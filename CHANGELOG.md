# Changelog

All notable changes to FORGE are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Removed
- **FORGE no longer runs full test suites.** Type check, lint, the related tests and browser QA already cover the change, and the full web suite took 155–263 s per pass in measured runs. Every unit whose test script is a plain vitest or jest call now runs only the related tests (`--changed` / `--changedSince`), consumers of a changed package and auth, payment or schema changes included, and the final gate accepts that. No full pass is owed, none starts in the background, and step 9 no longer runs `V run --full`. `V final` prints the full-suite command next to the build command (`Full test suite: not run by FORGE … run \`npm run test\` (packages/lib)`), the app table shows `PASSED (related)`, and the answer gives the command in one sentence without lowering the status. `--full` still runs the full suites, only when the user asks. `--serial` is gone. Other runners (pytest, go test, `turbo test`) have no related-tests mode and run as before. Trade-off: a consumer that imports a package's prebuilt output may have no related tests to run, so type check and browser QA are its checks until the user runs the full suite.
- **FORGE no longer runs the final production build.** Type check, lint and tests already cover what a build would catch, and builds were the slowest checks (a mobile build took about 3 minutes). A build that type check or tests cover, and whose output no consumer imports, is now `N/A` ("left to the user"): it never runs and never blocks the gate or `final`. `V final` prints its command, and the answer gives it in one sentence without lowering the status. A build still runs when it is a unit's only compile step or when consumers import its output. The pre-final pass that runs the full test suites is now `V run --full`; `--build` still works as an alias. Tests in `validation-gate.test.mjs` cover all of this: `--all`, `--full` and `--build` never run a covered build, `final` prints the command, and a build that is the only compile step still runs, last in its unit.

### Changed (platform contract)
- **Pre-approved, but never for dependency changes, publishing or deploys.** A probe showed that a rule's `*` matches spaces, so `pnpm --filter * test*` also matched `pnpm --filter x add pkg test`. The git guard now answers **ask** during FORGE turns for:
  - dependency changes (`add`, `install`, `remove`, `update`, `publish` and the like for npm, pnpm, yarn, bun, pip, poetry, uv, cargo, go, composer, gem, dotnet and flutter);
  - deploys (eas, vercel, netlify, firebase, wrangler, terraform, pulumi, kubectl, helm, fastlane, fly, heroku, serverless, `docker push`).

  A second probe confirmed that a hook's `ask` overrides an allow rule. Git writes stay blocked as before. Tests: `git-guard.test.mjs`.
- **Fixes from live runs 4 and 5 (TruArt):**
  - **Agents run in the foreground.** Claude Code started `Agent` calls in the background when `run_in_background` was unset, so the orchestrator said "waiting" and its turn ended. The later turn lost FORGE's pre-approvals, and it stopped to ask the user. Every `Agent` call now passes `run_in_background: false` (platform.md `foregroundWait`); a probe confirmed that it blocks and stays in one turn.
  - **Windows paths.** PowerShell rules now also cover FORGE's script paths in the backslash form (`C:\Users\…`), and the installers resolve them.
  - **Waiting for servers.** `V ports --wait <s>` replaces shell polling loops with `sleep`, which were denied.
  - **Stale task reports.** Earlier reports in `.forge/tasks/` are history, and the code is the truth: FORGE builds on the current tree, never restores a stash, and mentions the difference instead of stopping to ask.
  - **Plain commands.** Commands run from the project root without `git -C <path>`, so the plain rules match. Read-only `git stash list/show` and `git ls-tree` are pre-approved; the contract refuses stash writes.
- **No per-project permission setup on Claude Code.** In live runs, the project's tests, dev servers and the Playwright and DevTools tools each stopped for a permission prompt, and headless runs denied them outright. The Claude Code profile now lists FORGE's standard workflow (`preApproved`), and the build writes it into the forge skill's `allowed-tools`. The list covers FORGE's own files and scripts, the project's test, lint, type check and dev commands (pnpm, npm, yarn, bun, pytest, go, cargo, gradle, maven, dotnet, flutter, artisan), read-only git, `curl` to localhost, and the two browser MCP servers. It works in every project with no settings file and no workspace trust, and it lasts for the `/forge` turn, subagents included.
  - **Safety:** every part of a chained command must match. A probe showed `approved && node -e …` still asks.
  - **Refused by the contract:** git writes, installs, publish and deploy, single-word patterns, and any interpreter (`node -e`, `bash -c`, `python -c`) except FORGE's own script folders, so `../` traversal is out too. Commits and pushes stay blocked by the git guard, and everything outside the list still asks.
  - **Tests and probe:** `platform-contract.test.mjs` (scenario G). A headless probe confirmed the middle wildcard (`pnpm --filter * test*`), MCP server rules in the skill and in a subagent, and the chained-command refusal.
