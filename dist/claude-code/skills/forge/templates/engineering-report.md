### FORGE Execution Report

**Task:** <original user request, verbatim>

**Enhanced specification:** <2–4 lines: what was actually built/fixed/analyzed and the key acceptance criteria>

**Project understanding:** <stack, relevant modules and architecture actually inspected>

**Specialists involved:** <agents actually invoked + skills actually loaded; state "native subagents" (Mode A) or "emulated sequentially" (Mode B). Never list agents that did not run.>

**Skills & capabilities:** Relevant skills that already existed; skills recommended (with their source and license); user approval (approved / rejected / not yet received / not needed); skills installed, with their source and pinned commit; skills actually used; skills skipped and why. Confirm that no paid service or subscription was required. Never list an install or a skill use that did not happen.

**Implementation:**
- <features / fixes completed>
- Applications affected: <Web / Backend-API / Mobile / Shared packages, with unit paths>
- Files changed: <path — summary> (from `git diff --stat`)
- Architecture decisions: <decisions with one-line rationale, or "none">

**Validation summary:**
| Application | Type check | Lint | Tests | Build |
|---|---|---|---|---|
| <Web: apps/web> | PASSED / FAILED / PRE-EXISTING / BLOCKED / NOT RUN / UNAVAILABLE / N/A | <status> | <status> | <status> |
| <Backend/API: …> | <status> | <status> | <status> | <status> |
| <Mobile: …> | <status> | <status> | <status> | <status> |
| <Shared packages: …> | <status> | <status> | <status> | <status> |

Commands: `<exact command>` → <key output line> (one per check, from `validation-gate.mjs` output; drop rows for applications not in scope)
Validation cycles: <n>; re-runs limited to <what a fix made stale>. Pre-browser gate: OPEN at cycle <n> | CLOSED | BLOCKED (<why>). Final gate after the last edit: OPEN | <state>.

| Gate | Command / method | Status | Evidence |
|------|------------------|--------|----------|
| <G1 tests> | `<cmd>` | PASSED / FAILED / PRE-EXISTING / BLOCKED / NOT RUN / UNAVAILABLE / N/A | <key output line> |

**Browser & device verification:** (N/A, with the reason, when nothing browser- or device-visible changed)
| Area | Tool | Result |
|---|---|---|
| Web workflows | Playwright (project suite / MCP) | PASSED / FAILED / BLOCKED / UNAVAILABLE / N/A |
| Browser runtime | Chrome DevTools MCP | <status: console, network, runtime findings> |
| API integration | API tests / browser network | <status> |
| Responsive UI | Playwright / DevTools (viewports) | <status> |
| Native mobile | Emulator / simulator / device (platform, OS) | <status> |
- Journeys: <journey — viewport — PASSED/FAILED>; retests: <what was re-run after fixes>
- Verdict: browser-verified | implemented, not browser-verified (<limitation>)

**Evidence:** (from `validation-gate.mjs evidence --task <slug>`; only files that exist)
- <link as printed>: <what it demonstrates> — <page/workflow> — <viewport>
- Before/after: <before link> → <after link>: <the visual change> (only when both exist)

**Issues found and resolved:**
- <issue> — root cause: <file:line / cause> — fix: <what changed> — retest: <command or journey → result> — evidence: <link or "none">

**Remaining issues and blockers:**
- Pre-existing (not caused by this change): <…> or "none"
- Unresolved implementation issues: <last error and what was tried> or "none"
- Environment blockers: <what is missing and how to enable it> or "none"
- Checks not executed: <check — NOT RUN / UNAVAILABLE — reason> or "none"

**Assumptions:** <assumptions made, or "none">

**Remaining work:** <only genuinely incomplete items, or "none">

**Completion status:** VERIFIED | VERIFIED WITH LIMITATIONS | BLOCKED | FAILED — <one line: why, naming any limitation or blocker>

**Git status:** Branch `<branch>`; <N> files modified, <N> added, <N> deleted (uncommitted). No commit, push, or pull request was created.
