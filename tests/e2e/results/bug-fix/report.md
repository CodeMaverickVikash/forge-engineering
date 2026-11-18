### FORGE Execution Report

**Task:** The task board shows the wrong number of remaining tasks. Fix it. (Size S, bug fix)

**Enhanced specification:** The `#remaining` header must show the number of tasks that are not done, with correct singular/plural wording. Expected on the seed data (1 done, 2 open): "2 tasks remaining". No spec.md was written for an S task.

**Project understanding:** Zero-dependency Node task board (`server.mjs`, in-memory store, static files from `public/`) with a vanilla-JS ES-module front end. Tests use `node --test`. Root cause: `public/app.js` counted `tasks.filter((t) => t.done)`, which is the number of completed tasks. On the seed data it showed "1 task remaining" instead of 2, and the number moved the wrong way when ticking boxes.

**Specialists involved:** forge-code-reviewer (independent diff review) and forge-browser-qa (real-browser journeys). FORGE did the S-size fix and the regression test itself.

**Skills & capabilities:** Stack detector (`detect-stack.mjs`), `forge-debugging` approach (root cause, regression test), Playwright MCP and Chrome DevTools MCP (via browser QA). No skills were installed or searched for.

**Implementation:**
- `public/remaining.js` (new): `countRemaining(tasks)` returns `tasks.filter((t) => !t.done).length`. It is a small pure module, so the logic can be tested from Node.
- `public/app.js`: imports `countRemaining` and uses it in `render()`; the old inline filter and its comment are removed (3 insertions, 2 deletions).
- `test/remaining.test.mjs` (new): 3 regression tests (seed data gives 2, count follows toggling, empty and all-done lists).

**QA and verification:**

| Gate | Result | Evidence |
|---|---|---|
| Unit/integration tests | PASS | `npm test`: 6/6 (3 existing, 3 new); re-run by the reviewer, also 6/6 |
| Regression test catches the bug | PASS | Old logic returns 1 on the seed data (expected 2), so the new tests fail without the fix |
| Typecheck / lint / build | N/A | None configured in the project |
| Line endings (`verify-delta.mjs eol`) | PASS | 9 changed text files keep their endings |
| Independent review (G13) | PASS | forge-code-reviewer: approve, no blocking findings |
| Browser QA (G10) | PASS | forge-browser-qa: 6/6 journeys |

**Browser QA:** Verdict: browser-verified. Playwright and DevTools MCP both ran at the default desktop viewport only.
- Load: "2 tasks remaining".
- Tick task 2: "1 task remaining".
- Tick the rest: "0 tasks remaining".
- Untick one: "1 task remaining".
- Add a task: count +1.
- Delete an open task: count -1.
- `/remaining.js` returned 200 as `text/javascript`, with no module import error.

**Issues:**
- None caused by the change.
- Pre-existing and not fixed (out of scope):
  - `/favicon.ico` returns 404 (low).
  - `public/app.js` injects `${t.title}` into `innerHTML` without escaping, an XSS risk (medium, worth its own task).

**Assumptions:**
- "Remaining" means tasks not marked done.
- Extracting a module was the smallest testable seam, since the logic previously lived only in browser code.

**Remaining work:**
- Optional: reword `README.md:6` ("API tests") now that the suite also covers the count logic.
- Optional: separate tasks for the `innerHTML` escaping and the favicon.

**Git status:** Uncommitted: `public/app.js` modified (staged file with unstaged edits). New untracked files: `public/remaining.js`, `test/remaining.test.mjs`. The new files must be added to any commit, or the app will 404 on the `/remaining.js` import. No unrelated changes.

No commit, push, or pull request was created.

The report is also saved at `.forge/tasks/fix-remaining-count/report.md`.
