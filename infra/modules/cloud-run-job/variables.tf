variable "project_id" {
  description = "Google Cloud project ID."
  type        = string
}

variable "region" {
  description = "Cloud Run Job region."
  type        = string
}

variable "job_name" {
  description = "Cloud Run Job name."
  type        = string
}

variable "image_uri" {
  description = "Immutable trainer container image URI."
  type        = string
}

variable "service_account_email" {
  description = "Runtime service account used by trainer tasks."
  type        = string
}

variable "runner_members" {
  description = "IAM members allowed to execute the job with argument overrides."
  type        = set(string)
  default     = []
}

variable "labels" {
  description = "Resource labels."
  type        = map(string)
  default     = {}
}
