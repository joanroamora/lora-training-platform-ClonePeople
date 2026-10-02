# Remote smoke test

The first launch should use `trainer_mode = "smoke"` and `training_platform = "cloud_run"`. It exercises Cloud Run authentication, Firestore persistence, signed uploads, object validation, a Cloud Run Job, status synchronization, and result publication without downloading SDXL or allocating a GPU.

## Deployment order

1. Apply the bootstrap stack and the development foundation with `deploy_api = false`.
2. Build `api/Dockerfile` and `trainer/Dockerfile`, then push both images to the Terraform-created Artifact Registry repository.
3. Put immutable image URIs in the development `terraform.tfvars`, set `deploy_api = true`, keep `trainer_mode = "smoke"`, set `training_platform = "cloud_run"`, and apply the development stack again.
4. Read `api_service_uri` from Terraform output and obtain a Cloud Run identity token for a member listed in `api_invoker_members`.
5. Run `scripts/smoke-training-job.ps1` with 4-30 authorized JPEG, PNG, or WebP files.

Example invocation:

```powershell
.\scripts\smoke-training-job.ps1 `
  -ApiUrl 'https://service-url.run.app' `
  -IdentityToken '<short-lived-identity-token>' `
  -ImagePath @('.\samples\01.jpg', '.\samples\02.jpg', '.\samples\03.jpg', '.\samples\04.jpg')
```

The script creates a job, uploads directly to signed private URLs, starts the configured runner, polls status, and prints the final result. A successful smoke job creates `jobs/<jobId>/output/metadata.json` in the private data bucket.

## GPU training

After the smoke path succeeds, confirm model license access and GPU quota, change `trainer_mode` to `"train"`, set `training_platform = "vertex"`, and apply Terraform. New jobs will request one NVIDIA T4 and create `pytorch_lora_weights.safetensors`. Existing jobs retain their original mode and configuration in Firestore.

Use photos owned by the operator or covered by explicit permission. The base model identifier, trigger word, step count, learning rate, input count, timestamps, and output URI are recorded with every result.
