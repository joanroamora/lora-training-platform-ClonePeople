variable "project_id" {
  description = "GCP project that owns the bucket."
  type        = string
}

variable "region" {
  description = "Bucket location."
  type        = string
}

variable "name_prefix" {
  description = "Stable resource-name prefix."
  type        = string
}

variable "labels" {
  description = "Labels applied to the bucket."
  type        = map(string)
}

variable "force_destroy" {
  description = "Allow Terraform to remove all objects and versions during destroy."
  type        = bool
  default     = false
}

variable "cors_origins" {
  description = "Origins allowed to upload through signed URLs. Empty disables CORS."
  type        = list(string)
  default     = []
}

variable "object_admin_members" {
  description = "IAM members allowed to manage objects without administering the bucket."
  type        = set(string)
  default     = []
}

