# FORGE Architecture

## Design goals

1. **One entry point.** The user only ever types `/forge`.
2. **Native over imitation.** Use each host's real skills and subagents. Don't build a framework that pretends to be them.
3. **Shared core, thin adapters.** All engineering knowledge lives once, in `skills/` and `agents/`. Adapters only transform metadata.
4. **Low context.** Progressive disclosure everywhere. A deterministic detector replaces dozens of exploratory tool calls.
5. **Honesty.** No fabricated tests, metrics or agent participation. Missing capabilities are reported, not hidden.

## Components

```
                    ┌────────────────────────── shared core ──────────────────────────┐
 user ── /forge ──► │ skills/forge/SKILL.md          orchestrator (runs in main thread)│
                    │   core/lifecycle.md            adaptive 10-phase lifecycle, sizing│
                    │   core/routing.md              roster + task→team matrix         │
                    │   core/delegation.md           work orders, ownership, conflicts │
                    │   core/quality-gates.md        G1–G15, pre-browser+browser gates │
                    │   scripts/validation-gate.mjs  plan, run once, gate, evidence    │
                    │   core/safety.md               autonomy policy                   │
                    │   templates/                   spec, plan, test plan, report     │
                    │ skills/forge-*/                25 specialist skills (+references)│
                    │   forge-project-exploration/scripts/detect-stack.mjs + registry  │
                    │ agents/forge-*.md              25 specialist role definitions    │
                    │ agents/_shared/operating-rules.md   appended to every agent      │
                    └───────────────────────────────┬─────────────────────────────────┘
                                 scripts/build.mjs  │  (metadata transforms only)
                       ┌────────────────────────────┴───────────────────────────┐
              dist/claude-code/                                       dist/antigravity/
              Claude Code plugin layout                               Antigravity plugin layout
              agents keep tools/disallowedTools                       agents → name, description, model: inherit, skills
              skills keep user-invocable:false                        skills → name, description, disable-slash-command
              skills/forge/roles/ (Mode B fallback)                   skills/forge/roles/ + workflows/forge.md (legacy IDE)
                       │                                                         │
       install.sh / install.ps1 → ~/.claude/{skills,agents}       → ~/.gemini/config/{skills,agents,global_workflows}
                                   or <project>/.claude/             or <project>/.agents/
```

## Platform contract (core ↔ adapters)

FORGE is the decision layer: the core decides what to build, who does it, what to verify and how to report. The host (Claude Code, Antigravity, a future one) supplies execution: the model, file edits, the terminal, subagents, MCP tools and its permission system. FORGE adds no runtime of its own and never bypasses the host's permissions.

The boundary between them is a **host profile**, `adapters/<host>/platform.json`, checked by `skills/forge/scripts/platform.mjs` (`validateProfile`):
- It declares **every capability the core relies on** (`CAPABILITIES`: entry command, request arguments, subagents, parallel subagents, foreground waits, continuing a subagent, per-call model choice, tool allow-lists, the git-guard hook, pre-approved scripts, asking the user, deferred tools, browser tools, background commands). Each is `supported` with its native form, or `unsupported` / `unverified` with a fallback. An undeclared or unknown capability fails `validate.mjs`.
- It also states the standard and strong model tiers, which frontmatter fields the host reads, the required configuration, the limitations, and whether it was verified `live` or only against the `docs`.
- **The build reads every host decision from it.** That covers frontmatter fields, agent models, the specialist-hiding field and whether hooks ship. Each install gets `skills/forge/platform.json` and a generated `core/platform.md`.
- **The orchestrator reads `core/platform.md` first.** The shared instructions name capabilities ("continue the same verifier", "the strong tier"), never one host's tools.
- **The scripts read `platform.json`.** A model escalation then prints the host's native model, or "record the escalation as unavailable" where the host can't choose a model per delegation. With no valid profile they fall back to neutral wording; they never assume a capability.

Approvals and safety stay central: the rules are in the shared core (`core/safety.md` and the operating rules appended to every agent), and the skill installer refuses to run without the user's approving words. Hosts differ only in how much is *enforced* on top: the git-guard hook and tool allow-lists exist where the profile says `supported`, and elsewhere the profile names the fallback.

**Adding a host:** write `adapters/<host>/platform.json`, add a `buildX()` in `scripts/build.mjs` that applies it, and add an install target. The core needs no change; `tests/unit/platform-contract.test.mjs` checks that every adapter ships the same core.

### Orchestrator (the `forge` skill)

