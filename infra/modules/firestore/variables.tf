variable "project_id" {
  description = "GCP project that owns the Firestore database."
  type        = string
}

variable "location_id" {
  description = "Immutable Firestore database location."
  type        = string
}

variable "deletion_policy" {
  description = "Terraform deletion policy. Use DELETE only for disposable environments."
  type        = string
  default     = "ABANDON"

  validation {
    condition     = contains(["ABANDON", "DELETE"], var.deletion_policy)
    error_message = "deletion_policy must be ABANDON or DELETE."
  }
}

variable "delete_protection_enabled" {
  description = "Protect the database against accidental deletion."
  type        = bool
  default     = true
}

