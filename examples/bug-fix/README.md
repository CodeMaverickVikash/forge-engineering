# Example: bug fix (size S)

```
/forge The task board shows the wrong number of remaining tasks. Fix it.
```
Fixture: `tests/fixtures/web-tasks`. The seeded defect is that the counter counts completed tasks.

## Expected flow
1. **Understand.** Type: bug fix. Size: S (one obvious defect, one file). Browser-visible: yes.
2. **Explore.** `detect-stack.mjs` reports a Node web app with `npm test`, then FORGE reads `public/app.js` → `render()`.
3. **Reproduce.** The seed data has 1 done and 2 open tasks, but the UI shows "1 task remaining".
4. **Fix.** FORGE fixes it directly (S) or through `forge-frontend-engineer`: `filter(t => t.done)` becomes `filter(t => !t.done)`. It adds a regression test, or explains why the code is untestable and proposes the smallest seam.
5. **Verify.** G1 `npm test`. G10 `forge-browser-qa`: a Playwright journey (load, toggle, check the counter) plus DevTools console and network checks.
6. **Review.** `forge-code-reviewer` reviews the diff against the AC and runs the scope check.
7. **Report.** A FORGE Execution Report. Git: 1 or 2 files modified, no commit.

## What to check
- The diff touches only `public/app.js`, plus a test if one was added.
- The browser QA verdict is either *browser-verified* with MCP evidence, or *implemented, not browser-verified* with the reason.

Real results: [`tests/e2e/results/bug-fix/`](../../tests/e2e/results/bug-fix/).
