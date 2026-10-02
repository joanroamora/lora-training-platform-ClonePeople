from __future__ import annotations

import logging
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from .config import parse_args
from .images import validate_and_prepare_images
from .storage_io import JobStorage
from .train_sdxl import train_sdxl_lora

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
LOGGER = logging.getLogger("lora-trainer")


def main() -> None:
    config = parse_args()
    storage = JobStorage(config.project_id, config.bucket)
    started_at = datetime.now(timezone.utc)

    with tempfile.TemporaryDirectory(prefix=f"lora-{config.job_id}-") as temporary:
        workspace = Path(temporary)
        source_paths = storage.download_inputs(config.input_prefix, workspace / "input")
        prepared_paths = validate_and_prepare_images(
            source_paths, workspace / "prepared"
        )
        LOGGER.info("Validated %d training images", len(prepared_paths))

        weights_uri = None
        if config.mode == "train":
            weights = train_sdxl_lora(
                image_paths=prepared_paths,
                output_directory=workspace / "output",
                base_model=config.base_model,
                prompt=f"a photo of {config.trigger_word} person",
                max_training_steps=config.max_training_steps,
                learning_rate=config.learning_rate,
                resolution=config.resolution,
                rank=config.rank,
                seed=config.seed,
            )
            weights_object = f"{config.output_prefix}{weights.name}"
            storage.upload_file(weights, weights_object)
            weights_uri = f"gs://{config.bucket}/{weights_object}"

        finished_at = datetime.now(timezone.utc)
        metadata = {
            "schemaVersion": 1,
            "jobId": config.job_id,
            "version": config.version,
            "mode": config.mode,
            "status": "SUCCEEDED",
            "baseModel": config.base_model,
            "triggerWord": config.trigger_word,
            "imageCount": len(prepared_paths),
            "maxTrainingSteps": config.max_training_steps,
            "learningRate": config.learning_rate,
            "resolution": config.resolution,
            "rank": config.rank,
            "seed": config.seed,
            "startedAt": started_at.isoformat(),
            "finishedAt": finished_at.isoformat(),
            "durationSeconds": (finished_at - started_at).total_seconds(),
            "weightsUri": weights_uri,
        }
        storage.upload_json(metadata, f"{config.output_prefix}metadata.json")
        LOGGER.info("Published training metadata for job %s", config.job_id)


if __name__ == "__main__":
    main()
