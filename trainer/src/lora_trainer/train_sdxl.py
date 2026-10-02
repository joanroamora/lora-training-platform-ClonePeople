from __future__ import annotations

import math
from pathlib import Path


def train_sdxl_lora(
    *,
    image_paths: list[Path],
    output_directory: Path,
    base_model: str,
    prompt: str,
    max_training_steps: int,
    learning_rate: float,
    resolution: int,
    rank: int,
    seed: int,
) -> Path:
    """Train UNet attention adapters while keeping the SDXL base model frozen."""
    import torch
    import torch.nn.functional as functional
    from accelerate import Accelerator
    from accelerate.utils import set_seed
    from diffusers import AutoencoderKL, DDPMScheduler, StableDiffusionXLPipeline, UNet2DConditionModel
    from diffusers.utils import convert_state_dict_to_diffusers
    from peft import LoraConfig, get_peft_model_state_dict
    from torch.utils.data import DataLoader, Dataset
    from torchvision import transforms
    from transformers import CLIPTextModel, CLIPTextModelWithProjection, CLIPTokenizer
    from PIL import Image

    class SubjectDataset(Dataset):
        def __init__(self) -> None:
            self._paths = image_paths
            self._transform = transforms.Compose(
                [
                    transforms.Resize(resolution, interpolation=transforms.InterpolationMode.BILINEAR),
                    transforms.CenterCrop(resolution),
                    transforms.ToTensor(),
                    transforms.Normalize([0.5], [0.5]),
                ]
            )

        def __len__(self) -> int:
            return max(len(self._paths), max_training_steps)

        def __getitem__(self, index: int) -> torch.Tensor:
            with Image.open(self._paths[index % len(self._paths)]) as image:
                return self._transform(image.convert("RGB"))

    set_seed(seed)
    accelerator = Accelerator(mixed_precision="fp16", gradient_accumulation_steps=1)
    weight_dtype = torch.float16 if accelerator.device.type == "cuda" else torch.float32

    scheduler = DDPMScheduler.from_pretrained(base_model, subfolder="scheduler")
    tokenizer_one = CLIPTokenizer.from_pretrained(base_model, subfolder="tokenizer")
    tokenizer_two = CLIPTokenizer.from_pretrained(base_model, subfolder="tokenizer_2")
    text_encoder_one = CLIPTextModel.from_pretrained(base_model, subfolder="text_encoder")
    text_encoder_two = CLIPTextModelWithProjection.from_pretrained(base_model, subfolder="text_encoder_2")
    vae = AutoencoderKL.from_pretrained(base_model, subfolder="vae")
    unet = UNet2DConditionModel.from_pretrained(base_model, subfolder="unet")

    for model in (text_encoder_one, text_encoder_two, vae, unet):
        model.requires_grad_(False)

    unet.add_adapter(
        LoraConfig(
            r=rank,
            lora_alpha=rank,
            init_lora_weights="gaussian",
            target_modules=["to_k", "to_q", "to_v", "to_out.0"],
        )
    )
    unet.enable_gradient_checkpointing()
    trainable_parameters = [parameter for parameter in unet.parameters() if parameter.requires_grad]
    optimizer = torch.optim.AdamW(trainable_parameters, lr=learning_rate)
    data_loader = DataLoader(SubjectDataset(), batch_size=1, shuffle=True, num_workers=0)

    def encode_prompt() -> tuple[torch.Tensor, torch.Tensor]:
        prompt_embeddings = []
        pooled = None
        for tokenizer, encoder in (
            (tokenizer_one, text_encoder_one),
            (tokenizer_two, text_encoder_two),
        ):
            tokens = tokenizer(
                prompt,
                padding="max_length",
                max_length=tokenizer.model_max_length,
                truncation=True,
                return_tensors="pt",
            ).input_ids.to(accelerator.device)
            encoded = encoder(tokens, output_hidden_states=True)
            pooled = encoded[0]
            prompt_embeddings.append(encoded.hidden_states[-2])
        if pooled is None:
            raise RuntimeError("SDXL text encoders returned no pooled embedding")
        return torch.cat(prompt_embeddings, dim=-1), pooled

    unet, optimizer, data_loader = accelerator.prepare(unet, optimizer, data_loader)
    vae.to(accelerator.device, dtype=weight_dtype)
    text_encoder_one.to(accelerator.device, dtype=weight_dtype)
    text_encoder_two.to(accelerator.device, dtype=weight_dtype)
    vae.enable_tiling()

    with torch.no_grad():
        prompt_embeddings, pooled_embeddings = encode_prompt()

    unet.train()
    global_step = 0
    epochs = math.ceil(max_training_steps / len(data_loader))
    for _ in range(epochs):
        for pixel_values in data_loader:
            with accelerator.accumulate(unet):
                pixel_values = pixel_values.to(accelerator.device, dtype=weight_dtype)
                with torch.no_grad():
                    latents = vae.encode(pixel_values).latent_dist.sample()
                    latents = latents * vae.config.scaling_factor
                noise = torch.randn_like(latents)
                timesteps = torch.randint(
                    0,
                    scheduler.config.num_train_timesteps,
                    (latents.shape[0],),
                    device=latents.device,
                ).long()
                noisy_latents = scheduler.add_noise(latents, noise, timesteps)
                time_ids = torch.tensor(
                    [[resolution, resolution, 0, 0, resolution, resolution]],
                    device=accelerator.device,
                    dtype=weight_dtype,
                )
                prediction = unet(
                    noisy_latents,
                    timesteps,
                    prompt_embeddings,
                    added_cond_kwargs={
                        "text_embeds": pooled_embeddings,
                        "time_ids": time_ids,
                    },
                ).sample
                target = (
                    scheduler.get_velocity(latents, noise, timesteps)
                    if scheduler.config.prediction_type == "v_prediction"
                    else noise
                )
                loss = functional.mse_loss(prediction.float(), target.float())
                accelerator.backward(loss)
                optimizer.step()
                optimizer.zero_grad(set_to_none=True)

            if accelerator.sync_gradients:
                global_step += 1
            if global_step >= max_training_steps:
                break
        if global_step >= max_training_steps:
            break

    accelerator.wait_for_everyone()
    output_directory.mkdir(parents=True, exist_ok=True)
    if accelerator.is_main_process:
        unwrapped_unet = accelerator.unwrap_model(unet)
        state_dict = convert_state_dict_to_diffusers(
            get_peft_model_state_dict(unwrapped_unet)
        )
        StableDiffusionXLPipeline.save_lora_weights(
            output_directory,
            unet_lora_layers=state_dict,
            safe_serialization=True,
        )
    accelerator.wait_for_everyone()
    return output_directory / "pytorch_lora_weights.safetensors"
