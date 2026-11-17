# Using FORGE

Type `/forge` followed by what you want, in plain words. You don't have to pick specialists, write detailed prompts or approve each step.

```
/forge Build a complete notification system.
/forge Improve the existing dashboard UI.
/forge Fix the payment issue.
/forge Analyze the project and suggest improvements.
/forge Make this application production-ready.
/forge                      # no request means a project analysis
```

## What happens

1. **A one-line status at each phase**, for example *"Explore: Next.js 15 + Prisma; payment flow in app/api/checkout"*.
2. **Questions only when they're needed.** FORGE asks only when a decision is genuinely yours: business trade-offs, destructive actions, paid services or missing credentials. Otherwise it records an assumption and carries on.
3. **Working files** go in `.forge/tasks/<slug>/` (spec, plan, specialist reports, final report). `.forge/` is self-gitignored.
4. **Changes stay uncommitted.** Review them with `git diff`, then commit yourself.
5. **The FORGE Execution Report** is printed in full as the final message (and saved as `report.md`). It lists the specialists that actually ran, every gate with its real status, unresolved issues, assumptions and the git state.

## Size-adaptive behavior

| Request | Typical team | Ceremony |
|---|---|---|
| "Fix the off-by-one in pagination" | backend engineer (or FORGE itself) → code reviewer, + browser QA if visible | S: no written spec or plan; regression test and independent review |
| "Improve the dashboard UI" | PM, UX, frontend, browser QA, accessibility, reviewer | M: spec, plan, before and after screenshots, viewport checks |
| "Build a notification system" | PM, BA, architect, UX, backend, database, frontend, QA lead, test automation, browser QA, security, reviewer | L: spec, ADR, contract-first parallel implementation, full gates |
| "Analyze the project" | explorer, architect, security, performance (+ researcher) | read-only, ranked findings, roadmap |

A task that touches auth, payments, PII, migrations or schema, a public API contract, more than about 8 files or more than one deployable unit is sized up one step. Size reduces paperwork, not assurance: at every size FORGE runs the detector, adds a regression test for every bug fix, sends every browser-visible change to `forge-browser-qa`, and has `forge-code-reviewer` review every code change. With native subagents, the specialists do the work; FORGE implements directly only S-size fixes.

## Tips

- **Name constraints you care about:** *"/forge Add CSV export. Don't add new dependencies."* Constraints go straight into the spec.
- **Ask for analysis only:** *"/forge Review auth security, no changes."*
- **Resume or iterate:** *"/forge Continue the notification task"*. The task folder holds the state.
- **Browser verification** needs the Chrome DevTools and Playwright MCP servers. Without them, FORGE says so in the report.
- **Project knowledge** builds up in `.forge/knowledge.md`. Delete `.forge/.gitignore` to commit it for your team.

See `examples/` for complete walkthroughs.
