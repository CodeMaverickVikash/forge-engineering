# Review mode: PR and branch reviews

Use this playbook when the request asks FORGE to **review a PR/MR or the current branch's changes**. Examples: "review my current branch", "review this PR: <url>", "review my changes and find bugs". Do not ask the user to pick a mode. A PR/MR URL in the request means a PR review; otherwise it is a review of the current branch.

A whole-codebase audit ("review this app's security", "analyze the project") is not review mode. It is the analysis path in SKILL.md.

**Review mode is read-only.** It never modifies reviewed files, fixes findings, stages, commits, pushes, opens PRs, approves or comments on the hosting platform, or creates external tickets. In Claude Code this is enforced: during the review lock, the git guard blocks Edit and Write outside `.forge/`, and it always blocks git writes and hosting-platform writes (`gh pr review|comment|merge`, `gh issue create`, write calls through `gh api`).

## R1. Target and lock

```bash
node "<FORGE_HOME>/scripts/review-target.mjs" --lock --target "<PR url or branch>"
node "<FORGE_HOME>/scripts/review-target.mjs" [--pr <url>] --json
```

The script decides everything below from evidence. Read its JSON; don't redo the work by hand.
- **Branch mode:**
  - Base branch with a confidence level and evidence, from: an open PR's base, then `gh-merge-base`, then the origin default branch, then the nearest fork point among main, master, develop and similar. It never assumes `main`.
  - The committed range since the merge-base, with commits and files.
  - Staged, unstaged and untracked files, listed **separately**.
  - Changed areas (backend, frontend, database, api, security, tests, config, dependencies) and a suggested reviewer team.
  - When you are on the integration branch itself, it reviews unpushed commits plus local changes.
- **PR mode:**
  - Provider, repo and number. For GitHub: metadata, base and head, files, and the diff command (`gh pr diff <url>`).
  - Whether the PR is this checkout and whether its branch is checked out.
  - **FORGE never switches branches or checks out a PR during a review.** It would disturb the user's working tree.
- **`limitations`:** copy every entry into the report.
  - If the PR can't be read (no `gh`, not authenticated, no access, or an unsupported provider without an authenticated CLI), the review status is **BLOCKED**, and the report says exactly what is missing.
  - Never review a PR you could not read.

Base confidence `low` or `none`: say so in Review Information and Final Verdict, and say what was reviewed instead.

## R2. Understand before judging (the orchestrator, briefly)

1. Run the stack detector (phase 2) and read `.forge/knowledge.md` if it exists.
2. Read the PR title and description, or the branch's commit messages, to learn **the purpose**. Review the change against that purpose, but judge the code itself, not the description.
3. Read the full diff of each scope:
   - committed: `git diff <merge-base>..HEAD`, or `gh pr diff <url>` for a PR;
   - staged: `git diff --cached`;
   - unstaged: `git diff`;
   - untracked: read the files.
   For large diffs, split by area; don't skim.
4. Write `.forge/tasks/review-<slug>/scope.md`: the target, purpose, areas, files per area, and any limitations. This is the shared brief for the reviewers.

## R3. Reviewer team (one parallel wave)

Use the script's `suggestedTeam`, adjusted by what you saw. Each role maps to a FORGE agent:

| Spec role | FORGE agent | When |
|---|---|---|
| Senior Developer | `forge-code-reviewer` | always, for code changes |
| Security Engineer | `forge-security-engineer` | any code change. Mandatory for auth, input handling, data access, dependencies |
| QA Engineer | `forge-qa-lead` | any behavior change: missing tests, regression risk, acceptance |
| Principal Architect | `forge-architect` | API or schema contracts, cross-module changes, more than about 15 files, new patterns |
| Database Specialist | `forge-database-engineer` (**review-only work order**) | migrations, schema, queries, ORM models |
| Performance Engineer | `forge-performance-engineer` | queries, hot paths, rendering, network-heavy changes |
| UI/UX Reviewer | `forge-accessibility-specialist` + `forge-browser-qa` (+ `forge-ux-designer` for flows) | frontend changes |

