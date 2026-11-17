---
name: forge-performance-engineering
description: Measure-first performance engineering for web, backend and data layers. Covers baselines, Core Web Vitals and bundle size, backend latency percentiles, N+1 queries, EXPLAIN and indexes, caching, memory leaks, local load testing and scalability bottlenecks, with before/after numbers.
disable-slash-command: true
---


# Performance Engineering

**No number, no claim.** Every performance statement is a measurement taken with a stated method, or it is labelled a hypothesis. Optimize the measured bottleneck, not the suspected one.

## 1. Method (always)

1. **Define the target:** which user-facing or system metric (LCP, p95 latency of `GET /orders`, job duration, memory after N requests) and the budget or goal, from the spec or NFRs.
2. **Baseline:** measure before changing anything. Record the environment (machine, build mode, data volume, network or CPU throttling, warm or cold cache), the exact command or steps, and the number of runs.
3. **Profile** to find where the time or memory actually goes. Rank by contribution.
4. **Change one thing at a time** (or have the engineer do it), in order of expected gain against risk.
5. **Re-measure under identical conditions.** Report median and spread over at least 3 runs (more for noisy metrics); discard nothing silently.
6. **Guard against regression:** confirm functional tests still pass; suggest a budget or benchmark check if the project has a place for it.

Measure production builds, not dev mode (dev servers add instrumentation, skip minification and distort results). Use realistic data sizes; an empty local DB hides N+1 and missing-index problems.

## 2. Frontend

- **Core Web Vitals:** LCP (good ≤ 2.5 s), INP (good ≤ 200 ms), CLS (good ≤ 0.1). Lab traces approximate these; field data (RUM) is the truth if the project collects it.
- **Traces:** use the `forge-browser-qa` DevTools workflow: `performance_start_trace` → reload or interact → `performance_stop_trace` → `performance_analyze_insight`; `lighthouse_audit` when available. Use the same viewport, CPU and network throttling for before and after.
- **Bundle size:** use the project's build output or an existing analyzer (only if configured). Look for large dependencies, duplicate packages, missing code splitting on routes, unused polyfills, whole-library imports.
- **Loading:** LCP element prioritized (no lazy-loading it); images sized, modern formats, `width`/`height` set to avoid CLS; fonts with `font-display` and preloading where needed; render-blocking scripts deferred; caching headers on hashed assets.
- **Render work:** long tasks over 50 ms, unnecessary re-renders (unstable props, context churn, missing memoization where measured), layout thrashing (read-then-write loops), huge DOM or unvirtualized long lists, animation of layout properties instead of `transform`/`opacity`.
- **Network:** request waterfalls, duplicate or chatty calls, over-fetching, missing compression.

## 3. Backend latency

- Measure percentiles (p50, p95, p99), not averages. Separate cold start from steady state.
- Use the language's profiler if available (for example Node `--cpu-prof`, Python `cProfile`/`py-spy`, Go `pprof`, JVM async-profiler/JFR, .NET `dotnet-trace`) or the project's existing APM or timing logs.
- Common culprits: **N+1 queries** (a query inside a loop or lazy-loaded relations; fix with eager loading, batching or joins), synchronous I/O on hot paths, serial calls that could run concurrently, missing timeouts, large serialization payloads, chatty external APIs, exhausted connection pools (pool size versus concurrency, leaked connections), lock contention.
- **Caching:** cache only measured hot, expensive, stable data. Define the key, TTL, invalidation trigger and stampede protection. Never cache per-user data under a shared key.

## 4. Database

- Run `EXPLAIN` (`EXPLAIN ANALYZE` executes the query, so use it only on local or test databases) for slow queries. Look for sequential scans on large tables, row estimates far from actuals, sorts spilling to disk, nested loops over large sets.
- Indexes: match `WHERE`, `JOIN` and `ORDER BY` columns and order; composite index column order matters; every index costs writes. Index changes on large tables go through the database engineer with a migration and lock-risk note.
- Paginate with keyset/cursor for deep pages; select only needed columns; avoid functions on indexed columns in predicates.

## 5. Memory

- Symptoms: memory grows across identical requests or interactions and never returns to baseline after GC.
- Frontend: DevTools heap snapshots (`take_heapsnapshot` if available) before and after repeating an action N times; look for detached DOM nodes, listeners, intervals and subscriptions not cleaned up on unmount.
- Backend: heap snapshots or profiler allocation views; unbounded in-process caches or maps, global arrays, closures holding large objects, streams not consumed or closed.

## 6. Load testing (safety first)

- **Only against local or dedicated test environments.** Never load-test production, shared staging or third-party APIs without explicit user authorization.
- Use a tool only if the project already has it or it is installed (k6, autocannon, wrk, hey, Locust, JMeter, Gatling); otherwise mark it `UNAVAILABLE`.
- Ramp up gradually; record throughput, error rate and latency percentiles at each step; find the knee where latency or errors climb, and which resource saturates first (CPU, memory, DB connections, I/O, an external dependency).

## 7. Scalability review

Look for: in-memory state that breaks with multiple instances (sessions, caches, rate limits, locks), work done in the request path that belongs in a queue, unbounded fan-out, single-writer bottlenecks, missing pagination, per-request heavy initialization, cron jobs that don't scale with data growth.

## Anti-patterns

- "Should be faster" without numbers. Comparing a dev build to a prod build, a warm cache to a cold one, or runs on different machines.
- Micro-optimizing code that is not on the measured critical path.
- Adding caching or memoization everywhere "just in case".
- Trading correctness or security for speed.

## Output

For each finding: metric, method and environment, baseline value, bottleneck with `file:line` evidence, recommended fix with expected impact and risk, and owning engineer. For verified changes, a before/after table (metric, before, after, delta, runs). Unmeasured ideas go in a separate "hypotheses" list.
