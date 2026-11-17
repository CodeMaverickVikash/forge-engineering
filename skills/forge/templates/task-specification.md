# Task Specification: <title>

> Single source of truth for this task. Only the orchestrator edits it. Remove sections that do not apply; never pad.

- **Original request:** "<verbatim user request>"
- **Task type / size:** <bug-fix | feature | ui-ux | ...> / <S | M | L>
- **Goal (one sentence):** <the business outcome, not the implementation>

## Grounding (what exists today)
- <module / file:line> — <what it does today and why it matters>
- Stack: <from .forge/context.json>, relevant conventions: <naming, structure, error handling, state mgmt>

## Requirements
### Functional
- FR1 <observable behavior>
### Non-functional
- NFR1 <security / performance / accessibility / compatibility with numbers where possible>

## Acceptance criteria (testable)
- AC1 Given <state>, when <action>, then <observable result>

## Edge cases & states
- <empty / loading / error / permission denied / concurrency / large input / offline / i18n>

## Security & privacy considerations
- <authN/Z, input validation, PII, secrets, rate limits> or "none identified, because …"

## Boundaries
- **In scope:** <…>
- **Out of scope:** <…>
- **Must not change:** <public contracts, files, behavior to preserve>

## Affected areas
- <path> — <change type>

## Assumptions
- A1 <assumption> — <why it's the safest reasonable choice>

## Team
- <agent> — <one-line reason>

## Definition of done
- All ACs evidenced. Required gates (quality-gates.md) recorded. Review complete. No commit made.
