---
name: forge-deployment-readiness
description: Production-readiness review for a service or release. Covers config and secrets, health checks, observability, resilience, scalability, security posture, backups and migrations, CI gates, release strategy, rollback, SLOs, runbooks and cost, ending in an evidence-based readiness scorecard.
disable-slash-command: true
---


# Deployment Readiness

Answer: **can this ship to production safely, and can we recover if it goes wrong?** Every item is judged from evidence in the repo (file paths, config, command output), not from intent. This is a review; it never deploys, publishes or changes environments.

## 1. Scope

1. Identify the deployable units, their runtime platform, and how they are deployed today (`.forge/context.json`: Dockerfiles, CI workflows, IaC, platform config).
2. Identify what this release changes: code, schema, config, dependencies, infrastructure, external integrations.
3. Note the risk profile: user-facing, money, PII, data migrations, traffic level, new dependencies.

## 2. Checklist

Mark each item **met**, **partial**, **missing** or **N/A**, with evidence.

**Config and secrets**
- All config from the environment or a secret manager; nothing environment-specific hardcoded.
- Required variables validated at startup with clear errors; new variable **names** documented (`.env.example`, deploy docs).
- No secrets in the repo, images, logs or client bundles; production debug flags off.

**Health checks**
- Liveness and readiness endpoints (or platform equivalents) exist and are wired into the deploy config; readiness reflects critical dependencies, liveness does not.

**Observability**
- Structured logs with level, timestamp, request or correlation ID; no secrets or unnecessary PII.
- Metrics for the golden signals (latency, traffic, errors, saturation) on the new paths.
- Tracing propagated across service calls, where the project has it.
- Alerts on symptoms users feel (error rate, latency, failed jobs, queue depth), routed to an owner.
- Error tracking (e.g. Sentry or the project's equivalent) captures unhandled errors with release tags.

**Resilience**
- Timeouts on every outbound call (HTTP, DB, queues); retries only for idempotent operations, with backoff and jitter and a cap.
- Circuit breaking or graceful degradation for non-critical dependencies.
- Graceful shutdown: handle SIGTERM, stop accepting work, drain in-flight requests and jobs.
- Idempotency for webhooks, payments and job handlers; dead-letter handling for failed messages.

**Scalability and capacity**
- Stateless instances (no in-memory sessions, locks or caches that must be shared); connection pool sizes fit DB limits times instance count.
- Resource requests and limits or instance sizing defined; autoscaling signals sensible; expected load estimated.

**Security posture**
- Findings from `forge-security-engineering` resolved or accepted; dependency audit status known.
- HTTPS enforced, security headers, CORS restricted, rate limits on public and auth endpoints, least-privilege service credentials.

**Data**
- Backups exist and restore has been tested (or flagged as untested); retention defined.
- Migrations: backward compatible with the currently running version (expand, then contract), reversible or with a written rollback note, lock and duration risk assessed for large tables, backfills batched.
- Data deletion or PII changes reviewed for compliance obligations.

**CI gates**
- Lint, typecheck, tests and build required on the main branch; the release artifact is built once and promoted; dependency and secret scanning if configured.

**Release strategy**
- Feature flags for risky behavior, defaulting off; staged rollout (canary, percentage or ring) when the platform supports it; release notes prepared.
- Compatibility across the rollout window: old and new versions, clients and API consumers, queue message formats.

**Rollback**
- A documented, tested way to return to the previous version (redeploy the previous artifact, flip a flag), with time to roll back estimated.
- Explicit plan for irreversible steps (data migrations, external side effects): what can and cannot be undone.

**SLOs and operations**
- SLIs and SLO targets defined for the affected user journeys, or flagged as missing; error budget policy if it exists.
- Runbooks for new alerts and failure modes; an owner and an escalation path.

**Cost awareness**
- New or resized infrastructure, managed services, third-party API usage, log and metric volume, egress; flag anything that changes the bill.

## 3. Verdict

| Verdict | Rule |
|---|---|
| **ready** | No missing items in config/secrets, health, rollback, data, security; minor partials only |
| **ready-with-risks** | Shippable with named, accepted risks and mitigations (e.g. no canary, alerts pending) |
| **not-ready** | Any blocker: no rollback path, irreversible migration without a plan, open critical/high security finding, missing secrets handling, failing required CI gate, no health checks where the platform needs them |

Never mark an item met because it "should be" there. Unverified means partial at best.

## Output

```
READINESS SCORECARD — <service / release>
Verdict: ready | ready-with-risks | not-ready
| Area | Status | Evidence (file:line / command) | Gap and fix | Owner |
Blockers: <list or none>
Accepted risks: <list with mitigation>
Rollout plan: <steps, flags, canary, monitoring to watch>
Rollback plan: <trigger, steps, time estimate, irreversible parts>
```
