# CLAUDE.md — Project Instructions

## Scope
This repository contains:
- Backend: Quarkus (Kotlin)
- Frontend: React (TypeScript)
- Infrastructure: AWS ECS, AWS Lambda, and GCP

Claude must treat this as a **production system**. Favor correctness, maintainability, and explicit tradeoffs over convenience.

---

## General Behavior Rules
- Be direct and factual.
- Do not use politeness padding, motivational language, or emotional tone.
- Do not agree by default. Challenge incorrect assumptions.
- Point out design flaws, edge cases, and hidden costs.
- Prefer clarity over brevity, but avoid unnecessary explanation.
- If a request is underspecified or internally inconsistent, say so.

---

## Language, Stack & Clean Code Rules

### Backend
- Language: **Kotlin**
- Framework: **Quarkus**
- Java version: **17+**

#### Architecture & Layers
- Enforce **layered architecture**:
    - **Controller / Resource**: HTTP, validation, request/response mapping only.
    - **Service**: business logic, orchestration, transactions.
    - **Repository**: persistence and data access only.
- Do not bypass layers (e.g. controllers calling repositories directly).
- Keep framework- and transport-specific code at the edges.

#### Code Structure & Design
- Follow **Single Responsibility Principle** strictly.
- One primary reason to change per class.
- Avoid “god services” and generic `Utils` classes.
- Prefer composition over inheritance.
- Avoid cyclic dependencies between packages.
- Do not introduce abstractions without a clear benefit.

#### Methods
- Extract long methods aggressively.
- Methods should:
    - Do one thing.
    - Fit on one screen.
    - Have clear, intention-revealing names.
- Avoid deeply nested conditionals; refactor into smaller functions.

#### Kotlin-Specific Practices
- Prefer immutable data structures.
- Use `data class` for DTOs.
- Prefer expressions over statements where it improves clarity.
- Use sealed classes / enums for closed sets of states.
- Avoid nullable types unless absence is a valid state.
- Do not overuse scope functions (`let`, `run`, `apply`) if they reduce readability.
- Avoid reflection-heavy patterns unless required by Quarkus.
- Favor explicit configuration over magic defaults.

#### Error Handling
- Model domain errors explicitly.
- Do not use exceptions for normal control flow.
- Map domain errors to HTTP responses at the boundary layer only.

Do **not**:
- Introduce Spring abstractions or patterns.
- Use blocking I/O in reactive paths.
- Assume JVM tuning is unnecessary.

---

### Frontend
- Language: **TypeScript only**
- Framework: **React**

#### Architecture & Layers
- Separate concerns clearly:
    - **UI components**: rendering and user interaction only.
    - **State / hooks**: local or shared state management.
    - **Services / API clients**: remote calls and data fetching.
- Do not embed API calls or business logic directly in presentational components.
- Keep framework-specific code (React hooks, JSX) out of domain logic.

#### Code Structure & Design
- Use functional components only.
- Follow **Single Responsibility Principle** for components and hooks.
- Prefer small, composable components.
- Avoid “mega components” handling rendering, state, and data fetching together.
- Avoid generic `utils` dumping grounds; keep helpers domain-scoped.

#### Functions & Components
- Extract long components and hooks aggressively.
- Components and hooks should:
    - Do one thing.
    - Have clear, intention-revealing names.
    - Avoid deep nesting of conditional rendering.
- Prefer composition over prop-drilling or inheritance-like patterns.

#### TypeScript Practices
- Prefer explicit types at boundaries (API responses, props, state).
- Avoid `any`. If unavoidable, justify its use.
- Model domain states explicitly with unions and discriminated unions.
- Avoid overusing type assertions (`as`) to silence the compiler.

#### Error Handling
- Handle API and domain errors explicitly.
- Do not rely on implicit runtime failures.
- Map backend error contracts to explicit frontend states.

Do **not**:
- Write JavaScript examples.
- Mix class components with hooks.
- Assume browser-only execution if code may run in SSR or Lambda.

---

## API & Contracts
- APIs are contract-first.
- Assume frontend and backend evolve independently.
- Explicitly version APIs.
- Validate inputs at boundaries.
- Do not trust frontend input.

If an API design is ambiguous, propose a concrete schema instead of guessing.

---

## Cloud & Deployment Constraints

### AWS ECS
- Assume containerized Quarkus services.
- Optimize for cold start and memory footprint.
- Do not assume infinite horizontal scalability without cost analysis.

### AWS Lambda
- Assume Kotlin Lambda cold starts are expensive.
- Prefer native images where justified.
- Avoid heavy frameworks inside Lambdas unless explicitly requested.

### GCP
- Do not assume feature parity with AWS.
- Be explicit about which workloads run on GCP and why.

### Multi-Cloud Reality Check
- Treat AWS + GCP as a **deliberate complexity choice**, not a default.
- If a design increases operational burden, call it out.
- Do not suggest cross-cloud abstractions unless there is a clear benefit.

---

## Infrastructure as Code
- Prefer declarative IaC (Terraform, CDK, Pulumi).
- Avoid manual console steps.
- Make region, project, and account boundaries explicit.

---

## Security
- Assume zero trust between services.
- Never log secrets.
- Use least-privilege IAM.
- Call out missing authentication, authorization, or audit controls.

---

## Testing
- Backend: unit tests + integration tests.
- Frontend: component-level tests for non-trivial logic.
- Do not suggest snapshot tests as a primary strategy.
- If tests are missing, say so explicitly.

---

## Documentation Expectations
- Code must explain *why*, not *what*.
- Avoid restating obvious framework behavior.
- If documentation is outdated or misleading, point it out.

---

## What Claude Should Push Back On
- Mixing Java and Kotlin unnecessarily.
- Using JavaScript instead of TypeScript.
- Over-engineered abstractions.
- Ignoring cloud costs or operational complexity.
- Treating Quarkus like Spring.
- Treating Lambda like a container.

---

## Output Expectations
- Provide concrete code or configuration when possible.
- Prefer examples that compile.
- If unsure, state uncertainty explicitly.
- Do not hedge with vague language.

End of instructions.
