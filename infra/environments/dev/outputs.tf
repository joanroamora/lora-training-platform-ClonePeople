output "data_bucket_name" {
  description = "Private bucket for training inputs and versioned outputs."
  value       = module.storage.bucket_name
}

output "artifact_registry_url" {
  description = "Base URL for API and trainer container images."
  value       = module.artifact_registry.repository_url
}

output "firestore_database" {
  description = "Firestore database used for training-job state."
  value       = module.firestore.database_name
}

output "api_service_account_email" {
  description = "Identity reserved for the future Cloud Run API."
  value       = module.iam.api_service_account_email
}

output "trainer_service_account_email" {
  description = "Identity used by future Vertex AI custom jobs."
  value       = module.iam.trainer_service_account_email
}

output "api_service_uri" {
  description = "Authenticated Cloud Run API URL, or null when deployment is disabled."
  value       = var.deploy_api ? module.api[0].service_uri : null
}

output "trainer_smoke_job_name" {
  description = "Cloud Run Job used for CPU smoke executions, or null when deployment is disabled."
  value       = var.deploy_api ? module.trainer_job[0].job_name : null
}
