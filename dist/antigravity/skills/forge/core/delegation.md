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
VERIFY WITH: node "<FORGE_HOME>/scripts/validation-gate.mjs" run --task <slug> --units <your units>
             (once, when your edits are done; never raw suite commands; read-only roles: omit)
GATE:        (browser QA and device verification only) pre-browser gate OPEN at cycle <n>;
             re-check: node "<FORGE_HOME>/scripts/validation-gate.mjs" gate --task <slug>
EVIDENCE:    (browser QA only) screenshots: .playwright-mcp/<slug>/screenshots/{before,after,responsive,workflows}/
             index + session: .forge/tasks/<slug>/evidence/  (validation-gate.mjs evidence --init / evidence)
MODEL:       (only when escalated) strong tier: <trigger from Model escalation below>; otherwise omit
RETURN: Specialist Report (format below), max ~400 words
```

Write `<FORGE_HOME>` out as the absolute path with forward slashes, exactly as you run `V` yourself. A measured browser pass guessed the path six ways (`~`, `$HOME`, `/c/…`, backslashes) and every guess hit a permission prompt.

Implementers validate through the runner because it records every result. When their checks already passed for the final code, the validation wave reuses them instead of running them again. Never send a browser QA or device work order while the gate is CLOSED or BLOCKED. The one exception is a short pass before any edit: reproducing a bug, or capturing the before screenshots of a visual fix or UI improvement.

## Check budget (no repeated suites)

A measured run spent about 32 minutes of check time on one change: a baseline that overlapped the edits, implementers running the suites by hand, a gate cycle that was already stale when it finished, and a mobile build in every cycle. Follow these rules so each suite runs about once per round:
- **VERIFY WITH is always the runner** (`V run --task <slug> --units <own units>`), never raw `pnpm test` / `npm run typecheck` lines. Raw runs are not recorded, so the gate runs them all again. An implementer runs it **once, when its edits are done**. While iterating, it runs only the tests for the files it touched.
- **Run checks only when no editor is running.** A `V run` started while any implementer is still editing is stale the moment that edit lands. Wait for every implementer of the wave to return, then run once.
- **Balanced implementation wave.** In a measured run, the web engineer got 7 MUST items plus every SHOULD in one large page. It took 16 min and 145 calls, read 10.4M cached tokens and still hit its turn cap; mobile finished in 4 min. Give each engineer at most about 6 items, and split the rest across engineers with disjoint files. Smaller contexts also cost fewer tokens per call.
- **One fix wave per round.** Wait for every verifier of a wave (browser QA, and the code review when G13 requires it), merge their findings, and send each owner a single fix list. Each separate fix trickle costs a full gate cycle. **Balance the wave:** it ends when its slowest owner does. In a measured run, one engineer got 11 findings and took 11.5 min while the other two finished in 2–3 min. Give each owner at most about 6 findings, and split a longer list across engineers with disjoint files.
- **The validation wave runs `V run --task <slug>` without `--units`.** Then everything the working tree changed, staged work included, is covered in one cycle, not discovered as MISSING in a second one.
- **Production builds are the user's; full test suites run once, at the end.** `V run` never runs a build that type check or tests already cover, and `V final` hands its command to the user. Never run a build by hand to "double-check". `V run` runs only the tests related to a unit's own changes (plain vitest or jest scripts, traced through the module graph), and that is final unless the unit changed auth, payment or schema files. Run `V run --task <slug> --full` once, after the last fix and right before `V final`; it runs a full suite only where one is still required.
- **Branch work uses `--base <base branch>`, never `--all`, for coverage.** Without it the gate sees only uncommitted files and misses what the branch committed. `--all` re-runs passing checks and is never the way to widen scope.
- **A build that rewrites a tracked file** (a sitemap's lastmod) is reported as a build side effect and does not stale other checks. Restore the file only if it should not ship.
- **One `V run` per task at a time.** The runner holds a lock: a second run waits for the first, then runs only what is still needed. A run in the background prints a stderr line per finished check; read those, and never start a run to find out whether one is alive.
- **No edits of your own once the gate is OPEN**, not even a comment reflow. In a measured run, one comment edit made 8 checks stale (the 140 s API suite among them) and stopped browser QA at its gate check. Put the edit in the next fix wave, or leave it for the report.
- **A baseline only when red checks are expected** (knowledge.md lists failing checks, or the task fixes one). It runs to completion before the implementation wave starts, in the foreground. A baseline that overlaps edits is unreliable: the runner warns, and you must not use it to mark PRE-EXISTING.

## Browser QA scope

The first browser pass in the measured run hit its 45-turn cap. It had 6 journeys across 2 viewports, 3 model types and 4 modes, plus account setup. Size every browser work order to fit:
- **Before screenshots** (visual fixes and UI improvements only): the reproduction pass, before any edit, captures at most 3 screenshots into `screenshots/before/`: the screens the change touches. Write "at most 3 screenshots" in the work order; "3 journeys" produced 17 shots in a measured run. New features have no before.
- **At most 4 journeys per pass, at one viewport.** Add a second viewport only for layout assertions (one `evaluate` per page). Rank journeys by risk. Put the rest in a second pass, or list them as NOT RUN with the reason.
- **Give it the session:** check the servers once with `V ports --ports <app,api,db>` (never netstat or `Get-NetTCPConnection` loops), then pass the running app URL and, when a previous pass recorded one, `evidence/qa-session.md` (throwaway local test account, servers started). A retest reuses them instead of registering a new user.
- **Retests carry only the delta**, through the same verifier where platform.md `continueSubagent` is supported, otherwise a fresh foreground one. Never relaunch a full pass after a fix.

## Delta retests

Re-verifying the whole change after every fix was the biggest cost in measured runs: three full browser passes and three full reviews for one feature. So a retest covers only what changed:
- **Snapshot before every verification wave:** `node "<FORGE_HOME>/scripts/verify-delta.mjs" snapshot --task <slug>`. After the fix, `verify-delta.mjs delta --task <slug>` prints the fix delta.
- **Continue the same verifier** only where platform.md `continueSubagent` is supported; it still holds its findings and the code in cached context. Otherwise follow its fallback: a fresh **foreground** verifier with the previous report and only the delta.
- **A verifier that returns partial** (turn cap reached) is never resumed in the background. Launch a fresh foreground one with only the journeys still open and `evidence/qa-session.md`.
- **Reviewer:** confirms each previous finding against the delta and reviews only the delta lines.
- **Browser QA:** re-runs only the failed journeys plus the one adjacent journey most at risk, at one viewport. It covers more viewports only when the delta touches layout or CSS.
- **Automated checks:** `validation-gate.mjs run --task <slug>` re-runs exactly what the fix made stale or what failed, and nothing that still passes. Start it only after every owner of the fix wave has returned. It must exit 0 (gate OPEN) **before** the browser retest.
- **Minor findings and nits** never start a new round. Batch them into the fix wave and let the delta re-review confirm them.
- **Full re-verification only** when the delta is large (more than about a third of the original change), touches files the earlier round never saw, or changes a contract.

## Model escalation

Testing and QA start on the **standard tier**: test automation, manual QA, browser QA (Playwright, Chrome DevTools), API and regression checks, and routine bug reproduction. Move a role up to the **strong tier** only when one of these triggers is present, and name the trigger in the work order. [platform.md](platform.md) names both tiers on this host:
- **Critical workflow changed.** `V run` and `review-target.mjs` print a `Model escalation:` / `Code review: required` line when auth, authorization, payment or database schema files changed. Launch the roles it lists on the strong tier: the code reviewer always, plus the security and test automation engineers for auth or payment.
- **Root cause not found.** `V gate` hints `failed in 2 cycles`, or a standard-tier verifier returns `blocked` or "root cause unknown" after its re-brief. Move the investigation (`forge-debugging`) to the strong tier before the next fix attempt.
- **The failure spans services or apps**, or involves race conditions, concurrency, or an architectural defect.
- **A security vulnerability** needs deeper investigation than the first pass gave it.
- **High-risk independent review**: an L-size change, or a review whose verdict gates auth, money or data.

Rules:
- **How:** platform.md `perCallModel` gives the native form; the agent's file stays unchanged, and continuations keep their model. Never lower a model: a role whose model is already at least as capable stays there.
- **Strong tier unavailable** (`perCallModel` unsupported, Mode B, or an account without that model): continue with the available model and the same tools. Put the limitation in the report: `Model escalation unavailable: <role>, <trigger>, <reason>`.
- **Models never decide pass/fail.** A check passes only on the output of a run in this task: a test runner, Playwright, DevTools, curl or `V`. A test plan, a written test or an approving review is not evidence, on any model.
- **Never trade coverage for model cost.** Size the test scope by risk. A cheaper model may change who runs a check, never whether it runs.

## Turn caps

Every agent has a `maxTurns` cap, set well above real needs, to stop runaway loops. Output marked **partial** means the agent hit its cap. Continue it once with a narrower scope, or report the remainder as unverified. Never count partial work as done.

## Retest work order (after a fix)

Verifiers return after a fix to confirm it, not to start over. Send them only the fix delta:

```
ROLE TASK: RETEST round <n> of <slug>. Confirm the fixes; do not redo the full pass.
TASK FOLDER: .forge/tasks/<slug>/   (your previous report: reports/<your-name>.md)
PREVIOUS FINDINGS: <id — severity — one line each, as the owner reported them fixed>
FIX DELTA: run `node "<FORGE_HOME>/scripts/verify-delta.mjs" delta --task <slug>` (changes since your last round)
SCOPE: reviewer: each previous finding is resolved, plus problems introduced in the delta lines only.
       browser QA: the failed journeys + the one adjacent journey at most risk, one viewport (more only if the delta touches layout/CSS).
APP URL: <url of the already-running server>
GATE: (browser QA) pre-browser gate OPEN again at cycle <n> after the fix
RETURN: Specialist Report; list each previous finding as resolved | still open | regressed
```

Before you send it, take a new snapshot (`verify-delta.mjs snapshot --task <slug>`), so the next round's delta starts from what this round saw. Where platform.md `continueSubagent` is supported, send the retest to the **same** verifier, which already holds the context. Otherwise use its fallback, always in the foreground.

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
5. **Verification of claims.** Treat specialist claims as unverified until you see evidence: diff, a ledger row, command output or a screenshot. A claimed pass counts only as a `V` ledger row for the current code; never re-run a suite to confirm it.
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
3. Drop the role's mindset before starting the next role. When G13 requires a review, re-read the listed files as if you had never seen them.
4. Report the specialists as "emulated sequentially in Mode B". Never describe them as independent agents.
