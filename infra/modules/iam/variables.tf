variable "project_id" {
  description = "GCP project in which identities and role bindings are created."
  type        = string
}

variable "name_prefix" {
  description = "Short prefix used in service-account IDs."
  type        = string
}

