output "api_service_account_email" {
  description = "Cloud Run API runtime identity."
  value       = google_service_account.api.email
}

output "api_service_account_member" {
  description = "IAM member string for the API runtime identity."
  value       = google_service_account.api.member
}

output "trainer_service_account_email" {
  description = "Vertex AI training runtime identity."
  value       = google_service_account.trainer.email
}

output "trainer_service_account_member" {
  description = "IAM member string for the trainer runtime identity."
  value       = google_service_account.trainer.member
}

