# Extending FORGE

Every change goes through the same loop: edit the sources in `skills/` or `agents/`, run `node scripts/build.mjs`, run `./scripts/validate.sh`, then reinstall.

## Add a technology

1. Add an entry to `skills/forge-project-exploration/scripts/technology-registry.json`:
   ```json
   { "id": "remix", "name": "Remix", "category": "frontend",
     "detect": { "npm": ["@remix-run/react"], "files": ["remix.config.js"] },
     "skills": ["forge-frontend-engineering"],
     "reference": "forge-frontend-engineering/references/remix.md" }
   ```
   Signal keys:
   - `npm` and `composer`: exact package name, or a prefix ending in `*`.
   - `py`, `gem`, `cargo`, `pub`, `nuget`: word match in the manifest.
   - `maven` and `go`: substring match.
   - `files`: basename or path, with `*` allowed.
   - `dirs`: directories.

   `requireAny: ["npm"]` makes file-only evidence insufficient.
2. If you need a new command inference, extend `detectCommands()` in `detect-stack.mjs` and always record its `source`.
3. Write the reference (40 to 90 lines). Cover identification, architecture practices, coding standards, security issues, testing tools, lint/format, build commands ("if configured") and an official docs URL.
4. Add a fixture under `tests/fixtures/` and an expectation in `tests/unit/detect-stack.test.mjs`.

## Add a specialist agent

1. Create `agents/forge-<role>.md` (see existing agents). The frontmatter needs `name`, `description` (≤ 170 characters), `tools` (least privilege), `model: inherit`, `color` and `skills` (1 or 2). Leave the shared operating rules out of the body, because the build appends them.
2. Add the agent to the roster and the routing matrix in `skills/forge/core/routing.md`. The validator fails otherwise.
3. Rebuild and validate.

## Add a skill

1. Create `skills/forge-<name>/SKILL.md` with `name` equal to the directory name, a `description` of at most 200 characters (what it covers and when to use it), and `user-invocable: false`.
2. Keep it to 150 lines or fewer and put stack detail in `references/`.
3. Reference it from an agent's `skills:` list or by name in another skill.

## Project-specific knowledge

Keep universal skills generic. Project-specific facts belong in the target project's `.forge/knowledge.md`, or its `CLAUDE.md` / `AGENTS.md`. They don't belong in FORGE's skills.