It runs in the **main conversation**, not as a subagent, for three reasons: it keeps the user's context, it can spawn specialists (both hosts let the main agent delegate), and it owns the final outcome. Its `SKILL.md` stays under 100 lines and links to `core/*.md`, which are loaded only when the phase needs them.

**Operating modes**

- **Mode A (native subagents).** The host's delegation tool, as `core/platform.md` names it (Claude Code: `Agent`; Antigravity App and CLI: `invoke_subagent`). Independent specialists run in parallel. The routing matrix's core team does the specialist work, even on small-looking tasks; the orchestrator plans, briefs, verifies and integrates, and implements directly only S-size fixes. Browser QA always goes to `forge-browser-qa` and the final review to `forge-code-reviewer`.
- **Mode B (sequential role emulation).** For hosts without custom subagents, the orchestrator reads `roles/<agent>.md` and performs each role in turn. The final report states that the roles were emulated.

### Specialists (agents)

Each agent is short (about 30 to 40 lines). It preloads 1 or 2 skills (`skills:` frontmatter, supported by both hosts), so its expertise loads at startup without extra tool calls. Tool access is least-privilege in Claude Code:

| Class | Tools | Agents |
|---|---|---|
| Read-only analysts and reviewers | `Read, Grep, Glob, Bash, Skill` (+ web for researcher, architect, security) | PM, BA, researcher, UX, architect, QA lead, manual QA, security, performance, accessibility, code reviewer, release, SRE, explorer |
| Implementers | `Read, Edit, Write, Grep, Glob, Bash, Skill` (+ `WebFetch` for AI) | frontend, mobile, backend, database, integration, AI, devops, test automation, tech writer, DX |
| Browser QA | everything (needed for MCP tools) **except** `Agent` | browser QA |

No specialist can spawn agents. The orchestrator is the only coordinator, which keeps delegation shallow and auditable.

Antigravity tool names differ from Claude Code's, and a wrong tool name can hang an Antigravity subagent. So the Antigravity adapter omits `tools` (agents inherit) and relies on the role instructions for read-only behavior. See [compatibility.md](compatibility.md).

### Shared state and the single source of truth

```
<project>/.forge/                 (self-gitignored: contains .gitignore "*")
  context.json                    detector output: stack, commands with sources, git state, change diff
  knowledge.md                    durable project knowledge (revalidated, never secrets)
  tasks/<slug>/spec.md            requirements (orchestrator-owned)
  tasks/<slug>/plan.md            tasks, file ownership, decisions log
  tasks/<slug>/reports/<agent>.md specialist reports
  tasks/<slug>/report.md          FORGE Execution Report (saved; the user gets an answer)
```

Specialists get short work orders that point to these files instead of pasting context, which keeps prompts small and consistent.

### Concurrency control

The plan assigns **file ownership** for each task. Implementers run in parallel only when their ownership is disjoint. Shared files (route registries, barrels, lockfiles) get a single owner. When frontend and backend both change, the API contract is frozen in `plan.md` first.

### Conflict resolution

Precedence: safety/security/data integrity → correctness → backward compatibility and conventions → reliability → measured performance → simplicity → preference. Every resolved conflict is recorded in `plan.md` under **Decisions**.

## The stack detector

`skills/forge-project-exploration/scripts/detect-stack.mjs` is a zero-dependency Node script driven by `technology-registry.json`:

- **Evidence-based.** A technology is reported only with evidence (`npm:next@15.1.0`, `file:go.mod`, `maven:spring-boot`).
- **Monorepo-aware.** Every directory with a manifest becomes a *unit* with its own stack and commands.
- **Commands with provenance.** Each command records its source: `package.json#scripts.test`, `Makefile#lint`, or `inferred: <evidence>`.
- **Secret-safe.** `.env*` files are listed by name. Only `*.example`/`*.sample`/`*.template`/`*.dist` files are parsed, and only for variable names.
- **Incremental.** `--write` diffs against the previous `context.json` (manifest fingerprint plus added and removed technologies), so stale knowledge gets flagged.
- **Compact.** The Markdown summary is under 60 lines even for monorepos.

To add a technology, add a registry entry (see [extending.md](extending.md)).

## Why not an external orchestration server?

Both hosts already provide what an orchestrator needs: skills with progressive disclosure, subagents with isolated context, parallel delegation and permission models. An extra server would add a runtime dependency, a security surface and a second source of truth for no capability gain. FORGE's only executable code is the detector (optional) and the build, validate and install tooling.
