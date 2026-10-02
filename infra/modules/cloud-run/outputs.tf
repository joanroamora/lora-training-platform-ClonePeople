output "service_name" {
  description = "Cloud Run API service name."
  value       = google_cloud_run_v2_service.api.name
}

output "service_uri" {
  description = "Authenticated API endpoint."
  value       = google_cloud_run_v2_service.api.uri
}
