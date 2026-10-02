output "state_bucket_name" {
  description = "Bucket name to place in an environment backend.hcl file."
  value       = google_storage_bucket.terraform_state.name
}

