# Final response (what the user reads)

The final message is about the user's task and its outcome, not about FORGE. Re-read the original request first. Then answer it: what they asked for, what they now have, and only the technical details that matter to them. Write like an experienced engineer telling a teammate about finished work: outcome first, specific, natural, concise. Use headings or bullets only when they help.

## Shape it by the request

| Request | Say |
|---|---|
| Feature | What the feature does now, how to reach and use it, and limitations that matter |
| Bug fix | What caused it, what changed, how it behaves now; remaining limits or repro steps if any |
| UI / UX | The visible changes and the better experience, with screenshots (below) |
| API / backend | Endpoints and request/response changes, integration behavior, and anything web or mobile must do |
| Question | The direct answer, the explanation, and an example when useful. No implementation report |
| Research / analysis / audit | Findings ranked by impact with `file:line` evidence or sources, then the recommendation and why |

Skip what doesn't apply; never fill sections for their own sake.

## Leave out unless the user asks

Agent names or counts, orchestration steps, phases, model or skill choices, skill discovery logs, validation cycles, command lists, long file lists, internal debugging, and filler such as "The task was completed successfully." When the user asks for execution details, changed files, test evidence or an audit, print the saved `report.md` instead.

## Verification, briefly

One or two sentences that support the result: what proves it works ("checked with automated tests and in the browser: the counter now drops when a task is done") or what limits that. Give test counts, commands or logs only when a failure or blocker needs explaining. Never claim verification that did not happen. When `final` prints a `Production build:` line, end this part with one short sentence giving that command ("FORGE didn't run the production build; run `pnpm --filter web build` before release."). It does not lower the status.

## Visual Results (UI, browser and device work)

Every visually verifiable change shows its real result. `validation-gate.mjs final` prints a `### Visual Results` table built from the screenshot files that exist: one row per screen, before/after pairs side by side. Paste it as is, right after the outcome. Drop a row only if it shows nothing the user asked about. Never type a path or link yourself.
- Links are relative to the project root, so they open in IDE hosts (VS Code, JetBrains). Where relative links don't open (a plain terminal, a remote session), give the absolute paths from `final --json` and say where the files are.
- If no screenshot could be captured, say so plainly ("Visual evidence unavailable: <reason>") instead of the table, and the status cannot be VERIFIED.

## Honest ending

If anything is incomplete, say what works, what doesn't, the actual blocker, and what's needed to finish. Then end with exactly these two lines:

```
**Status:** VERIFIED | VERIFIED WITH LIMITATIONS | BLOCKED | FAILED: <one plain-language reason>
Changes are uncommitted; nothing was committed or pushed. Full engineering report: `.forge/tasks/<slug>/report.md`
```

The status follows the rules in `core/quality-gates.md` and matches the saved report. For a question (size Q), skip both lines.
