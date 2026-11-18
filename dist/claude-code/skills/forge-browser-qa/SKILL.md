---
name: forge-browser-qa
description: Real-browser QA with Playwright and Chrome DevTools MCP (journeys, console, network, performance).
user-invocable: false
---

# Browser QA: Playwright + Chrome DevTools MCP

**Playwright answers "does the journey work?" DevTools answers "is the runtime healthy?"** A browser-visible change is browser-verified only when both have run. See the completion gate at the end.

## 0. Preconditions: the pre-browser gate

You verify only code whose static checks and tests passed. **Your first command, every pass, retests included:** `node "<FORGE_HOME>/scripts/validation-gate.mjs" gate --task <slug>` (`<FORGE_HOME>` = the sibling `forge` skill). It takes about a second, and it catches a work order sent before the checks ran. Exit 0 means OPEN. On anything else, return `STATUS: blocked` with its output and open no browser. The exception is bug reproduction before a fix exists.

Native apps (React Native, Expo, Flutter, Android, iOS) are verified on an emulator, simulator or device ([references/device-verification.md](references/device-verification.md)); browser tools cover only what really runs in a browser.

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

Mandatory when capture works. Save screenshots of the implemented behavior, not the homepage:
- each affected journey's final state;
- the success and error states the acceptance criteria name;
- one per viewport for layout changes;
- the "after" of each fixed issue;
- a "before", only when one was taken.

Where and how:
- **Folder:** `.forge/tasks/<slug>/evidence/{screenshots,network,traces,playwright,reports}` (`validation-gate.mjs evidence --task <slug> --init`).
- **Capturing:** DevTools `take_screenshot` writes there directly via `filePath`. Copy Playwright MCP output in. Cite project-suite reports and traces where they are.
- **Names** describe the content (`after-checkout-error-390x844.png`), with one line each in `evidence/index.md`: file — what it shows — page/workflow — viewport.
- **Check:** `validation-gate.mjs evidence --task <slug>` must exit 0; cite only the links it prints. A screenshot never proves backend correctness.

## Efficiency budget

Browser passes were the most expensive part of measured FORGE runs: up to 71 turns. Every call re-reads the whole context, so fewer, denser calls are faster and cheaper:
- **Reuse the app URL from the work order.** Start a server only if none was given, and use a free port so you don't collide with the user's running apps.
- **Prefer `browser_snapshot` / `take_snapshot`** (a text accessibility tree) for assertions. Screenshots are for evidence only: the list above, usually 3–8 per pass, never one per assertion.
- **Batch checks.** Use one `browser_evaluate` / `evaluate_script` that returns several facts at once (text, counts, focus target, overflow), instead of one call per fact. Read the console and network once per page, after the journey.
- **Batching never replaces DevTools.** Console or network listeners inside a Playwright script (`browser_run_code`) are journey evidence, not DevTools evidence. When the Chrome DevTools MCP tools are in your list, open the page with them and call `list_console_messages` and `list_network_requests` at least once per pass. Without that call, the verdict is "implemented, not browser-verified".
- **Cover viewports efficiently.** Run the full journey at one viewport, then only layout assertions at the others.
- **On retest (work order says RETEST), re-run only the failed journeys** plus the one adjacent journey most likely to regress:
  - Use one viewport, unless the fix delta touches layout or CSS.
  - Read the console and network once.
  - Take no new screenshots except the "after" evidence for each fixed issue.
  - Aim for about 10 tool calls. Do not repeat journeys that passed and that the delta does not touch.
- **Aim for about 30 tool calls per pass**, including evidence capture. If you need more, report what is still unverified instead of grinding.
- **Too many journeys?** If the work order lists more than about 4 journeys, or more than one viewport for full journeys, run the highest-risk 4 at one viewport and report the rest as NOT RUN (scope). Don't try to fit them all in.
- **Keep the session reusable.** Right after setup, write `.forge/tasks/<slug>/evidence/qa-session.md` (the folder is git-ignored). Include:
  - the app URL;
  - the servers you started;
  - the throwaway local test account (email and password; only ones you created on a local `.test`-style domain, never a real account).
  A retest or continuation reads it first instead of registering a new user.
- **Save as you go.** After each journey, append its verdict and evidence paths to `.forge/tasks/<slug>/reports/forge-browser-qa.md`. If you hit the turn cap, the work done so far is not lost.

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
