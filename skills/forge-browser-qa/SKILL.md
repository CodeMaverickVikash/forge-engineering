---
name: forge-browser-qa
description: Real-browser QA with Playwright and Chrome DevTools MCP (journeys, console, network, performance).
user-invocable: false
---

# Browser QA: Playwright + Chrome DevTools MCP

**Playwright answers "does the journey work?" DevTools answers "is the runtime healthy?"** A browser-visible change is browser-verified only when both have run. See the completion gate at the end.

## 0. Preconditions: the pre-browser gate

`<FORGE_HOME>` is the `forge` skill directory, a sibling of this skill (`../forge/`). Browser and device verification come **after** static checks and automated tests. Before your first browser call, confirm that the work order says the gate is OPEN, or run the command it gives you: `node "<FORGE_HOME>/scripts/validation-gate.mjs" gate --task <slug>`, which exits 0 when OPEN. If the gate is CLOSED or BLOCKED, stop and return `STATUS: blocked` with the gate output. Never verify code whose checks are failing or stale.

Native mobile apps (React Native, Expo, Flutter, Android, iOS) are verified on an emulator, simulator or device: follow [references/device-verification.md](references/device-verification.md). Use browser tools only for the parts that really run in a browser (e.g. Expo web).

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
- Take evidence screenshots of the implemented behavior (see Evidence below), with before/after for UI changes. Capture traces on failure when the config supports it.
- Persist reusable tests in the project's E2E folder following its conventions, when appropriate. Don't duplicate existing coverage.
- Through the MCP: navigate → `browser_snapshot` (accessibility tree) → interact by element ref → re-snapshot to assert.

## 4. Chrome DevTools MCP: runtime diagnostics

For each affected page, after exercising it:
1. **Console:** `list_console_messages`. Classify errors and warnings as *new* (caused by the change), *pre-existing* or *third-party*.
2. **Network:** `list_network_requests`, then `get_network_request` for failures and for the API calls the change touches. Check status codes, failed resources, CORS errors, request payloads, response structure, error handling, auth (a protected call without a session must fail), and duplicate or chatty calls. **Redact** auth headers, cookies and tokens. Save the redacted request and response of any finding to `evidence/network/<finding>.json`.
3. **Rendering:** `take_snapshot` / `take_screenshot`. Use `evaluate_script` for layout checks (overflow, hidden focus outlines). Use `emulate` / `resize_page` for viewport and CPU or network throttling.
4. **Performance** (perf tasks or heavy pages): `performance_start_trace` → reload or interact → `performance_stop_trace` → `performance_analyze_insight` (LCP, CLS, INP-related insights, long tasks). Use `lighthouse_audit` when available for an a11y/SEO/best-practice snapshot. Compare before and after with the same conditions.
5. **Root cause:** for every problem, trace the symptom to code (`file:line`) before proposing a fix. Use logpoints (`set_logpoints`) or `evaluate_script` instead of guessing.

## 5. Fix loop

When an issue is caused by the change, hand it back with evidence: steps, expected vs actual, a screenshot, console or network excerpt, `file:line` hypothesis. The fix then goes through the automated checks and the pre-browser gate again **before** your retest; the work order confirms it. After the fix, **re-run the failed journeys and their DevTools checks** and confirm the original issue is gone. The retest scope is in the efficiency budget below.

## Evidence

Screenshots are mandatory whenever a browser or device run happened and capture works.
- **Folder:** `.forge/tasks/<slug>/evidence/`. Create it with `validation-gate.mjs evidence --task <slug> --init`; the subfolders are `screenshots/`, `playwright/`, `traces/`, `network/` and `reports/`.
- **Saving:** Chrome DevTools `take_screenshot` can write there directly (`filePath`). The Playwright MCP writes to its own output folder, so copy the file in afterwards. Project-suite traces and reports already under `test-results/` or `playwright-report/` are cited where they are, not copied.
- **What to capture:**
  - the final state of each affected journey;
  - the success and error states the acceptance criteria name;
  - one per viewport for layout changes;
  - the "after" of each fixed issue;
  - the "before", when a pre-change screenshot was taken (bug reproduction, UI audit).

  Not the homepage unless it is the change.
- **Names** say what the image shows: `after-checkout-error-390x844.png`.
- **Index:** add one line per file to `evidence/index.md`: ``- `screenshots/<file>`: <what it demonstrates> — <page/workflow> — <viewport>``.
- **Check:** before you report, run `validation-gate.mjs evidence --task <slug>`. It must exit 0, and your report cites only the links it printed. A screenshot shows what was on screen. Never present it as proof that the backend processed something correctly.

## Efficiency budget

Browser passes were the most expensive part of measured FORGE runs: up to 71 turns. Every call re-reads the whole context, so fewer, denser calls are faster and cheaper:
- **Reuse the app URL from the work order.** Start a server only if none was given, and use a free port so you don't collide with the user's running apps.
- **Prefer `browser_snapshot` / `take_snapshot`** (a text accessibility tree) for assertions. Screenshots are for evidence only: the list above, usually 3–8 per pass, never one per assertion.
- **Batch checks.** Use one `browser_evaluate` / `evaluate_script` that returns several facts at once (text, counts, focus target, overflow), instead of one call per fact. Read the console and network once per page, after the journey.
- **Cover viewports efficiently.** Run the full journey at one viewport, then only layout assertions at the others.
- **On retest (work order says RETEST), re-run only the failed journeys** plus the one adjacent journey most likely to regress:
  - Use one viewport, unless the fix delta touches layout or CSS.
  - Read the console and network once.
  - Take no new screenshots except the "after" evidence for each fixed issue.
  - Aim for about 10 tool calls. Do not repeat journeys that passed and that the delta does not touch.
- **Aim for about 30 tool calls per pass**, including evidence capture. If you need more, report what is still unverified instead of grinding.

## 6. Report

```
BROWSER QA
Gate: pre-browser gate OPEN (cycle <n>) | not open → STATUS blocked
Playwright: <source: project suite | MCP | unavailable> — journeys: <list with PASSED/FAILED>; viewports: <list>
DevTools MCP: <connected | UNAVAILABLE> — console: <new errors or "none new">; network/API: <failed or wrong requests, or "none">; runtime: <…>; performance: <metrics or N/A>
Device: <platform, emulator/simulator/physical, OS — PASSED/FAILED> | N/A | UNAVAILABLE (<why>)
Evidence: <links printed by `validation-gate.mjs evidence`, each with what it shows, page/workflow, viewport>
Issues: <id — severity — root-cause hypothesis file:line — evidence link — status (fixed/open)>
Retests: <what was re-run after fixes, and the result>
Verdict: browser-verified | implemented, not browser-verified (<missing capability>)
```

## Completion gate

- **browser-verified** requires Playwright journeys `PASSED` and a DevTools inspection showing no new errors attributable to the change.
- Missing Playwright or a missing DevTools MCP connection means the verdict is **not browser-verified**, stated as a verification limitation. It is never a silent pass.
- **Device-verified** requires the affected flows `PASSED` on a real emulator, simulator or device. A native app checked only in a browser is not device-verified.
