# Antigravity adapter notes

- **Sources:** antigravity.google/docs (skills, subagents, rules, workflows, migration/workflows-to-skills, customization-discovery, mcp, permissions, plugins, build-plugins). Researched 2026-11-17.
- **Current layout:** `.agents/` (workspace) and `~/.gemini/config/` (global). The legacy `.agent/` and `~/.gemini/antigravity/` paths are only read for backward compatibility, so FORGE installs to the current paths.
- **Skills** follow the Agent Skills standard (`.agents/skills/<name>/SKILL.md`, `~/.gemini/config/skills/<name>/`). They are slash-invocable in the App and CLI. Slash invocation in the IDE is not documented.
- **Subagents:** `.agents/agents/<name>.md`, `~/.gemini/config/agents/`. Frontmatter: `name`, `description`, `tools`, `model` (`inherit|flash|pro`), `skills`, `mcpServers`, `commandExecutionPolicy`, and others. Delegation goes through `invoke_subagent`. They are documented for the App and CLI.
- **Workflows are deprecated** (Skills are the replacement). FORGE still installs `forge.md` as a workflow for IDE users, and a same-named skill takes precedence. The workflow is kept well under the 12,000-character limit.
- **Unverified (documented as such):**
  - whether text after `/forge` is passed as arguments (the skill falls back to the invoking message);
  - whether plugin skills are namespaced;
  - whether `disable-slash-command` is honored outside the CLI.
- **Not exercised live** in the development environment. See [docs/testing.md](../../docs/testing.md#antigravity-manual-verification).
