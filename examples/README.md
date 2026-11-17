# Examples

Each folder walks through one kind of request: the invocation, the team FORGE is expected to assemble (from `skills/forge/core/routing.md`), the phases that run, and what to look for in the report. Where a **live run** was recorded during development, the walkthrough links to its real results in `tests/e2e/results/`. Those are actual outputs, not illustrations.

| Example | Invocation | Recorded live run |
|---|---|---|
| [bug-fix](bug-fix/) | `/forge The task board shows the wrong number of remaining tasks. Fix it.` | `tests/e2e/results/bug-fix/` |
| [security-review](security-review/) | `/forge Do a security review of this app. Report findings only — do not change any code.` | `tests/e2e/results/security-review/` |
| [ui-improvement](ui-improvement/) | `/forge Improve the task board UI: clear loading, empty and error states, and better accessibility.` | `tests/e2e/results/ui-improvement/` |
| [feature-development](feature-development/) | `/forge Let users edit the title of an existing task.` | none yet (scenario `new-feature`) |
| [performance-optimization](performance-optimization/) | `/forge The dashboard is slow to load. Make it faster.` | none (procedure only) |

You can reproduce any recorded run, or record a missing one, with `node tests/e2e/run-scenario.mjs <scenario>`. See [docs/testing.md](../docs/testing.md).
