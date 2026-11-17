### FORGE Execution Report

**Task:** Let users edit the title of an existing task.

**Enhanced specification:** Added `PATCH /api/tasks/:id` (`{title}`; trims; 400 on blank/invalid, 404 on unknown id, validation first) and inline editing in the board: an Edit button per row opens a prefilled input with Save/Cancel, Enter saves, Escape cancels, blank and server errors show inline and stay in edit mode. All titles rendered into HTML are now escaped, since editable titles make stored XSS reachable. Spec and plan: `.forge/tasks/edit-task-title/`.

**Project understanding:** Tiny zero-dependency Node app. `server.mjs` has an in-memory store plus a plain `http` router, and `public/` is vanilla JS with event delegation and innerHTML rendering. Tests use `node --test`. No lint, typecheck, build or CI exist.

**Specialists involved:** Mode A, native subagents: forge-backend-engineer, forge-frontend-engineer, forge-browser-qa (twice: full pass, then retest after a fix), forge-code-reviewer. Skills loaded by me: project exploration (detector run). Not used: architect, security, tech-writer and other roles, because the change is small and the XSS point was handled in the spec and review.

**Implementation:**
- `store.rename`, the PATCH route and 6 new API tests.
- Inline edit UI, `escapeHtml`, and edit styles.
- Files changed (`git diff --stat`): `server.mjs` +8, `test/api.test.mjs` +42, `public/app.js` +143/-2, `public/styles.css` +6.
- Architecture decisions: PATCH rather than PUT, for a partial update. Trim on edit only, leaving POST behaviour untouched. Editing state is a single module-level `editing` object, so only one row can be edited at a time.

**QA and verification:**
| Gate | Command / method | Status | Evidence |
|------|------------------|--------|----------|
| Tests | `npm test` (re-run by me after the final edits) | PASSED | tests 9, pass 9, fail 0 |
| Syntax | `node --check public/app.js` | PASSED | no output |
| Lint / typecheck / build | none configured | N/A | no such scripts |
| Browser QA (G10) | Playwright + DevTools MCP | PASSED | see below |
| Independent review (G13) | forge-code-reviewer | APPROVE-WITH-FIXES | no blockers; 1 applied, others listed below |
| Regression test for the bug found in QA | none | NOT ADDED | BUG-1 is front-end only and the project has no DOM test harness; it was covered by a browser retest instead |

**Browser QA:**
- Playwright: all of these passed:
  - Edit+Save, persisting after reload, Cancel, Enter and Escape.
  - Blank and whitespace titles, an unchanged title, and the server-error path (404 shown inline).
  - XSS title `<img src=x onerror=...>` inert in the span, input and aria-labels, including after editing.
  - Quotes round-trip, and toggle, add and delete during an edit with the draft preserved.
  - Layout at 390 and 1440 px with no overflow (first pass only).
- Chrome DevTools MCP: no console errors. The only failed requests were `/favicon.ico` 404 (pre-existing) and the intentional PATCH 404 in the error-path test.
- Verdict: browser-verified. The retest after the fix used desktop width only. 390 and 1440 were verified before it, and the fix did not touch layout.

**Issues:**
- Identified: BUG-1 (found by browser QA). Switching from editing row A to row B carried A's unsaved draft into B's input, and Save would overwrite B's title.
- Fixed: BUG-1, with an id guard on the draft capture in `render()` (`public/app.js:49`), retested forward and reverse. Also fixed the reviewer's finding that a click on the edit form's own gap triggered a needless refetch and focus loss, and retested.
- Unresolved / limitations (all minor, not applied):
  - After a successful save, a failed reload of the list gives no feedback. This matches how existing `load()` behaves.
  - Re-render triggered by another row's toggle, add or delete keeps the draft but loses input focus and caret.
  - Escape during IME composition cancels the edit.
  - `li span { overflow-wrap: anywhere; }` is a small unrequested CSS addition, for long titles.
  - No automated test covers the UI or escaping, because there is no DOM harness.

**Assumptions:**
- "Edit" means title only (`done` untouched).
- Blank titles are rejected on edit. POST still accepts blank titles, unchanged.
- No auth or concurrency concerns, since the store is in-memory and single-user.

**Remaining work:** Pre-existing and out of scope, not touched: the "N tasks remaining" count is inverted (`public/app.js:12` counts `t.done`, so it should be `!t.done`). It is a one-line fix if you want it. Also pre-existing: POST accepts blank titles, the delete button's accessible name is just "x", and there is no favicon.

**Git status:** Branch `master`; 4 files modified on top of the staged initial files, 0 added by this change, 0 deleted (uncommitted). `.claude/` is untracked and was there before. No commit, push, or pull request was created.

The full report is saved at `.forge/tasks/edit-task-title/report.md`.
