---
name: forge-requirements-engineering
description: Testable acceptance criteria, measurable NFRs, traceability and scope control.
disable-slash-command: true
---


# Requirements Engineering

A requirement is useful only if someone can build it without guessing and someone else can verify it without arguing. Ground every requirement in the user's words or in code evidence (`file:line`); everything else is an assumption.

## Acceptance criteria

Write each AC as `Given <state>, when <action>, then <observable result>`.

Checklist per AC:
- [ ] One behavior. Split on "and" when the two halves can fail independently.
- [ ] Observable from outside: UI text, URL, HTTP status and body, stored record, emitted event, log line.
- [ ] Concrete values: "returns 422 with `field: email`", not "shows an error".
- [ ] Includes the unhappy paths that are reachable: invalid input, unauthorized, not found, conflict, upstream failure.
- [ ] Does not prescribe implementation unless a constraint requires it (cite it).
- [ ] Has a planned verification: test level and test name or manual/browser step.

## NFR catalogue

Include an NFR only when the change touches that quality. Give a target only when a baseline, SLO, standard or user statement backs it; otherwise write "no regression vs baseline, measured by X".

| Category | Example measurable target | Typical evidence |
|---|---|---|
| Performance | p95 latency of `GET /orders` no worse than baseline +10% | Same benchmark before and after |
| Scalability | Handles the largest existing dataset in fixtures or docs | Load script, query plan |
| Availability / resilience | Upstream timeout surfaces a retryable error within N s | Fault-injection test |
| Security | Every touched endpoint enforces the existing auth guard | Integration test, review |
| Privacy | No PII in logs or client bundles for the new fields | Log inspection, grep |
| Accessibility | WCAG 2.2 AA for new UI: labels, focus order, contrast | Axe or Lighthouse run, keyboard pass |
| Compatibility | Existing API clients unaffected; supported browsers per project config | Contract test, browserslist |
| Observability | New failure path logs with the existing logger and correlation id | Log assertion |
| Maintainability | Follows existing module boundaries; no new dependency | Review |

## Traceability

Maintain a table in the spec or test plan: `AC → test level → test name or procedure → status`. Every AC has at least one row. Every new test maps to an AC or a regression risk. An AC with no verification path is rewritten or flagged as untestable with a reason.

## Scope control

- Restate scope as **In / Out / Must not change** before planning.
- New ideas found during analysis go to "Recommendations", not into the requirements, unless they are needed to meet an AC.
- Scope changes after the spec is written are reported to the orchestrator with the reason; specialists never edit the spec.
- Prefer the smallest slice that delivers the stated outcome end to end.

## User stories (INVEST)

`As a <role>, I want <capability>, so that <outcome>`. Check:
- **Independent**: deliverable without waiting for another story, or the dependency is named.
- **Negotiable**: states the need, not the design.
- **Valuable**: a user or operator can observe the benefit.
- **Estimable**: unknowns are listed as spikes.
- **Small**: fits one task; otherwise slice by workflow step, data variation, role or happy-path-first.
- **Testable**: has ACs that pass the checklist above.

## Requirement smells

| Smell | Example | Fix |
|---|---|---|
| Vague adjective | "fast", "user-friendly", "robust" | Measurable target or observable behavior |
| Unbounded scope | "support all file types" | Enumerate, or cite the existing whitelist |
| Hidden conjunction | "validate and save and notify" | Split into separate ACs |
| Implementation as need | "use a modal" | State the outcome; keep design in UX spec |
| Passive, no actor | "the record is updated" | Name who or what triggers it |
| Untestable negative | "never fails" | Define the failure behavior instead |
| Invented precision | "99.99% uptime" with no SLO in the project | Remove or mark as assumption |
| Speculative generality | "make it configurable for future needs" | Drop unless requested |

## Output

Return: FRs and NFRs each with a source, ACs in Given/When/Then, the traceability table, In/Out/Must-not-change scope, stories when requested, and a list of smells found with suggested rewrites.
