# Security Model

FORGE is instructions plus a small amount of local tooling. It gains no privileges beyond what your host (Claude Code or Antigravity) grants, and it **never tries to bypass the host's permission system**. Approve, deny or sandbox commands exactly as you normally would.

## Enforced boundaries

| Boundary | Mechanism |
|---|---|
| No commits, pushes, merges, rebases, stashes, resets, PRs or releases | **Claude Code: enforced by the FORGE git guard hook** (below), plus the orchestrator rules (`skills/forge/core/safety.md`) and the operating rules appended to every agent. Antigravity: rules only; add host deny rules (below) |
| Least-privilege specialists | Claude Code `tools` allow-lists: 14 agents are read-only, and no specialist can spawn agents |
| No secret exposure | The detector never opens `.env*` values (names only, from example files). Every agent is told to redact tokens and cookies in output |
| No new dependencies, major upgrades or project-wide config changes | Require user authorization (safety policy) |
| No destructive data ops, production access, deploys or paid services | Require explicit authorization. Test or sandbox modes only |
| User work preserved | `git status` before edits. Never revert unrelated changes. The installer refuses to overwrite files it didn't create |
| Existing containers and data untouched | When the project's own tooling can't verify a change, FORGE may start **ephemeral, local** services (for example a throwaway database container): uniquely named, self-removing (`docker run --rm`), on a non-default port and stopped when done. It never connects to, modifies or stops existing containers, volumes or databases |

## FORGE git guard (Claude Code, enforced)

`skills/forge/scripts/git-guard.mjs` is a `PreToolUse` hook on Bash and PowerShell. It blocks a forbidden command before it runs, and the agent sees the reason. No model judgment is involved.

**Blocked:**
- `git commit`, `push`, `pull`, `merge`, `rebase`, `cherry-pick`, `revert`, `am`
- `git reset --hard`; `git stash` (except `list` and `show`); `git clean` (except `-n`)
- `git checkout -f` or `git checkout .`; `git restore .` or `--source`; `git switch --discard-changes`
- branch delete, force or move; tag create or delete; history rewrites (`filter-branch`, `update-ref` and similar)
- hosting-platform writes:
  - `gh pr create|merge|review|comment|edit|close`, and `gh issue create|comment|edit|close`;
  - `gh api` with a write method (`-X POST/PATCH/PUT/DELETE`) or a request body (`-f`/`-F`);
  - `gh release` and `gh repo delete|edit`;
  - `glab mr create|merge|approve|note`.
- **during a review** (`.forge/review.lock`, see [usage](usage.md#reviewing-a-pr-or-branch)): `Edit`, `Write`, `MultiEdit` and `NotebookEdit` on any file outside `.forge/`. The lock is set when a review starts and removed when it ends; it expires after 3 hours.

**Detected inside wrapped commands too:** `&&` and `;` chains, pipes, `$(...)` and backticks, `bash -c` / `pwsh -Command` / `cmd /c`, `git -C <dir>` and `-c` options, env-var prefixes, `sudo`, and full paths to `git.exe`.

**Always allowed:** read-only git such as `status`, `diff`, `log`, `show`, `blame`, `stash list`, `fetch`, and `restore --staged <file>`.

| Where the hook lives | When it enforces |
|---|---|
| Every FORGE agent's frontmatter (`--scope agent`) | Always, but only while that agent runs, because Claude Code scopes agent hooks to the agent |
| The `forge` skill's frontmatter (`--scope skill`) | Only during FORGE turns. The hook is registered when `/forge` runs. It then reads the session transcript and enforces only while the current turn is a `/forge` turn, or one where the model invoked the `forge` skill. If it can't tell, it blocks. Your own later requests in the same session ("now commit this") are **not** blocked |
| Plugin `hooks/hooks.json` (`--scope plugin`) | For `forge-*` agents and FORGE turns only. Plugin hooks are global, so if it can't tell, it allows; other sessions are unaffected. This is needed because plugin agents ignore frontmatter hooks |

Notes:
- **Installers:** they write the absolute path of the installed script into the hook commands. Plugin installs use `${CLAUDE_PLUGIN_ROOT}`. Each hook call runs `node` once and returns in milliseconds; commands without `git` or `gh` exit immediately.
- **Project-scope installs:** Claude Code skips frontmatter hooks in project-level agents until you trust the folder. This is normal when you open the project interactively. User-scope installs need no trust.
- **Verified live (Claude Code 2.1.326, Windows):** a user-level agent, an `--agents` definition, a settings hook and the skill-scoped hook (with real transcript detection) all blocked the command before git ran.
- **Best effort against shell tricks:** a git alias or a script file that runs git internally is not parsed. The rules and the reviewer still apply, and host deny rules (below) add another layer.
- **Antigravity** has no equivalent hook mechanism in FORGE yet, so there it relies on the rules.

## Pre-approved /forge workflow (Claude Code)

The forge skill's `allowed-tools` rules come from `adapters/claude-code/platform.json` (`preApproved`). They cover FORGE's own files and scripts, the project's test, lint, type check and dev commands, read-only git, `curl` to localhost, and the Playwright and DevTools MCP servers. They apply only during a `/forge` turn, need no settings or workspace trust, and every part of a chained command must match. The platform contract refuses git writes, installs, publish and deploy, single-word patterns and interpreters other than FORGE's own scripts. Anything else still asks you, and the git guard still blocks commits and pushes. To narrow the set, edit `preApproved` and rebuild.

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
