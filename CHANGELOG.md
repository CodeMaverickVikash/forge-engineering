# Changelog

All notable changes to FORGE are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

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

### Changed (performance)
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
