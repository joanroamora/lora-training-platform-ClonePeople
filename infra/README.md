# Infrastructure as Code

This directory contains the Google Cloud foundation for the LoRA training platform. It intentionally stops before deploying Cloud Run or a Vertex AI custom job: those resources need application container images and belong to the next delivery stage.

## Layout

```text
infra/
  bootstrap/                 Remote-state bucket, managed separately
  environments/dev/         Development composition root
  modules/                   Reusable infrastructure modules
  scripts/                   Guarded lifecycle helpers
```

The bootstrap stack keeps local Terraform state. This avoids a state bucket depending on itself and makes a complete teardown possible: destroy the environment first, then destroy the bootstrap stack and its bucket. Never commit either state file.

The development root can be applied before container images exist. Leave `deploy_api = false` to create the foundation, publish the API and trainer images to the resulting Artifact Registry repository, then set the two immutable image URIs and enable the private Cloud Run service. See `docs/remote-smoke-test.md` for the first end-to-end test.

## Configuration model

Configuration has three layers:

1. Module defaults contain safe, environment-independent behavior.
2. Each environment root defines its topology and composes modules.
3. Untracked `terraform.tfvars` and `backend.hcl` files hold deployment-specific values.

Copy the example files instead of editing them. Do not place credentials or secrets in Terraform variables; use Application Default Credentials or workload identity. Resource labels are assembled centrally, mandatory labels cannot be overridden by environment input, and the complete label set is propagated to every resource that supports it.

## Intended workflow

The commands below document the future workflow only; no Terraform command is required while reviewing this initial structure.

```powershell
Copy-Item infra/bootstrap/terraform.tfvars.example infra/bootstrap/terraform.tfvars
terraform -chdir=infra/bootstrap init
terraform -chdir=infra/bootstrap apply

Copy-Item infra/environments/dev/backend.hcl.example infra/environments/dev/backend.hcl
Copy-Item infra/environments/dev/terraform.tfvars.example infra/environments/dev/terraform.tfvars
terraform -chdir=infra/environments/dev init -backend-config=backend.hcl
terraform -chdir=infra/environments/dev plan
```

The GCP project must already exist, billing must be enabled, and `serviceusage.googleapis.com` must be available so Terraform can manage the remaining APIs. Project creation, billing attachment, and this bootstrap prerequisite are organization-specific operations, so they are deliberately outside this stack. The bootstrap stack owns the Storage API and keeps it active until both the workload data bucket and the remote-state bucket have been removed.

## Tooling policy

Terraform uses the existing system installation; lifecycle scripts resolve it from `PATH` or the standard per-user installation under `%LOCALAPPDATA%\Programs\Terraform`. They never install or upgrade Terraform. Python work belongs in `.venv` or a container, and Node.js packages belong in the repository's local `node_modules` through the package manager and lockfile.

## Complete teardown

Run the following command from the repository root for a complete teardown:

```powershell
.\infra\scripts\destroy-environment.ps1 -Environment dev -IncludeBootstrap
```

The script creates and displays a destroy plan, requires the exact environment name as confirmation, applies that saved plan, verifies the environment state is empty, and only then destroys the remote-state bucket through the bootstrap stack. Omit `-IncludeBootstrap` when the same state bucket will be reused for another deployment.

The data bucket uses `force_destroy`, Firestore has deletion protection disabled and a `DELETE` deletion policy, enabled APIs are disabled during teardown, and the Artifact Registry repository is owned by Terraform. These settings are appropriate for disposable non-production environments. A future production environment should default to retention and deletion protection, then require a deliberate break-glass override for teardown.
