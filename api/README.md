# LoRA Training API

Node.js and Express orchestration API intended for Cloud Run. This first increment exposes `GET /health` and establishes the runtime conventions used by later Firestore, Cloud Storage, and Vertex AI integrations.

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
