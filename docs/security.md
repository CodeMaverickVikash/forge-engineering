# Security Model

FORGE is instructions plus a small amount of local tooling. It gains no privileges beyond what your host (Claude Code or Antigravity) grants, and it **never tries to bypass the host's permission system**. Approve, deny or sandbox commands exactly as you normally would.

## Enforced boundaries

| Boundary | Mechanism |
|---|---|
| No commits, pushes, merges, rebases, stashes, resets, PRs or releases | Orchestrator rules (`skills/forge/core/safety.md`) plus shared operating rules appended to every agent. For hard enforcement, add host deny rules (below) |
| Least-privilege specialists | Claude Code `tools` allow-lists: 14 agents are read-only, and no specialist can spawn agents |
| No secret exposure | The detector never opens `.env*` values (names only, from example files). Every agent is told to redact tokens and cookies in output |
| No new dependencies, major upgrades or project-wide config changes | Require user authorization (safety policy) |
| No destructive data ops, production access, deploys or paid services | Require explicit authorization. Test or sandbox modes only |
| User work preserved | `git status` before edits. Never revert unrelated changes. The installer refuses to overwrite files it didn't create |

## Recommended hard guardrails (optional)

Instructions are strong, but **deny rules make them unconditional**. In Claude Code (`~/.claude/settings.json` or `.claude/settings.json`):

```json
{
  "permissions": {
    "deny": [
      "Bash(git commit:*)", "Bash(git push:*)", "Bash(git merge:*)", "Bash(git rebase:*)",
      "Bash(git reset --hard:*)", "Bash(gh pr create:*)", "Bash(gh release:*)"
    ]
  }
}
```

In the Antigravity App, the equivalent is permission rules such as `command(regex:git (commit|push|merge|rebase))` set to **Deny**. FORGE doesn't modify your settings, so you add these yourself.

## What FORGE stores

- `.forge/context.json`: stack facts, file paths, command names, git branch and changed file names. No file contents and no secret values.
- `.forge/knowledge.md`: conventions and decisions written by FORGE. It is instructed never to store secrets.
- `.forge/tasks/**`: specs, plans and reports.

All of these stay local and are self-gitignored.

## Reporting vulnerabilities in FORGE itself

Open a private security advisory on the repository rather than a public issue.
