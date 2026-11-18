# Quality Gates

Order, never skipped: **implement → static checks → tests → fix → pre-browser gate → browser/device verification → fix and re-verify → final check → report.** `V` = `node "<FORGE_HOME>/scripts/validation-gate.mjs"`.

| Status | Meaning |
|---|---|
| `PASSED` | Executed in this task and succeeded (quote the command and the key output line) |
| `FAILED` | Executed and failed (quote the error). Fix it or report it |
| `PRE-EXISTING` | Fails identically on the untouched baseline. Report it; fix it only if in scope |
| `BLOCKED` | Required, but the environment prevents it (missing toolchain, dependencies, service, credentials, permission). Say how to unblock |
| `NOT RUN` | Applicable but deliberately not executed (e.g. the script deploys or rewrites files). Say why |
| `UNAVAILABLE` | No command exists for the gate, or an optional capability (e.g. Chrome DevTools MCP) is not connected |
| `N/A` | Not applicable to this change |

`BLOCKED`, `NOT RUN`, `UNAVAILABLE` and a stale result are never a pass.

## Static checks and tests: `V run --task <slug>`

One call does the whole cycle:
- **Plans** from the detector's units and their real commands (package scripts, Makefile, Composer, toolchain defaults). Scope is the units with changed code plus the **consumers** of a changed shared package; a root config change puts every unit in scope; documentation-only changes need no checks. API contracts (G6) and migrations (G12) add manual checks.
- **Runs** each affected app's type check → lint → tests → build. Apps run in parallel; tests that share a database run one at a time, and a prebuilt package builds before its consumers.
- **Defers builds** when type check or tests already cover the unit and no consumer imports its output. The row shows `DEFERRED` and does not block the browser, since the browser runs on the dev server. `V run --task <slug> --build` runs them once, right before `V final`, which requires them. A build that is the unit's only compile step, or that feeds a consumer, still runs every cycle.
- **Runs each check once.** It skips checks that already passed for the current code, so a fix re-runs only what it made stale or what failed.
- **Never runs** scripts that deploy or publish (`NOT RUN`, needs authorization), or that rewrite files (`--fix`, `--write`) or watch. Run a check-only or one-shot equivalent and record it with `V mark --task <slug> --unit <u> --check <c> --status PASSED --reason "<command → key output>"`.
- **Records** every result in `.forge/tasks/<slug>/validation/ledger.jsonl`, with logs under `evidence/reports/validation/`.
- **Exits with the pre-browser gate verdict:** 0 OPEN, 1 CLOSED (failed, missing or stale), 2 BLOCKED (environment only).

More options:
- `--units a,b`: an implementer validates only its own apps.
- `--baseline --units a,b`: before editing on M/L tasks, so regressions can be told apart from failures that were already there. Let it finish before any implementer starts; it skips deferred builds.
- `--build`: the deferred builds, once, after the last fix.
- `--all`: when project policy or a broad change requires a full re-run of the checks. It never runs builds; only `--build` does.
- `--base <ref>`: the task covers a branch ("test this branch", "did it break anything"). The scope adds what the branch committed since `<ref>`, so the API and shared packages it changed are checked in the same cycle. Pass it once; later runs, `gate` and `final` keep it.
- `V mark … --status PRE-EXISTING|BLOCKED|NOT RUN`: also records the manual G6 and G12 checks. Confirm a `PRE-EXISTING` (the gate flags failures that also failed on the baseline) before marking it.
- `V gate --task <slug>`: re-checks without running anything; `--verbose` lists every row.

If the host's command timeout is shorter than the suite, run it in the background and wait. Read `.forge/context.json`, CI and the README too: the plan shows what exists, it does not replace reading.

**Fix cycle:** find the root cause and decide whether this change caused it. Fix only what it caused, preserving the user's changes, then `V run` again.

## Gates by change type

