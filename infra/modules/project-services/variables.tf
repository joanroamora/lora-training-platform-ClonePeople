variable "project_id" {
  description = "GCP project in which APIs are enabled."
  type        = string
}

variable "services" {
  description = "Set of Google Cloud APIs required by the platform."
  type        = set(string)
}

