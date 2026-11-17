# Testing FORGE

FORGE is tested at four levels. Levels 1 to 3 are deterministic and free. Level 4 runs real agent sessions and costs API usage.

| Level | Command | What it proves |
|---|---|---|
| 1. Validator | `node scripts/validate.mjs` | Every skill and agent is well-formed for both hosts: names, descriptions, YAML safety, tool names, preloaded skills exist, routing covers all agents, links resolve, registry references exist, `dist/` and the docs catalogs are fresh, Antigravity constraints hold. It also prints the always-loaded context cost |
| 2. Unit and integration | `node --test tests/unit/*.test.mjs` | Detector accuracy on 7 fixtures (TS/Next.js, Python/FastAPI, RN/Expo, Java/Spring Boot, Go, PHP/Laravel, Node web), no false positives, secret safety, monorepo units, incremental refresh. Adapter build is correct and deterministic. **Real installer round-trips** (bash and PowerShell) in a sandboxed `HOME`: dry-run, install, upgrade cleanup, conflict refusal, `--force`, project scope, uninstall preserving user files |
| 3. Official validator | `claude plugin validate dist/claude-code` and `claude plugin validate .` | The Claude Code plugin and marketplace pass Anthropic's own checks |
| 4. Live scenarios | `node tests/e2e/run-scenario.mjs <scenario\|all>` | Real headless `/forge` sessions: correct team selection, a real implementation, real gates, browser QA through both MCPs, honest report, no forbidden git operations, post-conditions on the code |

`./scripts/validate.sh` runs levels 1 to 3.

## Plugin evals with a baseline (`claude plugin eval`)

`evals/` holds five graded cases in the official `claude plugin eval` format:
- `bug-fix-counter`
- `skill-discovery-approval-gate`
- `security-review-read-only`
- `database-change-honest-gates`
- `analysis-monorepo`

Each case has a natural-language prompt, an expected outcome and 4 to 7 LLM-graded assertions. The build packages the cases into `dist/claude-code/evals/` with their fixture projects in `files/`. The validator checks the format strictly, because a malformed case silently fails to load.

```bash
claude plugin eval dist/claude-code --scaffold --runs 1 --allow-tools Bash Write Edit --max-cost-usd 20
claude plugin eval dist/claude-code --case bug-fix-counter --scaffold --runs 1 --allow-tools Bash Write Edit
```

The CLI runs every case **with and without** FORGE and reports the score delta, which directly measures what FORGE adds over an unaided session. The assertions target FORGE's distinctive guarantees:
- regression tests;
- honest browser-verification verdicts;
- independent review;
- read-only analysis;
- no claimed-but-unrun Maven tests;
- no commits.

These are billed model runs, so start with `--runs 1`.

## Live scenarios (level 4)

Defined in `tests/e2e/scenarios.mjs`:

| Scenario | Fixture | Checks |
|---|---|---|
| `bug-fix` | `web-tasks` | code reviewer and browser QA invoked (the orchestrator may fix an S task directly); counter logic fixed; tests pass; browser-verified or honestly not |
| `security-review` | `web-tasks` | security engineer invoked; **no** source changes; report names the XSS sink |
| `ui-improvement` | `web-tasks` | frontend, UX or accessibility, and browser QA; source changes; tests pass |
| `new-feature` | `web-tasks` | engineers, browser QA and the reviewer; update endpoint added **with an automated test**; tests pass |
| `skill-discovery` | `web-tasks` | `forge-skill-scout` invoked; proposal mentions licenses and approval; headless means **nothing installed** (no new skill dirs, no lock file) and no source changes |
| `database-change` | `spring-boot-app` | database engineer and code reviewer; a new Flyway migration; V1 untouched; Maven missing is reported as UNAVAILABLE / NOT RUN, not as passed |
| `architecture-analysis` | monorepo (Next.js + FastAPI + Go) | explorer or architect plus security or performance; **no** changes |

How the runner works:
- It copies the fixture to a temp sandbox, runs `git init` and stages the baseline with `git add -A`. **Nothing is ever committed.**
- It installs FORGE at project scope, so your own `~/.claude` is untouched.
- It loads only the Playwright and Chrome DevTools MCP servers (`--strict-mcp-config`).
- It denies `git commit/push/merge/rebase/reset/stash/clean` and `gh pr`.
- It writes `tests/e2e/results/<scenario>/summary.json` and `report.md`.

Options: `--model` (default `sonnet`), `--budget` (USD cap per scenario, default 10) and `--keep` (keep the sandbox). Set `CLAUDE_BIN` if `claude` isn't on your PATH.

The recorded results of the runs made during development are in [`tests/e2e/results/`](../tests/e2e/results/). Each `summary.json` records the agents actually invoked, the MCP calls, cost, duration, files changed and the post-run test status.

## Antigravity manual verification

Antigravity could not be exercised in the development environment. Verify it with this procedure:

1. **Install:** `./scripts/install.sh --target antigravity` (or `--scope project --project <repo>`).
2. **Discovery:** Open Customizations (App or IDE), or run `/skills` in `agy`. Expect the skill `forge` plus 25 `forge-*` skills, and 25 `forge-*` agents.
3. **Single entry point:** type `/`. Only `forge` should be offered from FORGE (CLI: the specialists use `disable-slash-command`). If the App still lists the specialists, note it; it's cosmetic.
4. **Smoke run:** copy `tests/fixtures/web-tasks` to a scratch folder, open it, and run:
   `/forge The task board shows the wrong number of remaining tasks. Fix it.`
   Expect the following:
   - `.forge/context.json` is created by the detector.
   - Specialists are delegated through `invoke_subagent` (App/CLI). In the IDE, the report should say *emulated sequentially (Mode B)*.
   - `public/app.js` is fixed.
   - `npm test` is PASSED.
   - The final report ends with a git status and "No commit, push, or pull request was created."
5. **Browser QA:** add the Chrome DevTools and Playwright MCP servers to `~/.gemini/config/mcp_config.json`, re-run step 4, and expect DevTools console and network evidence in the report. Without them, expect the verdict *"implemented, not browser-verified"*.
6. **Arguments:** if the request text after `/forge` is ignored, report it. The skill already tells the agent to fall back to the invoking message.
7. **Uninstall:** `./scripts/uninstall.sh --target antigravity`. The FORGE files are removed and your other skills remain.

Please file the results (pass/fail per step, Antigravity surface and version) in an issue, so `docs/compatibility.md` can be updated.
