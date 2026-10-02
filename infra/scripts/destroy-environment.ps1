[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High')]
param(
  [Parameter(Mandatory = $false)]
  [ValidateSet('dev')]
  [string]$Environment = 'dev',

  [Parameter(Mandatory = $false)]
  [switch]$IncludeBootstrap
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$environmentRoot = Join-Path $repoRoot "infra\environments\$Environment"
$bootstrapRoot = Join-Path $repoRoot 'infra\bootstrap'
$destroyPlan = Join-Path $environmentRoot 'destroy.tfplan'
$bootstrapDestroyPlan = Join-Path $bootstrapRoot 'destroy.tfplan'
$localTerraform = Join-Path $repoRoot '.tools\terraform\terraform.exe'

if (Test-Path -LiteralPath $localTerraform) {
  $terraformCommand = $localTerraform
} else {
  $terraformOnPath = Get-Command terraform -ErrorAction SilentlyContinue
  if (-not $terraformOnPath) {
    throw 'Terraform was not found at .tools\terraform\terraform.exe or on PATH.'
  }
  $terraformCommand = $terraformOnPath.Source
}

if (-not (Test-Path -LiteralPath (Join-Path $environmentRoot 'backend.hcl'))) {
  throw "Missing $environmentRoot\backend.hcl. Initialize the configured remote backend before destroy."
}

Write-Host "This permanently deletes every Terraform-managed resource in '$Environment'."
$confirmation = Read-Host "Type the environment name '$Environment' to continue"
if ($confirmation -cne $Environment) {
  throw 'Confirmation did not match. No resources were changed.'
}

& $terraformCommand -chdir=$environmentRoot init -input=false -backend-config=backend.hcl
if ($LASTEXITCODE -ne 0) { throw 'Terraform initialization failed.' }

& $terraformCommand -chdir=$environmentRoot plan -destroy -input=false -out=$destroyPlan
if ($LASTEXITCODE -ne 0) { throw 'Terraform could not create the destroy plan.' }

& $terraformCommand -chdir=$environmentRoot show $destroyPlan
if ($LASTEXITCODE -ne 0) { throw 'Terraform could not display the destroy plan.' }

if ($PSCmdlet.ShouldProcess($Environment, 'Apply the saved Terraform destroy plan')) {
  & $terraformCommand -chdir=$environmentRoot apply -input=false -auto-approve $destroyPlan
  if ($LASTEXITCODE -ne 0) { throw 'Environment destroy failed; bootstrap was preserved.' }
}

$remainingResources = & $terraformCommand -chdir=$environmentRoot state list
if ($LASTEXITCODE -ne 0) { throw 'Could not verify the environment state.' }
if ($remainingResources) {
  throw 'Resources remain in environment state; bootstrap was preserved.'
}

if ($IncludeBootstrap) {
  if (-not (Test-Path -LiteralPath (Join-Path $bootstrapRoot 'terraform.tfstate'))) {
    throw 'Bootstrap local state is missing. Import or restore it before deleting the state bucket.'
  }

  if ($PSCmdlet.ShouldProcess('Terraform bootstrap', 'Destroy the remote-state bucket and all state versions')) {
    & $terraformCommand -chdir=$bootstrapRoot init -input=false
    if ($LASTEXITCODE -ne 0) { throw 'Bootstrap initialization failed.' }

    & $terraformCommand -chdir=$bootstrapRoot plan -destroy -input=false -out=$bootstrapDestroyPlan
    if ($LASTEXITCODE -ne 0) { throw 'Terraform could not create the bootstrap destroy plan.' }

    & $terraformCommand -chdir=$bootstrapRoot show $bootstrapDestroyPlan
    if ($LASTEXITCODE -ne 0) { throw 'Terraform could not display the bootstrap destroy plan.' }

    & $terraformCommand -chdir=$bootstrapRoot apply -input=false -auto-approve $bootstrapDestroyPlan
    if ($LASTEXITCODE -ne 0) { throw 'Bootstrap destroy failed.' }

    $remainingBootstrapResources = & $terraformCommand -chdir=$bootstrapRoot state list
    if ($LASTEXITCODE -ne 0) { throw 'Could not verify the bootstrap state.' }
    if ($remainingBootstrapResources) {
      throw 'Resources remain in bootstrap state.'
    }
  }
}

Write-Host "Terraform-managed resources for '$Environment' were removed and the state is empty."
