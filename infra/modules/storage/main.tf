resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "google_storage_bucket" "workload" {
  project                     = var.project_id
  name                        = "${var.name_prefix}-data-${random_id.bucket_suffix.hex}"
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = var.force_destroy
  labels                      = var.labels

  versioning {
    enabled = true
  }

  dynamic "cors" {
    for_each = length(var.cors_origins) == 0 ? [] : [1]
    content {
      origin          = var.cors_origins
      method          = ["PUT", "POST"]
      response_header = ["Content-Type", "ETag"]
      max_age_seconds = 3600
    }
  }

  lifecycle_rule {
    condition {
      age        = 30
      with_state = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }

  lifecycle_rule {
    condition {
      age     = 1
      matches_prefix = ["tmp/"]
    }
    action {
      type = "Delete"
    }
  }
}

resource "google_storage_bucket_iam_member" "object_admin" {
  for_each = var.object_admin_members

  bucket = google_storage_bucket.workload.name
  role   = "roles/storage.objectAdmin"
  member = each.value
}

