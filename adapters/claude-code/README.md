# Claude Code adapter notes

- **Sources:** official docs at code.claude.com/docs (sub-agents, skills, plugins, plugin manifest and marketplace references). Verified 2026-11-17 with Claude Code 2.1.326.
- **Bare `/forge`** requires a standalone skill in `~/.claude/skills/forge/` or `.claude/skills/forge/`, which is what the installer does. Plugin skills are always namespaced (`/forge:forge`).
- **Subagents** come from `~/.claude/agents/*.md` or `.claude/agents/*.md`. The orchestrator delegates with the `Agent` tool (formerly `Task`) using `subagent_type: forge-<role>`. They run in parallel and nest up to 3 levels, but FORGE specialists cannot spawn agents (`Agent` is absent from their `tools`).
- **Skill preloading:** `skills:` in agent frontmatter injects the full skill at startup. Skills with `disable-model-invocation: true` cannot be preloaded, so FORGE uses `user-invocable: false` instead.
- **`$ARGUMENTS`** carries the request. `${CLAUDE_SKILL_DIR}` resolves FORGE_HOME.
- **Validation:** `claude plugin validate dist/claude-code`, and `claude plugin details forge` for the projected token cost once installed.
- **Hard guardrails** (optional): permission deny rules. See [docs/security.md](../../docs/security.md).