- **Each host now declares its capabilities in a host profile, and the core reads it.** Model escalation printed "with model opus" and the shared instructions named `SendMessage`, `AskUserQuestion` and `ToolSearch`. Those Claude-only details shipped unchanged to Antigravity, which has none of them and only `inherit|flash|pro` models.
  - **`adapters/<host>/platform.json` is the adapter contract.** It covers 15 capabilities (each `supported` with its native form, or `unsupported` / `unverified` with a fallback), plus model tiers, frontmatter fields, required configuration, limitations, and whether the host was verified live or from its docs.
  - **Checked in two places:** `skills/forge/scripts/platform.mjs` validates profiles, and `validate.mjs` rejects an adapter without a valid one.
  - **The build reads every host decision from the profile** and writes `skills/forge/platform.json` and `core/platform.md` into each install. The output for existing files is unchanged, byte for byte.
  - **The shared instructions name capabilities and model tiers**; `core/platform.md` maps them to each host. The scripts print the host's model, or "record the escalation as unavailable" where the host can't choose one.
  - Tests: `tests/unit/platform-contract.test.mjs` covers scenarios A (identical core on both hosts, same decisions), B (missing or corrupt profile), C (capability detection) and E (project isolation). `docs/testing.md` maps scenarios A–H to their tests.
- **Stay in the `/forge` turn until the answer** (new rule 9). In the live run, the orchestrator started `V run` in the background and ended its turn with "I'll report back". The later turns had lost the skill's pre-approvals, so all three gate re-runs were denied and the task ended BLOCKED, with 2 test fixes unverified.
- **Checks reused across tasks.** `V run` records the commit (`head`) with each result and reuses a passing result from another task in the same project when the commit and the changed files are identical. That covers the baseline too. `--all` always re-runs. In the measured run, a 266 s baseline re-checked a tree the previous task had already passed.
- **`V ports --ports 3000,5173`** answers "which servers are running" in one call on any OS. The measured run spent 8 calls on netstat and `Get-NetTCPConnection` variants, half of them stopped by permission prompts.
- **Agents read and write files only with the file tools.** A subagent's `cat` and heredoc report were denied by permission prompts, and the report was lost.

### Fixed (live run, TruArt, 2026-11-19)
- **FORGE could not read its own rules or run its own gate without a permission prompt.** In a workspace without broad permissions, the orchestrator's reads of `core/lifecycle.md` and `core/delegation.md` were denied, and so was every `node …/validation-gate.mjs` call. So it ran without its delegation and check-budget rules: it edited a shared package itself and ran raw `pnpm --filter … test` twice, then stopped BLOCKED. `skills/forge/SKILL.md` now declares `allowed-tools` for FORGE's own files (`Read(~/.claude/skills/forge*/**)`) and for `node` on its own script folders only, in the quoted and unquoted forms, for Bash and PowerShell. The installer writes the absolute install path into them. Since `V run` runs the project's type check, lint and tests in its own process, this one grant covers most check traffic. Any other command still asks. A headless probe confirmed it: with the rules, the skill and its subagents read the files and ran the scripts; without them, all were denied; an unrelated `node -e` stayed denied. `install.test.mjs` asserts the resolved paths and that no bare wildcard is granted.
- **A stopped run is resumed, not restarted.** `validation-gate.mjs resume` finds the task that owns the working tree's changes: an app's changed files are still byte for byte what one of that task's checks saw. When that task's report is missing or says BLOCKED, FAILED or NOT READY, the run resumes it. It keeps the slug, spec and plan, re-runs only stale or missing checks, and finishes only the open items. SKILL.md step 0 runs it first. A first re-run of run 7's BLOCKED tree, guided only by written rules, read a newer VERIFIED report (whose code was stashed) and started a new pass; the script makes the choice instead.
- **Resuming a verifier ended the run (run 7: BLOCKED after 13.9 min).** Browser QA hit its 45-turn cap. The orchestrator resumed it with `SendMessage`, which runs in the background, so the `/forge` turn ended. Every later gate run and read then needed approval, and the last fix stayed unverified. The Claude Code profile now marks `continueSubagent` unsupported. Retests and partial passes go to a fresh foreground verifier with only the delta or the remaining journeys. Browser QA's cap is now 70 turns.
- **About 20 permission refusals per run (run 6), each a prompt in an interactive session:**
  - Agents guessed the path to `validation-gate.mjs` six ways. Probes showed that no rule matches a PowerShell command with a backslash path, so those generated rules were dropped. Work orders now carry the exact forward-slash command.
  - The shared rules encouraged "chained commands"; they now ask for one plain command per call, from the project root.
  - `pnpm … build` and `prettier --write` are now pre-approved.
- **Browser QA no longer waits for a consumer's full test suite.** In a fresh run, plain Claude Code finished 3.7 minutes sooner. About 2.5 of those minutes went to a full web suite that had to pass before browser QA could start, because the app consumes a changed shared package. Now the consumer's related tests open the pre-browser gate. The full suite it owes starts as a background `run --full` that overlaps browser QA. The final gate still requires that full pass, and step 9's `--full` waits for it. `--serial` restores the old order. Trade-off, accepted by the owner: in rare cases browser QA tests code whose full suite later fails, and the final gate catches it.
- **The DevTools record counts where QA writes it.** `final` also accepts a browser QA report under `reports/` that records the DevTools console and network. In run 12, two parallel QA passes each left the shared `evidence/devtools.md` to the orchestrator, so `final` failed once and a minute went to copying the record over.
- **235 false test failures from a lowercase drive letter.** Started from `c:\…`, the usual cwd in a VS Code terminal, Vitest loaded React twice and every hook test failed. The same code passed from `C:\…`. `validation-gate.mjs` now runs every check from an upper-case drive path. This was proven both ways on TruArt: the old script failed and the fixed one passed, from the same shell.
- **Server checks without `curl`.** `V ports --urls <local URLs>` adds each URL's HTTP status to the listening check, in one call, for local hosts only. Runs 7 and 9 each spent a permission prompt on `curl -s -o /dev/null -w "%{http_code}"` probes.
- **Evidence:** `final` counts a screenshot saved anywhere in `.playwright-mcp/<slug>/` (traces excepted). Run 6 spent two minutes and five refusals moving correct screenshots into `screenshots/after/`.
- **Baseline only when red checks are expected.** Run 6's baseline re-ran every suite before any edit, which took 2.5 minutes and found everything green.
- **Security: `curl` beyond localhost asks.** A rule's `*` matches spaces, so `curl * http://localhost:*` also matched a call that adds a remote URL. The guard hook now answers "ask" for any curl call with a non-local URL, proxy or config file. It also reads a package manager's subcommand after `--filter <pkg>`, so `pnpm --filter web exec vitest run update` no longer asks.

