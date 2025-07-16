# ==================================================================================================
# TERRAFORM AND PROVIDER CONFIGURATION
# ==================================================================================================

# Bloque de configuración de Terraform.
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0" # Se fija la versión del provider para evitar cambios inesperados.
    }
  }

  # --- CONFIGURACIÓN DEL BACKEND REMOTO ---
  # Se utiliza S3 para almacenar el archivo de estado de Terraform, permitiendo el trabajo
  # en equipo y la ejecución en pipelines de CI/CD.
  backend "s3" {

    bucket = "plataforma-encuestas-tfstate-16072025" 
    key    = "encuestas-app/infra/terraform.tfstate" 
    region = "us-east-1"                             

    # --- CONFIGURACIÓN DEL BLOQUEO DE ESTADO (MÉTODO ACTUAL) ---
    # Habilita el bloqueo de estado nativo de S3. Esto crea un archivo .tflock
    # en el bucket para prevenir ejecuciones concurrentes. Este es el método
    # recomendado y reemplaza el uso obsoleto de DynamoDB para el bloqueo.
    use_lockfile = true

    # Forzar el cifrado del archivo de estado en el bucket es una buena práctica de seguridad.
    encrypt = true
  }
}

# Define el proveedor de nube y la región por defecto para todos los recursos.
provider "aws" {
  region = "us-east-1"
}


# ==================================================================================================
# APPLICATION RESOURCES
# ==================================================================================================

# --------------------------------------------------------------------------------------------------
# DYNAMODB TABLE FOR THE APPLICATION
#
# Esta es la base de datos para la aplicación de encuestas.
# Sigue el patrón de diseño de tabla única (Single-Table Design).
# --------------------------------------------------------------------------------------------------
resource "aws_dynamodb_table" "survey_platform_table" {
  name         = "SurveyPlatform"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  tags = {
    Name      = "SurveyPlatformDB"
    Project   = "PruebaTecnica-Encuestas"
    ManagedBy = "Terraform"
  }
}

# --------------------------------------------------------------------------------------------------
# S3 BUCKET & CLOUDFRONT FOR FRONTEND
#
# Infraestructura para alojar y servir la aplicación Vue.js de forma segura y eficiente.
# --------------------------------------------------------------------------------------------------

# 1. Bucket de S3 para alojar los archivos estáticos (HTML, CSS, JS).
resource "aws_s3_bucket" "frontend_bucket" {

  bucket = "mi-plataforma-encuestas-frontend-final-160725"

  tags = {
    Name      = "SurveyApp-Frontend"
    Project   = "PruebaTecnica-Encuestas"
    ManagedBy = "Terraform"
  }
}

# 2. Bloqueo de acceso público para el bucket del frontend.
resource "aws_s3_bucket_public_access_block" "frontend_bucket_pab" {
  bucket = aws_s3_bucket.frontend_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 3. Origin Access Control (OAC) para CloudFront.
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "OAC-for-${aws_s3_bucket.frontend_bucket.id}"
  description                       = "OAC for the survey platform frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# 4. Política de bucket que concede permisos de lectura al OAC de CloudFront.
resource "aws_s3_bucket_policy" "frontend_bucket_policy" {
  bucket = aws_s3_bucket.frontend_bucket.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend_bucket.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.s3_distribution.arn
          }
        }
      },
    ]
  })
}

# 5. Distribución de CloudFront (CDN).
resource "aws_cloudfront_distribution" "s3_distribution" {
  origin {
    domain_name              = aws_s3_bucket.frontend_bucket.bucket_regional_domain_name
    origin_id                = "S3-Origin-${aws_s3_bucket.frontend_bucket.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CDN para la plataforma de encuestas"
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-Origin-${aws_s3_bucket.frontend_bucket.id}"
    cache_policy_id  = "658327ea-f89d-4fab-a63d-7e88639e58f6" # Managed-CachingOptimized
    viewer_protocol_policy = "redirect-to-https"
  }

  # Manejo de errores para Single Page Applications (SPAs).
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
  }
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Project   = "PruebaTecnica-Encuestas"
    ManagedBy = "Terraform"
  }
}


# ==================================================================================================
# OUTPUTS
# ==================================================================================================
# Valores de salida que se mostrarán después de un 'apply'.
# Son útiles para obtener información de los recursos creados.

output "dynamodb_table_name" {
  description = "El nombre de la tabla DynamoDB para la aplicación."
  value       = aws_dynamodb_table.survey_platform_table.name
}

output "dynamodb_table_arn" {
  description = "El ARN de la tabla DynamoDB, necesario para los permisos IAM de las Lambdas."
  value       = aws_dynamodb_table.survey_platform_table.arn
}

output "frontend_s3_bucket_name" {
  description = "El nombre del bucket de S3 para el frontend."
  value       = aws_s3_bucket.frontend_bucket.id
}

output "cloudfront_distribution_domain" {
  description = "El dominio de la distribución de CloudFront para acceder a la aplicación web."
  value       = aws_cloudfront_distribution.s3_distribution.domain_name
}

output "cloudfront_distribution_id" {
  description = "El ID de la distribución de CloudFront."
  value       = aws_cloudfront_distribution.s3_distribution.id
}