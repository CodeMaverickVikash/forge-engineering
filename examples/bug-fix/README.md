# Example: bug fix (size S)

```
/forge The task board shows the wrong number of remaining tasks. Fix it.
```
Fixture: `tests/fixtures/web-tasks`. The seeded defect is that the counter counts completed tasks.

## Expected flow
1. **Understand.** Type: bug fix. Size: S (one obvious defect, one file). Browser-visible: yes.
2. **Explore.** `detect-stack.mjs` reports a Node web app with `npm test`, then FORGE reads `public/app.js` → `render()`.
3. **Reproduce.** The seed data has 1 done and 2 open tasks, but the UI shows "1 task remaining".
4. **Fix.** FORGE fixes it directly (S) or through `forge-frontend-engineer`: `filter(t => t.done)` becomes `filter(t => !t.done)`. A regression test is required; if the logic is untestable in place, FORGE extracts the smallest testable seam (for example a small helper module) rather than widening the change.
5. **Verify.** G1 `npm test`. G10 is always delegated to `forge-browser-qa`, even though FORGE fixed the code itself: a Playwright journey (load, toggle, check the counter) plus DevTools console and network checks.
6. **Review.** `forge-code-reviewer` always reviews the diff against the AC and runs the scope check.
7. **Answer.** What caused the wrong count, what changed, and how the counter behaves now, ending with the status line. The full FORGE Execution Report is saved in `.forge/tasks/<slug>/report.md`. Git: the fix and its regression test, uncommitted.

## What to check
- The diff touches only the counter logic in `public/` (in `app.js` or an extracted helper) plus the regression test.
- `forge-browser-qa` and `forge-code-reviewer` both ran.
- The browser QA verdict is either *browser-verified* with MCP evidence, or *implemented, not browser-verified* with the reason.

Real results: [`tests/e2e/results/bug-fix/`](../../tests/e2e/results/bug-fix/).
