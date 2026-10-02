from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

Image.MAX_IMAGE_PIXELS = 40_000_000
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


def validate_and_prepare_images(
    source_paths: list[Path], output_directory: Path
) -> list[Path]:
    if not 4 <= len(source_paths) <= 30:
        raise ValueError("A training job requires between 4 and 30 images")

    output_directory.mkdir(parents=True, exist_ok=True)
    prepared: list[Path] = []
    for index, source in enumerate(sorted(source_paths), start=1):
        try:
            with Image.open(source) as image:
                image.verify()
            with Image.open(source) as image:
                if image.format not in ALLOWED_FORMATS:
                    raise ValueError(f"Unsupported image format for {source.name}")
                if min(image.size) < 256:
                    raise ValueError(f"Image {source.name} is smaller than 256 pixels")
                normalized = ImageOps.exif_transpose(image).convert("RGB")
                destination = output_directory / f"{index:03d}.jpg"
                normalized.save(destination, format="JPEG", quality=95)
                prepared.append(destination)
        except (UnidentifiedImageError, OSError) as error:
            raise ValueError(f"Image {source.name} cannot be decoded") from error
    return prepared
