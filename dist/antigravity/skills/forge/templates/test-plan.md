# Test Plan: <title>

## Scope
- Under test: <features / ACs>
- Regression scope: <adjacent features at risk and why>
- Not tested: <with reason>

## Traceability
| AC | Test level (unit/integration/E2E/manual/browser) | Test name or procedure | Status |
|----|------|------|------|
| AC1 | | | |

## Environments & data
- Runtime: <local dev server command / test DB / emulator>
- Test data: <fixtures, seeded test accounts, never production>
- Viewports (UI): 390×844 mobile, 768×1024 tablet, 1440×900 desktop (adjust to project breakpoints)

## Commands
- <exact commands from .forge/context.json>

## Exit criteria
- All ACs evidenced; no new failures vs baseline; pre-browser gate OPEN before browser/device runs; browser gate per quality-gates.md G10 (G10m for native mobile); screenshots indexed under the task's `evidence/`.
