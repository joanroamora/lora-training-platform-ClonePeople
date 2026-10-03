# LoRA Training API

Node.js and Express orchestration API intended for Cloud Run. It exposes health and training-job endpoints backed by Firestore, private Cloud Storage uploads, and a selectable Cloud Run Jobs or Vertex AI runner.

## Local development

Dependencies are installed only inside `api/node_modules`; no global package installation is required.

```powershell
Set-Location api
npm ci
Copy-Item .env.example .env
npm run dev
```

The development command loads `.env` through Node's built-in environment-file support. Production reads ordinary environment variables supplied by Cloud Run and never loads a local file.

## Checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

## Runtime contract

`GET /health` returns HTTP 200 with the service name, application version, timestamp, and process uptime. Every response receives an `x-request-id`; a valid caller-provided value is preserved to support end-to-end tracing.

Configuration is validated at startup. Logs are emitted as JSON, common authorization headers are redacted, and `SIGTERM` triggers graceful shutdown for Cloud Run instance termination.

Training endpoints are enabled only when `TRAINING_API_ENABLED=true` and all GCP configuration is present:

- `POST /v1/training-jobs` accepts subject metadata and 4-30 image declarations, persists a job, and returns short-lived signed upload URLs.
- `POST /v1/training-jobs/{jobId}/start` verifies every private object and submits one idempotent remote job.
- `GET /v1/training-jobs/{jobId}` synchronizes the remote state and returns private output locations after completion.

Cloud Run provides authentication at the service boundary. The application does not accept or store passwords, service-account keys, or long-lived access tokens.