### Changed (adaptive validation)
- **Full test suites scale with risk.** Related tests (`vitest --changed`, `jest --changedSince`, traced through the module graph) now count for the final gate of a low-risk change. A unit that changed auth, payment or schema files still needs one full-suite pass (`V run --full`). Consumers of a changed package, root config changes and other runners always run in full. In the measured TruArt run, the web suite (about 155 s) ran in full once more before `final` for a UI-only change.
- **Browser and device verification follow runtime impact.** A unit whose own and upstream changes are only tests is no longer in the browser or device scope, so `final` asks for no screenshot or DevTools record for it. A changed upstream package still puts its web and mobile consumers in scope.

### Added
- **Adaptive model selection for testing and QA.** Testing roles start on Sonnet and move up to Opus only on a defined trigger (`core/delegation.md` "Model escalation"). The triggers that depend only on changed files or check results are enforced in scripts:
  - `review-target.mjs` and the orchestrator's `V run` print an `Opus escalation:` line when auth, authorization, payment or database schema files changed, naming the roles to launch with `model: "opus"`. Any of them escalates the code review. Auth and payment also escalate the security review and test design. Look-alike paths (`author.ts`, `typeGuards.ts`, ORM models without a migration, docs, styles) don't count, and implementers' `--units` runs omit the line.
  - `V gate` marks a check that failed in two cycles (`escalate: true`, hint `failed in 2 cycles`) so the root-cause analysis moves to Opus before the next fix.
  - Never lowers a model: a role already on a model at least as capable stays there. When Opus is unavailable, the run continues and the report says so.
  - Every agent's rules now say that a test plan, a written test or a review is not a pass; only the output of a run decides it. Model cost never reduces test coverage.

### Changed
- **Every visually verifiable change shows its real screenshots in the answer.**
  - **Location:** screenshots go in `.playwright-mcp/<slug>/screenshots/{before,after,responsive,workflows}/` and traces in `.playwright-mcp/<slug>/traces/`. Playwright MCP saves there directly, which removes the old copy step. `evidence --init` gives the task folder its own `.gitignore`, so screenshots never show in git status. The index, the QA session (it holds a test account), network captures and validation logs stay in git-ignored `.forge/tasks/<slug>/evidence/`. Screenshots of older tasks under `.forge/` still count.
  - **Visual Results table:** `V final` and `V evidence` print the answer's `### Visual Results` table, built only from files that exist. Each row is described from `evidence/index.md`, and a before/after pair shares a row (`before/x` + `after/x`, or `x-before-y` + `x-after-y`). The answer pastes the table as is, so no link is typed by hand. `final --json` adds absolute paths for hosts where relative links don't open.
  - **Enforced:** for a browser- or device-visible change, `V final` is NOT READY without a screenshot of the final state, or when the newest screenshot predates the last code edit. The honest way out is a `Visual evidence unavailable: <reason>` line in `evidence/index.md`, and the answer then says so.
  - **Before screenshots** are taken only for visual fixes and UI improvements: at most 3 screens, in the pre-edit reproduction pass. New features have no before, and none is ever reconstructed.
  - Tests: `validation-gate.test.mjs` covers the folders, the git-clean layout, before/after pairing, no table without files, and the missing, stale and stated-unavailable final-state cases.
- **The final message answers the user's request; the full report is saved, not printed.** The 15-section FORGE Execution Report buried the outcome under agents, phases and command logs. Now the final message follows `templates/final-response.md`:
  - It starts with the outcome, shaped by the request (feature, bug fix, UI, API, question, research), with real screenshots for UI work.
  - Verification is a sentence or two; test counts appear only when a failure needs explaining.
  - It ends with one `**Status:**` line (the same four statuses) and the git state.
  - Agent names, phases, model and skill choices and command lists are left out unless the user asks for execution details. Then FORGE prints the saved report.
  - The report is still written to `.forge/tasks/<slug>/report.md`, unchanged, for tools and later tasks. The answer's status must match it.
  - Reviews keep their 13-section report, since that report is what was asked for.
  - The e2e runner now fails an answer that prints the execution report or names internal agents, that lacks the status line, or whose status differs from the saved report's.

### Fixed (measured live run, TruArt, 2026-11-18)
These fixes come from a headless `/forge improve the UX of the feature implemented in the current branch` run: Opus orchestrator, 44.5 min, $9.11, 24.9M cache-read tokens. Its answer fit the request, and all 18 screenshot links in it opened. These were the problems:
- **"Verified in the browser" without DevTools.** The browser QA agent loaded only the Playwright tools through `ToolSearch` (MCP tools were deferred), so it never read DevTools in either pass. The answer still said the web was "fully verified".
  - The skill now loads both tool sets in the first call and writes `evidence/devtools.md`.
  - `V final` is NOT READY for a browser-visible change without that record, or without a `DevTools unavailable: <reason>` line.
