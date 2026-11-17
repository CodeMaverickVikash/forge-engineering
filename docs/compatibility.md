# Platform Compatibility

Researched against the official docs on 2026-11-17: code.claude.com/docs (Claude Code 2.1.x) and antigravity.google/docs (App 2.x, CLI 1.x, IDE). Re-check these when the platforms change.

## Capability matrix

| Capability | Claude Code | Antigravity App / CLI | Antigravity IDE |
|---|---|---|---|
| Entry point | `/forge` skill (bare name via installer; `/forge:forge` as a plugin) | `/forge` skill | Skill slash-invocation **not documented**, so the installer also adds a legacy `/forge` **workflow** (workflows are deprecated but still run; a same-named skill takes precedence) |
| Arguments after `/forge` | `$ARGUMENTS` substitution | Not documented. The skill tells the agent to treat the invoking message as the request | Same |
| Skills format | Agent Skills `SKILL.md` + Claude extensions (`user-invocable`, `argument-hint`) | Agent Skills `SKILL.md` (`name`, `description`; CLI supports `disable-slash-command`) | Same |
| Skill locations | `~/.claude/skills`, `.claude/skills` | `~/.gemini/config/skills`, `.agents/skills` | Same (also reads legacy `~/.gemini/antigravity/skills`) |
| Custom subagents | Yes: `.claude/agents/*.md`, `Agent` tool, parallel | Yes: `.agents/agents/*.md`, `~/.gemini/config/agents/`, `invoke_subagent`, parallel | Not explicitly documented, so FORGE falls back to **Mode B** |
| Subagent skill preload | `skills:` frontmatter | `skills:` frontmatter | — |
| Per-agent tool restriction | `tools` / `disallowedTools` (enforced) | `tools` exists but tool names differ, and a wrong name can hang the agent, so it is **omitted** (inherit) | — |
| Agent model field | `inherit` (FORGE default) | `inherit` / `flash` / `pro`; FORGE uses `inherit` | — |
| MCP config | `claude mcp add …` | `~/.gemini/config/mcp_config.json`, `.agents/mcp_config.json` | Same |
| Built-in browser | via Playwright / DevTools MCP | built-in `browser` subagent + MCP | built-in browser agent + MCP |
| Plugin packaging | `.claude-plugin/plugin.json` (namespaced) | `plugin.json` (`agy plugin install`) | Plugins supported |

## How FORGE adapts

- **One source, two builds.** `scripts/build.mjs` keeps the instruction bodies identical and only transforms metadata (see the [architecture](architecture.md)).
- **Mode A / Mode B** is chosen at runtime by the orchestrator, based on whether `forge-*` agents and a delegation tool are actually available. It doesn't assume.
- **Read-only enforcement** is technical in Claude Code (tool allow-lists) and instruction-based in Antigravity. Antigravity's own permission system (`command(...)` allow/deny rules, sandboxing and review modes) still applies to everything FORGE does.
- **Specialist skills are hidden from slash menus** (`user-invocable: false` in Claude Code, `disable-slash-command: true` in Antigravity), so `/forge` stays the single entry point. Their descriptions remain visible to the model so agents can load them.

## Context cost (always-loaded listings)

`node scripts/validate.mjs` prints the size of every skill and agent description that hosts keep in context. Use `claude plugin details forge` for Claude Code's own projection. Project-scope installs (`--scope project`) limit this cost to repositories where you want FORGE.

## Verification status

| Platform | How it was verified |
|---|---|
| Claude Code | `claude plugin validate` on the generated plugin and marketplace; installer round-trip tests; live headless `/forge` runs on fixtures (see [testing.md](testing.md)) |
| Antigravity | Generated files are checked against the documented formats by the validator and tests. **Not exercised live in the development environment** (Antigravity is not installed there). Use the manual procedure in [testing.md](testing.md#antigravity-manual-verification) |
