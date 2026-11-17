# Changelog

All notable changes to FORGE are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

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
