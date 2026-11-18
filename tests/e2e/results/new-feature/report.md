# FORGE Engineering Report

**Task**
Let users edit the title of an existing task. Size: S/M (one feature across server, UI and tests; low risk, no auth, data or schema changes). It is implemented, tested, and browser-verified.

**Enhanced specification**
- **API:** `PATCH /api/tasks/:id` with `{title}`.
  - The title is trimmed.
  - A missing, non-string, empty or whitespace title, or malformed JSON, returns `400`.
  - An unknown id returns `404`.
  - Success returns `200` with the updated task. `done` and `id` are unchanged.
- **UI:** each row has an **Edit** button that swaps the title for an input with Save and Cancel.
  - Enter or Save commits. Esc or Cancel discards.
  - An empty title shows an inline error and stays in edit mode.
- **Safety:** task titles are now HTML-escaped when rendered.
- No written `spec.md` or `plan.md`, per the S-size path.

**Project understanding**
- Zero-dependency Node app: `server.mjs` (in-memory store plus a `node:http` router), vanilla JS in `public/`, tests on `node:test`.
- The stack detector ran (`.forge/context.json`).
- Test command is `npm test`. There is no CI, no linter and no build step.

**Specialists involved**
- `forge-code-reviewer`, two rounds, independent.
- `forge-browser-qa`, two rounds, with Playwright MCP and Chrome DevTools MCP.
- I implemented it myself under the S-size rule. The other core-team specialists were not used, because the change was small and had no data, auth or infra risk.

**Skills & capabilities**
- Used `forge-project-exploration` and the stack detector.
- Skill discovery against the web was not run, because there was no capability gap. Nothing was installed.

**Implementation**
- `server.mjs`: added `store.rename()` and a `PATCH` branch in the router.
- `public/app.js`: added edit state (`editingId`, `draft`).
  - Added `startEdit`, `stopEdit` and `saveEdit`, with try/catch around the fetch.
  - Focus returns to the row's Edit button after Save, Cancel or Esc.
  - Added `escapeHtml`, applied to the title text, the input value and the aria-label.
- `public/styles.css`: styles for the edit row and error.
- `test/api.test.mjs`: 3 new tests.
- `README.md`: documents the new endpoint and the UI behaviour.
- Fixes made after review and QA:
  - Clicking inside the edit input, or toggling, adding or deleting another row, wiped the draft. The draft is now preserved.
  - A network failure on save threw an uncaught error. It now shows an inline message.
  - Esc did not work from the Save and Cancel buttons.
  - IME Enter saved too early.
  - A stale-session race in `saveEdit`, and a `draft` state leak in `load()`.
  - The edit input had no `name`.

**QA and verification**

| Gate | Result | Evidence |
|---|---|---|
| Unit/API tests | PASS | `npm test`: 6/6 (3 new: rename and trim, rejects bad titles, 404). Re-run by me after the last edit. |
| Syntax check | PASS | `node --check public/app.js` |
| Typecheck, lint, build | N/A | None configured in the project. |
| Regression test for the feature | PASS | The 3 new API tests. The UI has no test harness. |
| Browser QA (G10) | PASS | Two rounds, details below. |
| Independent review (G13) | PASS with caveat | Round 2: approve-with-fixes, no blockers. |
| Scope check | PASS | `git diff --stat`: 5 files, +127/−4, all related to the feature. |

**Browser QA**
- **Round 1:** all 9 journeys passed.
  - Edit and persist, Enter, Esc and Cancel, and empty validation.
  - XSS payload and quotes rendered literally, with no script executed.
  - A done task kept its strike-through.
  - A 300-character title at 1280px and 375px did not overflow.
  - Keyboard focus, and the console and network.
  - It found defects D1–D5, which I fixed.
- **Round 2:** re-verified D1–D5 plus the regressions. All passed with no new console errors.
  - Only the pre-existing `/favicon.ico` 404 and the deliberately injected failures appeared.
- **Not re-browser-tested:** the last small edit. It added `name="edit-title"` and two state guards, and its checks were the syntax check and `npm test`.

**Issues**
- **Pre-existing bug, not fixed (out of scope):** `public/app.js` counts *done* tasks as "N tasks remaining" (`filter((t) => t.done)`). It should count the open ones.
- **Pre-existing:** `POST /api/tasks` does not trim or reject empty titles, so create and rename now differ.
- **Reviewer nits not applied:**
  - Focus and caret are lost if another row is toggled or deleted while editing; the draft is kept.
  - Cancel during an in-flight save does not abort the save.
  - Safari IME `keyCode 229`.
  - The error message is not cleared when typing resumes.
  - A save that hits a 404 exits edit mode silently.
  - The `x` delete button has no accessible name (pre-existing).
- There is no automated UI test, because the repo has no frontend test setup.

**Assumptions**
- Editing the title only; `done` is untouched.
- An empty title after trimming is invalid.
- No maximum title length was added; none exists for create either.
- I escaped titles in `render()` even though that is outside the literal request. The edit input needed it, and the old code was an XSS risk.

**Remaining work**
- Fix the "remaining" counter bug.
- Make create match rename (trim and reject empty titles).
- Consider adding a frontend test harness.

**Git status**
- Modified: `server.mjs`, `public/app.js`, `public/styles.css`, `test/api.test.mjs`, `README.md`. All are uncommitted.
- `.forge/` is ignored by its own `.gitignore`.

No commit, push, or pull request was created.
