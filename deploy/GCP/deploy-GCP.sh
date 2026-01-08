#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

APP_NAME="quarkus-cloud"
REGION="${REGION:-europe-west1}"
PROJECT_ID=$(gcloud config get-value project)

RESOURCES_DIR="${REPO_ROOT}/backend/src/main/resources"
PRIVATE_KEY="${RESOURCES_DIR}/privateKey.pem"
PUBLIC_KEY="${RESOURCES_DIR}/publicKey.pem"

if [[ ! -f "${PRIVATE_KEY}" ]] || [[ ! -f "${PUBLIC_KEY}" ]]; then
    echo "Generating JWT RSA key pair..."
    openssl genrsa -out "${PRIVATE_KEY}" 2048
    openssl rsa -in "${PRIVATE_KEY}" -pubout -out "${PUBLIC_KEY}"
    echo "JWT keys generated"
else
    echo "JWT keys already exist"
fi

echo "Building Quarkus app (container target)..."
"${REPO_ROOT}/gradlew" -p "${REPO_ROOT}" build -x test

echo "Building Docker image..."
docker build -f "${REPO_ROOT}/backend/src/main/docker/Dockerfile.jvm" -t quarkus-cloud "${REPO_ROOT}/backend"

IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/quarkus-repo/${APP_NAME}:latest"

echo "Tagging image as ${IMAGE_URI}..."
docker tag ${APP_NAME} ${IMAGE_URI}

echo "Pushing image..."
docker push ${IMAGE_URI}

echo "Deploying to Cloud Run..."
gcloud run deploy ${APP_NAME} \
  --image=${IMAGE_URI} \
  --region=${REGION} \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=1Gi \
  --cpu-boost \
  --max-instances=1 \
  --set-env-vars="QUARKUS_PROFILE=gcp"

echo "Done."
