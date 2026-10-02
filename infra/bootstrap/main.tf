provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_project_service" "storage" {
  project                    = var.project_id
  service                    = "storage.googleapis.com"
  disable_on_destroy         = true
  disable_dependent_services = true
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

locals {
  labels = merge(
    var.labels,
    {
      application = "lora-training-platform"
      environment = var.environment
      managed-by  = "terraform"
      purpose     = "terraform-state"
    }
  )
}

resource "google_storage_bucket" "terraform_state" {
  project                     = var.project_id
  name                        = "${var.project_id}-${var.environment}-tfstate-${random_id.bucket_suffix.hex}"
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = true
  labels                      = local.labels

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age                = 30
      with_state         = "ARCHIVED"
      num_newer_versions = 5
    }
    action {
      type = "Delete"
    }
  }

  depends_on = [google_project_service.storage]
}
