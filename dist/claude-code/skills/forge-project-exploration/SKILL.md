---
name: forge-project-exploration
description: Universal codebase exploration for any language or stack. Identifies languages, frameworks, versions, package managers, commands, architecture, API contracts, schema, auth, tests, CI/CD and deploy config from evidence, then builds a refreshable project context map. Use before changing an unfamiliar codebase.
user-invocable: false
---

# Universal Project Exploration

Goal: understand the codebase well enough to change it safely, **without reading everything**. Every claim must trace back to evidence (file paths). Never guess a stack or a command.

## Step 1: Fingerprint (deterministic)

```bash
node "<this-skill-dir>/scripts/detect-stack.mjs" --root <project-root> --write
```

- This prints a compact Markdown map and saves the full JSON to `.forge/context.json`. The `.forge/` directory is self-gitignored.
- It reports: git branch and uncommitted files, languages, units (monorepo-aware), technologies with evidence and versions, discovered commands with their sources, docs, CI, deploy files, API contracts, migrations, tests, and env var **names**.
- A command whose source is `inferred:` is a candidate, not a guarantee. Confirm the tool exists before relying on it.
- On later runs, "since last run" shows changed manifests and added or removed technologies. Revalidate `.forge/knowledge.md` when anything changed.
- **No Node available?** Do Step 1 manually. Find the manifests (`package.json`, `pyproject.toml`, `requirements*.txt`, `go.mod`, `pom.xml`, `build.gradle*`, `composer.json`, `Cargo.toml`, `Gemfile`, `pubspec.yaml`, `*.csproj`), the lockfiles, the CI files and the Dockerfiles, while skipping dependency and build directories. Read the manifests and record the same facts.

## Step 2: Targeted deep read (task-driven)

Read in this order and stop once you can explain how the affected feature works end to end:
1. **Docs:** README, CONTRIBUTING, ARCHITECTURE, ADRs, CLAUDE.md/AGENTS.md (conventions often live there).
2. **Entry points:** server bootstrap, router or route registry, app shell, `main`.
3. **The feature path:** follow the request from UI → API route → handler or service → data access → schema. Use search (`grep -rn` / Grep) for the domain nouns in the request.
4. **Contracts:** OpenAPI, GraphQL, proto and shared type files touching the feature.
5. **Data:** models, the latest 2 or 3 migrations, schema files.
6. **Cross-cutting:** auth middleware and guards, error handling, logging, config loading, validation library.
7. **Tests:** the nearest existing tests for the feature. They show conventions and how to run things.
8. **UI** (if relevant): the design-system or component folder, theme tokens, an existing similar screen.

**Never open:** dependency folders, build output, lockfile bodies, minified bundles, binary files, or `.env*` values. Secrets stay unread. You may report variable **names**.

## Step 3: Record conventions

Note conventions before writing code: naming, folder layout, state management, error and result patterns, DI style, test style and location, formatting (the project's formatter config). New code must look like it was written by the existing team.

## Step 4: Output

For the orchestrator or report, produce at most ~40 lines:
```
STACK: <units → key tech + versions>
COMMANDS: <test / lint / typecheck / build / dev with source>
ARCHITECTURE: <layers/modules and how they interact; 3–8 bullets>
FEATURE PATH: <file:line chain for the affected feature>
CONVENTIONS: <bullets>
RISKS: <fragile areas, missing tests, auth/data concerns>
UNKNOWNS: <what could not be determined and why>
```

## Project knowledge (`.forge/knowledge.md`)

Persist only durable, non-secret facts: conventions, architecture decisions, non-obvious commands, known gotchas, testing conventions. Each entry carries a date and the evidence path. Treat existing entries as **hints to revalidate**, not truth. If code contradicts an entry, fix or delete the entry.
