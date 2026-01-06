# FitAgora

A second-hand fitness equipment marketplace built with Kotlin/Quarkus and React/TypeScript.

## Tech Stack

**Backend:** Kotlin, Quarkus 3.26, RESTEasy Reactive, Jackson
**Frontend:** React 18, TypeScript, Vite

## Running Locally

**Backend:**
```bash
./gradlew quarkusDev
```
Runs at http://localhost:8080 (Swagger UI at `/q/swagger-ui`)

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Runs at http://localhost:3000

## Quarkus

This project uses Quarkus, the Supersonic Subatomic Java Framework.

If you want to learn more about Quarkus, please visit its website: <https://quarkus.io/>.

## Running the application in dev mode

You can run your application in dev mode that enables live coding using:

```shell script
./gradlew quarkusDev
```

> **_NOTE:_**  Quarkus now ships with a Dev UI, which is available in dev mode only at <http://localhost:8080/q/dev/>.

## Packaging and running the application

The application can be packaged using:

```shell script
./gradlew build
```

It produces the `quarkus-run.jar` file in the `build/quarkus-app/` directory.
Be aware that it’s not an _über-jar_ as the dependencies are copied into the `build/quarkus-app/lib/` directory.

The application is now runnable using `java -jar build/quarkus-app/quarkus-run.jar`.

If you want to build an _über-jar_, execute the following command:

```shell script
./gradlew build -Dquarkus.package.jar.type=uber-jar
```

The application, packaged as an _über-jar_, is now runnable using `java -jar build/*-runner.jar`.

## Creating a native executable

You can create a native executable using:

```shell script
./gradlew build -Dquarkus.native.enabled=true
```

Or, if you don't have GraalVM installed, you can run the native executable build in a container using:

```shell script
./gradlew build -Dquarkus.native.enabled=true -Dquarkus.native.container-build=true
```

You can then execute your native executable with: `./build/code-with-quarkus-1.0.0-SNAPSHOT-runner`

If you want to learn more about building native executables, please consult <https://quarkus.io/guides/gradle-tooling>.

## Cloud Deployment

This application can be deployed to:

### AWS (ECS Fargate)

Deploy to AWS ECS with Application Load Balancer for a stable endpoint.

```bash
npm install
npx tsx deploy-AWS-ECS.ts
```

See [AWS-ECS_README.md](AWS-ECS_README.md) for detailed setup, AWS terminology, and configuration.

### AWS (Lambda)

Deploy to AWS Lambda for serverless, pay-per-request pricing.

```bash
npm install
npx tsx deploy-AWS-Lambda.ts
```

See [AWS-LAMBDA_README.md](AWS-LAMBDA_README.md) for detailed setup and configuration.

### GCP (Cloud Run)

Deploy to Google Cloud Run for fully managed serverless containers.

```bash
./deploy-GCP.sh
```

See [GCP_README.md](GCP_README.md) for detailed setup, GCP terminology, and configuration.
