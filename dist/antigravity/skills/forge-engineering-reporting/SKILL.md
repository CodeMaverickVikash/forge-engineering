---
name: forge-engineering-reporting
description: Honest FORGE reporting with the status vocabulary, evidence rules and report template.
disable-slash-command: true
---


# Engineering Reporting

A report is a record of what actually happened. If it did not run, it did not pass. If an agent did not run, it is not listed. If a number was not measured, it does not appear.

`FORGE_HOME` below is the `forge` skill directory, a sibling of this skill (`../forge/`).

## Status vocabulary

Use exactly the statuses defined in `<FORGE_HOME>/core/quality-gates.md`: `PASSED`, `FAILED`, `PRE-EXISTING`, `BLOCKED`, `NOT RUN`, `UNAVAILABLE`, `N/A`.
- `PASSED` only for a check executed in this task, quoting the command and the key output line.
- `PRE-EXISTING` only when the same failure was observed on the baseline before the change.
- `BLOCKED`, `NOT RUN` and `UNAVAILABLE` always carry the reason and, where useful, how to enable it.
- A check that `validation-gate.mjs gate` shows as `STALE` passed for an older version of the code: re-run it, or report it as not verified for the final code.
- Never soften a failure ("mostly passing", "should work"). Say `FAILED` and quote the error.

## Evidence rules

| Claim | Required evidence |
|---|---|
| Test or build result | Exact command and the summary line (counts, exit status) |
| AC met | Test name, command output, screenshot path or `file:line` |
| File changed | Appears in `git diff --stat` or `git status --short` |
| Bug fixed | Reproduction failing before and passing after |
| Performance change | Before and after numbers from the same method and conditions |
| Screenshot or trace | The file exists and is listed by `validation-gate.mjs evidence`; the description says what it shows, nothing more |
| Specialist participated | It was actually invoked (Mode A) or emulated (Mode B), as stated |

Never fabricate metrics, coverage percentages, timings, file counts, agent participation or tool output. If you are unsure whether something ran, re-run it or report it as `NOT RUN`.

## Filling the execution report

Use `<FORGE_HOME>/templates/engineering-report.md` as the structure; do not restate or reorder it. Guidance per section:
- **Task**: the user's request verbatim.
- **Enhanced specification**: what was built, in 2 to 4 lines, with the key ACs.
- **Project understanding**: only modules you actually inspected.
- **Specialists involved**: the agents invoked and skills loaded, and the mode (native subagents or emulated sequentially).
- **Implementation**: the applications affected (from the validation plan), files from `git diff --stat` plus untracked files, each with a one-line summary; decisions with rationale.
- **Validation summary**: the per-application table comes from the latest `validation-gate.mjs gate` rows, one row per application in scope. Merge multiple commands of one kind into the worst status. List the exact commands with their key output lines, the number of cycles, and the gate state before browser work and after the last edit. Then one row per applicable gate (G1 to G15), including gates that did not run.
- **Browser & device verification**: see below.
- **Evidence**: paste the links printed by `validation-gate.mjs evidence --task <slug>`, each with what it demonstrates, the page or workflow, and the viewport. Never type a path by hand that the command did not list.
- **Issues found and resolved**: each with its root cause, the fix, the retest result and an evidence link when one exists.
- **Remaining issues and blockers**: keep the four groups apart (pre-existing, unresolved, environment blockers, checks not executed). Unresolved items include the last error and what was tried.
- **Assumptions** and **Remaining work**: copy from the spec and plan; do not invent new ones at report time.
- **Completion status**: exactly one of the four, chosen by the rules and precedence in `quality-gates.md`, with a one-line reason.

## Completion status

- **VERIFIED** needs everything: the final gate OPEN, all applicable gates passed, and the required browser or device verification passed with both tools.
- **VERIFIED WITH LIMITATIONS** when the core checks, tests, review and a real browser or device run passed, but something non-critical was unavailable. Name the limitation.
- **BLOCKED** when a required check or verification could not complete, including a user-visible change with no real browser or device run at all.
- **FAILED** when an implementation-caused failure remains. It overrides everything else.

Never write VERIFIED next to a FAILED, BLOCKED, NOT RUN or stale required check.

Save the report to `.forge/tasks/<slug>/report.md` and print it.

## Browser & device verification section

Take the content from the `forge-browser-qa` report: Playwright journeys and viewports with statuses, DevTools console and network findings, API integration observed in the browser, native-device results, and the verdict.
- The verdict is `browser-verified` only when both Playwright and Chrome DevTools MCP ran; otherwise write `implemented, not browser-verified (<missing capability>)`.
- A native app verified only through browser tools is not device-verified. Say so.
- When nothing browser- or device-visible changed, write N/A with the reason (for example "backend-only; API-level verification in the validation summary").

## Git status section

1. Run `git status --short` and `git diff --stat` at report time, not earlier.
2. Report the branch, counts of modified, added (including untracked) and deleted files, and flag any file that is not part of the task.
3. State plainly: "No commit, push, or pull request was created." Changes are left uncommitted for the user.
4. If the user had uncommitted changes before the task, say which files were theirs and that they were not modified (or how they were edited around).

## Analysis report format

For analyze, review and audit requests, rank findings by impact, highest first:

```
### Findings
| # | Finding | Severity | Impact | Evidence | Recommendation | Effort |
|---|---------|----------|--------|----------|----------------|--------|
| 1 | <one line> | critical/high/medium/low | <who or what is affected> | path:line, command output | <specific fix> | S/M/L |
```
Follow with a short prioritized roadmap (now, next, later) and a "Not assessed" list naming areas you did not check and why. Every finding needs evidence; drop findings you cannot support.

## Anti-patterns

- Listing every specialist in the roster rather than those that ran.
- Reporting a gate as `PASSED` based on a specialist's claim you did not verify.
- Omitting failed or skipped gates to make the table look clean.
- Long narrative instead of the template; the user should get the answer in one screen.

## Output

A completed execution report (or analysis report) that is accurate, evidence-backed, and states the git state and that nothing was committed.
