# Example: security review (analysis only)

```
/forge Do a security review of this app. Report findings only — do not change any code.
```

## Expected flow
- **Team:** `forge-security-engineer` (core) + `forge-qa-lead` as needed. Analysis requests skip phases 6 to 8.
- **Method:** threat model the web UI and JSON API, run the OWASP checklist, scan for secrets (names only), and run the dependency audit if a tool exists.
- **Report:** findings ranked by severity, each with an exploit scenario, `file:line` evidence and a recommended fix. **No files are modified.**

Expected findings on `web-tasks`:
- Stored XSS through `innerHTML` in `public/app.js`.
- Missing input validation for empty or unbounded titles.
- No authentication on mutating endpoints. This is acceptable for a demo, but the review should note it.

Real results: [`tests/e2e/results/security-review/`](../../tests/e2e/results/security-review/).
