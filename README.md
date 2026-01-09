# FitAgora

A second-hand fitness equipment marketplace built with Kotlin/Quarkus and React/TypeScript. Features user authentication, product listings, and order management with multi-cloud deployment support.

## Features

- User registration and authentication (JWT-based)
- Browse fitness equipment listings (public)
- List your own equipment for sale (requires login)
- Place orders (guest or authenticated)
- Manage your products and order history

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Kotlin, Quarkus 3.26, RESTEasy Reactive, SmallRye JWT |
| Frontend | React 18, TypeScript, Vite |
| Storage | In-memory (dev), DynamoDB (Lambda) |
| Auth | JWT with bcrypt password hashing |

## Prerequisites

- Java 21+
- Node.js 18+
- npm

## Quick Start

### Backend

```bash
./gradlew :backend:quarkusDev
```

- API: http://localhost:8080
- Swagger UI: http://localhost:8080/q/swagger-ui

### Frontend

```bash
cd frontend
npm install
npm run dev
```

- App: http://localhost:3000

## Environment Variables

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8080` | Backend API URL |

## Cloud Deployment

The application supports multiple deployment targets:

### AWS Lambda (Serverless)

Serverless deployment with DynamoDB storage and API Gateway.

```bash
cd deploy/AWS
npm install
npx tsx deploy-AWS-Lambda.ts
```

See [AWS-LAMBDA_README.md](deploy/AWS/AWS-LAMBDA_README.md) for details.

### AWS ECS (Container)

Containerized deployment with Application Load Balancer.

```bash
cd deploy/AWS
npm install
npx tsx deploy-AWS-ECS.ts
```

See [AWS-ECS_README.md](deploy/AWS/AWS-ECS_README.md) for details.

### GCP Cloud Run (Container)

Fully managed serverless containers on Google Cloud.

```bash
cd deploy/GCP
./deploy-GCP.sh
```

See [GCP_README.md](deploy/GCP/GCP_README.md) for details.

### AWS Amplify (Frontend)

To deploy the frontend on AWS Amplify:

1. Connect your repository to Amplify
2. Set the **App settings > Build settings** with the following `amplify.yml`:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: frontend/dist
    files:
      - '**/*'
  cache:
    paths:
      - frontend/node_modules/**/*
```

3. Add environment variable in **App settings > Environment variables**:
   - `VITE_API_BASE_URL`: Your backend API URL (e.g., `https://your-api.execute-api.eu-central-1.amazonaws.com`)

## Security

- Passwords hashed with bcrypt (cost factor 12)
- JWT tokens valid for 24 hours
- CORS configured for specific origins
- Input validation on all endpoints

### JWT Keys

The application requires RSA key pair for JWT token signing. **Deployment scripts automatically generate keys** if they don't exist.

To generate manually (for local development):

```bash
cd backend/src/main/resources
openssl genrsa -out privateKey.pem 2048
openssl rsa -in privateKey.pem -pubout -out publicKey.pem
```

The private key is excluded from version control via `.gitignore`.

## Author

**Ferenc Solyom**
- LinkedIn: [ferenc-solyom](https://www.linkedin.com/in/ferenc-solyom/)
- Email: ferenc.solyom1@gmail.com

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

```
Copyright 2026 Ferenc Solyom

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
