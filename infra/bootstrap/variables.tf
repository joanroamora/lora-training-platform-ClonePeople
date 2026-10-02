variable "project_id" {
  description = "Existing GCP project that will own the Terraform state bucket."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "project_id must be a valid Google Cloud project ID."
  }
}

variable "region" {
  description = "Region used for the state bucket."
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment whose state is stored in the bucket."
  type        = string
  default     = "dev"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,14}$", var.environment))
    error_message = "environment must be 2-15 lowercase letters, digits, or hyphens."
  }
}

variable "labels" {
  description = "Additional labels for the state bucket."
  type        = map(string)
  default     = {}
}

