---
name: forge-code-review
description: Independent code review of an uncommitted diff against the task spec. Checks acceptance criteria coverage, correctness, error handling, security and performance smells, conventions, test adequacy, regression risk and scope creep, with a verdict. Use for the final review of any code change.
disable-slash-command: true
---


# Independent Code Review

You review the change as if you had never seen it. You do not fix code. You find what is wrong, prove it with `file:line`, and give a verdict.

## 1. Gather the change

1. Read the spec (`.forge/tasks/<slug>/spec.md`) and plan. Note the ACs and the "Must not change" list.
2. `git status --short` and `git diff --stat` to list every changed, added and untracked file. Untracked files are part of the change; read them.
3. `git diff` (and `git diff --cached` if anything is staged) for the full patch. Read surrounding code for context, not just the hunks.
4. Read the specialist reports for claimed test results. Treat claims as unverified.

## 2. Review checklist

**Spec conformance**
- [ ] Each AC is implemented, and you can point to the code and a test for it.
- [ ] Nothing in "Out of scope" or "Must not change" was touched.

**Correctness**
- [ ] Logic matches the intended behavior on the main path and edge cases from the spec.
- [ ] Off-by-one, null or undefined, empty collections, type coercion, time zones, rounding.
- [ ] Async: awaited promises, race conditions, cleanup, cancellation.
- [ ] State transitions and transactions are consistent; partial failure leaves data valid.

**Error handling**
- [ ] Errors are handled at the right layer, with the project's error types and shapes.
- [ ] No swallowed exceptions, empty catch blocks or silent fallbacks that hide failures.
- [ ] User-facing errors are safe (no stack traces, internals or secrets).

**Security smells**
- [ ] Input validated at the boundary; queries parameterized; output encoded.
- [ ] Authorization checked on every new or changed protected path, including object ownership.
- [ ] No secrets, tokens or PII in code, logs or client bundles.
- [ ] No new dependency without authorization; no disabled security control.

**Performance smells**
- [ ] No N+1 queries, unbounded loops or lists, missing pagination, repeated work in render or hot loops.
- [ ] No blocking I/O on hot paths; no large payloads without need.

**Conventions and maintainability**
- [ ] Matches existing naming, structure, patterns and reuse of existing helpers and components.
- [ ] No dead code, debug output, commented-out blocks or stray TODOs without context.
- [ ] No premature abstraction or unexplained complexity.

**Tests**
- [ ] New behavior and the bug (for fixes) are covered by tests at the project's existing levels.
- [ ] Tests assert outcomes, not implementation details; they would fail without the change.
- [ ] No skipped, weakened or deleted tests to make a gate pass.

**Regression risk and scope**
- [ ] Callers and consumers of changed functions, contracts and schemas still work.
- [ ] Unrelated changes (formatting sweeps, renames, refactors, lockfile churn, config edits) are flagged as scope creep.

Re-run at least one claimed-passing check yourself when it is cheap (a targeted test file or typecheck).

## 3. Severity scale

| Severity | Meaning |
|---|---|
| **blocker** | Wrong behavior, data loss, security hole, broken build or test, AC not met. Must fix before done |
| **major** | Likely bug in an edge case, missing test for an AC, significant regression risk, scope creep |
| **minor** | Maintainability or clarity issue that is worth fixing but not risky |
| **nit** | Small preference; optional |

Do not report style that the project's formatter or linter enforces. Do not raise preferences as majors. Every finding needs `file:line` and a concrete suggested fix.

## 4. Verdict

- **approve**: no blockers or majors.
- **approve-with-fixes**: majors or minors that are quick and low risk; list them.
- **request-changes**: any blocker, or majors that need rework.

## Output

```
CODE REVIEW: <verdict>
Scope: <files reviewed>; unrelated changes: <list or "none">
AC coverage: AC1 <path:line / test name> ... (or "missing")
Findings:
- [blocker|major|minor|nit] path:line — problem — suggested fix
Checks re-run: <command → result>
```
