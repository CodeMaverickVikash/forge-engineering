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

## Keeping knowledge fresh

The technology registry and the `references/*.md` files go stale as frameworks release new versions and packages get renamed. `scripts/check-freshness.mjs` watches for this:

| Check | Mode | Result |
|---|---|---|
| Every reference and the registry has a review date in `scripts/freshness.json` | offline (also run by `validate.mjs`) | missing date: error |
| Review date older than `maxAgeDays` (180) | offline | error in `check-freshness.mjs`, warning in `validate.mjs` |
| Each detector signal still exists in its public registry (npm, PyPI, Packagist, RubyGems, crates.io, pub.dev, Go proxy) | `--online` | `NOT_FOUND`: error |
| The package is deprecated or abandoned | `--online` | error, unless the signal is listed in `legacySignals` |
| No release in `inactiveAfterDays` (730). Go modules are followed to their newest `/vN` path | `--online` | warning |
| A reference names a technology's major versions (for example "Express 4") but never the latest one | `--online` | `OUTDATED_MENTION`: error |

Wildcard signals and SDK-only signals (such as `flutter`) are skipped. Maven signals are skipped because they are word matches, not coordinates. Only public package names are sent, and only to those public registries.

**Workflow:**
1. Run `node scripts/check-freshness.mjs --online`, or let the weekly GitHub Action (`.github/workflows/freshness.yml`) run it.
2. Fix what it reports:
   - Update the reference.
   - Add the successor package to the registry entry.
   - If a deprecated package is still worth detecting in older projects, keep it and add `"<eco>:<name>"` to `legacySignals` in `scripts/freshness.json`. Only do this after its successor is in the registry.
3. After reviewing a file against current upstream docs, record it: `node scripts/check-freshness.mjs --mark <path>` (or `--mark all`).
4. When you add a new reference file, run `--mark` for it too. Otherwise `validate.mjs` fails with `UNREGISTERED`.
