---
name: forge-system-architecture
description: Architecture for existing code (assessment, trade-offs, short ADRs, contract-first plans).
disable-slash-command: true
---


# System Architecture

The best architecture for a change is usually the one the codebase already has. Your job is to fit the change into it cleanly, and to argue for a deviation only when the existing structure cannot meet the requirements.

## 1. Assess what exists

From `.forge/context.json`, docs, ADRs and the code:
- **Units and boundaries**: deployables, packages, modules, layers. How do they depend on each other (imports, HTTP, queues, shared DB)?
- **Patterns in use**: layering (controller/service/repository), DI style, error and result handling, state management, data access, event or job systems.
- **Contracts**: API schemas, shared types, events, DB schema ownership.
- **Pain points**: cycles, god modules, duplicated logic, leaky boundaries, missing tests on critical paths. Cite `path:line`.

Summarize in 5 to 10 bullets. Every bullet has evidence.

## 2. Choose the approach

1. List 2 or 3 viable options. One of them is always "extend the existing pattern with the smallest change".
2. Evaluate each against the spec's ACs and NFRs, plus: consistency with existing architecture, blast radius (files and units touched), reversibility, operational cost, testability, team familiarity (patterns already in the repo).
3. Pick one. State why the others lost in one line each.
4. Apply the precedence in `<FORGE_HOME>/core/delegation.md` (Conflict resolution) when trade-offs conflict. `FORGE_HOME` is the `forge` skill directory.

## 3. Modularity and coupling checks

- New code lives in the module that owns the concept; do not scatter one concept across layers that do not need it.
- Dependencies point inward or follow the existing direction. No new cycles.
- Shared code is extracted only when there are at least two real callers today.
- Cross-unit communication uses the mechanism already in place (same HTTP client, same queue, same event bus).
- Data has one owner. Another module reads it through its owner's interface, not by querying its tables directly, unless the codebase already does so consistently.

## 4. Scalability and reliability (proportionate)

Ask only what the change makes relevant: data growth (pagination, indexes), hot paths (caching only with measured need), fan-out (N+1 calls), long work (move to existing job system), external calls (timeouts, retries with backoff, idempotency), failure isolation. Do not design for scale the product does not have.

## 5. When NOT to introduce a new abstraction

Do not add a new layer, interface, base class, generic helper, framework, plugin system or configuration option when:
- There is one implementation and no concrete second one in the spec.
- The existing code solves similar problems directly and consistently.
- It exists to make future changes "easier" that nobody has asked for.
- It requires a new dependency the project does not have.
Three similar lines are better than a premature abstraction. Recommend refactors separately; do not bundle them into feature work.

## 6. Cross-module change planning (contract first)

1. Define the contract before implementation: endpoint shapes and status codes, shared types, event payloads, schema changes. Write it into the plan's Contracts section.
2. Prefer backward-compatible evolution: add fields, do not rename or remove; accept old and new shapes during transition.
3. Order work so producers land before consumers, and migrations before code that needs them.
4. Assign each shared file (route registry, schema, barrel export) a single owner.
5. Identify the integration test that proves both sides agree.

## 7. ADR (L tasks, or any decision that is hard to reverse)

```
# ADR-<n>: <decision title>
Status: proposed | accepted     Date: <YYYY-MM-DD>
Context: <forces, constraints, evidence paths; 3-6 lines>
Decision: <what we will do; 1-3 lines>
Alternatives: <option — why rejected> (one line each)
Consequences: <positive, negative, follow-ups, rollback path>
```
Save it to the task folder; the tech writer may move it into the repo's ADR folder if one exists.

## Output

Return: the assessment bullets with evidence, the chosen approach and rejected alternatives, contracts to freeze, the cross-module task order with owners for shared files, risks with mitigations, and an ADR when required. You may use web research for library or pattern documentation; cite the URL.
