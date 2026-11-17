### FORGE Execution Report

**Task:** Improve the task board UI: clear loading, empty and error states, and better accessibility.

**Enhanced specification:** Add explicit loading, empty and error states (load, add, toggle, delete) to the task board and bring it to WCAG 2.2 AA. Fix the defects found on the render path: the inverted "remaining" count, XSS through unescaped titles, and unchecked failed requests. The server API is unchanged. Spec: `.forge/tasks/board-ui-states-a11y/spec.md`.

**Project understanding:** Zero-dependency Node app. `server.mjs` holds an in-memory store behind a REST API at `/api/tasks`, and serves a vanilla-JS ES-module frontend from `public/` (`index.html`, `app.js`, `styles.css`). Tests run with `node --test` and covered only the API before this change. There is no CI and no build step.

**Specialists involved:** Native subagents (Mode A). They were forge-frontend-engineer (twice: implementation, then audit fixes), forge-test-automation-engineer, forge-accessibility-specialist (static audit), forge-browser-qa (twice: full journeys, then a retest) and forge-code-reviewer. I wrote the spec and plan myself, plus two small edits: clearing a stale form error in `mutate()`, and the README test line. The only skill loaded was the forge-project-exploration detector. I skipped the architect, UX designer and product manager as unnecessary for a frontend-only change.

**Implementation:**
- **Loading:** "Loading tasks…" is painted before the first fetch, and the list has `aria-busy`. The Add button shows "Adding…" and ignores re-submits while a request is in flight.
- **Empty:** the page shows "No tasks yet. Add your first task above." and "0 tasks remaining".
- **Error:**
  - Load, add, toggle and delete failures each show a `role="alert"` message with readable text, never raw server output.
  - A failed load offers a "Try again" button, and a failed add keeps the input value.
  - The list re-syncs from the server after every mutation, and stale or out-of-order responses are dropped.
  - An empty title is rejected client-side with no request sent.
- **Accessibility:**
  - Checkboxes are labelled by the task title, and delete buttons are named "Delete task: <title>".
  - Controls have a `:focus-visible` outline and all text is at least 4.5:1 contrast (computed by the audit).
  - Delete and Add buttons and the label row are 44px; checkboxes are 24px.
  - Reduced motion is respected, the layout reflows to 320px, and the list has `role="list"` and an h2 "Tasks" heading.
  - Focus is managed after add, toggle, delete and retry, and the empty state has a single live announcer.
- **Defects fixed:** `app.js` counted done tasks as "remaining", titles were injected raw through `innerHTML` (XSS), and failed requests were never checked.
- **Files changed:**
  - `public/app.js`: state machine rewritten.
  - `public/index.html`: regions and ARIA.
  - `public/styles.css`: focus, states and responsive rules.
  - `public/view.js` (new): pure helpers.
  - `test/view.test.mjs` (new): 39 unit tests plus a served-file test.
  - `README.md`: test line.
  - `server.mjs`, `package.json` and `test/api.test.mjs` are untouched.
- **Architecture decisions:**
  - Helpers live in `public/view.js` so `node --test` can unit-test them without a DOM or new dependencies.
  - The Add button uses `aria-disabled` instead of `disabled` while posting, so it doesn't lose focus.
  - `#form-error` is always `role="alert"`, because pressing Enter in an already-focused input makes `focus()` a no-op and the message would otherwise go unannounced.

**QA and verification:**
| Gate | Command / method | Status | Evidence |
|------|------------------|--------|----------|
| G1 Tests | `npm test`, re-run by me after the final edits | PASSED | 42 tests, 42 pass, 0 fail (3 existing, 39 new) |
| Syntax | `node --check public/app.js` | PASSED | no output |
| Typecheck, lint, build | none configured | N/A | the project has no TS, linter or build |
| Regression test for count bug | `test/view.test.mjs` (3 seeded tasks, 1 done gives "2 tasks remaining") | PASSED | asserts the correct count; I did not run it against the old code to show it fails |
| Static a11y audit | forge-accessibility-specialist, contrast computed in node | PASSED after fixes | 1 serious and 5 moderate findings fixed; text at least 4.5:1, non-text at least 3:1 |
| G10 Browser QA | Playwright and Chrome DevTools MCP | PASSED | see below |
| G13 Independent review | forge-code-reviewer | APPROVE WITH NOTES | 1 major and 1 minor addressed, 1 minor not reproduced, 1 gap accepted |
| API contract | `git diff -- server.mjs` | PASSED | empty |

**Browser QA:**
- **Playwright:** 9 journeys passed.
  - Initial render and accessible names.
  - Loading, using a 2.5s delayed GET.
  - Empty state.
  - Load error with retry, and failed POST, toggle and DELETE.
  - Validation.
  - XSS payloads render as literal text, and `window.__xss` stays undefined.
  - Keyboard-only add, toggle and delete, with the focus ring visible.
  - 320, 768 and 1440px, plus a 200% zoom emulation, with no horizontal scroll.
  - Reduced motion.
  - A retest after the review fixes (Enter on an empty field, stale error clearing, add in flight) also passed.
- **Chrome DevTools MCP:** no new console errors. The only noise is the existing `/favicon.ico` 404 and the failures I injected on purpose. Lighthouse accessibility was 100 in both the normal and error states.
- **Verdict:** browser-verified. That covers Chromium only and no real screen reader.

**Issues:**
- **Identified:**
  - The inverted count, the XSS and the missing failure handling.
  - The initial loading state was never painted (audit).
  - Pressing Enter on an empty field gave no announcement (review).
  - A stale add error showed beside a toggle or delete error (QA).
  - There were duplicate announcements, and a false "list refreshed" message when the reload also failed (audit).
- **Fixed:** all of the above.
- **Unresolved / limitations:**
  - Screen-reader announcements are inferred from ARIA, not heard on NVDA, JAWS or VoiceOver.
  - Checkboxes are 24px, which meets the AA minimum but not the 44px preference. The label row and delete button are 44px.
  - A failed add followed by a failed reload shows two alerts.
  - `app.js` DOM wiring has no automated tests, because the project has no DOM test dependency. It rests on the browser QA.
  - The server still accepts empty-string titles. The API was left unchanged on purpose, and the client enforces the rule.
  - The `/favicon.ico` 404 and the missing meta description were already there.
  - The reviewer's CRLF line-ending note did not reproduce. None of the three modified files contains a carriage return.

**Assumptions:** "Improve" covers the frontend only and the API contract stays frozen. A visible "Tasks" heading and client-side title trimming are acceptable. I added no Playwright test suite, since the project has no such dependency and none was requested.

**Remaining work:** none required. Optional follow-ups are a manual screen-reader pass, and a DOM test harness if the project later accepts a dev dependency.

**Git status:** Branch `master`; 4 files modified (`README.md`, `public/app.js`, `public/index.html`, `public/styles.css`), 2 added (`public/view.js`, `test/view.test.mjs`), 0 deleted (uncommitted). `.claude/` and `.forge/` are tooling, and `.forge/` is git-ignored. No commit, push, or pull request was created.

The report is saved at `.forge/tasks/board-ui-states-a11y/report.md`.
