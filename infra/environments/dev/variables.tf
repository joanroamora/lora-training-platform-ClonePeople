variable "project_id" {
  description = "Existing GCP project ID for the development environment."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "project_id must be a valid Google Cloud project ID."
  }
}

variable "region" {
  description = "Primary GCP region. Keep compute and storage colocated."
  type        = string
  default     = "us-central1"
}

variable "firestore_location" {
  description = "Firestore location; immutable after database creation."
  type        = string
  default     = "us-central1"
}

variable "application_name" {
  description = "Stable application identifier used in names and labels."
  type        = string
  default     = "lora-training"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,17}$", var.application_name))
    error_message = "application_name must be 3-18 lowercase letters, digits, or hyphens so derived service-account IDs remain valid."
  }
}

variable "environment" {
  description = "Deployment environment. This root only accepts dev."
  type        = string
  default     = "dev"

  validation {
    condition     = var.environment == "dev"
    error_message = "The dev composition root requires environment = dev."
  }
}

variable "labels" {
  description = "Organization-specific labels merged with mandatory platform labels."
  type        = map(string)
  default     = {}

  validation {
    condition = alltrue([
      for key, value in var.labels :
      can(regex("^[a-z][a-z0-9_-]{0,62}$", key)) && can(regex("^[a-z0-9_-]{0,63}$", value))
    ])
    error_message = "Label keys and values must satisfy Google Cloud label syntax."
  }
}

variable "upload_cors_origins" {
  description = "Browser origins allowed to upload via signed URLs. Keep empty for server clients."
  type        = list(string)
  default     = []
}
