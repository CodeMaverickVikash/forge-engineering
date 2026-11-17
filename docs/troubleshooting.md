# Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `/forge` not listed | Session started before install | Start a new session. In the Antigravity CLI, run `/skills reload` |
| Only `/forge:forge` exists | Installed as a Claude Code plugin (namespaced) | That's expected. For a bare `/forge`, use `scripts/install.sh` instead of (not in addition to) the plugin |
| Both `/forge` and `/forge:forge` | Installed both ways | Pick one: `/plugin uninstall forge@forge-engineering` or `scripts/uninstall.sh` |
| Report says "emulated sequentially (Mode B)" | Host surface has no custom subagents, or agents aren't installed | Check `~/.claude/agents/forge-*.md` (or `~/.gemini/config/agents/`). Re-run the installer |
| Installer: "refusing to overwrite existing files" | A file at a FORGE path wasn't created by the installer (yours, or a copy made by hand) | Inspect the listed paths. Re-run with `--force` / `-Force` only if replacing them is fine |
| `detect-stack: Not a directory` | Wrong `--root` | Run it from the project root or pass `--root <dir>` |
| Detector says `TRUNCATED` | More than 60,000 files | Point `--root` at the relevant sub-project, or rely on targeted search |
| `node: command not found` | Node isn't installed | Optional. FORGE falls back to manual exploration. Install Node ≥ 18 for faster, cheaper exploration |
| "implemented, not browser-verified" | Chrome DevTools MCP and/or Playwright unavailable | Add the MCP servers ([installation.md](installation.md#browser-qa-servers-recommended)) and restart the session |
| Antigravity subagent hangs | Misspelled tool name in a custom agent (known Antigravity issue) | FORGE's Antigravity agents omit `tools`. If you edited them, remove the `tools:` line |
| `validate.mjs`: "dist out of date" | Sources changed without rebuilding | `node scripts/build.mjs` |
| PowerShell: "running scripts is disabled" | Execution policy | `powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1` |
| Too much context used | Many skills installed globally | Install with `--scope project` only where needed. Check `node scripts/validate.mjs` for the listing cost |
