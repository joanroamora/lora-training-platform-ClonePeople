# Vertex AI LoRA trainer

This container reads job images from Cloud Storage, decodes and normalizes them, optionally trains an SDXL UNet LoRA, and writes `metadata.json` plus `pytorch_lora_weights.safetensors` to the job output prefix.

`--mode smoke` performs the same download, decoding, validation, and output publication without loading a base model or requiring a GPU. Use it for the first remote integration test. `--mode train` downloads the configured SDXL model and performs GPU training.

Python dependencies are installed only inside the Docker image. The repository does not require or modify a global Python installation.

The training implementation is intentionally fixed to one SDXL-compatible workflow. Before running `train`, verify the selected model's license, accept any required model terms, confirm Vertex AI GPU quota, and use authorized images.