- **False test failures under load.** Cycle 1 reported the admin tests FAILED ("Test timed out in 5000ms") while up to 4 suites ran at once on 8 cores. The tests were untouched, and they passed alone. This cost an extra 158 s gate cycle.
  - At most half the slots now run test suites.
  - A suite that fails with a runner timeout message is re-run alone after the batch. The timed-out attempt is not recorded as a verdict; the re-run's result is, with the reason. A real failure is never retried.
- **Related tests never used.** The shared contract lived in `packages/types`, so web counted as a consumer of a changed package and ran its full 155–157 s suite in every cycle.
  - Each full test pass now records an upstream fingerprint.
  - When a unit's last full pass already saw the upstream exactly as it is now, its own changes run only the related tests. A new upstream change brings back the full suite.
- **One overloaded engineer.** The web engineer got 7 MUST items plus every SHOULD in one large page: 16 min, 145 calls, 10.4M cache-read tokens (42% of the run), and it still hit its turn cap. Mobile took 4 min. Plans now give each engineer at most about 6 items and split the rest across disjoint files.
- **Screenshot overload.** "At most 3 journeys" produced 17 before shots, plus 16 after shots.
  - Work orders now say "at most 3 screenshots" for the before pass, and passes aim for at most about 8.
  - `evidence` and `final` flag shots over budget.
  - The Visual Results table shows at most 8 rows (pairs first) and links the folder for the rest.
- **Dev servers left running.** FORGE's `pnpm dev` (web, admin, API, Expo) kept 4 ports busy, and the headless session could not exit. Step 10 now stops the servers FORGE started, never the user's own, and says how to restart them.
- **Learning the gate from its source.** `validation-gate.mjs --help` printed one line saying "see the header", so the orchestrator read the source. `--help` now prints the documented usage in all four scripts. `comment-check` and `review-target` used to run a full check on `--help`.
- **A targeted test that ran everything.** `pnpm --filter @truart/web test -- <file>` passes `--` through to vitest, so it ran the whole 133 s suite. The agent rules now name the runner command for one file.
- The orchestrator may write a small frozen contract (shared types or copy, with tests) for parallel engineers; it did so in about 40 s. Everything else stays with specialists.

### Changed (performance)
- **Fix cycles run only the related tests; the full suite runs once, before final.** In the measured TruArt runs, web's 263 s suite ran in 3–4 gate cycles per task.
  - A unit with its own changed files whose test script is a plain `vitest` or `jest` call now runs `vitest --changed [<base>]` or `jest --changedSince=<base>` / `--onlyChanged` (with `--passWithNoTests`) in fix cycles. The ledger marks it `scope: affected`, and it opens the pre-browser gate.
  - `run --build` runs the full suite once with the deferred builds. The final gate treats a related-tests-only pass as MISSING, so nothing reaches FINAL READY without a full run.
  - Always the full suite: a consumer of a changed package (its tests can't trace a package's prebuilt output to the changed sources), any unit whose upstream changed, root config changes, baselines, and anything that isn't a plain vitest or jest call (`turbo test`, chained or wrapped scripts).
  - Tests: `affectedCommand` patterns, plus a fake `vitest` that records its arguments. It proves the fix cycle ran `--changed`, `--build` ran the full suite, the final gate required it, and a consumer stays on the full suite.
- **Browser QA stops waiting on timeouts.** In two measured TruArt passes (8 and 10 min), `browser_run_code` took 262 s and 393 s. Almost every call lasted about 30 s, Playwright's default timeout: `click().catch(fallback)` on missing elements, plus fixed sleeps of up to 30 s for a generation. Scripts now start with `page.setDefaultTimeout(5000)`, check that an element exists before clicking it, and wait for the real response or element, never a fixed sleep over 500 ms.
- **Comment errors surface in the author's own `V run`**, limited to that run's units. Before, `final` found them after browser QA, and the fix made checks and screenshots stale.
- **Balanced fix waves:** at most about 6 findings per owner. A wave ends with its slowest owner; one 11-item list took 11.5 min while two others finished in 2–3 min.
- **Faster gate cycles and no duplicate runs.** These fixes come from two measured TruArt branch runs (40 and 21 minutes). In those runs, each gate cycle took about 7 minutes, two cycles ran at once, and agents re-ran suites the gate had already recorded.
  - **Checks start longest first and run side by side.** Before, a unit ran type check → lint → format → tests in order, and at most 2–4 units ran at a time. So web's 263 s test suite started about 90 s into its unit, behind shared packages. Now up to `--jobs` checks run at once, ordered by the duration this task last recorded, and units that others wait on go first. A unit's package.json checks run side by side. Maven, Gradle and dotnet keep their order, because they compile into one output folder. Builds still run last.
  - **One `V run` per task.** A backgrounded run printed nothing until the end and looked dead, so a second run started, and both ran the 140 s and 263 s suites. Now a lock makes a second run wait for the first and then run only what is still needed (exit 3 after an hour). Each finished check prints a progress line to stderr, and `gate` says when a run is in progress.
  - **`verify-delta.mjs eol` and `delta` read git's baselines in one `git cat-file --batch` call**, instead of one or two `git show` calls per file. On the 110-file branch, `eol` took 77 s; `V final` runs it on every task.
  - **No suite re-runs to "confirm" a pass.** The orchestrator, the code reviewer and the QA lead no longer re-run a claimed-passing command. The gate's ledger already holds a recorded run of every check, and in the measured run a reviewer's re-run took 125 s. Every agent searches with `git grep` or `rg`, not `grep -r` (86 s over a monorepo).
  - **No orchestrator edits after the gate opens.** One comment reflow made 8 checks stale, among them the 140 s API suite, and stopped browser QA at its gate check.
  - Browser QA: SKILL.md now states the limit of at most 4 journeys per pass; a 7-journey pass hit its turn cap. The code reviewer's turn cap goes from 30 to 45, because 3 of 4 branch-regression reviewers stopped at 30 without a report.
  - The `bug-fix-counter` eval no longer expects an independent review, which matches the G13 policy below.
