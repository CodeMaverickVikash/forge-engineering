# FORGE Lifecycle (adaptive)

Every phase has an exit criterion. Skip a phase only when the size table in SKILL.md allows it. Cost should be proportional to risk.

## Sizing heuristics

Upgrade the size by one step if **any** of these apply:
- It touches authentication, authorization, payments, PII, migrations or data deletion.
- It changes a public API contract, an event schema or a database schema.
- It touches more than about 8 files or more than one deployable unit.
- The request is vague and has several plausible interpretations.

Downgrade to S only when the defect and its fix are both obvious after targeted reading.

Use **Q** (answer only) when the user asks how, where or why something works and wants no change, audit or review. A wrong answer is cheap to correct, but a team of agents for a lookup is pure cost. If answering turns out to need more than about 10 files, or the user then asks for a change, re-size the task.

## Phase exit criteria

| # | Phase | Exit criterion |
|---|---|---|
| 1 | Understand | Task type, size, risks and a draft goal sentence are known |
| 2 | Explore | Stack identified from evidence. Affected apps (web, backend/API, mobile, shared packages), files and modules listed. Existing tests and validation commands known (`validation-gate.mjs plan`). Baseline captured for M/L |
| 2b | Capabilities | Local skill inventory done. If discovery ran, the proposal was presented and the user's answer is recorded (approved / rejected / not yet received). Only approved items are installed |
| 3 | Specify | Spec has acceptance criteria (testable), edge cases, NFRs, boundaries, assumptions, and grounding references (file paths) |
| 4 | Architect | Team chosen. Approach chosen with the alternatives considered. ADR for L tasks |
| 5 | Plan | Ordered tasks with owners, dependencies and a validation strategy per task |
| 6 | Implement | Every plan task is done or explicitly deferred with a reason |
| 7 | Verify | Static checks and tests ran once per cycle for every affected app. The pre-browser gate opened **before** browser or device verification started, or the run stopped as BLOCKED. Every required gate is passed, failed or recorded as blocked or unavailable, each with evidence |
| 8 | Fix | Failures introduced by our change are fixed, or reported as unresolved after 3 cycles. After each fix, the affected checks re-ran and the gate reopened before any browser retest |
| 9 | Final review | Reviewer verdict recorded. No unrelated diffs. The final gate is OPEN after the last edit, and the evidence check exits 0 |
| 10 | Report | Report printed and saved, with links to real evidence and one completion status. Git state stated. No commit or PR created |

## Task-type playbooks (deltas from the default)

- **Bug fix:** reproduce first with a failing test, a script or browser steps. Find the root cause (`forge-debugging`). Fix it, prove the reproduction now passes, and add a regression test.
- **New feature:** product discovery happens before architecture. Plan the loading, empty, error and success states for any UI.
- **UI/UX improvement:** audit the current UI first (screenshot plus DevTools). Stay consistent with the existing design system. Check responsive layouts and accessibility.
- **Database change:** migrations must be reversible or carry an explicit rollback note. Never run destructive operations against non-local databases. Check backfill and lock risks.
- **Security review / fix:** use a threat model plus OWASP checklist. Report findings with severity, evidence and a fix. Fix only what was asked; recommend the rest.
- **Performance:** measure before and after with the same method. Never claim an improvement you did not measure.
- **Analysis / audit:** read-only. Produce ranked, evidence-backed findings and a prioritized roadmap.
- **Production readiness:** run `forge-deployment-readiness` across config, observability, security, CI/CD, rollback and docs.

## Clarification policy

Ask the user (one concise, batched question) **only** when:
1. A critical business decision cannot be inferred safely from code, docs or conventions.
2. Interpretations differ materially, so building the wrong one wastes significant work.
3. A destructive or irreversible action is required (data deletion, schema drop, force operations).
4. A paid external service, a purchase or a financial transaction is involved.
5. Credentials, permissions or access are missing.

Otherwise pick the most conservative reasonable interpretation, write it under **Assumptions** in the spec, and continue.

## Stop conditions

Stop and report (do not loop) when:
- Required tooling is missing and cannot be used safely (report what is missing and how to enable it).
- The same failure persists after 3 fix cycles.
- Continuing would require a forbidden action (see safety.md).
