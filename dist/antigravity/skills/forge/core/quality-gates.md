# Quality Gates

Verification runs in a fixed order. Each step starts only after the previous one passed:

**Implement → static validation → automated tests → fix → pre-browser gate → browser / device verification → fix and re-verify → final gate → evidence and report.**

Every gate ends in exactly one status, with evidence:

| Status | Meaning |
|---|---|
| `PASSED` | Command or check executed and succeeded (quote the command and the key output line) |
| `FAILED` | Executed and failed (quote the error). It must be fixed or reported |
| `PRE-EXISTING` | Fails identically on the untouched baseline. Not caused by this change, so report it but do not fix it unless it is in scope |
| `BLOCKED` | Required, but the environment prevents it: missing toolchain or dependencies, an unavailable service (database, emulator), missing credentials or permissions. State what is missing and how to unblock it |
| `NOT RUN` | Applicable but deliberately not executed (state why, e.g. the script deploys or would rewrite files) |
| `UNAVAILABLE` | The project has no command for this gate, or an optional capability (e.g. Chrome DevTools MCP) is not connected |
| `N/A` | Not applicable to this change |

Never use `PASSED` without having executed the check in this task. `BLOCKED`, `NOT RUN` and `UNAVAILABLE` are never a pass.

## Validation plan (phase 2, before the first check)

`node "<FORGE_HOME>/scripts/validation-gate.mjs" plan --task <slug>` builds the plan from the real project, not from assumptions. It uses the detector's units (each app and package), their discovered commands (package scripts, Makefile, Composer, toolchain defaults) and the changed files. It:
- **Scopes:** only units with changed code, plus the **consumers** of a changed shared package. A root config change (lockfile, root tsconfig or lint config) puts every unit in scope; documentation-only changes need no checks.
- **Classifies** each unit as web, backend/API or mobile, and names the verification that follows the gate: browser, API-level, or emulator/device.
- **Flags** API contract changes (a manual G6 `contract` check, plus the web/mobile consumers) and migration or schema changes (a manual G12 `migration` check).
- **Refuses unsafe scripts:** a script that deploys or publishes is `NOT RUN` (needs authorization). A `--fix`/`--write` or watch-mode script is never run; run a check-only or one-shot equivalent and record it with `mark`.

Read `.forge/context.json`, CI workflows and the README too. The plan tells you what exists; it does not replace reading. If a gate has no command, it is `UNAVAILABLE`: explain and suggest a fix.

## Baseline first

Before changing code on M and L tasks, capture the **baseline** for the units you plan to touch: `validation-gate.mjs run --task <slug> --baseline --units <a,b>`. Only then can you tell regressions apart from pre-existing failures. The gate later flags a failure that also failed on the baseline as a `PRE-EXISTING` candidate. Confirm it is the same failure before you mark it.

## Running checks: once per cycle, in parallel where safe

