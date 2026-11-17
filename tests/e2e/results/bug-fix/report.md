### FORGE Execution Report

**Task:** The task board shows the wrong number of remaining tasks. Fix it.

**Enhanced specification:** The header "N tasks remaining" must count tasks that are NOT done, with correct singular/plural ("1 task remaining"). Root cause: `public/app.js:12` used `tasks.filter((t) => t.done)`, which counts completed tasks. On the seed data (1 done, 2 open) it showed "1 task remaining" instead of 2. Acceptance: correct count on load and after toggle/add/delete; regression test added.

**Project understanding:** Zero-dependency Node (ESM) task board. `server.mjs` serves an in-memory JSON API (`/api/tasks`, `/toggle`, `DELETE`) and static files from `public/`. The vanilla-JS frontend `public/app.js` is loaded as an ES module, and it touches the DOM at import time. Tests use `node --test` (`test/api.test.mjs`). npm; no CI, lint or build step. Task size: S.

**Specialists involved:** Native subagents (Mode A): `forge-browser-qa`, `forge-code-reviewer`. FORGE itself ran the detector (`forge-project-exploration`) and implemented the fix directly (S task, so no written spec or plan).

**Implementation:**
- Fixed the inverted filter (`t.done` → `!t.done`). Moved the count and label into a small pure module, `public/remaining.js` (`countRemaining`, `remainingLabel`), so the logic can be unit-tested without a DOM. `app.js` imports it.
- Files changed: `public/app.js` — import and call `remainingLabel(tasks)` (+3/−3, from `git diff --stat`); `public/remaining.js` — new, pure count and label helpers; `test/remaining.test.mjs` — new regression tests.
- Architecture decisions: extracted the helper to create a testable seam, because `app.js` can't be imported in Node. No other design changes.

**QA and verification:**
| Gate | Command / method | Status | Evidence |
|------|------------------|--------|----------|
| G1 Unit/API tests | `npm test` | PASSED | 6 tests, 6 pass, 0 fail (3 existing, 3 new) |
| Regression test fails on the old logic | Re-introduced `t.done` in `remaining.js`, ran `npm test` | PASSED | 3 pass / 3 fail with the bug; 6 pass after restoring the fix |
| Typecheck / lint / build | none configured | N/A | No such scripts in `package.json` |
| G10 Browser QA | `forge-browser-qa` (Playwright and DevTools MCP) | PASSED | See Browser QA |
| G13 Independent review | `forge-code-reviewer` | PASSED | Verdict: approve; no blockers |
| Scope check | `git status`, `git diff --stat` | PASSED | Only the 3 intended files changed; the browser-QA scratch folder `.playwright-mcp/` was deleted |

**Browser QA:**
- Playwright: MCP journey at the default desktop viewport (no responsive pass; no layout change). All steps passed: load → "2 tasks remaining"; tick one → "1 task remaining"; tick the last → "0 tasks remaining"; untick → "1 task remaining"; add a task → "2 tasks remaining"; delete an open task → "1 task remaining"; delete a done task → unchanged.
- Chrome DevTools MCP: no JS exceptions or module-load errors. `/app.js` and `/remaining.js` both returned 200 as `text/javascript`, and `/remaining.js` was requested with `/app.js` as referer. The only failure was a pre-existing `/favicon.ico` 404.
- Verdict: browser-verified

**Issues:**
- Identified: inverted filter at `public/app.js:12`, which counted done tasks.
- Fixed: the inverted filter; the regression tests cover it.
- Unresolved / limitations (pre-existing, out of scope, not changed):
  - `public/app.js:17` interpolates `t.title` unescaped into `innerHTML` (stored XSS).
  - `server.mjs:41` uses a loose `startsWith(PUBLIC)` path-prefix check.
  - `/favicon.ico` returns 404.
  - The new tests cover the helper, not the DOM wiring in `app.js`. The browser QA run covers that wiring.

**Assumptions:** "Remaining" means tasks not yet done. The "N task(s) remaining" wording and pluralization were kept as they were.

**Remaining work:** none for this task. Optional follow-ups: escape task titles in `app.js`, tighten the static path check, add a favicon.

**Git status:** Branch `master`; 1 file modified (`public/app.js`), 2 added (`public/remaining.js`, `test/remaining.test.mjs`) on top of the previously staged files (uncommitted). No commit, push, or pull request was created.

The report is also saved at `.forge/tasks/fix-remaining-count/report.md`.