- **The code review is no longer mandatory on every change.** In a measured branch run (TruArt TRUART-31), the final review of the fix delta re-checked fixes that already had regression tests and a passing gate. `forge-code-reviewer` (G13) now runs only when the user asks for a review, or when `V run` prints `Code review: required` because auth, payment or schema files changed. It then reviews only those files, on Opus. Every orchestrator `V run` prints the decision on one line. Review mode and "did this branch break anything" regression analysis keep their reviewers: in that run they found every real bug, and browser QA found none. The e2e `bug-fix` and `new-feature` scenarios now fail if a reviewer runs.
- **Branch work checks the branch, in one cycle.** `V run --base <ref>` adds what the branch committed since `<ref>` to the scope, and the task keeps that base for later runs, `gate` and `final`. Before, only uncommitted files were in scope, so the measured run missed its API and shared-package changes and needed a second cycle.
- **`--all` no longer runs builds.** In the measured run it rebuilt mobile (173s) and web in every cycle; only `--build` runs builds now.
- **A build's side effects no longer stale other checks.** The web build rewrote `sitemap.xml`'s lastmod, which made every web check stale and cost an extra cycle. Non-code files a build rewrites are reported (`Build side effect: …`, with the `git checkout` to restore them), and they don't count as a code change while they still hold the build's output.
- **Browser QA no longer re-runs every check suite.** Playwright MCP writes a snapshot, console log or screenshot to `./.playwright-mcp/` after each action. In a project that doesn't gitignore that folder, the files changed the gate's fingerprint, so every passed check went STALE after browser QA and all suites ran again before `final`. Untracked Playwright output (`.playwright-mcp/`, `test-results/`, `playwright-report/`, `blob-report/`) no longer counts as a changed file for the gate, delta retests, line-ending and comment checks, or review scope. Tracked files in those folders still count. Regression tests: `validation-gate.test.mjs`, `verify-delta.test.mjs`.
- The recommended Chrome DevTools MCP setup adds `--redactNetworkHeaders`, so cookies and `Authorization` headers never reach the model.
- **The project's own package manager runs the checks.** Workspace members without their own lockfile used to fall back to `npm run …`, even in a pnpm monorepo. They now inherit the manager from the nearest ancestor (lockfile, `packageManager`, or `pnpm-workspace.yaml`), so a pnpm workspace runs `pnpm typecheck` / `pnpm lint` / `pnpm test`. A member's own lockfile still wins. When the declared manager isn't installed on the machine, `validation-gate.mjs` runs the same package.json script with `npm run` instead of failing as BLOCKED.
- The e2e runner no longer overwrites the recorded results when the `claude` CLI cannot start (set `CLAUDE_BIN`).
- **Fixes from a live benchmark (2026-11-18).** `code-question` passed. `bug-fix`, `architecture-analysis` and `new-feature` failed, at about the previous costs ($0.54 / $0.63 / $1.87):
  - Browser QA could start before the gate was checked. Browser QA now runs `validation-gate.mjs gate` as its first command on every pass, and the S-size path spells out "`V run` until OPEN → review + browser QA".
  - Browser QA counted Playwright console listeners as DevTools evidence. They no longer count: one DevTools console and network read per pass is required when the MCP is connected.
  - Reports used non-FORGE status words (`COMPLETE`, `DONE_WITH_CONCERNS`). `V final` now prints the four valid completion statuses right before the report is written.
  - The e2e runner flagged `git commit` written inside a heredoc report as a git attempt. It now checks only executed text (`tests/e2e/command-text.mjs`).
- **No repeated check suites.** In a measured TruArt run (web + mobile), the checks took about 32 minutes of run time: about 7.5 minutes of baseline and about 8 minutes of a gate cycle that was already stale went to waste, and the first browser pass hit its turn cap.
  - `validation-gate.mjs run` now **defers builds** that type check or tests already cover (`DEFERRED`, not blocking the browser). `run --build` runs them once before `final`, which requires them. Builds still run every cycle when consumers import their output or when the build is the unit's only compile step.
  - A **native shell nested in a JS app** (React Native `android/app` reaching `../../node_modules`) is no longer treated as that app's consumer, so a JS-only change no longer requires a Gradle test and build.
  - The run warns when files changed during the checks: a stale result, or an unreliable baseline.
  - New **check budget** rules (`core/delegation.md`):
    - VERIFY WITH is always the runner, run once per implementer.
    - No `V run` while an editor is still running.
    - The review's and browser QA's findings merge into one fix wave.
    - The validation wave runs without `--units`.
    - The baseline finishes before implementation starts.
  - **Browser QA scope:** at most 4 journeys per pass at one viewport. A `qa-session.md` stores the local test account and servers so retests reuse them, and the report is saved after each journey so a turn cap loses nothing.
