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

module "api" {
  count  = var.deploy_api ? 1 : 0
  source = "../../modules/cloud-run"

  project_id            = var.project_id
  region                = var.region
  service_name          = "${local.name_prefix}-api"
  image_uri             = var.api_image_uri
  service_account_email = module.iam.api_service_account_email
  invoker_members       = var.api_invoker_members
  labels                = local.common_labels
  min_instances         = 0
  max_instances         = 3
  environment_variables = {
    APP_VERSION                    = "0.2.0"
    CLOUD_RUN_TRAINER_JOB          = module.trainer_job[0].job_name
    GCP_PROJECT_ID                 = var.project_id
    GCP_REGION                     = var.region
    GCS_DATA_BUCKET                = module.storage.bucket_name
    LOG_LEVEL                      = "info"
    LORA_BASE_MODEL                = var.base_model
    MAX_IMAGE_BYTES                = "15728640"
    MAX_TRAINING_STEPS             = "800"
    NODE_ENV                       = "production"
    SERVICE_NAME                   = "${local.name_prefix}-api"
    SIGNED_URL_TTL_SECONDS         = "900"
    TRAINER_MODE                   = var.trainer_mode
    TRAINING_PLATFORM              = var.training_platform
    TRAINING_SEED                  = "42"
    TRAINING_API_ENABLED           = "true"
    VERTEX_TRAINER_IMAGE_URI       = var.trainer_image_uri
    VERTEX_TRAINER_SERVICE_ACCOUNT = module.iam.trainer_service_account_email
  }

  depends_on = [
    module.artifact_registry,
    module.firestore,
    module.project_services,
    module.storage,
    module.trainer_job,
  ]
}

module "trainer_job" {
  count  = var.deploy_api ? 1 : 0
  source = "../../modules/cloud-run-job"

  project_id            = var.project_id
  region                = var.region
  job_name              = "${local.name_prefix}-trainer-smoke"
  image_uri             = var.trainer_image_uri
  service_account_email = module.iam.trainer_service_account_email
  runner_members        = toset([module.iam.api_service_account_member])
  labels                = local.common_labels

  depends_on = [
    module.artifact_registry,
    module.project_services,
    module.storage,
  ]
}
