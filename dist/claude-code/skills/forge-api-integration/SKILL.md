---
name: forge-api-integration
description: API contract design and third-party integration for REST, GraphQL, gRPC and WebSockets, covering versioning, errors, pagination, rate limits, resilient clients, webhooks, OAuth/OIDC and payments. Use when defining or changing an API, or integrating an external service.
user-invocable: false
---

# API Design and Integration

Contracts are promises to callers you cannot see. Change them deliberately, validate them mechanically, and treat every external service as slow, flaky and occasionally malicious. Discover the API style, contract files (OpenAPI, GraphQL schema, `.proto`), client libraries and SDKs from `.forge/context.json` before changing anything.

## Contract design

- **Contract first.** Update the source of truth (OpenAPI spec, GraphQL SDL, proto, shared types) in the same change as the code, and freeze it in the plan before frontend and backend work start in parallel.
- **REST**: nouns for resources, HTTP methods with correct semantics (GET safe, PUT/DELETE idempotent, POST not), correct status codes (201 + `Location` on create, 204 for empty, 400/422 validation, 401 unauthenticated, 403 forbidden, 404, 409 conflict, 429 rate limited). Consistent casing and date format (ISO 8601 UTC).
- **GraphQL**: nullable-by-default awareness, input types for mutations, errors in a consistent shape (or typed result unions if the schema uses them), query depth or complexity limits, DataLoader-style batching to avoid N+1 in resolvers, field-level authorization.
- **gRPC**: never reuse or renumber field tags; `reserved` removed fields and names; use deadlines on every call; map errors to canonical status codes.
- **WebSockets / realtime**: authenticate on connect and authorize per channel or message; versioned message envelope (`type`, `id`, `payload`); heartbeats and reconnect with backoff; resume or resync after reconnect; bounded message size and rate.
- **Errors**: one envelope across the API (RFC 9457 Problem Details or the existing shape) with a stable machine-readable `code`, human message, and field-level details for validation. No stack traces.
- **Pagination**: cursor-based for large or changing collections; server-enforced max page size; stable sort order; return the next cursor explicitly.
- **Rate limits**: per client or key; respond 429 with `Retry-After`; document limits.

## Versioning and compatibility

- Additive changes only on an existing version: new optional fields, new endpoints, new enum values only if clients tolerate unknown values.
- Breaking changes (removing or renaming fields, changing types, tightening validation, changing defaults or status codes) need a new version or endpoint, a deprecation period, and a plan entry. Follow the project's versioning style (URL, header, or schema evolution).
- Validate compatibility mechanically when tooling is configured (OpenAPI diff, GraphQL schema checks, `buf breaking` for proto).

## Calling third-party services (client checklist)

- [ ] Use the provider's official SDK if the project already uses it; otherwise the existing HTTP client wrapper. No new dependency without authorization.
- [ ] Credentials from env or the secrets manager; never in code, logs, URLs or error messages.
- [ ] **Timeouts** on connect and read for every call.
- [ ] **Retries** only for idempotent requests or requests carrying an idempotency key, only on transient failures (network errors, 429, 502/503/504), with **exponential backoff plus jitter**, a max attempt count, and honoring `Retry-After`.
- [ ] **Idempotency keys** on create-style calls the provider supports (payments, orders); derive the key from the business operation so retries reuse it.
- [ ] **Circuit breaking / bulkheads** for high-volume dependencies (use the library already present); fail fast and degrade gracefully when the provider is down.
- [ ] Validate and map responses at the boundary into internal types; do not leak provider shapes through the codebase.
- [ ] Log request IDs from the provider and our correlation ID; never log full payloads containing PII or secrets.
- [ ] Tests use the provider's sandbox or recorded/mocked responses. Never call production endpoints from tests.

## Webhooks (receiving)

1. **Verify the signature** with the provider's documented scheme on the **raw request body** (before JSON parsing), using a constant-time comparison and the secret from config.
2. **Replay protection**: reject stale timestamps where the provider signs them; deduplicate by event ID in durable storage (unique constraint).
3. **Idempotent handler**: processing the same event twice yields the same state. Events can arrive out of order; check current state before transitions.
4. **Respond fast** (2xx) after persisting the event; do heavy work asynchronously in a job.
5. Fetch the authoritative object from the provider API when the event payload may be stale or when acting on money.
- Sending webhooks: sign payloads, include event ID and timestamp, retry with backoff, allow consumers to replay.

## OAuth 2.0 / OIDC

- Authorization Code flow with **PKCE** for browser and mobile clients; never the implicit flow for new work. Client credentials for service-to-service.
- Validate `state` (CSRF) and `nonce` (OIDC); exact-match redirect URIs.
- Validate ID tokens: signature via JWKS, `iss`, `aud`, `exp`, `nbf`. Use a maintained library; do not hand-roll JWT validation.
- Store tokens server-side or in `HttpOnly`, `Secure`, `SameSite` cookies; never in `localStorage` for sensitive apps. Request minimal scopes. Handle refresh-token rotation and revocation.

## Payments (Stripe, Razorpay, PayPal and similar)

- **Test mode / sandbox keys only.** Never execute a real transaction. Any live-key usage requires explicit user authorization.
- **Amounts and currency are computed server-side** from trusted data (catalog, cart in DB). Never trust a client-sent price.
- **Webhook-driven state**: mark orders paid only after a verified webhook (or a server-side verification call to the provider), not on a client redirect.
- Use idempotency keys on payment creation; persist provider IDs and reconcile.
- **Minimize PCI scope**: use the provider's hosted checkout, elements or SDK so raw card data never touches our servers. Never log, store or echo card numbers, CVC or full bank details.
- Model payment status as an explicit state machine (pending, succeeded, failed, refunded, disputed) and handle every transition including partial refunds and retries.
- Involve `forge-security-engineering` review for any payment or auth change.

## Contract tests and validation

- Request and response validation against the schema in tests (OpenAPI validators, GraphQL schema tests, generated proto clients).
- Consumer-driven contract tests (e.g. Pact) where the project uses them.
- For each endpoint changed: tests for success, each validation error, 401, 403, 404, 409 and pagination edges, plus the exact error shape.
- For each integration: tests for timeout, retryable failure, non-retryable failure, malformed response, and duplicate webhook delivery.

## Anti-patterns

- Returning 200 with an error body; inconsistent error shapes between endpoints.
- Retrying non-idempotent POSTs without an idempotency key; retrying without backoff (thundering herd).
- No timeout on outbound calls; synchronous third-party calls inside DB transactions.
- Trusting webhook payloads without signature verification, or parsing JSON before verifying.
- Fulfilling orders from the client-side success redirect.
- Provider SDK types spread through domain code.

## Output

Report: contract changes (method, path or operation, request and response shape, status codes, error codes), compatibility assessment (additive or breaking, and why), external services touched and in which mode (sandbox, mocked), resilience settings (timeouts, retries, idempotency), webhook verification details, new env variable names, and the tests and commands run.
