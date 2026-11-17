# Contributing to FORGE

1. Edit **sources only**: `skills/`, `agents/`, `scripts/`, `evals/`, `tests/`, `docs/`. Never hand-edit `dist/`, `docs/agents.md` or `docs/skills.md`; they are generated.
2. Run `node scripts/build.mjs`.
3. Run `./scripts/validate.sh`. It runs the validator, the tests and the official plugin validator, and it must pass.
4. For behavior changes to the orchestrator or agents, run at least one live scenario (`node tests/e2e/run-scenario.mjs bug-fix`) and include its `summary.json` in your PR.

## Content standards

- **Grounded:** no invented flags, APIs or versions. Phrase tool commands as "if configured" and discover them from the project.
- **Concise:** skills ≤ 150 lines (stack detail goes in `references/`), agents ≤ ~55 lines. Descriptions state what the item does and when to use it, in ≤ 200 characters for specialist skills and ≤ 170 for agents (they are always loaded; the validator warns above that).
- **Least privilege:** read-only roles get no Edit or Write tools, and no specialist gets `Agent`.
- **Honest reporting:** never weaken the status vocabulary or the browser completion gate.
- **Portable:** keep instruction bodies host-neutral. Host differences belong in `scripts/build.mjs` and `docs/compatibility.md`.

See [docs/extending.md](docs/extending.md) for adding technologies, agents and skills.
