# FORGE — Engineering Review Report

### 1. Review Information

| Field | Details |
|---|---|
| Review type | PR Review / Current Branch Review |
| Repository | <repository name> |
| Current branch | <branch> |
| Base branch | <base> (confidence: high / medium / low; evidence) |
| PR URL | <url> / Not provided |
| Review date | <YYYY-MM-DD> |
| Changes reviewed | <N files; committed range, staged, unstaged, untracked> |
| Local changes | Present / Not present |

### 2. Executive Summary

- **Overall assessment:** <2-4 sentences>
- **Purpose of the changes:** <what the change is trying to do>
- **Findings:** Critical <n> · High <n> · Medium <n> · Low <n> · Info <n>
- **Important risks:** <bullets or "none">
- **Implementation quality:** <short judgement>

**Review status:** APPROVED | APPROVED WITH SUGGESTIONS | CHANGES REQUIRED | BLOCKED

> This is an advisory assessment by FORGE, not an approval or review submitted on the Git hosting platform.

### 3. Critical Findings

**[CRITICAL] <Finding title>**

- File:
- Line:
- Problem:
- Impact:
- Reproduction / Evidence:
- Recommended fix:
- Confidence: HIGH / MEDIUM / LOW

<If none: "No critical findings identified.">

### 4. Bug Findings

**BR-001: <Title>**

- Severity: CRITICAL / HIGH / MEDIUM / LOW
- Affected module:
- File and line:
- Root cause:
- Expected behavior:
- Actual or potentially incorrect behavior:
- Reproduction steps:
- Recommended fix:
- Required regression tests:
- Confidence:

<If none: "No bugs identified.">

### 5. Security Review

- **Verified vulnerabilities:** <findings with file:line, or "none">
- **Potential risks (not verified):** <items, or "none">
- Authentication: <…>
- Authorization: <…>
- Data protection: <…>
- Input validation: <…>
- Injection risks: <…>
- Secret exposure: <…>
- Dependency concerns: <…>

### 6. Architecture & Code Quality

- Architectural concerns: <…>
- Code duplication: <…>
- Maintainability: <…>
- Incorrect abstractions: <…>
- API contract problems: <…>
- Database design concerns: <…>
- Backward compatibility: <…>

### 7. UI/UX & Browser QA

- Playwright workflows executed: <list with PASSED/FAILED, or N/A with reason>
- Browser and viewport coverage: <…>
- Chrome DevTools MCP findings: <…>
- Console errors: <…>
- Network failures: <…>
- Visual regressions: <…>
- Responsive issues: <…>
- Accessibility issues: <…>
- Screenshots or traces: <paths, or none>

<Mark checks that could not run as unavailable, and give the reason.>

### 8. Testing & Verification

| Check | Status | Details |
|---|---|---|
| Existing tests | Pass / Fail / Not run | <command and result> |
| New test coverage | Pass / Fail / Missing | <…> |
| Type checking | Pass / Fail / Not run | <…> |
| Lint | Pass / Fail / Not run | <…> |
| Build | Pass / Fail / Not run | <…> |
| Playwright | Pass / Fail / N/A | <…> |
| Chrome DevTools MCP | Pass / Fail / N/A | <…> |

### 9. Required Fixes

**Must fix before merge:**
1. [CRITICAL] <fix> (<finding/bug id>)
2. [HIGH] <fix> (depends on: <id>)

**Should fix soon:**
3. [MEDIUM] <fix>
4. [LOW] <fix>

<If none: "No required fixes.">

### 10. Suggested Bug-Fix Tickets

**Title:** <short, actionable>

**Type:** Bug

**Priority:** Critical / High / Medium / Low

**Description:** <problem and root cause; covers: BR-00x>

**Expected behavior:** <…>

**Acceptance criteria:**
- [ ] <specific expected behavior>
- [ ] <error handling>
- [ ] <regression tests>
- [ ] <QA verification>

**Affected modules:** <…>

**Dependencies:** <other tickets, or none>

<If none: "No bug-fix tickets: no confirmed bugs.">

### 11. Suggested Feature & Improvement Tickets

*Optional improvements, not required for merge.*

**Title:** <actionable title>

**Type:** Feature / Enhancement / Technical Debt / Performance

**Priority:** High / Medium / Low

**Business value:** <why it matters>

**Description:** <what to implement>

**Acceptance criteria:**
- [ ] <functional>
- [ ] <technical>
- [ ] <testing>

**Dependencies:** <…>

<If none: "No improvement tickets with clear value identified.">

### 12. Recommended Next Actions

| Order | Task | Type | Priority | Reason |
|---|---|---|---|---|
| 1 | <task> | Bug / Enhancement / … | High | <reason> |

### 13. Final Verdict

- **Ready for merge:** Yes / No / Cannot determine
- **Blocking issues:** <ids or "none">
- **Required fixes:** <ids or "none">
- **Recommended next ticket:** <title>
- **Remaining testing limitations:** <…>

No files were modified, and no commit, push, PR, review submission or external ticket was created.
