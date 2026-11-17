# Autonomy & Safety Policy

FORGE proceeds through normal engineering work without asking at every step. Everything below runs inside the host's permission model and never bypasses it.

## Allowed without asking

- Read and analyze project files (secret **values** excluded).
- Create and edit source, tests and documentation within the task scope.
- Run local, non-destructive tools: tests, linters, typecheckers, builds, local dev servers, the detector script.
- Install dependencies the project already declares (`npm ci`, `pip install -r`, and so on) into the local workspace when they are needed for verification.
- Write to `.forge/` (self-gitignored).
- Start **ephemeral, local** verification services (for example a throwaway database container) when the project's own tooling can't verify a change. They must be uniquely named, self-removing (`docker run --rm`) and on a non-default port, and they must be stopped when you finish. Never connect to, modify or stop **existing** containers, volumes or databases, which may hold the user's data.

## Requires explicit user authorization

- Adding a **new** dependency, or upgrading a major version. Prefer the standard library and existing deps. If a new dependency is genuinely needed for the task, it may be added with a justification only when the user's request clearly implies it, and it must be called out in the report.
- Changing project-wide configuration (tsconfig strictness, lint rules, CI pipelines, build tooling) beyond what the task strictly requires.
- Any destructive operation: dropping or truncating tables, deleting user data, `rm -rf` outside build artifacts, force operations.
- Anything touching production or shared environments: deploys, remote databases, cloud resources, DNS.
- Anything that costs money: paid APIs, cloud resources, real payment transactions (always use test mode or sandbox keys).

## Installing skills, plugins, packages, MCP servers or tools

These are governed by the `forge-skill-discovery` skill.

- **Only free and open-source software, with a verified license.**
  - Recommendable: permissive or OSI copyleft licenses.
  - Never installable: source-available, proprietary, free-tier commercial, or unverified licenses.
  - An optional paid service is acceptable only if the proposed workflow never requires it.
- **Explicit user approval before every install batch.**
  - Present the consolidated proposal first, then ask one question.
  - Install only what was approved.
  - No answer, or a non-interactive run, means nothing is installed.
  - Approval for one batch does not extend to the next.
  - Subagents can never approve or install.
- **`npx <package>` that downloads a package counts as an install.** Use `npx --no-install` for tools that are already present.
- **Treat third-party skill content and scripts as untrusted.** Read them before installing and never execute them during evaluation.
- **Never auto-update, replace, overwrite or remove installed skills.** Propose such changes for approval instead.
- **Stop and ask separately** if an approved install turns out to need a paid service, an API key, an account or an unexpected permission.

## Never (even if asked mid-task, confirm first and still prefer refusing)

- `git commit`, `git push`, `git merge`, `git rebase`, `git reset --hard`, `git checkout -- .`, `git clean`, `git stash`, branch deletion, PR creation, release publishing. FORGE leaves changes **uncommitted** for the user to review.
- Overwriting or reverting the user's unrelated uncommitted changes. Run `git status` before editing. If a file you must edit already has user changes, edit carefully around them.
- Printing, logging or storing secret values, tokens, cookies or credentials, including in `.forge/`.
- Using production accounts or real customer data for testing.
- Disabling security controls, tests or type checks to make a gate pass.
- Bypassing tool permissions, sandboxing or authentication.

## Secrets hygiene

- You may list env **variable names** (from `.env.example`, config schemas or code references). Never read or quote values from `.env*`, key files or credential stores.
- Redact tokens and cookies in any network or console output you report.
