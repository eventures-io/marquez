# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Marquez is an open source metadata service for data lineage collection, aggregation, and visualization. It maintains provenance of datasets and jobs, implementing the OpenLineage specification for metadata collection.

## Architecture

The project uses a multi-module structure:

- **`api/`**: Java-based backend API using Dropwizard framework, PostgreSQL database, JDBI for data access
- **`web/`**: React/TypeScript frontend with Redux for state management, Material-UI components, XYFlow for lineage graphs
- **`clients/`**: Java and Python client libraries
- **`chart/`**: Helm charts for Kubernetes deployment

### Key Backend Components

- **Services**: Core business logic in `api/src/main/java/marquez/service/`
- **DAOs**: Database access objects in `api/src/main/java/marquez/db/`
- **API Resources**: REST endpoints in `api/src/main/java/marquez/api/`
- **Models**: Data models in `api/src/main/java/marquez/service/models/`

### Key Frontend Components

- **Routes**: Main application pages in `web/src/routes/`
- **Components**: Reusable UI components in `web/src/components/`
- **Store**: Redux state management in `web/src/store/`
- **Graph Library**: Custom lineage visualization in `web/libs/graph/`

## Development Commands

### Backend (Java)

```bash
# Build entire project
./gradlew build

# Run API server locally
./gradlew :api:runShadow

# Run all tests
./gradlew test

# Run specific test categories
./gradlew :api:testUnit         # unit tests only
./gradlew :api:testIntegration  # integration tests only
./gradlew :api:testDataAccess   # data access tests only

# Run specific test class
./gradlew :api:test --tests marquez.api.OpenLineageResourceTest

# Format code (required before commits)
./gradlew spotlessApply

# PMD code analysis
./gradlew pmdMain
```

### Frontend (TypeScript/React)

```bash
cd web

# Development server
npm run dev

# Build production bundle
npm run build

# Run tests
npm test

# Lint and fix code
npm run eslint-fix
```

### Docker Development

```bash
# Start all services (API + Web + PostgreSQL)
./docker/up.sh

# Start with sample data
./docker/up.sh --seed

# Build from source
./docker/up.sh --build

# Custom API port (useful on macOS where port 5000 is reserved)
./docker/up.sh --api-port 9000
```

## Database

- Uses PostgreSQL with Flyway for migrations
- Database migrations in `api/src/main/resources/marquez/db/migration/`
- Test database setup uses Testcontainers

## Testing

- Backend tests use JUnit 5 with custom tags for test categories
- Frontend tests use Jest and React Testing Library
- Integration tests require PostgreSQL (handled by Testcontainers)

## Code Quality

- Java code formatted with Google Java Style (enforced by Spotless)
- PMD for Java static analysis
- ESLint for TypeScript/JavaScript
- No wildcard imports allowed in Java code

## Key APIs

- **OpenLineage**: `/api/v1/lineage` - accepts OpenLineage events
- **REST API**: Standard CRUD operations for namespaces, sources, datasets, jobs, runs
- **GraphQL**: Beta endpoint at `/api/v1-beta/graphql`
- **Search**: Full-text search across metadata

## Local Development Ports

- API Server: 8080 (or 5000 in Docker)
- Admin Interface: 8081 (or 5001 in Docker)
- Web UI: 3000
- PostgreSQL: 5432

## Development Constraints

**IMPORTANT**: When working on this codebase, only modify files in the `web/src/routes/dataset-lineage*` directories. Do not modify or create files in other directories unless explicitly requested.

## Development Notes

- Don't ask to run the server. Consider it to be already running.