resource "google_firestore_database" "primary" {
  project                     = var.project_id
  name                        = "(default)"
  location_id                 = var.location_id
  type                        = "FIRESTORE_NATIVE"
  concurrency_mode            = "OPTIMISTIC"
  app_engine_integration_mode = "DISABLED"
  deletion_policy             = var.deletion_policy
  delete_protection_state     = var.delete_protection_enabled ? "DELETE_PROTECTION_ENABLED" : "DELETE_PROTECTION_DISABLED"
}

