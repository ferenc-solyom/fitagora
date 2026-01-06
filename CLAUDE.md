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

## Language & Stack Rules

### Backend
- Language: **Kotlin**
- Framework: **Quarkus**
- Java version: **17+**
- Prefer immutable data structures.
- Use `data class` for DTOs.
- Avoid reflection-heavy patterns unless required by Quarkus.
- Favor explicit configuration over magic defaults.

Do **not**:
- Introduce Spring abstractions or patterns.
- Use blocking I/O in reactive paths.
- Assume JVM tuning is unnecessary.

### Frontend
- Language: **TypeScript only**
- Framework: **React**
- Use functional components.
- Prefer explicit types over inference at boundaries (API, state, props).
- Avoid `any`. If unavoidable, justify its use.

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
