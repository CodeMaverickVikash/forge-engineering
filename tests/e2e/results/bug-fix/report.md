### FORGE Execution Report

**Task:** The task board shows the wrong number of remaining tasks (size S).

**Root cause:** `render()` in `public/app.js` counted done tasks (`filter(t => t.done)`) instead of not-done ones. The seed data (1 done, 2 open) therefore showed "1 task remaining" instead of 2.

**Changes (uncommitted):**
- `public/remaining.js` (new): a small pure helper, `countRemaining(tasks)`, that counts `!t.done`. I extracted it because `app.js` runs against the DOM on load, so a test can't import it.
- `public/app.js`: imports the helper and uses it. The 2-line diff drops the old inline filter and its comment.
- `test/remaining.test.mjs` (new): 3 regression tests covering the seed data, empty and all-done boards, and counts after toggling.

**Verification:**
- `npm test`: 6 of 6 pass (3 existing, 3 new). With the bug put back, all 3 new tests failed.
- Browser QA (Playwright): the counter read "2 tasks remaining" on load, "1 task remaining" after checking a task, and "2 tasks remaining" after adding one. The only console error is a favicon 404 that was already there and is unrelated.
- Independent review (`forge-code-reviewer`): approved with no blockers. It left two nits that need no action.
- The review ran as a separate agent. QA and the fix were done by me directly, not by other specialists.

**Notes:**
- I started a local server on port 4173 for QA and stopped it afterwards. I also deleted the `.playwright-mcp` scratch folder.
- The tests exercise the helper, not `render()` itself, because there's no DOM test harness. The browser run covers the wiring.
- I wrote a short summary to `.forge/tasks/fix-remaining-count/report.md`.

No commit, push, or pull request was created.
