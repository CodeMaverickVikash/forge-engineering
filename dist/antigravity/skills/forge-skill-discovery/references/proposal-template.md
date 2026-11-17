# Skill Installation Proposal template

Read this in Step 5. Copy the block below, fill in every field from evidence gathered in Steps 1 to 4, and delete the guidance in parentheses. Use `none` for an empty section; never drop a section.

````markdown
## Skill Installation Proposal

Project: <project name> · Stack: <key technologies from .forge/context.json> · Task: <slug or one line>

### Candidates

| Skill name | Purpose | Why needed | Source | License | Compatibility | Installation scope | Dependencies | Cost | Security |
|---|---|---|---|---|---|---|---|---|---|
| <name from SKILL.md> | <one line> | <the capability gap or task need it fills> | <repo URL + path @ commit SHA> | <SPDX> (<oss-permissive or oss-copyleft>, <skill or repo> level; copyleft obligations if any) | <Claude Code / Antigravity / both> | <project or user> (<why>) | <runtimes, packages, MCP servers, CLIs; or none> | <Free; or Free, optional paid service> | <scripts it runs, network calls, file writes; or "instructions only, no scripts"> |

### Already-installed relevant skills

- <name> (<location>) — covers <need>
- FORGE coverage: <forge-* skills that already cover needs>

### Newly recommended

**Essential** (the task cannot be done well without it)
- <name> — <one-line reason>

**Recommended** (clear improvement for this stack)
- <name> — <one-line reason>

**Optional** (nice to have)
- <name> — <one-line reason>

### Duplicates not installed

- <name> — duplicates <installed skill or forge-* skill>; <why the existing one is enough>

### Unavailable capabilities

- <need> — <why no candidate qualifies: none found, source-available, proprietary, unverified license, mandatory paid service, security concern>

### Total proposed installations

<N> skills (<e> essential, <r> recommended, <o> optional) · Target: <claude | antigravity | both> · Default scope: <project | user>
````

Then ask the approval question from SKILL.md Step 6, word for word. Do not install anything until the answer arrives.

## Field rules

- **Skill name:** the `name` in the candidate's SKILL.md frontmatter, not the repo name.
- **Source:** must be public. Include the folder path and the commit SHA you inspected, so the install can pin `--ref` to it.
- **License:** only from `license-check.mjs` output or a LICENSE file you read in this task. Never from memory.
- **Compatibility:** "both" for plain Agent Skills (`SKILL.md` + `references/` + `scripts/`). Name the host when the skill relies on plugins, hooks or host-specific MCP config.
- **Dependencies:** anything the user must install separately is itself a tool install and is listed here so the approval covers it explicitly.
- **Security:** summarize what you read, not what the README claims.
- Only `oss-permissive` and `oss-copyleft` candidates appear in the Candidates table and Newly recommended lists. Everything else goes under Duplicates or Unavailable.
