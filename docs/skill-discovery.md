# Skill Discovery & Installation

FORGE can find, evaluate and (with your permission) install **free and open-source** skills and tools that suit your project and task. You only ever talk to `/forge`.

```
/forge Find skills that would help with this project.
/forge Build the checkout flow.      # an M/L task with a capability gap may trigger discovery
```

## The rules

| Rule | How it's enforced |
|---|---|
| **Free & open-source only** | `license-check.mjs` verifies the SPDX license through the GitHub API or the local LICENSE files, **per skill folder**, because a skill can be licensed differently from its repo. Only `oss-permissive` and `oss-copyleft` are recommendable. Source-available, proprietary, free-tier commercial and unverified licenses are never installed |
| **Approval before any install** | The orchestrator presents one consolidated proposal and asks one question: *all / essential only / select / none*. No answer, or a headless run, means **nothing is installed**. Each approval covers only that batch |
| **No silent tool downloads** | Using `npx <pkg>` to fetch a package counts as an install. An existing `skills` CLI is used only via `npx --no-install` |
| **Untrusted content** | Third-party SKILL.md files and scripts are read and security-reviewed. They are never executed during evaluation or install |
| **No auto-update, replace or remove** | `install-skill.mjs` refuses to overwrite. Updates and removals are proposed for approval |
| **Provenance** | Each install is recorded in `forge-skills.lock.json` (in `~/.claude`, `<project>/.claude`, `~/.gemini/config` or `<project>/.agents`): source, path, pinned commit, license, scope, time, and your approving words |

## Primary engine: Vercel Skills CLI

| | |
|---|---|
| **Tool** | `skills` (npm). Source: https://github.com/vercel-labs/skills. Directory: https://skills.sh/ |
| **License** | MIT (verified from the repository LICENSE) |
| **Requires** | Node.js ≥ 22.20 |
| **Used for** | `skills find <query>` (search), `skills add <repo> --list` (inspect without installing), and `skills add <repo>@<ref> --skill <name> -a claude-code\|antigravity [-g] -y --copy` (install, **only after approval**) |
| **Telemetry** | On by default in the CLI. FORGE always sets `DISABLE_TELEMETRY=1` |

- **If the CLI is already available** (on PATH or in the npx cache), FORGE uses it with `npx --no-install`, which never downloads anything.
- **If it is not available,** FORGE lists the CLI itself in the proposal as a discovery tool, with its source, license, Node requirement and telemetry note, and asks for approval before using it (`npx --yes skills@<pinned-version>`). Until then, FORGE uses the documented alternative: skills.sh browsed read-only, curated sources, and GitHub search. The report says which path was used.
- **The CLI is not a quality gate.** Listing on skills.sh implies nothing about license, maintenance or safety, so FORGE evaluates every skill independently (license per skill folder, security read-through, overlap) before recommending it.

## Flow

1. **Inventory (always, local).** `skill-inventory.mjs` lists the skills, agents, plugins and MCP servers (names only) in every Claude Code and Antigravity location. It flags duplicates and detects existing discovery tools such as `find-skills`.
2. **Needs analysis.** Compare the detected stack (`.forge/context.json`) and the task with what's installed, including FORGE's own specialist skills.
3. **Discovery** (only when asked, or for a real gap on an M/L task; cached in `.forge/skill-discovery.json`). `forge-skill-scout` searches curated sources: Anthropic's skills, official framework and vendor repos, and established community collections. It uses the existing `skills` CLI if present, and web or GitHub search otherwise.
4. **Verification.** For each candidate: license, maintenance, compatibility (Claude Code and/or Antigravity), dependencies, security, overlap.
5. **Proposal.** A table with name, purpose, why it's needed, source, license, compatibility, scope, dependencies, cost and security, grouped as **Essential / Recommended / Optional**, plus already-installed skills, duplicates and unavailable capabilities.
6. **Approval gate.** You choose. Only approved skills are installed with `install-skill.mjs` (pinned commit, license re-verified, discoverability checked).
7. **Use.** Only the skills relevant to the task are loaded. The final report's **Skills & capabilities** section states exactly what was recommended, approved, installed, used and skipped, and confirms that no paid service was required.

## Scripts (in `skills/forge-skill-discovery/scripts/`, zero dependencies)

```bash
node skill-inventory.mjs --project .                       # what's installed where (names only)
node license-check.mjs https://github.com/<owner>/<repo>/tree/<ref>/<skill-path>
node install-skill.mjs --source <git-url|dir> --skill-path <path> --target claude --scope user \
     --ref <commit> --approval "<your approving words>" [--dry-run]
```

`install-skill.mjs` refuses to run without `--approval`. It also refuses non-OSS or unverified licenses, existing targets and reserved `forge*` names.

## Limitations

- License detection is heuristic for unusual license texts. When it isn't certain, the candidate is marked `unverified` and is not recommended.
- GitHub API calls are rate-limited without `GITHUB_TOKEN`. When rate-limited, candidates are reported as unverified rather than guessed.
- Some hosts load newly installed skills only in a new session (Claude Code) or after `/skills reload` (Antigravity CLI).
