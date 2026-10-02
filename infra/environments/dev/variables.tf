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

variable "deploy_api" {
  description = "Create Cloud Run after API and trainer images exist in Artifact Registry."
  type        = bool
  default     = false
}

variable "api_image_uri" {
  description = "API image URI. Prefer an immutable sha256 digest."
  type        = string
  default     = ""
}

variable "trainer_image_uri" {
  description = "Vertex AI trainer image URI. Prefer an immutable sha256 digest."
  type        = string
  default     = ""
}

variable "trainer_mode" {
  description = "Use smoke for the first integration test and train for GPU LoRA training."
  type        = string
  default     = "smoke"

  validation {
    condition     = contains(["smoke", "train"], var.trainer_mode)
    error_message = "trainer_mode must be smoke or train."
  }
}

variable "training_platform" {
  description = "Remote executor used by the API. Cloud Run supports CPU smoke tests; Vertex supports GPU training."
  type        = string
  default     = "vertex"

  validation {
    condition     = contains(["vertex", "cloud_run"], var.training_platform)
    error_message = "training_platform must be vertex or cloud_run."
  }
}

variable "api_invoker_members" {
  description = "Users or service accounts allowed to invoke the private Cloud Run API."
  type        = set(string)
  default     = []
}

variable "base_model" {
  description = "Hugging Face model identifier used for compatible LoRA training."
  type        = string
  default     = "stabilityai/stable-diffusion-xl-base-1.0"
}

check "container_images_present" {
  assert {
    condition     = !var.deploy_api || (length(var.api_image_uri) > 0 && length(var.trainer_image_uri) > 0)
    error_message = "api_image_uri and trainer_image_uri are required when deploy_api is true."
  }
}
