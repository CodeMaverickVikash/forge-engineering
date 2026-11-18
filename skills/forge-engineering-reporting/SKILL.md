---
name: forge-engineering-reporting
description: Honest FORGE reporting with the status vocabulary, evidence rules and report template.
user-invocable: false
---

# Engineering Reporting

A report is a record of what actually happened. If it did not run, it did not pass. If an agent did not run, it is not listed. If a number was not measured, it does not appear.

`FORGE_HOME` below is the `forge` skill directory, a sibling of this skill (`../forge/`).

## Status vocabulary

Use exactly the statuses defined in `<FORGE_HOME>/core/quality-gates.md`: `PASSED`, `FAILED`, `PRE-EXISTING`, `NOT RUN`, `UNAVAILABLE`, `N/A`.
- `PASSED` only for a check executed in this task, quoting the command and the key output line.
- `PRE-EXISTING` only when the same failure was observed on the baseline before the change.
- `NOT RUN` and `UNAVAILABLE` always carry the reason and, where useful, how to enable it.
- Never soften a failure ("mostly passing", "should work"). Say `FAILED` and quote the error.

## Evidence rules

| Claim | Required evidence |
|---|---|
| Test or build result | Exact command and the summary line (counts, exit status) |
| AC met | Test name, command output, screenshot path or `file:line` |
| File changed | Appears in `git diff --stat` or `git status --short` |
| Bug fixed | Reproduction failing before and passing after |
| Performance change | Before and after numbers from the same method and conditions |
| Specialist participated | It was actually invoked (Mode A) or emulated (Mode B), as stated |

Never fabricate metrics, coverage percentages, timings, file counts, agent participation or tool output. If you are unsure whether something ran, re-run it or report it as `NOT RUN`.

## Filling the execution report

Use `<FORGE_HOME>/templates/engineering-report.md` as the structure; do not restate or reorder it. Guidance per section:
- **Task**: the user's request verbatim.
- **Enhanced specification**: what was built, in 2 to 4 lines, with the key ACs.
- **Project understanding**: only modules you actually inspected.
- **Specialists involved**: the agents invoked and skills loaded, and the mode (native subagents or emulated sequentially).
- **Implementation**: files from `git diff --stat` plus untracked files, each with a one-line summary; decisions with rationale.
- **QA and verification**: one row per applicable gate (G1 to G14), each with a status and evidence. Include gates that did not run.
- **Issues**: separate fixed from unresolved; unresolved items include the last error and what was tried.
- **Assumptions** and **Remaining work**: copy from the spec and plan; do not invent new ones at report time.

Save the report to `.forge/tasks/<slug>/report.md` and print it.

## Browser QA section

Include it for any browser-visible change. Take the content from the `forge-browser-qa` report: Playwright journeys and viewports with statuses, DevTools console and network findings, and the verdict. The verdict is `browser-verified` only when both Playwright and Chrome DevTools MCP ran; otherwise write `implemented, not browser-verified (<missing capability>)`. Omit the section only when nothing browser-visible changed.

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
