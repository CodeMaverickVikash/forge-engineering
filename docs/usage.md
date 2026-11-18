# Using FORGE

Type `/forge` followed by what you want, in plain words. You don't have to pick specialists, write detailed prompts or approve each step.

```
/forge Build a complete notification system.
/forge Improve the existing dashboard UI.
/forge Fix the payment issue.
/forge Analyze the project and suggest improvements.
/forge Make this application production-ready.
/forge                      # no request means a project analysis
```

## What happens

1. **A one-line status at each phase**, for example *"Explore: Next.js 15 + Prisma; payment flow in app/api/checkout"*.
2. **Questions only when they're needed.** FORGE asks only when a decision is genuinely yours: business trade-offs, destructive actions, paid services or missing credentials. Otherwise it records an assumption and carries on.
3. **Working files** go in `.forge/tasks/<slug>/` (spec, plan, specialist reports, final report). `.forge/` is self-gitignored.
4. **Changes stay uncommitted.** Review them with `git diff`, then commit yourself.
5. **The FORGE Execution Report** is printed in full as the final message (and saved as `report.md`). It lists the specialists that actually ran, every gate with its real status, unresolved issues, assumptions and the git state.

## Size-adaptive behavior

| Request | Typical team | Ceremony |
|---|---|---|
| "Fix the off-by-one in pagination" | backend engineer (or FORGE itself), + browser QA if visible | S: no written spec or plan; regression test and the final gate |
| "Improve the dashboard UI" | PM, UX, frontend, browser QA, accessibility | M: spec, plan, before and after screenshots, viewport checks |
| "Build a notification system" | PM, BA, architect, UX, backend, database, frontend, QA lead, test automation, browser QA, security, reviewer | L: spec, ADR, contract-first parallel implementation, full gates |
| "Analyze the project" | explorer, architect, security, performance (+ researcher) | read-only, ranked findings, roadmap |

A task that touches auth, payments, PII, migrations or schema, a public API contract, more than about 8 files or more than one deployable unit is sized up one step. Size reduces paperwork, not assurance: at every size FORGE runs the detector, adds a regression test for every bug fix, sends every browser-visible change to `forge-browser-qa`, and runs `forge-code-reviewer` when you ask for a review or a change touches auth, payment or schema files (only those files, on Opus). With native subagents, the specialists do the work; FORGE implements directly only S-size fixes.

## Reviewing a PR or branch

```
/forge Review my current branch
/forge Review this PR: https://github.com/organization/repository/pull/123
/forge Review the current branch and identify bugs, security issues and improvements.
```

FORGE works out the target itself. A PR or MR URL means a PR review; otherwise it reviews the current branch. You never pick a mode.

**Current branch review:**
- **Finding the base branch.** It is never assumed to be `main`. FORGE uses, in order: the open PR's base, the `gh-merge-base` config, the remote default branch, then the nearest fork point among `main`, `master`, `develop` and similar. Its confidence and evidence go in the report, and an uncertain base is reported, not guessed.
- **What is reviewed.** Committed branch changes are kept separate from staged, unstaged and untracked local work, and local work is always reported.
- **On `main` itself:** FORGE reviews unpushed commits plus local changes.

**PR review:**
- **GitHub:** FORGE reads the PR metadata, description and full diff through the authenticated `gh` CLI (read-only).
- **Other providers or no access:** GitLab needs an authenticated `glab`. Bitbucket and Azure DevOps, or a GitHub PR without access, make the review **BLOCKED**, with the reason stated. FORGE never pretends a PR was read.
- **Branch checkout:** FORGE does not check out the PR branch. Local tests and browser checks run only when the PR branch is already your current checkout.

**The review itself:**
- **Team.** One parallel wave of reviewers, chosen from the changed areas and the diff size:
  - every review: senior developer (`forge-code-reviewer`), plus security and QA;
  - when the change needs them: architect, database, performance, and UI/UX with browser QA.
  - A small diff gets two or three reviewers, not seven.
- **Findings.** Every finding has a file and line, the problem, its impact, evidence and a fix. Each has a severity (CRITICAL / HIGH / MEDIUM / LOW / INFO) and a confidence. FORGE re-checks high-severity findings against the code, and speculation is never reported as a confirmed bug.
- **Output.** The final message is the **13-section Engineering Review Report**:
  - review information, executive summary and status;
  - critical findings, bugs (BR-001…), security, architecture, UI/UX and browser QA, and testing;
  - required fixes, ticket drafts, next actions and a final verdict.
  The status is APPROVED, APPROVED WITH SUGGESTIONS, CHANGES REQUIRED or BLOCKED. It is advisory and never submitted to GitHub.

**Read-only, enforced in Claude Code.** A review never edits, stages, commits or pushes. It never approves, comments on or creates PRs or issues, and it never creates Jira tickets unless you ask. During the review the git guard blocks file edits outside `.forge/`, and it always blocks hosting-platform writes. To fix the findings afterwards, ask: *"/forge Fix BR-001 and BR-002"*. That runs the normal lifecycle, with the review report as input.

## Tips

- **Name constraints you care about:** *"/forge Add CSV export. Don't add new dependencies."* Constraints go straight into the spec.
- **Ask for analysis only:** *"/forge Review auth security, no changes."*
- **Resume or iterate:** *"/forge Continue the notification task"*. The task folder holds the state.
- **Browser verification** needs the Chrome DevTools and Playwright MCP servers. Without them, FORGE says so in the report.
- **Project knowledge** builds up in `.forge/knowledge.md`. Delete `.forge/.gitignore` to commit it for your team.

See `examples/` for complete walkthroughs.
