# Delegation Protocol

## Work order (what you send a specialist)

Keep it short and point to files instead of pasting them. Specialists start with **no** conversation context.

```
ROLE TASK: <one sentence goal>
TASK FOLDER: .forge/tasks/<slug>/   (read spec.md and plan.md there first)
CONTEXT: .forge/context.json (stack, commands). Key paths: <3-10 paths>
SCOPE: <what to do>  |  OUT OF SCOPE: <what not to touch>
FILE OWNERSHIP: <exact files/globs you may edit>   (omit for read-only roles)
DEPENDS ON: <contracts or decisions already fixed, e.g. API shape in plan.md §3>
VERIFY WITH: <commands or checks you must run, from context.json>
RETURN: Specialist Report (format below), max ~400 words
```

## Specialist report (what they return)

```
## <agent-name> report
STATUS: done | partial | blocked
SUMMARY: <2-4 lines>
FINDINGS / DECISIONS: <bullets, each with file:line evidence>
FILES CHANGED: <path: what changed>   (or "none")
COMMANDS RUN: <exact command → result: PASSED | FAILED (key error) | NOT RUN (why)>
RISKS / OPEN ISSUES: <bullets or "none">
```

Specialists must also save this report to `.forge/tasks/<slug>/reports/<agent-name>.md` when a task folder exists.

## Rules

1. **Single source of truth.** The spec and plan in the task folder are the source of truth. If a specialist needs a requirement changed, it reports the reason. Only the orchestrator edits `spec.md` and `plan.md`.
2. **File ownership.** Implementers edit only the files they own. Before launching parallel implementers, make sure ownership is disjoint. Shared files (route registries, barrel exports, lockfiles, config) get a single owner, and the other agents request changes through their report.
3. **Contract first.** When frontend and backend both change, freeze the API contract in `plan.md` before launching both.
4. **Parallel launch.** Issue independent Agent calls in the same message. Never launch two editors on overlapping files.
5. **Verification of claims.** Treat specialist claims as unverified until you see evidence: diff, command output or a screenshot. Re-run at least one "passed" command yourself.
6. **No nesting by default.** Specialists do their own job and do not spawn further agents. The orchestrator coordinates everything.
7. **Retry budget.** If a specialist returns `blocked` or wrong work, re-brief it once with the specific correction. After that, do it yourself or report it.

## Conflict resolution

When recommendations conflict, decide by this precedence and record the decision with its rationale in `plan.md` under **Decisions**:

1. Safety, security and data integrity
2. Correctness against acceptance criteria
3. Backward compatibility and existing conventions
4. Reliability and operability
5. Performance (only with measured evidence)
6. Simplicity and maintainability
7. Preference or style

If the conflict is a genuine business trade-off (a clarification-policy trigger), ask the user.

## Mode B (sequential emulation)

When no native subagents exist, run the same work orders yourself in wave order:
1. Read `roles/<agent-name>.md`. Load each skill it lists from `<FORGE_HOME>/../<skill-name>/SKILL.md`.
2. Do only that role's job and write its specialist report to the task folder.
3. Drop the role's mindset before starting the next role. For the final review, re-read the diff as if you had never seen it.
4. Report the specialists as "emulated sequentially in Mode B". Never describe them as independent agents.