- **Orchestrator prompt −36%** (`skills/forge/SKILL.md`: 15.7k → 10.0k characters, about 1,400 fewer tokens on every orchestrator turn). Every rule is kept. Phase-specific procedures (delta retests, turn caps) moved to `core/delegation.md`, which is read when delegating, and the rationale is now one line per rule.
- The orchestrator launches specialists in **waves**, with every agent in a wave sent in one message: discovery, implementation, verification (browser QA and code review together), then fix.
- Read-only and lighter roles (13 agents) run at `effort: medium`.
- Browser QA has an efficiency budget: reuse the app URL, use snapshots rather than screenshots, batch checks, retest only what failed, and aim for about 25 tool calls per pass.
- Skill scout has a search budget: at most 3 queries per need and about 6 deep-verified candidates.
- Every specialist follows a "work efficiently" rule: parallel reads, chained commands, and stopping once the evidence is sufficient.
- **Delta retests.** New `skills/forge/scripts/verify-delta.mjs` (zero dependencies; it only reads git through status, show and `diff --no-index`).
  - It snapshots the changed files before each verification wave and prints only what changed since.
  - Retest work orders carry that delta. The reviewer re-reviews only the delta and the status of each earlier finding, and browser QA re-runs only the failed journeys plus one adjacent journey, at one viewport, in about 10 calls.
  - Minor findings and nits no longer trigger a new verification round.
  - This targets the main cost in the measured `new-feature` run: three full browser passes and three full reviews.
- **Retests continue the same verifier** (Claude Code `SendMessage`) instead of launching a new agent. That agent still holds its findings and the code in cached context.
- **Q size (answer only).** Questions about the code are answered directly with `file:line` evidence, without agents, a task folder or the full report. New e2e scenario: `code-question`.
- **Turn caps.** Every agent has a `maxTurns` cap (30–60, well above observed needs) as a runaway guard. Output marked partial is continued once or reported as unverified. The validator requires the cap.
- **Model tiers.** The 13 lighter roles (`effort: medium`) run on `model: sonnet` instead of inheriting a possibly more expensive main model. Antigravity builds keep `inherit`.
  - Browser QA (`effort: medium`) and the frontend, mobile, test automation and DevOps engineers (`effort: high`) also run on `model: sonnet`. They do the most token-heavy work, and tests, the browser and the code reviewer catch their mistakes.
  - Only roles where a mistake is costly and hard to catch later inherit the main model: architect, security, code reviewer, database, integration, AI, backend and performance.
- **Always-loaded context −41%.** Skill and agent descriptions were rewritten to be concise, cutting FORGE's footprint in every session from ~2,133 to ~1,251 tokens. The validator budget is now 120 characters per specialist skill and 110 per agent.
- **Measured (single runs, sonnet).** `architecture-analysis`: $1.00 / 2.3 min → $0.47 / 1.3 min. `new-feature`: $2.34 / 11.5 min → $1.83 / 7.5 min. `bug-fix`: $0.56 → $0.50. `code-question`: $0.12 with no agents. All pass. See `docs/testing.md`.
- Analysis and audit requests always use specialists, with the team scaled to codebase size. Only Q questions skip them.

### Added
- **Code comment standard (`forge-code-comments`).** Comments must explain why or what is not obvious, in one short natural sentence and in the file's existing style. They never restate code, narrate, use banners, emoji, fake or empty TODOs or commented-out code, or mention AI, Claude or FORGE. Rationale comments are allowed only when verified, and existing meaningful comments are left alone.
  - The skill is preloaded by the 10 code-writing agents and the code reviewer. The shared operating rules carry a one-line version for every agent, and `forge-documentation` points to it.
  - New `skills/forge/scripts/comment-check.mjs` (zero dependencies, read-only) extracts only the comments a change adds. It covers added diff lines against `--base`, untracked files, or `--files`, for C-like, hash, SQL, markup and Python docstring syntax, and skips lint and compiler directives.
    - **Errors (exit 1):** restated code, narration, AI or generator mentions, banners, emoji, obvious comments, commented-out code, empty TODOs.
    - **Warnings:** long blocks, promotional or conversational wording, every new TODO.
  - It runs in phase 9 next to the line-ending check and in the reviewer's new **Comments** checklist: a stale or wrong comment is major, pattern issues are minor. G13 now includes it.
  - Tests: `tests/unit/comment-check.test.mjs`, built from the standard's own good and bad examples, with diff-only scoping and `--files`. Running it on the validation-gate change caught a decorative banner, now removed.
