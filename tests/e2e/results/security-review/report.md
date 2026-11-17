### FORGE Execution Report

**Task:** Do a security review of this app. Report findings only — do not change any code.

**Enhanced specification:** Security audit of `web-tasks`, a zero-dependency Node task board. I reviewed it against OWASP and ASVS for injection and XSS, input limits, static-file handling, CSRF and bind address, crash robustness, headers, secrets and dependencies. Each finding gets a file:line reference, a trigger and a severity. Nothing was modified.

**Project understanding:** Node ESM with no dependencies and no lockfile. `server.mjs` (50 lines) is an in-memory REST API (`/api/tasks`, toggle, delete) plus a static file server for `public/`. `public/app.js` is a vanilla-JS client. There are three API tests and no CI. The server listens on `PORT` (default 4173) and has no auth.

**Specialists involved:** Native subagents (Mode A): `forge-security-engineer` ran the audit. I loaded `forge-project-exploration` and ran its detector. I did not run browser QA, code review or the other specialists, because nothing was changed.

**Implementation:**
- None. This was an analysis-only request.
- Files changed: none (`git diff --stat` is empty). The workspace-only `.forge/` folder (gitignored) holds a short findings file.
- Architecture decisions: none.

**QA and verification:**
| Gate | Command / method | Status | Evidence |
|------|------------------|--------|----------|
| Tests / typecheck / lint / build | n/a (read-only review) | N/A | No code changed |
| Finding F2 verified by me | Raw TCP `GET //[ HTTP/1.1` against `node server.mjs` | PASSED (confirmed) | `server exited code=1 TypeError: Invalid URL` |
| Finding F3 verified by me | Partial POST body, then socket destroyed | PASSED (confirmed) | `server exited code=1 Error: aborted` |
| Other findings | Specialist PoC `poc.mjs` (traversal variants, CSRF, 50 MB body, headers, netstat) | PASSED (executed by specialist, not re-run by me) | See findings below |
| Dependency audit | `npm audit` | UNAVAILABLE | No dependencies or lockfile |
| Secrets scan | Regex scan and `.env` check | PASSED | No matches, no `.env*` files |

**Browser QA:** N/A. No browser-visible change. The XSS sink in F1 was confirmed server-side and by reading the code; no browser run was done.

**Issues:**
- Identified (ranked, severities scaled for a local demo app):
  1. **F1. Stored XSS: Medium, High if exposed.** `public/app.js:14-19` puts `${t.title}` into `innerHTML`, and `server.mjs:33-34` stores any string unsanitized. A title like `<img src=x onerror=…>` runs script in every viewer's origin until the task is deleted. The API round-trip is confirmed by execution; the browser sink is by reading only.
     - Fix: build DOM nodes with `textContent`, or escape the title. Add a CSP (`default-src 'self'`).
  2. **F2. Remote process crash via malformed URL: Medium, confirmed by me.** `server.mjs:29` calls `new URL(req.url, …)` in an async handler with no try/catch, so one unauthenticated request line such as `GET //[ HTTP/1.1` exits the process.
     - Fix: wrap the handler in try/catch and add a `clientError` handler.
  3. **F3. Process crash on aborted body: Medium, confirmed by me.** `server.mjs:25` reads `for await (const c of req)` outside any try. A client that sends a partial body and disconnects crashes the server.
     - Fix: handler-level try/catch plus a `req.on('error')` handler.
  4. **F4. Unbounded body, title and task count: Medium (DoS), confirmed by the specialist.** There is no size cap at `server.mjs:25,33`. A 50 MB title returned 201 and was then served to every client in `GET /api/tasks`. Empty titles are accepted too.
     - Fix: reject bodies over about 10–16 KB with a 413, cap title length, trim and reject blank titles, cap the task count.
  5. **F5. CSRF, no Origin or Host validation, binds to all interfaces: Medium on localhost, Low as a demo, confirmed by the specialist.**
     - A cross-origin `Content-Type: text/plain` POST creates tasks, and a cross-origin toggle returns 200, because the server parses JSON regardless of content type (`server.mjs:25`).
     - `Host: attacker.example` is accepted, so DNS rebinding could read tasks.
     - `netstat` shows `0.0.0.0` and `[::]` listening (`server.mjs:49`), so anyone on the LAN can read and write.
     - DELETE needs a preflight; that is by reading only.
     - Chained with F1, any visited website can plant persistent script.
     - Fix: bind to `127.0.0.1`, require `application/json` (415 otherwise), check Origin and Host, add auth if ever deployed.
  6. **F6. Path containment check is wrong but not reachable: Low, latent.** `server.mjs:41` uses `abs.startsWith(PUBLIC)` with no trailing separator, so a sibling like `public-secret` would pass; the specialist demonstrated this on the path logic. Over HTTP it is blocked because `new URL` collapses `..` and the pathname is never percent-decoded. All 12 traversal variants returned 404. It becomes exploitable if someone adds `decodeURIComponent`.
     - Fix: `abs === PUBLIC || abs.startsWith(PUBLIC + path.sep)`, or use `path.relative`.
  7. **F7. Missing security headers: Low.** No CSP, `X-Content-Type-Options`, `Referrer-Policy` or `frame-ancestors` (clickjacking of delete and toggle). `.js` is served without a charset.
  8. **F8. Info.** Unmatched methods such as `PUT /api/tasks` fall through to the static handler and return a JSON 404 (405 would be cleaner). On Windows, `/app.js::$DATA` and `/APP.JS` return 200, but both stay inside `public/`.
- Checked and OK:
  - No SQL, shell, eval or deserialization sinks.
  - Task ids are matched with `\d+`.
  - `server.mjs` and `package.json` are not served.
  - No CORS headers, so cross-origin reads are blocked.
  - No stack traces or paths leak.
  - No secrets and no dependencies.
- Fixed: none (by request).
- Unresolved / limitations:
  - The XSS sink was not executed in a real browser.
  - Slow-loris and timeout behavior and rate limiting were not tested.
  - There is no HTTPS (not applicable for local use).
  - F1, F4, F5 and F7 were confirmed by the specialist's PoC, not re-run by me; I re-ran only F2 and F3.

**Assumptions:** Severities assume a local or demo deployment with no sensitive data. They rise if the app is exposed beyond localhost. Non-security bug noticed in passing: `public/app.js:12` computes "remaining" with `filter(t => t.done)`, which is inverted.

**Remaining work:** None for this review. If you want fixes, the highest-value order is F1 (XSS) → F2/F3 (try/catch plus `clientError`) → F5 (bind to `127.0.0.1`, require JSON, check Origin) → F4 (size limits) → F6 and F7. Each fix should come with regression tests.

**Git status:** Branch `master`; 0 files modified, 7 added (already staged before this session), 0 deleted (uncommitted); untracked `.claude/`. No commit, push, or pull request was created.

The specialist's PoC is at `C:\Users\admin\AppData\Local\Temp\claude\f0cb9e374eb6c750\4b56dce1-a721-4546-9c87-97f6fc9169d4\scratchpad\poc.mjs`. My crash re-check is at `C:\Users\admin\AppData\Local\Temp\claude\f0cb9e374eb6c750\4b56dce1-a721-4546-9c87-97f6fc9169d4\scratchpad\verify.mjs`.
