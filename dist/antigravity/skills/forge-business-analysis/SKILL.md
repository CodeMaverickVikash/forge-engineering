---
name: forge-business-analysis
description: Business analysis grounded in code. Extracts business rules, maps workflows and state machines, finds edge cases (money, time zones, concurrency, idempotency, permissions, partial failure) and data dependencies. Use for features, stateful flows and M/L bugs.
disable-slash-command: true
---


# Business Analysis

The code is the most accurate description of the business rules that actually run. Extract them, make them explicit, and find where the requested change collides with them.

## 1. Extract business rules from code

Search for the domain nouns and verbs in the request, then read where decisions happen:
- Validation schemas, guards and policies (who may do what, which values are allowed).
- Conditionals on status, role, plan, region, dates or amounts in services and handlers.
- Database constraints: unique keys, foreign keys, checks, defaults, enums, triggers.
- Config and feature flags that change behavior.
- Tests: their names and fixtures often state the rule better than the code.

Record each rule as: `BR<n>: <rule in plain words> — source: path:line — enforced at: UI | API | DB | none`. A rule enforced only in the UI is a finding.

## 2. Map workflows and state machines

- List the states of each entity involved (from enums, status columns, or string literals).
- For each transition: trigger, actor, preconditions, side effects (emails, events, payments, audit), and where it is implemented.
- Draw it as a compact table or a text diagram:
  ```
  draft --submit(owner)--> pending --approve(admin)--> active
  pending --reject(admin)--> draft     active --cancel(owner)--> cancelled
  ```
- Flag: transitions with no guard, states with no exit, side effects outside a transaction, and transitions the request adds or changes.

## 3. Edge case discovery heuristics

Apply only the families the feature actually touches:

| Area | Ask |
|---|---|
| Money | Integer minor units or decimals, never floats? Rounding rule and currency? Refunds, partial refunds, negative totals, zero amounts? |
| Time | Stored in UTC? Displayed in whose time zone? DST transitions, end of month, leap days, expiry exactly at the boundary? |
| Concurrency | Two users or two tabs editing the same record? Double submit? Check-then-act races? Optimistic locking present? |
| Idempotency | Can a retry, webhook redelivery or job re-run duplicate the effect? Is there an idempotency key or unique constraint? |
| Permissions | Owner vs admin vs other tenant? Access via direct URL or ID guessing? Role changed mid-session? |
| Partial failure | Step 2 of 3 fails: what is rolled back, what is left, what is retried, what does the user see? |
| Data shape | Empty, null, very long, Unicode, duplicates, deleted or archived references, very large collections? |
| Lifecycle | Behavior for existing records created before the change? Migration or backfill needed? |

Each discovered edge case gets the expected behavior, the evidence for it, or a note that it is an open question.

## 4. Data and process dependencies

- Upstream: which data, services, jobs or third parties this feature reads from.
- Downstream: which reports, exports, emails, webhooks, caches, search indexes or analytics consume what it writes.
- Ordering: jobs or steps that must happen in sequence; scheduled tasks that assume the old behavior.
- Mark each dependency as affected or unaffected by the change, with evidence.

## 5. Functional spec

Hand the orchestrator material that fits directly into the task specification:
- Business rules (existing and new or changed), each with source.
- Workflow or state table, before and after.
- Edge cases with expected behavior.
- Data and process dependencies.
- Open questions that meet the clarification policy, with a recommended default for each.

## Anti-patterns

- Restating the request as rules without reading the code.
- Assuming a rule from the domain ("refunds are always allowed within 30 days") instead of finding it.
- Listing every edge case family regardless of relevance.
- Proposing new business rules; you surface and clarify them, the user decides.

## Output

Return the functional spec above: rules with `path:line`, the state or workflow table, relevant edge cases with expected behavior, dependency list, and open questions with defaults.
