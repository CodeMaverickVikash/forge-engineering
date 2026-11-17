# Installation

## Requirements

- **Claude Code** (any recent version with skills and subagents), and/or **Google Antigravity** (App 2.x, CLI `agy`, or IDE).
- To install: `bash` (macOS, Linux, Git Bash, WSL) or Windows PowerShell 5.1+. **No Node.js needed.**
- Optional: Node.js ≥ 18 for the fast stack detector. Without it, FORGE explores manually.
- Optional but recommended for web apps: Chrome DevTools MCP and Playwright MCP (see below).

## Option 1: installer (recommended, gives a bare `/forge`)

```bash
./scripts/install.sh                          # user scope, auto-detects platforms
./scripts/install.sh --target all             # both Claude Code and Antigravity
./scripts/install.sh --scope project --project ~/code/myapp   # only for one repository
./scripts/install.sh --dry-run                # show what would change
```
```powershell
.\scripts\install.ps1 -Target all
.\scripts\install.ps1 -Scope project -Project C:\code\myapp
```

| Platform | Scope | Skills | Agents | Extra |
|---|---|---|---|---|
| Claude Code | user | `~/.claude/skills/` (honours `CLAUDE_CONFIG_DIR`) | `~/.claude/agents/` | — |
| Claude Code | project | `<project>/.claude/skills/` | `<project>/.claude/agents/` | commit these to share FORGE with your team |
| Antigravity | user | `~/.gemini/config/skills/` | `~/.gemini/config/agents/` | `~/.gemini/config/global_workflows/forge.md` (legacy IDE entry) |
| Antigravity | project | `<project>/.agents/skills/` | `<project>/.agents/agents/` | `<project>/.agents/workflows/forge.md` |

Set `FORGE_ANTIGRAVITY_HOME` to override the Antigravity global directory.

**Safety.** The installer writes a manifest (`skills/forge/.forge-install-manifest`) and refuses to overwrite any file at a FORGE path that it did not install. Use `--force` to override that. Re-running it upgrades cleanly and removes files left over from older versions.

**Uninstall:** `./scripts/uninstall.sh` (same flags) or `.\scripts\uninstall.ps1`. This removes only manifest-listed paths.

**After installing,** start a new session (or run `/skills reload` in the Antigravity CLI), then type `/forge`.

## Option 2: Claude Code plugin marketplace

```
/plugin marketplace add <git-url-or-local-path-of-this-repo>
/plugin install forge@forge-engineering
```

Plugin components are **namespaced**: the command becomes `/forge:forge` and agents become `forge:forge-<role>`. The orchestrator detects this automatically. Use Option 1 if you want a bare `/forge`. To try the plugin without installing it: `claude --plugin-dir ./dist/claude-code`.

## Option 3: Antigravity plugin

```
agy plugin install <path-to-repo>/dist/antigravity
```

Whether plugin skills are namespaced in Antigravity isn't documented. If `/forge` doesn't appear, use Option 1.

## Browser QA servers (recommended)

FORGE never installs or connects these by itself. Without them, browser-visible changes are reported as *not browser-verified*.

**Claude Code**
```bash
claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest
claude mcp add playwright -- npx @playwright/mcp@latest
claude mcp list
```

**Antigravity:** add to `~/.gemini/config/mcp_config.json` (or `.agents/mcp_config.json`):
```json
{
  "mcpServers": {
    "chrome-devtools": { "command": "npx", "args": ["-y", "chrome-devtools-mcp@latest"] },
    "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] }
  }
}
```

## Verify the installation

- Claude Code: type `/` and confirm `forge` is listed. Ask *"What agents are available?"*; the `forge-*` agents should appear.
- Antigravity: open Customizations and confirm the `forge` skill and the `forge-*` agents.
- From the repository: `./scripts/validate.sh` runs the validator, the tests, and `claude plugin validate` when the CLI is on your PATH.