- **Mandatory validation order with an enforced pre-browser gate.** Verification now always runs: implement → static checks → automated tests → fix → pre-browser gate → browser/device verification → fix and re-verify → final gate → evidence and report.
  - New `skills/forge/scripts/validation-gate.mjs` (zero dependencies; it reuses the detector and `verify-delta.mjs` and writes only inside `.forge/`), with five subcommands:
    - `plan` maps the changed files to the project's units (web, backend/API, mobile, shared) and adds the consumers of changed shared packages (workspace names or relative-path references). It puts every unit in scope for a root config change, needs nothing for documentation-only changes, and flags API contracts (manual G6 check plus their web/mobile consumers) and migrations (manual G12 check).
    - `run` runs type check → lint → tests → build per unit, with units in parallel. Tests that share a database run one at a time, and a prebuilt shared package builds before its consumers. **Each check runs once:** a check that passed is re-run only when a file in its scope (the unit plus its upstream packages and root config) changed. Results go to a ledger (`validation/ledger.jsonl`) with full logs as evidence. A missing toolchain is `BLOCKED`, not `FAILED`. `npx` runs with `--no-install`. Scripts that deploy or publish, rewrite files (`--fix`/`--write`) or watch are never run.
    - `mark` records manual checks, confirmed `PRE-EXISTING` failures and one-shot equivalents. `PASSED` requires evidence text.
    - `gate` exits 0 OPEN, 1 CLOSED (failed, missing or stale) or 2 BLOCKED (environment only). It flags failures that also failed on the `--baseline` run.
    - `evidence` lists the real artifact files as links and exits 1 when `evidence/index.md` cites a file that does not exist.
  - Browser QA and device verification start only behind an OPEN gate (the work order carries the gate cycle, and the agent re-checks it). The one exception is bug reproduction before the fix. After a browser-found fix, the affected checks re-run and the gate reopens before the retest.
  - New status `BLOCKED` (a required check prevented by the environment). New gate G10m (device verification).
  - New `forge-browser-qa/references/device-verification.md` (adb / emulator, simctl, Flutter, Maestro/Detox, never EAS or OTA). `forge-browser-qa` now also verifies native mobile changes on an available emulator or device.
  - **Evidence:** screenshots of the implemented behavior are mandatory whenever a browser or device run happened. They live in `.forge/tasks/<slug>/evidence/{screenshots,playwright,traces,network,reports}` with an `index.md` (what each file shows, page or workflow, viewport). The browser QA screenshot budget changed from "about 3" to the evidence list (usually 3–8), and its call budget from about 25 to about 30.
  - Tests: `tests/unit/validation-gate.test.mjs` (8 tests on a real temporary monorepo: consumer scoping, run-once and staleness, PRE-EXISTING marking, contract, `--fix`, watch and deploy handling, BLOCKED toolchains, docs-only changes, evidence links, CLI errors). The live e2e runner now fails a report without a completion status, a VERIFIED next to "not browser-verified", and any browser call made after the first edit but before the gate was checked.
- **Install self-check** (`scripts/verify-install.mjs`). The installers run it automatically when Node is present. It confirms the installed files are byte-identical to `dist/` (allowing only the hook-path substitution), with nothing missing and no stale leftovers. It also confirms the hook paths resolve and that the installed guard blocks `git commit` and allows `git status`. After an uninstall, `--absent` confirms nothing is left. There is deliberately no separate reinstall script: re-running the installer already upgrades cleanly.
- **PR and branch review mode** through `/forge`. FORGE picks the mode itself: a PR or MR URL means a PR review; otherwise it reviews the current branch.
  - `core/review.md` holds the playbook and `templates/review-report.md` the fixed 13-section Engineering Review Report.
  - `scripts/review-target.mjs` handles target detection:
    - base branch from evidence (open PR base, `gh-merge-base`, origin default, nearest fork point), with confidence; never an assumed `main`;
    - committed, staged, unstaged and untracked changes kept separate;
    - PR URLs from GitHub (read through `gh`), GitLab, Bitbucket and Azure; an unreadable PR is BLOCKED;
    - area classification and a size-aware reviewer team.
  - Read-only is enforced: `review-target.mjs --lock` makes the git guard block Edit and Write outside `.forge/` for the review's duration, and the guard now always blocks hosting-platform writes (`gh pr review|comment|edit`, `gh issue create`, `gh api` writes, `glab mr approve|note`).
  - Tests: unit tests for URL parsing, base ranking, scopes, team sizing and the lock; a new e2e scenario, `branch-review`, with scenario-built history and a byte-for-byte unchanged check.
- **Enforced git guard (Claude Code).** `skills/forge/scripts/git-guard.mjs` is a `PreToolUse` hook on Bash and PowerShell in every FORGE agent, in the `forge` skill and in the plugin `hooks/hooks.json`.
  - It blocks commit, push, pull, merge, rebase, `reset --hard`, stash, clean, history rewrites, branch and tag changes, and `gh pr create/merge`. It also catches these inside `&&` chains, `$(...)`, `bash -c` / `pwsh -Command` / `cmd /c`, `git -C`, env prefixes and full `git.exe` paths.
  - It enforces only for FORGE agents and during `/forge` turns. Your own requests later in the session are not blocked.
  - Installers write the absolute script path into the hooks. The validator requires the guard in every Claude Code agent, the orchestrator skill and the plugin hooks.
  - Verified live on Windows with Claude Code 2.1.326: user-level agents, `--agents` definitions and the skill-scoped hook (with real transcript detection) all blocked the command before git ran.
