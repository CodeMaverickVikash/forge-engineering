### FORGE Execution Report

**Task**
The task board showed the wrong number of remaining tasks. Size: S (one defect, plus a small seam so it can be tested).

**Enhanced specification**
The `#remaining` header must show the number of tasks that are not done. It must read "1 task remaining" in the singular and "0 tasks remaining" when everything is done.

**Project understanding**
This is a zero-dependency Node task board: `server.mjs` plus static files in `public/`. Tests run with `node --test`. `app.js` is already loaded as an ES module.

**Specialists involved**
`forge-code-reviewer` and `forge-browser-qa` ran in parallel. I made the fix myself, since it is S-size.

**Skills & capabilities**
The `forge-project-exploration` detector, plus Playwright MCP and Chrome DevTools MCP (used by browser QA).

**Implementation**
- **Root cause:** `public/app.js:12` counted `t.done` (finished tasks) instead of `!t.done`.
- **Fix:** I added `public/remaining.js`, which exports `countRemaining(tasks)` and counts `!t.done`. `app.js` now imports and uses it. I also removed a comment the reviewer flagged as redundant.
- **Tests:** I added `test/remaining.test.mjs` with 3 regression tests.

**QA and verification**

| Gate | Result |
|---|---|
| `npm test` | PASS, 6/6 (3 existing, 3 new) |
| New tests fail on the old logic | PASS (reviewer reverted to `t.done` and they failed) |
| Browser QA | PASS |
| Independent review | approve-with-fixes; the nit is fixed, the minor is accepted (see Issues) |
| Line endings | PASS |
| Lint, typecheck, build | N/A, none configured |

I re-ran `npm test` and the line-ending check myself after the last edit.

**Browser QA**
The check ran in a real browser at 1440x900.
- **Initial load:** the header read "2 tasks remaining".
- **Toggling tasks:** it read 1 (singular), then 0, then 1, then 2.
- **Add and delete:** counts were correct for both.
- **Module files:** `/app.js` and `/remaining.js` returned 200 with `text/javascript`.

**Issues**
- **Reviewer minor, accepted:** the unit tests cover `countRemaining`, not the call in `app.js`. Browser QA covered that call.
- **Not changed, already in the repo:**
  - `/favicon.ico` returns 404, which logs one console error.
  - `app.js` puts task titles into `innerHTML` unescaped, which is an XSS risk.

**Assumptions**
Moving the count into its own module was the smallest way to make it testable. `app.js` reads the DOM as soon as it loads, so a Node test cannot import it directly.

**Remaining work**
Optional follow-ups: escape task titles and add a favicon.

**Git status**
- **Modified:** `public/app.js`.
- **New:** `public/remaining.js` and `test/remaining.test.mjs`.
- **Already staged:** the other files were staged before I started.
- **Cleanup:** I deleted a stray `.playwright-mcp/` log folder that browser QA left behind.

No commit, push, or pull request was created.

The full report is also saved at `.forge/tasks/fix-remaining-count/report.md`.
