from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from google.cloud import storage


class JobStorage:
    def __init__(self, project_id: str, bucket_name: str) -> None:
        self._client = storage.Client(project=project_id)
        self._bucket = self._client.bucket(bucket_name)

    def download_inputs(self, prefix: str, destination: Path) -> list[Path]:
        destination.mkdir(parents=True, exist_ok=True)
        downloaded: list[Path] = []
        for blob in self._client.list_blobs(self._bucket, prefix=prefix):
            if blob.name.endswith("/"):
                continue
            local_path = destination / Path(blob.name).name
            blob.download_to_filename(local_path)
            downloaded.append(local_path)
        return downloaded

    def upload_file(self, local_path: Path, object_name: str) -> None:
        self._bucket.blob(object_name).upload_from_filename(local_path)

    def upload_json(self, value: dict[str, Any], object_name: str) -> None:
        self._bucket.blob(object_name).upload_from_string(
            json.dumps(value, indent=2, sort_keys=True),
            content_type="application/json",
        )
