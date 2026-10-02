resource "google_service_account" "api" {
  project      = var.project_id
  account_id   = "${var.name_prefix}-api"
  display_name = "LoRA API runtime"
  description  = "Runtime identity for the Cloud Run orchestration API"
}

resource "google_service_account" "trainer" {
  project      = var.project_id
  account_id   = "${var.name_prefix}-trainer"
  display_name = "LoRA trainer runtime"
  description  = "Runtime identity for Vertex AI custom training jobs"
}

locals {
  api_project_roles = toset([
    "roles/aiplatform.user",
    "roles/datastore.user",
    "roles/logging.logWriter",
  ])

  trainer_project_roles = toset([
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
  ])
}

resource "google_project_iam_member" "api" {
  for_each = local.api_project_roles

  project = var.project_id
  role    = each.value
  member  = google_service_account.api.member
}

resource "google_project_iam_member" "trainer" {
  for_each = local.trainer_project_roles

  project = var.project_id
  role    = each.value
  member  = google_service_account.trainer.member
}

resource "google_service_account_iam_member" "api_can_run_as_trainer" {
  service_account_id = google_service_account.trainer.name
  role               = "roles/iam.serviceAccountUser"
  member             = google_service_account.api.member
}

resource "google_service_account_iam_member" "api_can_sign_uploads" {
  service_account_id = google_service_account.api.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = google_service_account.api.member
}

