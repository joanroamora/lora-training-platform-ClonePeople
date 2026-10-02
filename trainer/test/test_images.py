from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from PIL import Image

from src.lora_trainer.images import validate_and_prepare_images


class ImageValidationTest(unittest.TestCase):
    def test_prepares_four_decodable_rgb_images(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            sources = []
            for index in range(4):
                path = root / f"source-{index}.png"
                Image.new("RGBA", (512, 512), (index, 10, 20, 255)).save(path)
                sources.append(path)

            prepared = validate_and_prepare_images(sources, root / "prepared")

            self.assertEqual(len(prepared), 4)
            with Image.open(prepared[0]) as result:
                self.assertEqual(result.mode, "RGB")
                self.assertEqual(result.format, "JPEG")

    def test_rejects_images_that_are_too_small(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            sources = []
            for index in range(4):
                path = root / f"source-{index}.jpg"
                Image.new("RGB", (128, 128)).save(path)
                sources.append(path)

            with self.assertRaisesRegex(ValueError, "smaller than 256 pixels"):
                validate_and_prepare_images(sources, root / "prepared")


if __name__ == "__main__":
    unittest.main()
