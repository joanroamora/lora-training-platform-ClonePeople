output "job_name" {
  description = "Fully qualified Cloud Run Job resource name."
  value       = "projects/${var.project_id}/locations/${var.region}/jobs/${google_cloud_run_v2_job.trainer.name}"
}
