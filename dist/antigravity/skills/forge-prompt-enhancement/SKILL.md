---
name: forge-prompt-enhancement
description: Turns a vague request into a grounded spec (intent, contracts, acceptance criteria, edge cases, tests).
disable-slash-command: true
---


# Prompt Enhancement: Vague Request to Grounded Spec

Goal: convert what the user said into a spec an engineer can build and a tester can verify, **without inventing scope**. The output is a filled `<FORGE_HOME>/templates/task-specification.md`. `FORGE_HOME` is the `forge` skill directory, a sibling of this skill (`../forge/`).

## The grounding rule

Every requirement, edge case and NFR must cite one of:
- **Code evidence**: `path:line` showing the current behavior, contract or convention.
- **The user's words**: a quote from the request.
- **A project standard**: a doc, ADR, lint rule or existing test that mandates it.

Anything else is an **assumption**. List it under Assumptions with the reason it is the safest choice, or drop it. Never add requirements to make the spec look comprehensive. A short spec with real evidence beats a long one with guesses.

## Ambiguity triage (do this first)

Write down every plausible interpretation of the request, then classify:

| Situation | Action |
|---|---|
| One interpretation is clearly supported by code or docs | Use it. Cite the evidence |
| Interpretations differ but the cost of the wrong one is small | Pick the most conservative, record it as an assumption, continue |
| Any trigger in the clarification policy (`<FORGE_HOME>/core/lifecycle.md`, "Clarification policy") applies | Ask **one** batched, concise question with your recommended default |

Never ask about things you can answer by reading the code. Never ask more than once per phase.

## The 14 steps

1. **Business intent.** Who benefits and what outcome changes? Write a one-sentence goal about the outcome, not the implementation.
2. **Existing functionality.** Locate the feature path (use `.forge/context.json` and `forge-project-exploration`). Describe what happens today, with `file:line`.
3. **Inspection.** Read the code, tests and docs on that path. Note conventions, current bugs, TODOs and missing tests you see. Do not trust names; read bodies.
4. **Missing requirements.** Compare the request against the current behavior. What must change for the intent to be met? Each item is a FR with a citation.
5. **Affected modules.** List files and modules that will change and those that consume them (callers, importers, templates, tests).
6. **Dependencies and API contracts.** Identify endpoints, schemas, events, shared types and third-party APIs touched. Mark each as unchanged, extended (backward compatible) or breaking. Breaking needs explicit justification.
7. **Security and privacy.** Check authN/Z on every touched path, input validation, PII exposure, secrets, rate limiting and audit logging. If none apply, write why.
8. **Expected behavior.** Describe the observable before and after for the user and for API callers.
9. **Acceptance criteria.** Write `Given / When / Then` statements that a test or a browser step can verify. One behavior per AC. No "should work well".
10. **Edge cases.** Empty, loading, error, permission denied, invalid input, concurrency, large input, slow network, i18n. Keep only those reachable on this path.
11. **Test requirements.** Map each AC to a test level (unit, integration, E2E, browser, manual) following the project's existing test layout.
12. **NFRs.** Performance, accessibility, compatibility, observability, with measurable targets only where a baseline or standard exists. See `forge-requirements-engineering`.
13. **Boundaries.** In scope, out of scope, and must-not-change (public contracts, unrelated behavior, files owned by others).
14. **Completion criteria.** The applicable quality gates from `<FORGE_HOME>/core/quality-gates.md` plus the AC evidence each one requires.

For S tasks, steps 1, 2, 8, 9, 10 and 13 are usually enough, kept inline. For M and L, write the full spec to `.forge/tasks/<slug>/spec.md`.

## Worked example (abridged)

Request: *"make login better"*

```
Triage: "better" could mean UX, security or speed. Code shows
  src/auth/LoginForm.tsx:41 submits with no loading state and
  src/api/auth.ts:18 returns a generic 500 on bad password.
  No clarification trigger hit -> assume UX + error handling; record A1.
Goal: users understand login outcomes and cannot double-submit.
Grounding: LoginForm.tsx:41 (no pending state), auth.ts:18 (500 for 401 case),
  tests/auth.spec.ts covers only the happy path.
FR1 Button disabled with progress text while request is in flight (LoginForm.tsx:41).
FR2 Wrong credentials return 401 with the existing error shape (auth.ts:18, errors.ts:7).
FR3 Form shows "Email or password is incorrect" without revealing which.
AC1 Given valid credentials, when I submit, then the button is disabled until redirect.
AC2 Given a wrong password, when I submit, then I see the FR3 message and stay on /login.
AC3 Given the API is down, when I submit, then I see a retryable error, not a blank page.
Edge: double click, Enter key submit, slow network, password manager autofill.
Security: no user enumeration (FR3); existing rate limit middleware kept (auth.ts:5).
NFR: label/error associations pass the a11y gate (G9).
Out of scope: SSO, password reset, visual redesign.
A1 "better" = feedback + error handling; redesign deferred (no design-system change asked).
```

## Anti-patterns

- Copying a generic checklist into the spec ("supports 10k concurrent users") with no evidence.
- Writing the solution as the requirement ("use Redux") when the user asked for an outcome.
- Silently widening scope to adjacent features you noticed. Recommend them in the report instead.
- ACs that can only be verified by reading code, not by observing behavior.

## Output

A filled task specification: grounding with `file:line`, FRs and NFRs each with a source, Given/When/Then ACs, edge cases, security notes, boundaries, assumptions, and the team with one-line reasons. Remove template sections that do not apply.
