# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Quarkus REST application written in Kotlin. Uses Gradle for build management.

## Build Commands

```bash
# Run in dev mode with live reload
./gradlew quarkusDev

# Build the application
./gradlew build

# Run tests
./gradlew test

# Run a single test class
./gradlew test --tests "org.acme.GreetingResourceTest"

# Run a single test method
./gradlew test --tests "org.acme.GreetingResourceTest.testHelloEndpoint"

# Build über-jar
./gradlew build -Dquarkus.package.jar.type=uber-jar

# Build native executable (requires GraalVM)
./gradlew build -Dquarkus.native.enabled=true
```

## Tech Stack

- **Kotlin** with JVM target 21
- **Quarkus 3.26.3** - REST framework
- **Quarkus REST** (quarkus-rest) - JAX-RS implementation
- **SmallRye OpenAPI + Swagger UI** - API documentation available at `/q/swagger-ui` in dev mode
- **REST Assured** - Integration testing
- **JUnit 5** - Test framework with `@QuarkusTest` annotation

## Dev Mode URLs

- Application: http://localhost:8080
- Dev UI: http://localhost:8080/q/dev/
- Swagger UI: http://localhost:8080/q/swagger-ui/

## Code Structure

- `src/main/kotlin/org/acme/` - Kotlin source code
- `src/test/kotlin/org/acme/` - Unit/integration tests with `@QuarkusTest`
- `src/native-test/kotlin/org/acme/` - Native image integration tests (`@QuarkusIntegrationTest`)
- `src/main/resources/META-INF/resources/` - Static web resources served at root