`validation-gate.mjs run --task <slug>` runs **only** the checks that are not already passing for the current code: missing, failed, blocked, or stale because a file in their scope changed since they passed. Every result goes to `.forge/tasks/<slug>/validation/ledger.jsonl`, with its full log under `evidence/reports/validation/`.
- **Parallel:** independent units run at the same time (Web, API and Mobile in one coordinated batch).
- **Sequential:** checks within a unit (type check → lint → tests → build, so they don't fight over build caches), tests of units that share a database, and a shared package with prebuilt output before its consumers.
- **No repeats:** a check that passed is not re-run unless its scope changed. A fix in one app leaves the others' results valid.
- `--units` restricts a run to an implementer's own units. `--all` forces a full re-run when project policy or a broad change requires it.
- Record what the runner cannot produce with `mark --unit <u> --check <c> --status <S> --reason "<evidence>"`: manual checks, confirmed `PRE-EXISTING` failures, `BLOCKED`/`NOT RUN` with the reason, or the `PASSED` one-shot equivalent of a watch script (the reason quotes the command and its key output line).
- If the host's command timeout is shorter than the suite, run it in the background and wait for completion. Never assume a result.

Fix cycle: capture the error, find the root cause, decide whether this change introduced it, fix only what it introduced (preserving the user's changes), then `run` again. That re-runs the failed check plus anything the fix made stale, and nothing else.

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
| G10m **Device verification** (emulator, simulator or physical device) | Any native mobile UI or behavior change |
| G11 Responsive check (mobile / tablet / desktop viewports) | Layout or styling changes |
| G12 Migration safety (up, down or rollback, data preservation) | Schema change |
| G13 Independent code review | Any code change |
| G14 Scope check: `git diff --stat` shows only intended files | Always |
| G15 Install provenance: every skill or tool installed in this task has a verified OSS license, a recorded user approval for its batch and an entry in `forge-skills.lock.json` | Any installation happened |

## Pre-browser completion gate

`validation-gate.mjs gate --task <slug>` must exit **0 (OPEN)** before any browser or device verification starts. That means every required G1–G6 and G12 check in the plan is `PASSED` (or `PRE-EXISTING`, `N/A`, `UNAVAILABLE`) **for the code as it is now**.
- Exit 1, **CLOSED**: something failed, is missing, or went stale. Fix it, `run`, and check again.
- Exit 2, **BLOCKED**: only environment blockers remain. Try the allowed remedy first: install the project's declared dependencies, or start a local throwaway service ([safety.md](safety.md)). Otherwise stop and report `BLOCKED`. Never start browser verification behind a blocked gate.

The code review (G13) is not a browser step. It may run while the checks run.

## Browser and device verification (G10, G10m)

A browser-visible change may be called **browser-verified** only when both of these hold:
1. **Playwright**: the affected workflow was executed in a real browser with `PASSED`. Use the project's Playwright test suite, the Playwright MCP, or an existing E2E framework, in that order.
2. **Chrome DevTools MCP**: console, network and runtime were inspected for the affected pages, with no new errors attributable to the change.

If either capability is missing, the change is **"implemented, not browser-verified"**. Report the gap as a verification limitation, together with the exact steps to enable it (see the `forge-browser-qa` skill). A missing MCP is never a pass.

- **Backend-only changes** with no browser-facing workflow get API-level verification (integration tests plus real requests against the local server), not a forced browser pass. When the change feeds a browser workflow, browser QA also inspects the real frontend-to-API requests.
- **Native mobile** is verified on an available emulator, simulator or device ([device verification](../../forge-browser-qa/references/device-verification.md)). Browser tools never verify a native app.

After any fix found in this phase: `run` (only affected checks re-run) → `gate` OPEN again → re-run the failed journeys plus the adjacent one ([delta retests](delegation.md#delta-retests)).

## Evidence

Screenshots are mandatory whenever browser or device verification ran and capture is possible. They must show the implemented behavior (each affected journey's final state, the success and error states the criteria name, each viewport for layout changes, each fixed issue), not just a homepage.
- **Location:** `.forge/tasks/<slug>/evidence/` with `screenshots/`, `playwright/`, `traces/`, `network/` and `reports/` (create them with `validation-gate.mjs evidence --task <slug> --init`). It is git-ignored, so G14 stays clean. If the project already has an artifact convention (e.g. a configured Playwright `outputDir`), cite those paths instead of copying.
- **Names** describe the content: `after-checkout-success-390x844.png`, `before-header-1440x900.png`.
- **Index:** every artifact gets one line in `evidence/index.md`: the file, what it demonstrates, the page or workflow, and the viewport. Before/after pairs go on one line, and only when both images really exist.
- **No invented paths:** `validation-gate.mjs evidence --task <slug>` lists the real files as clickable links and exits 1 if the index cites a file that does not exist.
- A screenshot proves what was on screen. It never proves backend correctness on its own.

## Completion status (exactly one, in the report)

| Status | When |
|---|---|
| **VERIFIED** | Every applicable gate passed, the final gate is OPEN, and the required browser/device verification passed with both of its tools |
| **VERIFIED WITH LIMITATIONS** | Static checks, tests, review and a real browser/device run passed, but some non-critical verification was unavailable or not run (e.g. Chrome DevTools MCP missing, a viewport or performance check not covered) |
| **BLOCKED** | A required check or verification could not be completed: the gate was BLOCKED, or a user-visible change got no real browser or device run at all |
| **FAILED** | An unresolved failure caused by this change remains |

Precedence: FAILED > BLOCKED > VERIFIED WITH LIMITATIONS > VERIFIED. Never use VERIFIED if a required check failed, was skipped, or is stale.

## Done means

- All acceptance criteria are mapped to evidence (a test name, command output, screenshot or code reference).
- The final `gate` is OPEN after the last code change, or the report explains exactly why not.
- No gate is `FAILED` due to our change, or it is clearly reported as unresolved.
- G13 and G14 are done, and `evidence` exits 0 when browser or device verification ran.
- The report, with its completion status and git state, is printed. Nothing was committed.
