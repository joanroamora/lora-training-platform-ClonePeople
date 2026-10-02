from __future__ import annotations

import argparse
from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class TrainerConfig:
    project_id: str
    bucket: str
    job_id: str
    mode: Literal["smoke", "train"]
    base_model: str
    trigger_word: str
    max_training_steps: int
    learning_rate: float
    resolution: int
    rank: int
    seed: int
    version: str

    @property
    def input_prefix(self) -> str:
        return f"jobs/{self.job_id}/input/"

    @property
    def output_prefix(self) -> str:
        return f"jobs/{self.job_id}/output/"


def parse_args() -> TrainerConfig:
    parser = argparse.ArgumentParser(description="Train and publish an SDXL LoRA")
    parser.add_argument("--project-id", required=True)
    parser.add_argument("--bucket", required=True)
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--mode", choices=("smoke", "train"), default="smoke")
    parser.add_argument("--base-model", required=True)
    parser.add_argument("--trigger-word", required=True)
    parser.add_argument("--max-training-steps", type=int, default=800)
    parser.add_argument("--learning-rate", type=float, default=1e-4)
    parser.add_argument("--resolution", type=int, default=1024)
    parser.add_argument("--rank", type=int, default=16)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--version", required=True)
    args = parser.parse_args()

    if not 1 <= args.max_training_steps <= 10_000:
        parser.error("--max-training-steps must be between 1 and 10000")
    if not 0 < args.learning_rate <= 0.01:
        parser.error("--learning-rate must be greater than 0 and at most 0.01")
    if args.resolution not in (512, 768, 1024):
        parser.error("--resolution must be 512, 768, or 1024")
    if not 1 <= args.rank <= 128:
        parser.error("--rank must be between 1 and 128")
    if not 0 <= args.seed <= 2_147_483_647:
        parser.error("--seed must be between 0 and 2147483647")

    return TrainerConfig(
        project_id=args.project_id,
        bucket=args.bucket,
        job_id=args.job_id,
        mode=args.mode,
        base_model=args.base_model,
        trigger_word=args.trigger_word,
        max_training_steps=args.max_training_steps,
        learning_rate=args.learning_rate,
        resolution=args.resolution,
        rank=args.rank,
        seed=args.seed,
        version=args.version,
    )
