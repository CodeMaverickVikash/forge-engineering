Nothing has changed since the last review, so I did not launch the reviewers again. HEAD is still d87a8cc, the diff is the same, and `server.mjs` and `public/app.js` were last modified before that review started. The reviewers' findings and my own checks still apply, so the report below is unchanged, and it is saved at `.forge/tasks/review-feature-edit-title/report.md`.

# FORGE — Engineering Review Report

### 1. Review Information

| Field | Details |
|---|---|
| Review type | Current Branch Review |
| Repository | forge-e2e-branch-review-vM2AFU |
| Current branch | feature/edit-title |
| Base branch | main (confidence: high; 1 commit on this branch since the fork point) |
| PR URL | Not provided |
| Review date | 2026-11-18 |
| Changes reviewed | 2 files. Committed: `server.mjs` (+2, commit d87a8cc, range 410aa9a..HEAD). Staged: none. Unstaged: `public/app.js` (+2). Untracked: none |
| Local changes | Present |

### 2. Executive Summary

- **Overall assessment:** The PATCH happy path works, but the route has no validation or error handling. An unknown id or a malformed JSON body kills the whole Node process, and a missing or non-string title is accepted and corrupts the task. The branch adds no tests, and the unstaged change in `public/app.js` is a stray debug log.
- **Purpose of the changes:** Add `PATCH /api/tasks/:id` to rename a task (commit d87a8cc).
- **Findings:** Critical 1 · High 1 · Medium 3 · Low 3 · Info 3
- **Important risks:**
  - One anonymous request crashes the server and wipes the in-memory task list.
  - Titles are rendered through `innerHTML` unescaped, and PATCH adds another unvalidated write path to that sink.
- **Implementation quality:** Low for the new route. It is inconsistent with the sibling routes (POST, toggle, DELETE), which validate input and return 400 or 404.

**Review status:** CHANGES REQUIRED

> This is an advisory assessment by FORGE, not an approval or review submitted on the Git hosting platform.

### 3. Critical Findings

**[CRITICAL] PATCH crashes the server on an unknown id or an invalid JSON body**

- File: `server.mjs`
- Line: 20 (`rename`) and 39 (route)
- Problem: `rename` does `t.title = title` without checking that `find()` returned a task. `readBody` returns `null` on a parse failure, and the route reads `body.title` without a guard. The handler is `async` with no try/catch, so the rejection is unhandled.
- Impact: Node exits with code 1. One unauthenticated request takes the service down and loses all in-memory tasks. `toggle` and `DELETE` return 404 for the same unknown id, and POST returns 400 for a bad body.
- Reproduction / Evidence: I re-ran this myself. With `PORT=45890 node server.mjs`, `curl -X PATCH localhost:45890/api/tasks/999 -d '{"title":"x"}'` dropped the connection (curl exit 56). The server log shows `TypeError` at `server.mjs:39` and the process terminated, so a following GET got no response. The code-reviewer and security-engineer each reproduced both the unknown-id crash (`Cannot set properties of undefined`) and the invalid-JSON crash (`Cannot read properties of null`).
- Recommended fix:
  - Make `rename` return `null` for an unknown id, and have the route answer 404 `{error:'not found'}`.
  - Guard the body with `if (!body || typeof body.title !== 'string') return json(res, 400, { error: 'title is required' })`.
  - Optionally wrap the handler in try/catch and return a 500 JSON error.
- Confidence: HIGH

### 4. Bug Findings

**BR-001: PATCH crashes the process (unknown id, malformed JSON)**

- Severity: CRITICAL
- Affected module: backend, `server.mjs`
- File and line: `server.mjs:20`, `server.mjs:39`
- Root cause: No existence check in `rename`, no body guard in the route, no top-level error handling.
- Expected behavior: 404 for an unknown id, 400 for a bad body, and the server stays up.
- Actual or potentially incorrect behavior: The process exits.
- Reproduction steps: See section 3.
- Recommended fix: See section 3.
- Required regression tests: PATCH unknown id → 404, and a follow-up GET still works. PATCH malformed JSON → 400.
- Confidence: HIGH

**BR-002: PATCH accepts a missing or non-string title**

- Severity: HIGH
- Affected module: backend, `server.mjs`
- File and line: `server.mjs:39`
- Root cause: `body.title` is passed to the store with no type or emptiness check. POST validates `typeof body.title !== 'string'`.
- Expected behavior: 400 `title is required`, as POST does.
- Actual or potentially incorrect behavior: `PATCH {}` returns 200 and the task loses its title. `{"title":123}` stores a number, `{"title":{"a":[1]}}` stores an object, and `{"title":""}` is accepted (verified by code-reviewer and security-engineer).
- Reproduction steps: Start the server, `curl -X PATCH :PORT/api/tasks/2 -d '{}'`, then GET `/api/tasks`.
- Recommended fix: Use the same guard as POST. Optionally trim and cap the length (for example 1–200 characters), and apply the rule to POST too so the two stay consistent.
- Required regression tests: `{}`, non-string and empty title → 400, and the task is unchanged.
- Confidence: HIGH

