# syntax=docker/dockerfile:1.7
FROM pytorch/pytorch:2.7.1-cuda12.8-cudnn9-runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    TOKENIZERS_PARALLELISM=false

WORKDIR /app

RUN groupadd --system trainer && useradd --system --gid trainer --create-home trainer
COPY requirements.txt ./requirements.txt
RUN python -m pip install --requirement requirements.txt

COPY --chown=trainer:trainer src ./src
USER trainer

ENTRYPOINT ["python", "-m", "src.lora_trainer.main"]
