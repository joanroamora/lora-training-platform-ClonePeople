output "bucket_name" {
  description = "Private bucket used for input images and LoRA artifacts."
  value       = google_storage_bucket.workload.name
}

output "bucket_url" {
  description = "Google Storage URI for the workload bucket."
  value       = google_storage_bucket.workload.url
}

