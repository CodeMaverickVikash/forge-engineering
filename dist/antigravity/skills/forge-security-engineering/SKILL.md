---
name: forge-security-engineering
description: AppSec review for any stack (threat model, OWASP, authN/authZ, IDOR, injection, secrets, deps).
disable-slash-command: true
---


# Security Engineering

Find real, exploitable weaknesses in the code that is in scope, prove them with evidence, and say how to fix them. **Report findings; fixes go through the owning engineers.** No speculative "might be vulnerable" without a traced data path.

## 1. Scope and attack surface

1. Read `spec.md`/`plan.md` and `.forge/context.json` (frameworks, auth libraries, API contracts, env var **names**).
2. List entry points: HTTP routes, GraphQL resolvers, WebSocket handlers, webhooks, queue consumers, CLIs, file uploads, scheduled jobs.
3. For each one note: who can call it (anonymous, user, admin, service), what input it takes, what data or side effects it reaches.
4. Locate the security controls: auth middleware or guards, validation layer, ORM or query builder, output encoding or templating, CSRF and CORS config, rate limiter, secrets loading.

## 2. Threat model (STRIDE-lite)

For each entry point or data flow crossing a trust boundary, ask:

| Threat | Question |
|---|---|
| **S**poofing | Can someone act as another user or service (weak sessions, unsigned webhooks, missing token checks)? |
| **T**ampering | Can input alter data or logic it shouldn't (mass assignment, price or role fields, unsigned client state)? |
| **R**epudiation | Are security-relevant actions logged with actor and time? |
| **I**nformation disclosure | Can data leak (verbose errors, over-fetching, logs, IDOR, directory listing)? |
| **D**enial of service | Unbounded queries, uploads, pagination, regex, loops or fan-out? |
| **E**levation of privilege | Can a user reach admin functions or other tenants' data? |

## 3. Checklist (OWASP Top 10 2021 + API Security Top 10 2023)

- **Broken access control (A01, API1, API3, API5):** every protected route enforces authN *and* authZ on the server; object lookups are scoped to the caller or tenant (`WHERE id = ? AND owner_id = ?`), not just by ID (**IDOR / BOLA**); responses don't expose fields the caller may not see; writes don't accept privileged fields (mass assignment); admin functions check role server-side; CORS isn't `*` with credentials.
- **Cryptographic failures (A02):** TLS assumed in prod; passwords hashed with a slow algorithm (bcrypt, scrypt, Argon2, PBKDF2); no homemade crypto, ECB mode, MD5/SHA1 for security; secure random for tokens; sensitive data encrypted at rest where required.
- **Injection (A03):** SQL/NoSQL built only with parameters or the ORM (no string concatenation, no raw operators like `$where` from input); no shell commands built from input (use argument arrays, never `shell=True` or equivalents with user data); no template rendering of user-controlled templates (SSTI); safe XML parsing (XXE); path traversal blocked (`../`, absolute paths).
- **XSS:** output encoded by the framework; flag every raw-HTML sink (`dangerouslySetInnerHTML`, `v-html`, `innerHTML`, `|safe`, `{!! !!}`, `html_safe`) fed by user data; sanitize rich text with the project's sanitizer; CSP where possible.
- **Insecure design (A04, API6):** business-flow abuse (coupon reuse, negative quantities, race conditions on balances, skipping workflow steps).
- **Misconfiguration (A05, API8):** debug mode or stack traces in prod config, default credentials, permissive CORS, missing security headers (`Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `frame-ancestors`/`X-Frame-Options`, `Referrer-Policy`), cookies without `HttpOnly`, `Secure`, `SameSite`.
- **Vulnerable components (A06):** see section 5.
- **Authentication failures (A07, API2):** brute-force protection or rate limits on login, OTP and reset; session rotation on login; logout invalidates server sessions; JWT signature and `alg` verified, expiry enforced, no secrets in the payload; reset tokens single-use and expiring; no user enumeration through messages or timing.
- **Integrity failures (A08):** webhook signatures verified (constant-time compare); no unsafe deserialization of untrusted data (`pickle`, Java native serialization, `unserialize`, YAML full loaders); CI pulls pinned dependencies.
- **Logging failures (A09):** auth failures and privilege changes logged; **no passwords, tokens, full card numbers or unnecessary PII in logs**.
- **SSRF (A10, API7):** server-side fetches of user-supplied URLs use an allowlist and block internal ranges and cloud metadata addresses (e.g. `169.254.169.254`); redirects re-validated.
- **CSRF:** cookie-authenticated state-changing requests require a CSRF token or a strict `SameSite` policy; no state changes on GET.
- **Resource consumption (API4):** rate limits on expensive or abusable endpoints; pagination caps; upload size limits; timeouts on outbound calls.
- **File upload:** allowlisted type checked by content not just extension, size limit, randomized stored name, stored outside the web root or in object storage, never executed, served with a safe `Content-Type`/`Content-Disposition`.
- **Inventory and third parties (API9, API10):** no forgotten debug/old API versions exposed; responses from third-party APIs validated before use.
- **Data protection / PII:** collect the minimum; mask in UIs and exports; retention and deletion paths exist; PII not sent to analytics or LLM providers without a basis.

## 4. Secrets exposure scan (never print values)

List matching **files and lines only**, never the matched text. For example:
```bash
grep -rnIlE 'AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{36}|xox[abprs]-|sk_live_|AIza[0-9A-Za-z_-]{35}' --exclude-dir={node_modules,.git,vendor,dist,build,.venv} .
grep -rnIlE '(api[_-]?key|secret|passw(or)?d|token).{0,3}[:=].{0,3}[A-Za-z0-9/+_-]{16,}' --exclude-dir={node_modules,.git,vendor,dist,build,.venv} .
```
Check that `.env*` files (other than examples) are gitignored (`git check-ignore -v .env`) and not tracked (`git ls-files | grep -E '(^|/)\.env'`). Report "secret-like value at `path:line`", redacted, and recommend rotation if it is tracked. Use a dedicated scanner (gitleaks, trufflehog) only if it is already installed.

## 5. Dependency vulnerabilities

Use the project's own audit tool **if installed** and the lockfile exists: `npm audit` / `pnpm audit` / `yarn npm audit`, `pip-audit`, `composer audit`, `govulncheck ./...`, `bundle audit check`, `cargo audit`, `dotnet list package --vulnerable`. Mark it `UNAVAILABLE` if the tool is missing; never install it without authorization. For each relevant finding, check whether the vulnerable code path is actually reachable, and look up the advisory or CVE when web tools are available. Recommend the minimal safe version; major upgrades need authorization.

## 6. Severity

| Severity | Typical meaning |
|---|---|
| **Critical** | Remote, unauthenticated or trivial exploit leading to account takeover, RCE, mass data exposure or payment fraud |
| **High** | Authenticated exploit reaching other users' data (IDOR), stored XSS, SQL injection, auth bypass in a narrow path |
| **Medium** | Needs user interaction or unusual conditions; missing rate limits on sensitive flows; weak config with real impact |
| **Low** | Defense-in-depth gaps, informational headers, verbose but harmless errors |

## Output

Findings ranked by severity, each with: ID, title, severity, `file:line` evidence, **exploit scenario** (who, how, impact, in 1–3 lines), **fix** (concrete change and owning engineer), and confidence (confirmed / likely). Then: the threat model summary, checks performed and not performed, audit commands with status, and secrets results (paths only).
