---
name: forge-browser-qa
description: Real-browser QA with Playwright and Chrome DevTools MCP (journeys, console, network, performance).
disable-slash-command: true
---


# Browser QA: Playwright + Chrome DevTools MCP

**Playwright answers "does the journey work?" DevTools answers "is the runtime healthy?"** A browser-visible change is browser-verified only when both have run. See the completion gate at the end.

## 1. Discover capabilities (never assume)

| Capability | How to detect | Preference order |
|---|---|---|
| Playwright | Project has `@playwright/test` / `playwright.config.*` (see `.forge/context.json`); or Playwright MCP tools are in your tool list (e.g. `mcp__playwright__browser_navigate`) | 1. project's Playwright suite 2. Playwright MCP 3. project's other E2E framework (Cypress) for journeys only |
| Chrome DevTools MCP | Tools such as `mcp__chrome-devtools__list_console_messages`, `list_network_requests`, `performance_start_trace` are in your tool list | Only source for DevTools evidence |
| Antigravity built-in browser subagent | Host provides it | May drive journeys; still needs DevTools MCP for runtime evidence unless it exposes console and network |

- Do **not** install a second browser-automation framework when one exists. If the project has no Playwright and no MCP, do not add `@playwright/test` without authorization. Report `UNAVAILABLE`.
- If a capability is missing, say how to enable it (see `references/setup.md`) and continue with what is available.

## 2. Start the app safely

1. Use the project's documented dev or start command from `.forge/context.json` and the README. Run it in the background. Wait until the URL responds (poll with curl or a navigation; no blind sleeps).
2. Use local or test environments only. Use test accounts, seeded data and sandbox payment keys. Never use production accounts, real payments, or production data mutations.
3. If the app needs secrets or services you lack (DB, OAuth), report `NOT RUN` with the reason. Do not fake it.
4. Stop the servers you started when you finish.

## 3. Playwright: journeys

- Cover the **affected workflow end to end**, plus the 1 or 2 adjacent journeys most at risk of regression.
- For each step, verify the user-visible outcome (text, URL, enabled state), not just the absence of exceptions.
- Exercise the states: loading, empty, success, validation error, server error. Use route mocking for error states when the suite supports it.
- Viewports for layout changes: **390×844** (mobile), **768×1024** (tablet), **1440×900** (desktop), or the project's own breakpoints.
- Locators: `getByRole` > `getByLabel` > `getByText` > `getByTestId`. Avoid CSS/XPath chains, nth-child and arbitrary `waitForTimeout`. Use web-first assertions (`expect(locator).toBeVisible()`).
- Take screenshots of key states and before/after for UI changes. Capture traces on failure when the config supports it.
- Persist reusable tests in the project's E2E folder following its conventions, when appropriate. Don't duplicate existing coverage.
- Through the MCP: navigate → `browser_snapshot` (accessibility tree) → interact by element ref → re-snapshot to assert.

## 4. Chrome DevTools MCP: runtime diagnostics

For each affected page, after exercising it:
1. **Console:** `list_console_messages`. Classify errors and warnings as *new* (caused by the change), *pre-existing* or *third-party*.
2. **Network:** `list_network_requests`, then `get_network_request` for failures. Check status codes, failed resources, CORS errors, unexpected payload shapes, duplicate or chatty calls. **Redact** auth headers, cookies and tokens.
3. **Rendering:** `take_snapshot` / `take_screenshot`. Use `evaluate_script` for layout checks (overflow, hidden focus outlines). Use `emulate` / `resize_page` for viewport and CPU or network throttling.
4. **Performance** (perf tasks or heavy pages): `performance_start_trace` → reload or interact → `performance_stop_trace` → `performance_analyze_insight` (LCP, CLS, INP-related insights, long tasks). Use `lighthouse_audit` when available for an a11y/SEO/best-practice snapshot. Compare before and after with the same conditions.
5. **Root cause:** for every problem, trace the symptom to code (`file:line`) before proposing a fix. Use logpoints (`set_logpoints`) or `evaluate_script` instead of guessing.

## 5. Fix loop

When an issue is caused by the change, hand it back with evidence: steps, expected vs actual, console or network excerpt, `file:line` hypothesis. After the fix, **re-run the failed journeys and their DevTools checks**. The retest scope is in the efficiency budget below.

## Efficiency budget

Browser passes were the most expensive part of measured FORGE runs: up to 71 turns. Every call re-reads the whole context, so fewer, denser calls are faster and cheaper:
- **Reuse the app URL from the work order.** Start a server only if none was given, and use a free port so you don't collide with the user's running apps.
- **Prefer `browser_snapshot` / `take_snapshot`** (a text accessibility tree) for assertions. Take screenshots only as evidence: at most about 3 per pass (before, after, one failure).
- **Batch checks.** Use one `browser_evaluate` / `evaluate_script` that returns several facts at once (text, counts, focus target, overflow), instead of one call per fact. Read the console and network once per page, after the journey.
- **Cover viewports efficiently.** Run the full journey at one viewport, then only layout assertions at the others.
- **On retest (work order says RETEST), re-run only the failed journeys** plus the one adjacent journey most likely to regress:
  - Use one viewport, unless the fix delta touches layout or CSS.
  - Read the console and network once.
  - Take no new screenshots except the "after" evidence for each fixed issue.
  - Aim for about 10 tool calls. Do not repeat journeys that passed and that the delta does not touch.
- **Aim for about 25 tool calls per pass.** If you need more, report what is still unverified instead of grinding.

## 6. Report

```
BROWSER QA
Playwright: <source: project suite | MCP | unavailable> — journeys: <list with PASSED/FAILED>; viewports: <list>; artifacts: <screenshots/traces paths>
DevTools MCP: <connected | UNAVAILABLE> — console: <new errors or "none new">; network: <failed requests or "none">; runtime: <…>; performance: <metrics or N/A>
Issues: <id — severity — evidence — status (fixed/open)>
Retests: <what was re-run after fixes>
Verdict: browser-verified | implemented, not browser-verified (<missing capability>)
```

## Completion gate

- **browser-verified** requires Playwright journeys `PASSED` and a DevTools inspection showing no new errors attributable to the change.
- Missing Playwright or a missing DevTools MCP connection means the verdict is **not browser-verified**, stated as a verification limitation. It is never a silent pass.
