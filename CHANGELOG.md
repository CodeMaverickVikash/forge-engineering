# Changelog

All notable changes to FORGE are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed (performance)
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
- **Model tiers.** The 13 lighter roles (`effort: medium`) run on `model: sonnet` instead of inheriting a possibly more expensive main model. Implementers, reviewer, architect, security, performance and browser QA still inherit the main model. Antigravity builds keep `inherit`.
- **Always-loaded context −41%.** Skill and agent descriptions were rewritten to be concise, cutting FORGE's footprint in every session from ~2,133 to ~1,251 tokens. The validator budget is now 120 characters per specialist skill and 110 per agent.
- **Measured (single runs, sonnet).** `architecture-analysis`: $1.00 / 2.3 min → $0.47 / 1.3 min. `new-feature`: $2.34 / 11.5 min → $1.83 / 7.5 min. `bug-fix`: $0.56 → $0.50. `code-question`: $0.12 with no agents. All pass. See `docs/testing.md`.
- Analysis and audit requests always use specialists, with the team scaled to codebase size. Only Q questions skip them.

### Added
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
