### FORGE Execution Report

**Task:** Let users edit the title of an existing task. Size M (new endpoint = public contract, plus UI).

**Enhanced specification:** `.forge/tasks/edit-task-title/spec.md`. Frozen contract: `PATCH /api/tasks/:id` with `{title}`. It returns 200 and the updated task (title trimmed, id/done unchanged), 400 for a blank, non-string or invalid-JSON title, and 404 for an unknown id. UI: an Edit button per row opens an inline input with Save and Cancel (Enter saves, Esc cancels). A blank title shows an inline error and sends no request. All titles are HTML-escaped. AC1 to AC10 are in the spec.

**Project understanding:** Zero-dependency Node `http` server (`server.mjs`, in-memory store) plus a vanilla JS UI in `public/`. Tests are `node:test` API tests run with `npm test`. There is no UI test harness, no CI and no lint script. `render()` rebuilds `innerHTML` on every `load()`, so edit state is kept in module variables.

**Specialists involved:** `forge-backend-engineer`, `forge-frontend-engineer` (two runs: implementation, then a fix cycle), `forge-browser-qa` (three runs), `forge-code-reviewer` (three runs). FORGE did the exploration, spec, plan, a README line, and the final fix for the focus regression and line endings. No discovery specialists were used; the codebase was 164 lines and I read all of it. Specialists ran as native subagents (Mode A).

**Skills & capabilities:** The stack detector ran (`.forge/context.json`). Playwright MCP and Chrome DevTools MCP were both available and used. No skill discovery was run and nothing was installed.

**Implementation:**
- `server.mjs`: `store.rename(id, title)` and the `PATCH /api/tasks/:id` route (+7 lines).
- `test/api.test.mjs`: 3 new tests covering trim with id/done unchanged and GET reflecting it, 404, and 7 kinds of invalid body with the title left unchanged (+26).
- `public/app.js`: inline edit UI.
  - Edit state lives in module variables and survives a background reload.
  - `escapeHtml` is used for every title render path.
  - Focus handling and a save-in-flight guard.
  - 400, 404 and network errors are handled.
  - IME-safe Enter.
  - After a save, the UI updates immediately from the cache and reloads in the background.
- `public/styles.css`: edit-row styles, a long-title wrap rule, and a focus ring scoped to the edit controls only.
- `README.md`: one line describing the feature.
- Total diff: 175 insertions and 6 deletions across 5 files.

**QA and verification:**

| Gate | Result | Evidence |
|---|---|---|
| Unit/API tests | PASS | `npm test`: 6 of 6 pass (3 existing, 3 new). I re-ran them myself after the last change. |
| Syntax check | PASS | `node --check` on `public/app.js` and `server.mjs` |
| Lint / typecheck / build | N/A | The project has no such scripts. |
| Regression test for the feature | PASS | The new API tests cover the PATCH contract. UI behavior has no harness, so it is covered by browser QA only. |
| Browser QA (G10) | PASS | See below |
| Independent review (G13) | PASS | Final verdict: approve. Earlier rounds: approve-with-nits, then approve-with-fixes. All substantive findings were fixed. |
| Diff hygiene | PASS | `git diff --check` is clean, all files are LF, and there are no unrelated or untracked files. |

**Browser QA:**
- Tools: Playwright MCP for journeys and Chrome DevTools MCP for console, network and runtime checks.
- Round 1, full feature: all 10 journeys passed at 1440, 768 and 390 px. They covered the edit/save/cancel flow, blank-title error, one row editing at a time, the 404 path, XSS and quote escaping, a 300-character unbroken title, and toggle/delete/add regression.
- Round 2, after the fix cycle: it found **F1 (medium)**. After a successful save the background refresh dropped focus to `body`, which loses context for keyboard users.
- I fixed F1 in `render()`.
- Round 3, retest: all journeys passed.
  - Focus lands on the row's Edit button after both Enter and the Save button.
  - Also verified: a delayed PATCH (mid-save Edit/Esc/Cancel ignored), the 404 path, an aborted reload after a successful PATCH, blank-title save, and Esc/Cancel sending no request.
  - Toggle, delete and add are not affected by the focus logic.
- Console: no errors caused by the feature. The only entries were the pre-existing `/favicon.ico` 404 and errors the tests injected on purpose.
- Verdict: **browser-verified**.

**Issues:**
- Found and fixed:
  - Save-in-flight race clobbering another row's edit.
  - The global `focus-visible` rule changing existing controls.
  - Enter during IME composition submitting.
  - A silent stale UI when the reload fails after a successful save.
  - The focus-loss regression F1.
  - CRLF line endings introduced by an agent write (the diff was 198 changed lines in `app.js` instead of about 134; converted back to LF).
- Open, not fixed:
  - Nit: a `load()` started before a save could resolve after it and briefly show the old title until the next refresh.
  - Nit: `li span` styling is broader than needed.
  - Low: Safari and Firefox on macOS don't focus a button on click, so after a delete, focus could return to a previously focused Edit button. This was not tested.

**Assumptions:**
- An Edit button with an inline input was chosen over double-click, for keyboard and screen-reader access.
- PATCH validates and trims the title, and blank titles are rejected.
- A bad body on an unknown id returns 400 rather than 404. The spec didn't set an order.
- POST behavior is unchanged, so it still accepts blank titles.
- The existing unescaped `${t.title}` was fixed only in the markup this change touches, because editing makes titles user-mutable and puts them in an input value.

**Remaining work:**
- Pre-existing, left alone as out of scope:
  - "N tasks remaining" counts done tasks (`public/app.js`, `open = tasks.filter((t) => t.done)`, should be `!t.done`).
  - POST accepts blank titles.
  - No request-body size or title-length cap.
  - No favicon.
- There is no automated UI test harness. UI behavior is verified through browser QA only.
- Optional: a sequence counter in `load()` to ignore stale responses.

**Git status:** Changed files, all uncommitted: `README.md`, `public/app.js`, `public/styles.css`, `server.mjs`, `test/api.test.mjs`. `.forge/` is git-ignored workspace (spec, plan, report, knowledge). No commit, push, or pull request was created.
