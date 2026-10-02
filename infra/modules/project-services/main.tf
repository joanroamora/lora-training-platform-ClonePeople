resource "google_project_service" "required" {
  for_each = var.services

  project                    = var.project_id
  service                    = each.value
  disable_on_destroy         = true
  disable_dependent_services = true
}

