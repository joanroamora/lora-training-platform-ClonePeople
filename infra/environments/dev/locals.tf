locals {
  name_prefix = "${var.application_name}-${var.environment}"

  common_labels = merge(
    var.labels,
    {
      application = var.application_name
      environment = var.environment
      managed-by  = "terraform"
    }
  )

  required_services = toset([
    "aiplatform.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "firestore.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "run.googleapis.com",
  ])
}