### 5. Security Review

- **Verified vulnerabilities:**
  - Unauthenticated remote process crash via PATCH (`server.mjs:20,39`), see BR-001.
  - No title validation on PATCH (`server.mjs:39`, MEDIUM from the security view), see BR-002.
  - Stored XSS sink (MEDIUM): `public/app.js:14-17` interpolates `${t.title}` into `list.innerHTML` unescaped. The server stores and returns `<img src=x onerror=alert(1)>` verbatim (verified via the API). The sink is pre-existing, since POST already writes titles. PATCH is a new write path to it. Execution in a browser was not run.
- **Potential risks (not verified):**
  - Unbounded request body in `readBody` (`server.mjs:26`, MEDIUM). Only code-path reasoning, because the 3 MB test request could not be sent. Pre-existing, and PATCH adds another caller. Suggest a ~10 KB cap with 413.
  - A plain `startsWith(PUBLIC)` prefix check for static files (`server.mjs:42-43`, INFO). Pre-existing, and traversal attempts returned 404.
- Authentication: None. Pre-existing; PATCH adds one more unauthenticated write endpoint.
- Authorization: None. Tasks are global with sequential ids, so any client can rename, toggle or delete any task. Pre-existing.
- Data protection: No sensitive data is handled.
- Input validation: Missing on PATCH (BR-002). Malformed JSON is not handled (BR-001).
- Injection risks: Stored XSS via titles, see above. Suggested fix: `textContent` or escaping, plus a CSP.
- Secret exposure: None found. No `.env` files are tracked.
- Dependency concerns: None. The project has no dependencies, so `npm audit` is not applicable.

### 6. Architecture & Code Quality

- Architectural concerns: The async request handler has no top-level try/catch, so any thrown error kills the process (INFO, pre-existing, exposed by this change).
- Code duplication: Title validation should be shared between POST and PATCH.
- Maintainability:
  - The PATCH route is a one-liner mixing parsing, validation and response, unlike the multi-line POST route (LOW).
  - Pre-existing, in a file touched by this branch: `public/app.js:12` computes `open` as `tasks.filter((t) => t.done).length`, so the "N tasks remaining" label counts completed tasks instead of open ones (LOW). It is not part of this diff.
- Incorrect abstractions: `store.rename` does not signal "not found", unlike `toggle` and `remove`.
- API contract problems: Inconsistent error semantics. PATCH never returns 400 or 404, while the other routes do.
- Database design concerns: N/A (in-memory store).
- Backward compatibility: Additive endpoint, no breaking changes. `README.md` does not mention PATCH, and no UI uses it, so confirm that is intentional.

### 7. UI/UX & Browser QA

- Playwright workflows executed: N/A. The only frontend change is a `console.log` line, and no rename UI exists. Browser QA was not run, and the stored-XSS execution was not verified in a browser.
- Browser and viewport coverage: N/A
- Chrome DevTools MCP findings: N/A
- Console errors: The unstaged change adds a `console.log('debug: tasks rendered')` at `public/app.js:40`. It runs right after `load()` is called, before the first render completes, so the message is also inaccurate (LOW). Debug noise only, nothing sensitive is logged.
- Network failures: N/A
- Visual regressions: N/A
- Responsive issues: N/A
- Accessibility issues: Not assessed. No UI change.
- Screenshots or traces: none

### 8. Testing & Verification

| Check | Status | Details |
|---|---|---|
| Existing tests | Pass | `npm test` → 3 of 3 pass (run by me and the code-reviewer). None exercise PATCH |
| New test coverage | Missing | `test/api.test.mjs` is unchanged. There are no tests for PATCH success, unknown id, malformed JSON or bad title. Toggle and DELETE are also untested |
| Type checking | Not run | No type checker is configured |
| Lint | Not run | No linter is configured |
| Build | Not run | No build step |
| Playwright | N/A | Only a `console.log` changed on the frontend |
| Chrome DevTools MCP | N/A | Same reason |

