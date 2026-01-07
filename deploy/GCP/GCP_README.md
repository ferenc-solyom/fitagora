# GCP Cloud Run Deployment

Deploy the Quarkus application to Google Cloud Run using `deploy-GCP.sh`.

## GCP Terminology

### Core Services

**Cloud Run**
A fully managed serverless platform for running containers. Automatically scales from zero to handle traffic, and you only pay for actual compute time used. No infrastructure to manage.

**Artifact Registry**
Google's container image registry (successor to Container Registry). Stores Docker images that Cloud Run pulls from when deploying services.

### Cloud Run Concepts

**Service**
A deployed container application. Each service gets a unique HTTPS URL. Services auto-scale based on incoming requests and can scale to zero when idle.

**Revision**
An immutable snapshot of a service's configuration and container image. Each deployment creates a new revision. You can split traffic between revisions for canary deployments.

**Instance**
A running container handling requests. Cloud Run automatically creates and destroys instances based on traffic. Multiple instances can run concurrently for high traffic.

### Networking & Access

**Service URL**
Each Cloud Run service gets a stable HTTPS URL: `https://<service-name>-<hash>-<region>.a.run.app`. This URL never changes across deployments.

**Ingress**
Controls who can access your service:
- **All** - public internet access
- **Internal** - only from same VPC
- **Internal and Cloud Load Balancing** - internal + via load balancer

**Authentication**
- **Allow unauthenticated** - public access (used in our script)
- **Require authentication** - requires IAM permissions or identity token

### Configuration

**Memory/CPU**
Resources allocated per instance. Our deployment uses 512Mi memory. Cloud Run supports up to 32GB memory and 8 vCPUs.

**Max Instances**
Limits concurrent instances to control costs and downstream load. Set to 1 in our script for development.

**Concurrency**
Number of simultaneous requests per instance (default: 80). Tune based on your app's threading model.

## Prerequisites

- Google Cloud CLI installed and configured (`gcloud auth login`)
- Docker running
- A GCP project selected (`gcloud config set project <PROJECT_ID>`)

## Setup

1. Authenticate with Google Cloud:
   ```bash
   gcloud auth login
   gcloud config set project <your-project-id>
   ```

2. Create Artifact Registry repository (one-time):
   ```bash
   gcloud artifacts repositories create quarkus-repo \
     --repository-format=docker \
     --location=europe-west1 \
     --description="Quarkus application images"
   ```

3. Configure Docker to use Artifact Registry:
   ```bash
   gcloud auth configure-docker europe-west1-docker.pkg.dev
   ```

## Deploy

```bash
./deploy-GCP.sh
```

Deploy to a different region:
```bash
REGION=us-central1 ./deploy-GCP.sh
```

## What the script does

1. Builds the Quarkus application (`./gradlew build`)
2. Builds Docker image using `src/main/docker/Dockerfile.jvm`
3. Tags and pushes image to Artifact Registry
4. Deploys to Cloud Run with:
   - Public access (unauthenticated)
   - Port 8080
   - 512Mi memory
   - Max 1 instance

## Access your application

The deployment script outputs the service URL. Or get it manually:

```bash
gcloud run services describe quarkus-cloud --format='value(status.url)'
```

## Useful commands

View logs:
```bash
gcloud run services logs read quarkus-cloud --region=europe-west1
```

List revisions:
```bash
gcloud run revisions list --service=quarkus-cloud --region=europe-west1
```

Update configuration:
```bash
gcloud run services update quarkus-cloud \
  --memory=1Gi \
  --max-instances=5 \
  --region=europe-west1
```

Delete service:
```bash
gcloud run services delete quarkus-cloud --region=europe-west1
```

## Resources created

- Artifact Registry image: `europe-west1-docker.pkg.dev/<project>/quarkus-repo/quarkus-cloud`
- Cloud Run service: `quarkus-cloud`

## Cost considerations

Cloud Run charges for:
- **CPU/Memory** - per 100ms of compute time
- **Requests** - per million requests
- **Networking** - egress traffic

With `--max-instances=1` and scale-to-zero, costs are minimal for development. Free tier includes 2 million requests/month.
