variable "project_id" {
  description = "GCP project that owns the Cloud Run service."
  type        = string
}

variable "region" {
  description = "Cloud Run deployment region."
  type        = string
}

variable "service_name" {
  description = "Cloud Run service name."
  type        = string
}

variable "image_uri" {
  description = "Immutable API container image URI, preferably using a digest."
  type        = string
}

variable "service_account_email" {
  description = "Runtime service account email."
  type        = string
}

variable "environment_variables" {
  description = "Non-secret runtime configuration."
  type        = map(string)
  default     = {}
}

variable "invoker_members" {
  description = "IAM members allowed to invoke the private API."
  type        = set(string)
  default     = []
}

variable "labels" {
  description = "Labels applied to the Cloud Run service."
  type        = map(string)
}

variable "min_instances" {
  description = "Minimum warm instances. Zero permits scale-to-zero."
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Hard upper bound for API instances."
  type        = number
  default     = 3
}
