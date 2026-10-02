variable "project_id" {
  description = "GCP project that owns the repository."
  type        = string
}

variable "region" {
  description = "Artifact Registry location."
  type        = string
}

variable "repository_id" {
  description = "Docker repository identifier."
  type        = string
}

variable "labels" {
  description = "Labels applied to the repository."
  type        = map(string)
}

variable "immutable_tags" {
  description = "Prevent a released image tag from being moved."
  type        = bool
  default     = true
}

variable "reader_members" {
  description = "IAM members allowed to pull runtime container images."
  type        = set(string)
  default     = []
}
