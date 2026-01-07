#!/usr/bin/env bash
set -euo pipefail

APP_NAME="quarkus-cloud"
REGION="${REGION:-europe-west1}"
PROJECT_ID=$(gcloud config get-value project)

echo "Building Quarkus app..."
./gradlew build

echo "Building Docker image..."
docker build -f src/main/docker/Dockerfile.jvm -t quarkus-cloud .

IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/quarkus-repo/${APP_NAME}:latest"

echo "Tagging image as ${IMAGE_URI}..."
docker tag ${APP_NAME} ${IMAGE_URI}

echo "Pushing image..."
docker push ${IMAGE_URI}

echo "Deploying to Cloud Run..."
gcloud run deploy ${APP_NAME} \
  --image=${IMAGE_URI} \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --max-instances=1

echo "Done."
