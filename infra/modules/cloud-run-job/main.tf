resource "google_cloud_run_v2_job" "trainer" {
  project             = var.project_id
  location            = var.region
  name                = var.job_name
  deletion_protection = false
  labels              = var.labels

  template {
    task_count = 1

    template {
      service_account = var.service_account_email
      timeout         = "1200s"
      max_retries     = 0

      containers {
        name  = "trainer"
        image = var.image_uri
        args  = ["--help"]

        resources {
          limits = {
            cpu    = "1"
            memory = "4Gi"
          }
        }
      }
    }
  }
}

resource "google_cloud_run_v2_job_iam_member" "runner" {
  for_each = var.runner_members

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_job.trainer.name
  role     = "roles/run.developer"
  member   = each.value
}
