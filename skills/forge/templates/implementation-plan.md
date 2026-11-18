# Implementation Plan: <title>

Spec: `./spec.md`

## Approach
<2–6 lines: chosen approach and why. Alternatives considered (one line each) and why rejected.>

## Contracts (frozen before parallel work)
<API shapes / types / events / schema that multiple owners depend on>

## Tasks
| # | Task | Owner (agent) | Files owned | Depends on | Validation |
|---|------|---------------|-------------|------------|------------|
| T1 | | | | — | |

## Waves
1. <parallel group> → 2. <…>

## Validation strategy
- Affected apps: <unit — web / backend-API / mobile / shared — why (changed, consumer, contract)> (from `validation-gate.mjs plan`)
- Baseline: <`validation-gate.mjs run --baseline --units …` results>
- Per task: <see table; implementers run `validation-gate.mjs run --task <slug> --units <theirs>`>
- Ordering: <checks that must run in sequence: shared DB, emulator, build-before-consumer> or "all parallel"
- After the gate: <browser journeys / device flows / API-level verification, per app>
- Final gates: <list from quality-gates.md that apply>

## Risks & mitigations
- <risk> → <mitigation / rollback>

## Decisions
- D1 <decision> — <rationale, who disagreed, precedence rule applied>
