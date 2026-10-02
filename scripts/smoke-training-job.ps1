[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [ValidatePattern('^https://')]
  [string]$ApiUrl,

  [Parameter(Mandatory)]
  [string]$IdentityToken,

  [Parameter(Mandatory)]
  [ValidateCount(4, 30)]
  [string[]]$ImagePath,

  [Parameter()]
  [string]$SubjectName = 'Authorized test subject',

  [Parameter()]
  [string]$TriggerWord = 'sksPerson'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$contentTypeByExtension = @{
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.png'  = 'image/png'
  '.webp' = 'image/webp'
}

$images = foreach ($path in $ImagePath) {
  $resolved = Resolve-Path -LiteralPath $path
  $file = Get-Item -LiteralPath $resolved
  $extension = $file.Extension.ToLowerInvariant()
  if (-not $contentTypeByExtension.ContainsKey($extension)) {
    throw "Unsupported image extension: $extension"
  }
  if ($file.Length -gt 15MB) {
    throw "$($file.Name) exceeds the 15 MiB limit."
  }
  [ordered]@{
    fileName    = $file.Name
    contentType = $contentTypeByExtension[$extension]
    sizeBytes   = $file.Length
    localPath   = $file.FullName
  }
}

$headers = @{ Authorization = "Bearer $IdentityToken" }
$requestImages = @($images | ForEach-Object {
  [ordered]@{
    fileName    = $_.fileName
    contentType = $_.contentType
    sizeBytes   = $_.sizeBytes
  }
})
$createBody = @{
  subjectName = $SubjectName
  triggerWord = $TriggerWord
  images      = $requestImages
} | ConvertTo-Json -Depth 5

$baseUrl = $ApiUrl.TrimEnd('/')
$created = Invoke-RestMethod `
  -Method Post `
  -Uri "$baseUrl/v1/training-jobs" `
  -Headers $headers `
  -ContentType 'application/json' `
  -Body $createBody

for ($index = 0; $index -lt $created.uploads.Count; $index++) {
  $upload = $created.uploads[$index]
  $image = $images[$index]
  Invoke-WebRequest `
    -Method Put `
    -Uri $upload.uploadUrl `
    -ContentType $upload.contentType `
    -InFile $image.localPath | Out-Null
  Write-Host "Uploaded $($image.fileName)"
}

$jobId = $created.job.id
Invoke-RestMethod `
  -Method Post `
  -Uri "$baseUrl/v1/training-jobs/$jobId/start" `
  -Headers $headers | Out-Null

do {
  Start-Sleep -Seconds 15
  $current = Invoke-RestMethod `
    -Method Get `
    -Uri "$baseUrl/v1/training-jobs/$jobId" `
    -Headers $headers
  Write-Host "Job $jobId status: $($current.job.status)"
} while ($current.job.status -notin @('SUCCEEDED', 'FAILED', 'CANCELLED'))

$current | ConvertTo-Json -Depth 8
if ($current.job.status -ne 'SUCCEEDED') {
  throw "Training job ended with status $($current.job.status)."
}