For a small diff (under about 100 changed lines, one area), 2 reviewers are enough: `forge-code-reviewer` plus the area specialist. Launch the whole team **in one message**, so they run in parallel. When the JSON has an `escalation` (auth, payment or database files changed), launch the roles it lists with `model: "opus"` ([model escalation](delegation.md#model-escalation)).

### Review work order

```
ROLE TASK: REVIEW ONLY. Review <scope> from the <role> perspective. Modify no files except your report.
TASK FOLDER: .forge/tasks/review-<slug>/ (read scope.md first)
DIFF: <commands from R2 for each scope>   PURPOSE: <one line>
FOCUS: <the spec checklist for this role>
METHOD: trace changed functions to callers and dependencies; compare with existing conventions; check the
        unchanged code the change relies on. Verify every finding against the actual code.
RETURN: findings, each exactly:
  [CRITICAL|HIGH|MEDIUM|LOW|INFO][confidence HIGH|MEDIUM|LOW] <title>
  kind: bug | security | architecture | performance | test-gap | ux | recommendation
  file: <path>:<line>   problem: <…>   why: <impact>
  evidence: <reproduction steps, or the exact code-path reasoning>   fix: <concrete suggestion>
  Plus: checks you ran (command → PASSED/FAILED/NOT RUN) and anything you could not verify.
```

**Browser QA** in review mode tests the **current checkout** against a local or test app:
- Run it when frontend files changed and the app can run locally.
- In PR mode, run it only if the PR branch is the current checkout. Otherwise mark it N/A and give the reason.
- It reports problems; it never fixes them.

## R4. Consolidate (the orchestrator)

1. **Verify:** re-open the cited `file:line` for every CRITICAL and HIGH finding, and spot-check the rest. Drop or downgrade anything the code doesn't support. Speculative concerns become **INFO** or **potential risks**, never confirmed bugs.
2. **Deduplicate:** one finding per root cause. Keep the most precise evidence and credit the roles that raised it.
3. **Severity:**
   - CRITICAL: a security hole, data loss or system-wide failure.
   - HIGH: a major functional failure, a security issue or a significant regression.
   - MEDIUM: incorrect behavior, incomplete validation or meaningful maintainability debt.
   - LOW: a minor issue or edge case.
   - INFO: advisory only.
   The code reviewer's own scale maps blocker→CRITICAL/HIGH, major→HIGH/MEDIUM, minor→LOW, nit→INFO. Decide by impact.
4. **Classify:** confirmed bugs (BR-001…) go in section 4. Security goes in section 5, split into verified and potential. Design and maintainability go in section 6. Recommendations are never presented as bugs.
5. **Run the cheap checks yourself** if no reviewer did: the existing tests, typecheck, lint and build from `.forge/context.json`. Record the real results in section 8. Never fabricate a result: if it wasn't run, write *Not run* and the reason.
6. **Status:**
   - BLOCKED: no access, or the base or target is too uncertain to review.
   - CHANGES REQUIRED: any confirmed CRITICAL or HIGH finding, or a confirmed MEDIUM bug in the change's main purpose.
   - APPROVED WITH SUGGESTIONS: nothing blocking, but worthwhile improvements.
   - APPROVED: nothing to report beyond INFO.

## R5. Tickets (only when they earn their place)

- **Bug tickets** are only for confirmed bugs. Group findings that share a root cause into one ticket, and keep independent bugs separate. Each ticket gets acceptance criteria: behavior, error handling, regression test, QA check.
- **Feature or improvement tickets** need genuine product or engineering value that you can tie to something seen in the code: a missing capability, a repeated pattern, a performance or security gap. Never invent business requirements. Label them clearly as optional.
- **Section 9** splits fixes into *must fix before merge* and *should fix soon*. Section 11 holds future opportunities.
- Draft tickets in the report only. Create them in Jira or another tracker **only** when the user explicitly asks.

## R6. Report and unlock

1. Fill [templates/review-report.md](../templates/review-report.md) **exactly**:
   - The first line is `# FORGE — Engineering Review Report`.
   - Use all 13 sections, in order, with the same headings, whether this is a PR or a branch review.
   - Write the template's "none" line rather than dropping a section.
2. Write the report only after **every reviewer you launched has returned**. Save it to `.forge/tasks/review-<slug>/report.md` and print the **full report** as the final message. If a reviewer's result arrives after that, merge it, update the file and print the full report again. The last message starts with the `# FORGE — Engineering Review Report` line, with no preamble, and is never a recap or a pointer to an earlier message.
3. Run `node "<FORGE_HOME>/scripts/review-target.mjs" --unlock` before you finish, even when the review is BLOCKED. The lock also expires after 3 hours.

If the user then asks to fix findings, that is a new FORGE task: unlock, then run the normal lifecycle with the review report as input, with a spec, the owning engineers, verification and the Execution Report.