- **Knowledge freshness check.** `scripts/check-freshness.mjs`, `scripts/freshness.json` and a weekly GitHub Action.
  - Offline: review dates for all 21 knowledge files. `validate.mjs` errors on a missing date and warns on a stale one.
  - `--online`: checks 189 detector signals against npm, PyPI, Packagist, RubyGems, crates.io, pub.dev and the Go proxy. It flags removed, deprecated or abandoned packages and references that never mention the latest major version, and it follows Go `/vN` module paths.
  - Its first run found and fixed: Clerk renamed `@clerk/clerk-react` and `@clerk/clerk-expo` (the successors `@clerk/react` and `@clerk/expo` were added); PayPal deprecated `@paypal/checkout-server-sdk` (`@paypal/paypal-server-sdk` was added); `nunomaduro/larastan` is abandoned (the old names are kept as legacy signals). It also prompted adding the Express 5 route-syntax changes to the Node reference.
- README section **Models per task**: which model and turn cap each agent uses, and which models each kind of task uses. It is generated from `agents/*.md` by the build, and the validator fails if it is stale. `docs/agents.md` gained Model and Max turns columns.

### Changed (token and tool-call budget for the validation and comment workflows)
- **Fewer calls.** `validation-gate.mjs run` prints its scope and exits with the pre-browser gate verdict, so one call replaces plan, run and gate.
  - The new `final` subcommand replaces four phase-9 calls (gate, `verify-delta eol`, `comment-check`, evidence). It prints the per-application table ready for the report, and exits 0 only when everything is clean.
  - Every tool call re-sends the orchestrator's whole context, so each call saved compounds.
- **Compact output.** The gate lists only rows that need attention, plus counts (`--verbose` for all). `run` puts every passing check on one line and prints output only for failures (the last 25 lines).
- **Smaller always-read texts** (characters, before → after this pass):
  - `forge-code-comments`: 5.9k → 1.8k. The script enforces the patterns, so the skill keeps only the judgment rules. Only the 9 code-writing agents preload it; the reviewer and tech writer rely on their own checklists and the script.
  - `core/quality-gates.md`: 11.0k → 8.3k. Report template: 3.9k → 3.2k; the gate table no longer repeats the per-app table, and sections that don't apply collapse to one line, so reports for small tasks are shorter.
  - Browser QA skill and agent: 15.0k → 14.1k.
  - Context per code-writing agent: back to +1.8–2k over the pre-workflow baseline, down from +6k. Code reviewer: 16.2k → 10.3k (baseline 9.5k).

### Changed (report format)
- The execution report follows the validation workflow:
  - **Validation summary** (a per-application type check / lint / tests / build table, the commands, the cycles and the gate state) replaces "QA and verification".
  - **Browser & device verification** (an Area / Tool / Result table) replaces "Browser QA".
  - New sections: **Evidence** (links printed by `validation-gate.mjs evidence`), **Issues found and resolved** (root cause, fix, retest, evidence), **Remaining issues and blockers** (pre-existing, unresolved, environment, not executed), and a final **Completion status**: VERIFIED, VERIFIED WITH LIMITATIONS, BLOCKED or FAILED, with precedence rules.
- The verification wave is split. The code reviewer now runs alongside the static checks, and browser QA waits for the gate. On browser tasks this trades some wall-clock time for never browser-testing code that fails its checks.
- The orchestrator prompt grows by about 1.2k characters (10.3k → 11.5k) for the verification order. The detail lives in `core/quality-gates.md`, which is read only when needed.

### Fixed
- Line endings:
  - Every specialist must keep each file's LF/CRLF line endings and encoding, and should prefer targeted edits to rewriting whole files.
  - Phase 9 runs `verify-delta.mjs eol`, which exits 1 on a flipped or mixed file.
  - The review checklist flags line-ending flips as major.
  - A measured run had an agent rewrite `app.js` with CRLF, which turned a 134-line change into a 198-line diff.
- Sizing: "S/M" is no longer accepted as a size. New features, endpoints, screens or contracts are at least M, and migrations or schema changes size up.
- In Mode A the routing matrix's core team implements the work, and browser QA is always delegated to `forge-browser-qa`.
- The final message is the full report, and its first line is exactly `### FORGE Execution Report`.

## [1.0.0] - 2026-11-17

### Added
- Skill discovery, recommendation, approval and installation engine (`forge-skill-discovery`, `forge-skill-scout`). It is free and open-source only, verifies licenses per skill folder, and uses the Vercel Skills CLI as the primary engine with a documented fallback. It enforces a strict approval gate (nothing is installed without explicit approval of each batch), installs with a pinned commit, keeps provenance in `forge-skills.lock.json`, and adds the G15 install-provenance gate.
- `/forge` orchestrator skill with an adaptive 10-phase lifecycle, S/M/L sizing, a clarification policy and a list of steps that are never skipped.
- Shared core: routing matrix, delegation protocol (work orders, file ownership, conflict precedence), quality gates G1 to G14 with the browser completion gate, autonomy and safety policy, and templates (spec, plan, test plan, report).
- 26 specialist agents across product, architecture & engineering, quality, delivery and intelligence, with least-privilege tools and preloaded skills.
- 26 specialist skills, with per-stack references for 8 backend, 4 frontend and 4 mobile ecosystems.
- Zero-dependency stack detector (`detect-stack.mjs`) and a technology registry with 116 evidence-based signatures. It is monorepo-aware, secret-safe and supports incremental refresh.
- Claude Code adapter (a plugin, plus a standalone install for a bare `/forge`) and Antigravity adapter (agents, skills and a legacy workflow).
- Installers for bash and PowerShell with a manifest, conflict safety, dry-run, upgrade cleanup and uninstall.
- Validator, unit and integration tests, and a live e2e scenario runner with 7 scenarios and 5 `claude plugin eval` cases.
