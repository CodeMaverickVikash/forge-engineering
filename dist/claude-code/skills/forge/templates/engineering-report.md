### FORGE Execution Report

**Task:** <original user request, verbatim>

**Enhanced specification:** <2–4 lines: what was actually built/fixed/analyzed and the key acceptance criteria>

**Project understanding:** <stack, relevant modules and architecture actually inspected>

**Specialists involved:** <agents actually invoked + skills actually loaded; state "native subagents" (Mode A) or "emulated sequentially" (Mode B). Name each agent escalated to Opus and its trigger, or "Opus escalation unavailable: <role>, <trigger>, <reason>". Never list agents that did not run.>

**Skills & capabilities:** Relevant skills that already existed; skills recommended (with their source and license); user approval (approved / rejected / not yet received / not needed); skills installed, with their source and pinned commit; skills actually used; skills skipped and why. Confirm that no paid service or subscription was required. Never list an install or a skill use that did not happen.

**Implementation:**
- <features / fixes completed>
- Applications affected: <Web / Backend-API / Mobile / Shared, with unit paths>
- Files changed: <path — summary> (from `git diff --stat`)
- Architecture decisions: <decisions with one-line rationale, or "none">

**Validation summary:**
<the per-application table exactly as `validation-gate.mjs final` printed it (Application | Type check | Lint | Tests | Build)>

Commands: `<command>` → <key output line> (one per check). Cycles: <n>. Pre-browser gate: OPEN at cycle <n> | BLOCKED (<why>). Final check: READY | NOT READY (<why>).

| Gate | Command / method | Status | Evidence |
|------|------------------|--------|----------|
| <only gates the table above does not cover: G2, G6–G15 as applicable> | `<cmd>` | PASSED / FAILED / PRE-EXISTING / BLOCKED / NOT RUN / UNAVAILABLE / N/A | <key output line> |

**Browser & device verification:** <"N/A — <reason>" on one line when nothing browser- or device-visible changed; otherwise:>
| Area | Tool | Result |
|---|---|---|
| Web workflows | Playwright (project suite / MCP) | <status, journeys and viewports> |
| Browser runtime | Chrome DevTools MCP | <status: console, network, runtime> |
| API integration | API tests / browser network | <status> |
| Native mobile | Emulator / simulator / device (platform, OS) | <status> |
- Verdict: browser-verified | implemented, not browser-verified (<limitation>)

**Evidence:** <"none" when no browser or device run happened; otherwise the links `validation-gate.mjs final` printed, each with what it demonstrates, the page or workflow, and the viewport; before → after pairs only when both exist>

**Issues found and resolved:** <"none", or per issue: description — root cause — fix — retest result — evidence link>

**Remaining issues and blockers:** <"none", or the applicable groups: pre-existing; unresolved (last error, what was tried); environment blockers (how to enable); checks not executed (reason)>

**Assumptions:** <assumptions made, or "none">

**Remaining work:** <only genuinely incomplete items, or "none">

**Completion status:** VERIFIED | VERIFIED WITH LIMITATIONS | BLOCKED | FAILED — <one line: why>

**Git status:** Branch `<branch>`; <N> files modified, <N> added, <N> deleted (uncommitted). No commit, push, or pull request was created.