Dynamic checks: PATCH with an unknown id and with invalid JSON both crashed the server (reproduced by me, the code-reviewer and the security-engineer). Not run: a 3 MB body test (blocked by curl's argument-length limit) and a browser XSS execution.

### 9. Required Fixes

**Must fix before merge:**
1. [CRITICAL] Return 404 for an unknown id and 400 for a malformed body, so PATCH cannot crash the process (BR-001).
2. [HIGH] Validate `title` as a string on PATCH, using the same guard as POST (BR-002).
3. [MEDIUM] Add tests for PATCH: success, unknown id → 404, malformed JSON → 400, bad title → 400 (covers BR-001 and BR-002).
4. [LOW] Remove the stray `console.log` from `public/app.js` (or discard the unstaged change).

**Should fix soon:**
5. [MEDIUM] Escape titles when rendering in `public/app.js` (use `textContent`) and consider a CSP header.
6. [MEDIUM] Cap the request body size in `readBody` (about 10 KB, 413 when exceeded).
7. [LOW] Fix the "remaining" count at `public/app.js:12` (pre-existing: it counts `done` tasks).
8. [LOW] Restructure the PATCH route like POST, and document it in the README if the API is listed there.

### 10. Suggested Bug-Fix Tickets

**Title:** PATCH /api/tasks/:id crashes the server and accepts invalid titles

**Type:** Bug

**Priority:** Critical

**Description:** `store.rename` assumes the task exists, and the PATCH route reads `body.title` without validating the body. An unknown id or malformed JSON throws in the async handler and terminates the Node process. A missing or non-string title is stored as-is. Covers: BR-001, BR-002.

**Expected behavior:** 404 `{error:'not found'}` for an unknown id. 400 `{error:'title is required'}` for a malformed body or a missing, non-string or empty title. The server keeps running, and the task is unchanged on error.

**Acceptance criteria:**
- [ ] PATCH unknown id → 404.
- [ ] PATCH malformed JSON, missing title, non-string title or empty title → 400.
- [ ] The server stays alive after each of these requests, and the task is not modified.
- [ ] Regression tests added to `test/api.test.mjs`, including a PATCH success case that is visible through GET.
- [ ] Manual QA: send each bad request against a running server and confirm a normal response.

**Affected modules:** `server.mjs` (`store.rename`, PATCH route), `test/api.test.mjs`

**Dependencies:** none

### 11. Suggested Feature & Improvement Tickets

*Optional improvements, not required for merge.*

**Title:** Escape task titles when rendering the board

**Type:** Technical Debt

**Priority:** Medium

**Business value:** Removes a stored-XSS sink in `public/app.js:14-17` that every title write path (POST and the new PATCH) feeds into.

**Description:** Build the list items with `createElement` and `textContent`, or escape titles. Consider a CSP of `script-src 'self'` and `X-Content-Type-Options: nosniff`.

**Acceptance criteria:**
- [ ] A title such as `<img src=x onerror=alert(1)>` renders as text and runs no script.
- [ ] Existing add, toggle and delete flows still work.
- [ ] A test or browser check covers the escaped rendering.

**Dependencies:** none

**Title:** Harden the HTTP handler (body-size cap and top-level error handling)

**Type:** Technical Debt

**Priority:** Medium

**Business value:** A single in-memory process should not die from one bad request or a large body. The crash in BR-001 shows the handler has no safety net.

**Description:** Wrap the handler in try/catch with a 500 JSON response, cap `readBody` at about 10 KB (413), and set explicit request and header timeouts.

**Acceptance criteria:**
- [ ] An unexpected error returns 500 and does not exit the process.
- [ ] An oversized body returns 413.
- [ ] Tests cover both cases.

**Dependencies:** none

### 12. Recommended Next Actions

| Order | Task | Type | Priority | Reason |
|---|---|---|---|---|
| 1 | Add the 404/400 handling to PATCH and `rename` | Bug | Critical | One request kills the server |
| 2 | Add PATCH validation and regression tests | Bug | High | Closes BR-002 and locks in BR-001 |
| 3 | Remove the debug `console.log` | Cleanup | Low | Unrelated noise in the working tree |
| 4 | Escape titles in `render` | Enhancement | Medium | Stored-XSS sink, now with a second write path |
| 5 | Add a body-size cap and handler try/catch | Enhancement | Medium | Hardening against crashes and large bodies |

### 13. Final Verdict

- **Ready for merge:** No
- **Blocking issues:** BR-001, BR-002
- **Required fixes:** BR-001, BR-002, missing PATCH tests, the stray debug `console.log`
- **Recommended next ticket:** PATCH /api/tasks/:id crashes the server and accepts invalid titles
- **Remaining testing limitations:** Browser QA was not run, because there is no rename UI and the only frontend change is a log line. The stored-XSS execution and the large-body DoS were not verified dynamically. The project has no type checker, linter or build to run.

Review team: `forge-code-reviewer` and `forge-security-engineer` ran in parallel, which is two reviewers for a 4-line diff in two areas. I re-opened the cited lines and re-ran `npm test` and the unknown-id crash myself. The pre-existing "remaining" count bug at `public/app.js:12` is my own finding from reading the file, not a reviewer's.

No files were modified, and no commit, push, PR, review submission or external ticket was created.
