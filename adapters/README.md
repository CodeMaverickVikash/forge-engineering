# Platform adapters

The adapters are intentionally thin. They **transform metadata only**, and every instruction body is shared. They are implemented in [`scripts/build.mjs`](../scripts/build.mjs) (`buildClaude`, `buildAntigravity`), and their output is committed in `dist/` so installing doesn't need Node.js.

| Concern | `claude-code` adapter → `dist/claude-code/` | `antigravity` adapter → `dist/antigravity/` |
|---|---|---|
| Package manifest | `.claude-plugin/plugin.json` | `plugin.json` |
| Entry point | `skills/forge` (bare `/forge` via installer; `/forge:forge` as a plugin) | `skills/forge` (`/forge`), plus legacy `workflows/forge.md` for the IDE |
| Skill frontmatter | unchanged (`user-invocable: false` hides specialists) | reduced to `name`, `description`, plus `disable-slash-command: true` for specialists |
| Agent frontmatter | unchanged: `tools` / `disallowedTools` least-privilege, `model: inherit`, `color`, `skills` | `name`, `description`, `model: inherit`, `skills`. `tools` is omitted because Antigravity tool names differ and an unknown name can hang the agent |
| Agent body | source body + `agents/_shared/operating-rules.md` | identical |
| Mode B fallback | `skills/forge/roles/*.md` | identical |
| Eval cases | `evals/` (from `evals/`, each with its fixture project in `files/`) | — |
| Install targets | `~/.claude/` or `<project>/.claude/` | `~/.gemini/config/` or `<project>/.agents/` |

To support another host that reads Agent Skills (for example Codex or Gemini CLI), add a `buildX()` function that copies `skills/` and maps agents to that host's subagent format. If the host has no subagents, ship only `roles/` and Mode B covers it. Then add an install target in `scripts/install.sh` and `install.ps1`.

`claude-code/` and `antigravity/` in this folder contain host-specific notes only.