| Gate | Required when |
|---|---|
| G1 Existing tests for the affected area | Any code change |
| G2 New or updated tests for the new behavior or bug | Feature or bug fix, unless untestable (explain why) |
| G3 Typecheck / compile | Typed languages or a compiled build |
| G4 Lint / format (project config only) | Linter configured |
| G5 Build | Build step exists and change affects shipped code |
| G6 API contract validation | API added or changed (schema, status codes, error shapes, backwards compatibility) |
| G7 Security review | Auth, input handling, payments, PII, secrets, dependencies, file or network I/O |
| G8 Performance check (measured) | Performance task, hot paths, large data, N+1-prone code |
| G9 Accessibility check | New or changed UI components, forms, navigation |
| G10 **Browser QA** (Playwright + Chrome DevTools MCP) | Any browser-visible change |
| G10m **Device verification** (emulator, simulator or device) | Any native mobile UI or behavior change |
| G11 Responsive check (mobile / tablet / desktop viewports) | Layout or styling changes |
| G12 Migration safety (up, down or rollback, data preservation) | Schema change |
| G13 Independent code review, including comment quality | The user asked for a review, or `V run` prints `Code review: required` (auth, payment or schema files; review only those, on Opus). Otherwise N/A: tests, the gate, browser QA and `V final` (comments included) cover the change |
| G14 Scope check: `git diff --stat` shows only intended files | Always |
| G15 Install provenance: every skill or tool installed in this task has a verified OSS license, a recorded user approval for its batch and an entry in `forge-skills.lock.json` | Any installation happened |

## Pre-browser gate

Browser QA and device verification start **only** when the gate is OPEN for the code as it is now. The one exception is reproducing a bug before the fix exists.
- On BLOCKED, first try the allowed remedy: install the project's declared dependencies, or start a throwaway local service ([safety.md](safety.md)). Otherwise stop and report `BLOCKED`.
- The code review (G13), when required, is not a browser step and runs alongside the checks.

## Browser and device verification (G10, G10m)

**Browser-verified** requires both:
1. **Playwright** ran the affected workflow in a real browser with `PASSED`. Use the project's suite, else the Playwright MCP, else the project's other E2E framework.
2. **Chrome DevTools MCP** inspected console, network and runtime, with no new errors caused by the change.

If either is missing, the verdict is **"implemented, not browser-verified"**, plus how to enable the missing tool (`forge-browser-qa`).
- **Backend-only changes** get API-level verification (integration tests plus real requests to the local server) instead.
- **Native mobile** is verified on an emulator, simulator or device (`forge-browser-qa` device reference). Browser tools never verify a native screen.

After a fix found in this phase: `V run` once all owners have returned (it reopens the gate), then a delta retest ([delegation.md](delegation.md#delta-retests)).

## Evidence

Whenever a browser or device run happened and capture works, save screenshots of the **implemented behavior**:
- each affected journey's final state;
- the success and error states the criteria name;
- each viewport for layout changes;
- each fixed issue;
- a "before", only when one was really taken.

Rules:
- Store them in `.forge/tasks/<slug>/evidence/{screenshots,playwright,traces,network,reports}` (`V evidence --task <slug> --init`). The folder is git-ignored. Cite an existing project artifact folder in place instead of copying.
- Give each file a descriptive name (`after-checkout-error-390x844.png`) and one line in `evidence/index.md`: what it shows, the page or workflow, the viewport.
- Cite only links the tools print. A screenshot never proves backend correctness on its own.

## Final check (phase 9): `V final --task <slug>`

One call that is READY (exit 0) only when:
- the gate is OPEN after the last edit;
- no line ending flipped;
- the new comments have no errors;
- no evidence link is missing.

It also prints the per-application table and the evidence links for the report.

## Completion status (exactly one)

| Status | When |
|---|---|
| **VERIFIED** | Every applicable gate passed, the final check is READY, and the required browser/device verification passed with both tools |
| **VERIFIED WITH LIMITATIONS** | Checks, tests, review and a real browser/device run passed, but something non-critical was unavailable (e.g. no DevTools MCP, a viewport or performance check not covered) |
| **BLOCKED** | A required check or verification could not complete: the gate was BLOCKED, or a user-visible change had no real browser or device run |
| **FAILED** | A failure caused by this change remains |

Precedence: FAILED > BLOCKED > VERIFIED WITH LIMITATIONS > VERIFIED. Never VERIFIED with a failed, skipped or stale required check.

## Done means

- Every acceptance criterion maps to evidence: a test name, command output, screenshot or code reference.
- The final check is READY, or the report says exactly why not.
- G14 is done, and G13 when it is required.
- The report, with its completion status and git state, is printed. Nothing was committed.
