# Quality Gates

Every gate ends in exactly one status, with evidence:

| Status | Meaning |
|---|---|
| `PASSED` | Command or check executed and succeeded (quote the command and the key output line) |
| `FAILED` | Executed and failed (quote the error). It must be fixed or reported |
| `PRE-EXISTING` | Fails identically on the untouched baseline. Not caused by this change, so report it but do not fix it unless it is in scope |
| `NOT RUN` | Applicable but deliberately skipped (state why, e.g. needs credentials) |
| `UNAVAILABLE` | The tool or capability is missing (e.g. no Chrome DevTools MCP connected) |
| `N/A` | Not applicable to this change |

Never use `PASSED` without having executed the check in this task.

## Baseline first

Before changing code on M and L tasks, run the project's fast checks (typecheck, lint, the unit tests touching the affected area) to capture the **baseline**. Only then can you tell regressions apart from pre-existing failures.

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
| G11 Responsive check (mobile / tablet / desktop viewports) | Layout or styling changes |
| G12 Migration safety (up, down or rollback, data preservation) | Schema change |
| G13 Independent code review | Any code change |
| G14 Scope check: `git diff --stat` shows only intended files | Always |
| G15 Install provenance: every skill or tool installed in this task has a verified OSS license, a recorded user approval for its batch and an entry in `forge-skills.lock.json` | Any installation happened |

Discover commands from `.forge/context.json` (package scripts, Makefile, CI workflows). **Never assume** a command exists. If none exists for a gate, mark it `UNAVAILABLE`, explain, and suggest a fix.

## Browser QA completion gate (G10)

A browser-visible change may be called **browser-verified** only when both of these hold:
1. **Playwright**: the affected workflow was executed in a real browser with `PASSED`. Use the project's Playwright test suite, the Playwright MCP, or an existing E2E framework, in that order.
2. **Chrome DevTools MCP**: console, network and runtime were inspected for the affected pages, with no new errors attributable to the change.

If either capability is missing, the change is **"implemented, not browser-verified"**. Report the gap as a verification limitation, together with the exact steps to enable it (see the `forge-browser-qa` skill). A missing MCP is never a pass.

## Done means

- All acceptance criteria are mapped to evidence (a test name, command output, screenshot or code reference).
- No gate is `FAILED` due to our change, or it is clearly reported as unresolved.
- G13 and G14 are done.
- The report and git state are printed. Nothing was committed.
