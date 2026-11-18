---
name: forge-backend-engineering
description: Server-side code in any stack (validation, authz, errors, idempotency, transactions, jobs, tests).
user-invocable: false
---

# Backend Engineering

Write the code the existing team would have written. Discover the stack, commands and conventions from `.forge/context.json` and the nearest existing code before adding anything. This file holds the stack-independent rules. Stack idioms live in `references/`.

## Stack references (read the one that matches `.forge/context.json`)

| Read when the stack is | Reference |
|---|---|
| Node.js / TypeScript (Express, NestJS, Fastify, Hono) | [references/node.md](references/node.md) |
| Python (FastAPI, Django, Flask) | [references/python.md](references/python.md) |
| Java / Kotlin on the JVM (Spring Boot) | [references/java-spring.md](references/java-spring.md) |
| Go (std lib, chi, gin, echo) | [references/go.md](references/go.md) |
| PHP (Laravel, Symfony) | [references/php-laravel.md](references/php-laravel.md) |
| .NET (ASP.NET Core, EF Core) | [references/dotnet.md](references/dotnet.md) |
| Ruby (Rails) | [references/ruby-rails.md](references/ruby-rails.md) |
| Rust (axum, actix-web) | [references/rust.md](references/rust.md) |

For schema and migration work, the `forge-database-engineering` skill applies. For third-party APIs, webhooks and payments, `forge-api-integration` applies.

## Layering

- **Transport** (routes, controllers, handlers, consumers): parse, validate, authenticate, map to a service call, map the result or error to the wire format. No business rules, no queries.
- **Service / application**: orchestrates a use case, owns the transaction boundary, enforces authorization on the resource.
- **Domain**: business rules and invariants, free of framework and I/O where the codebase already separates them.
- **Data access** (repositories, ORM models, clients): queries and persistence only.
- Follow the layering the project actually uses. Do not introduce new layers, DI containers or patterns into a codebase that does not have them.

## Boundary rules (checklist for every endpoint, job and consumer)

- [ ] **Validate input** at the boundary with the project's validation library: types, required fields, lengths, ranges, enums, formats. Reject unknown fields where the convention does. Never trust client-supplied IDs, prices, roles or ownership.
- [ ] **Authenticate**, then **authorize on the specific resource** (owner or tenant check), on every path, including list, export, bulk and background endpoints. Missing object-level checks (IDOR) are the most common backend defect.
- [ ] **Errors** use the existing error model: same envelope, same status-code mapping, stable machine-readable codes. Never leak stack traces, SQL or internal hostnames. 4xx for caller mistakes, 5xx for ours.
- [ ] **Idempotency**: any write that may be retried (client retries, queue redelivery, webhooks) is safe to repeat. Use idempotency keys, natural unique constraints or upserts.
- [ ] **Transactions** wrap multi-write invariants. Keep them short. No network calls to third parties inside a DB transaction; use an outbox or a post-commit hook.
- [ ] **Concurrency**: guard read-modify-write with optimistic versioning, `SELECT ... FOR UPDATE`, atomic updates or unique constraints. Assume two requests arrive at once.
- [ ] **Pagination** on every list endpoint, with a server-enforced maximum page size. Prefer cursor pagination for large or changing sets.
- [ ] **Timeouts** on every outbound call (DB, HTTP, cache). No unbounded waits.

## Configuration, secrets and logging

- Configuration and secrets come from environment variables or the project's config system. Never hardcode secrets, URLs or credentials. Add new variable **names** to `.env.example` or the config schema if the project has one.
- Fail fast at startup on missing required config.
- Log with the project's structured logger. Include a request or correlation ID and propagate it to downstream calls and jobs.
- Never log secrets, tokens, passwords, full card data or unnecessary PII. Log identifiers, not payloads.
- Log at the boundary once per error. Do not log-and-rethrow at every layer.

## API evolution

- Keep contracts backward compatible: add optional fields, never rename or remove fields, never tighten validation on existing inputs, never change a field's type or meaning silently.
- Breaking change needed? It must be in the plan: new version or new endpoint, deprecation note, migration path.
- Update the contract source (OpenAPI, GraphQL schema, proto, shared types) in the same change.

## Background jobs

- Jobs are idempotent and retry-safe, with bounded retries, backoff and a dead-letter path where the queue supports it.
- Pass IDs, not full objects. Re-read state inside the job and re-check authorization or preconditions.
- Long jobs checkpoint progress. Scheduled jobs tolerate overlap or take a lock.

## Testing pyramid for services

1. **Unit**: domain rules and service logic with fakes for I/O. Fast, many.
2. **Integration**: handler to database through the real framework stack, using the project's test DB setup (containers, SQLite or a test schema), never a shared or remote DB.
3. **Contract / API**: status codes, error shapes, auth rejections (401/403), validation failures (400/422), pagination edges.
4. Every bug fix gets a regression test that failed before the fix.
- Cover: happy path, each validation failure class, unauthorized and forbidden access, not found, conflict or duplicate, retry of the same request.

## Procedure

1. Read the feature path end to end: route → handler → service → data → schema. Read the nearest tests.
2. Open the matching stack reference above.
3. Run the baseline: affected tests, typecheck, lint, using commands from `.forge/context.json`.
4. Implement in small steps, reusing existing helpers, error types, validators and logging.
5. Add tests at the existing levels. Run tests, typecheck/compile and lint for the affected unit.
6. Re-read the diff against the boundary checklist above.

## Anti-patterns

- Business logic in controllers or ORM hooks; queries in handlers.
- Authorization only in the UI, or only on the "main" endpoint and not on list/export variants.
- Catch-all handlers that swallow errors or return 200 with an error body.
- Network calls inside DB transactions; non-idempotent retries.
- N+1 queries in list endpoints; unbounded `SELECT *` without pagination.
- New dependency for something the standard library or an existing dependency already does.
- Mass assignment from the request body into models.
- Silent behavior changes to existing endpoints.

## Output

Report: endpoints or contracts touched (method, path, request and response shape), behavior changes callers may notice, new config variable names, tests added, and the commands run with their status.
