# Changelog

All notable changes to FORGE are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed (performance)
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
- Measured on `architecture-analysis`: $1.00 → $0.68 (−32%) and 2.3 → 1.8 min (−22%), still passing. The optimized run used one fewer agent, so the gain is not attributable to parallelism alone. See `docs/testing.md`.

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
