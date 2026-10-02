module "project_services" {
  source = "../../modules/project-services"

  project_id = var.project_id
  services   = local.required_services
}

module "iam" {
  source = "../../modules/iam"

  project_id  = var.project_id
  name_prefix = local.name_prefix

  depends_on = [module.project_services]
}

module "storage" {
  source = "../../modules/storage"

  project_id    = var.project_id
  region        = var.region
  name_prefix   = local.name_prefix
  labels        = local.common_labels
  force_destroy = true
  cors_origins  = var.upload_cors_origins
  object_admin_members = toset([
    module.iam.api_service_account_member,
    module.iam.trainer_service_account_member,
  ])

  depends_on = [module.project_services]
}

module "firestore" {
  source = "../../modules/firestore"

  project_id                = var.project_id
  location_id               = var.firestore_location
  deletion_policy           = "DELETE"
  delete_protection_enabled = false

  depends_on = [module.project_services]
}

module "artifact_registry" {
  source = "../../modules/artifact-registry"

  project_id     = var.project_id
  region         = var.region
  repository_id  = "${local.name_prefix}-containers"
  labels         = local.common_labels
  immutable_tags = true
  reader_members = toset([
    module.iam.api_service_account_member,
    module.iam.trainer_service_account_member,
  ])

  depends_on = [module.project_services]
}
