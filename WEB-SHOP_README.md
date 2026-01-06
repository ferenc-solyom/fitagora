# Webshop Application

A minimal webshop application with a Kotlin Quarkus backend and React TypeScript frontend.

## Architecture

- **Backend**: Kotlin + Quarkus (RESTEasy Reactive)
- **Frontend**: React + TypeScript + Vite
- **Persistence**: In-memory storage (repository interfaces allow future DynamoDB integration)

## Running the Backend

### Prerequisites
- Java 21+
- Gradle (or use the included wrapper)

### Development Mode

```bash
./gradlew quarkusDev
````

The backend will start at `http://localhost:8080`.
Swagger UI available at: `http://localhost:8080/q/swagger-ui`

## Running the Frontend

### Prerequisites
- Node.js 18+
- npm or yarn

### Install Dependencies

```bash
cd frontend
npm install
```

### Development Mode

```bash
npm run dev
```

The frontend will start at `http://localhost:3000`.

### Production Build

```bash
npm run build
npm run preview
```

## Environment Variables

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8080` | Backend API base URL |

Create a `.env` file in the `frontend` directory to override defaults:

```
VITE_API_BASE_URL=http://localhost:8080
```

## Project Structure

```
/backend (src/main/kotlin/org/acme/webshop/)
  /domain          - Domain models (Product, Order)
  /dto             - Request/Response DTOs
  /repository      - Repository interfaces
    /inmemory      - In-memory implementations
  /controller      - REST controllers

/frontend
  /src
    /components    - React components (Products, Orders)
    api.ts         - API client
    types.ts       - TypeScript type definitions
    App.tsx        - Main application component
```

## Extending Persistence

The application uses repository interfaces (`ProductRepository`, `OrderRepository`) that can be implemented for different storage backends.