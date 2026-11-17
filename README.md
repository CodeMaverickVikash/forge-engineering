# FORGE: an autonomous software engineering organization behind one command

```
/forge Build a complete notification system.
/forge Fix the payment issue.
/forge Make this application production-ready.
```

FORGE turns a one-line request into finished, verified engineering work. It explores your codebase, rewrites the request as a grounded specification, assembles the smallest team of specialist agents that covers the task's risks, then implements, tests, browser-verifies, reviews and reports. **It never commits, pushes or opens pull requests.** Every change is left uncommitted for you to review.

It runs on **Claude Code** and **Google Antigravity** from one shared core.

| | |
|---|---|
| **Entry point** | `/forge <request>` (the only user-facing command) |
| **Specialists** | 25 subagents in 5 divisions: product, architecture & engineering, quality, delivery, intelligence ([docs/agents.md](docs/agents.md)) |
| **Skills** | 26 reusable, technology-independent skills with per-stack references ([docs/skills.md](docs/skills.md)) |
| **Stacks** | Any stack, discovered from evidence. The registry ships 116 technology signatures plus references for Node, Python, Java/Spring, Go, PHP/Laravel, .NET, Ruby/Rails, Rust, React/Next, Vue, Angular, Svelte, React Native/Expo, Flutter, Android and iOS |
| **Browser QA** | Playwright journeys + Chrome DevTools MCP (console, network, performance) with a hard completion gate |
| **Runtime deps** | None. Node ≥ 18 is optional and powers the fast stack detector, with a manual fallback |

## Install

```bash
git clone <this-repo> forge-engineering && cd forge-engineering
./scripts/install.sh                 # macOS / Linux / Git Bash. Auto-detects Claude Code and Antigravity
.\scripts\install.ps1                # Windows PowerShell
```

The options are `--target claude|antigravity|all`, `--scope user|project`, `--project <dir>`, `--dry-run`, `--force` and `--uninstall`. Restart your session, then run `/forge`. Details, plugin-marketplace installs and MCP setup are in [docs/installation.md](docs/installation.md).

**Recommended for web apps:** connect the browser-QA MCP servers:
```bash
claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest
claude mcp add playwright -- npx @playwright/mcp@latest
```

## How it works

```
/forge "<request>"
  │  1 UNDERSTAND   classify type, size (S/M/L) and risk
  │  2 EXPLORE      detect-stack.mjs → .forge/context.json, then targeted reading
  │  3 SPECIFY      prompt-enhancement → .forge/tasks/<slug>/spec.md (single source of truth)
  │  4 ARCHITECT    routing matrix → smallest specialist team, ADR for large tasks
  │  5 PLAN         ordered tasks with file ownership and a validation strategy
  │  6 IMPLEMENT    parallel specialists on disjoint files (native subagents)
  │  7 VERIFY       quality gates G1–G14: tests, types, lint, build, security, Playwright + DevTools
  │  8 FIX          root-cause fixes, at most 3 cycles, nothing hidden
  │  9 REVIEW       independent code reviewer against the spec, plus a scope check
  └ 10 REPORT       FORGE Execution Report, saying what really ran and what didn't
```

Phases scale with the task. A one-line bug fix skips the ceremony, while a new subsystem gets the full process. Read [docs/architecture.md](docs/architecture.md) for the design and [docs/usage.md](docs/usage.md) for examples.

## Guarantees and limits

- **Honest verification.** Every gate is reported as `PASSED`, `FAILED`, `PRE-EXISTING`, `NOT RUN`, `UNAVAILABLE` or `N/A`, with evidence. A missing Chrome DevTools MCP connection makes a change *"implemented, not browser-verified"*. It never counts as a pass.
- **Safe autonomy.** FORGE edits code and runs local tools on its own. Commits, pushes, PRs, deploys, destructive data operations, new dependencies and paid services are out of bounds without your authorization. See [docs/security.md](docs/security.md).
- **Platform differences.** Claude Code and the Antigravity App and CLI run specialists as native subagents. Surfaces without custom subagents (the Antigravity IDE is not documented to support them) fall back to sequential role emulation, and the report says so. See [docs/compatibility.md](docs/compatibility.md).

## Repository layout

```
skills/            shared core: forge (orchestrator + core/ + templates/) and 25 specialist skills
agents/            25 specialist definitions (canonical source) + _shared/operating-rules.md
scripts/           build.mjs (adapters), validate.mjs, install/uninstall (.sh + .ps1), validate.sh
dist/              generated adapters: claude-code/ (Claude plugin) and antigravity/ (Antigravity plugin)
.claude-plugin/    marketplace.json (plugin-style install for Claude Code)
docs/  examples/  tests/ (unit tests + 7 stack fixtures)
```

## Develop

```bash
node scripts/build.mjs        # regenerate dist/ and the docs catalogs after editing skills/ or agents/
./scripts/validate.sh         # validator + tests + `claude plugin validate` (when the CLI is available)
```

See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/extending.md](docs/extending.md). License: [MIT](LICENSE).
