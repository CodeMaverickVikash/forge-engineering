---
name: forge-qa-strategy
description: Risk-based test strategy and verification for any stack. Covers test planning, regression scope analysis, mapping acceptance criteria to evidence, exploratory CLI/HTTP testing charters, edge-case heuristics, baseline-versus-after comparison, bug reports and exit criteria.
user-invocable: false
---

# QA Strategy & Verification

QA answers one question with evidence: **does the change meet every acceptance criterion without breaking what already worked?** Test effort follows risk, not file count.

## 1. Inputs

- `spec.md` (acceptance criteria, edge cases, NFRs) and `plan.md` in the task folder.
- `.forge/context.json`: test, lint, typecheck, build and dev commands with their sources. Never assume a command exists; a command with an `inferred:` source must be confirmed first.
- The diff or planned file list, plus the nearest existing tests for the affected area.

## 2. Risk-based planning

Rate each affected area on **impact** (data loss, money, auth, many users) × **likelihood** (new code, complex logic, many callers, no tests). Spend effort top-down:

| Risk | Expected coverage |
|---|---|
| High | Automated tests at the lowest effective level + an integration or E2E path + manual exploratory pass |
| Medium | Automated tests for the AC and main error path |
| Low | Existing suite plus a quick smoke check |

Pick the **lowest test level that proves the behavior**: unit for logic, integration for contracts and persistence, E2E/browser only for user journeys and wiring.

## 3. Regression scope

Find what else could break:
- Callers of changed functions, routes and components (grep for symbols and route paths).
- Shared code touched: utilities, middleware, schemas, config, migrations, styles and design tokens.
- Contract changes: response shapes, status codes, events, DB columns consumed elsewhere.
- Feature flags, permissions and roles that alter the same path.

List each adjacent area with the reason it is at risk and how it will be checked.

## 4. Test plan

Write `.forge/tasks/<slug>/test-plan.md` from `skills/forge/templates/test-plan.md` (`<FORGE_HOME>/templates/test-plan.md`). Fill in:
- **Traceability:** every AC gets a row: level, test name or manual procedure, status. An AC without a row is a gap.
- **Not tested:** say what and why (needs credentials, external service, hardware).
- **Commands:** exact commands from `.forge/context.json`.

## 5. Baseline vs after

1. Before changes, run the affected tests and fast checks; record pass/fail counts and failing test names.
2. After changes, run the same commands with the same environment and data.
3. Classify every failure: **new** (caused by the change), **PRE-EXISTING** (fails identically on baseline) or **flaky** (passes on re-run with no code change; report it, do not hide it).

## 6. Exploratory / manual charters

Write short charters: *Explore <area> with <resources/data> to discover <risk>*. Time-box each one and record what was tried, not only what failed.

**HTTP checks** (local or test env only), for example:
```bash
curl -sS -i -X POST http://localhost:<port>/api/<path> -H 'Content-Type: application/json' -d '{"field":"value"}'
```
Check the status code, error shape, headers and idempotency (send twice). Redact `Authorization` headers and cookies in anything you report.

**CLI checks:** run with valid input, no input, `--help`, invalid flags, and missing files. Check exit codes (`echo $?`), stdout versus stderr, and messages.

## 7. Edge-case heuristics

- **Boundaries:** 0, 1, max, max+1, negative, empty string, whitespace-only, very long input.
- **Types and format:** null or missing fields, wrong types, unicode and emoji, RTL text, leading zeros, decimals and rounding, time zones, DST, leap days.
- **State:** first use, empty list, already deleted, concurrent edits, double submit, retry after failure, expired session.
- **Permissions:** anonymous, wrong role, another user's resource ID (IDOR).
- **Environment:** slow network, offline, server 500, timeout, partial data.

## 8. Bug report format

```
BUG-<n> [critical|high|medium|low] <one-line title>
Steps: <numbered, reproducible from a clean state>
Expected: <per AC or spec> | Actual: <observed>
Evidence: <command + output excerpt, screenshot path, file:line hypothesis>
Scope: new | pre-existing | flaky
```

Severity: **critical** = data loss, security or the core flow is blocked; **high** = an AC fails, no workaround; **medium** = degraded with a workaround; **low** = cosmetic.

## 9. Exit criteria

- Every AC has evidence with a status from quality-gates.md (PASSED only if executed in this task).
- No new failures versus baseline; pre-existing and flaky ones are listed separately.
- No open critical or high bug caused by the change.
- Browser gate G10 met for browser-visible changes, or reported as a verification limitation.

## Anti-patterns

- Declaring "tested" from reading code. Testing only the happy path.
- Re-running a failing test until it passes and calling it green.
- Duplicating the same assertion at unit, integration and E2E levels.
- Using production data or accounts for any check.

## Output

A test plan (written to the task folder when planning), an **AC → evidence** table, the regression scope checked, baseline-versus-after results, bugs in the format above, and an exit verdict: `meets criteria` | `meets criteria with risks` | `does not meet criteria`.
