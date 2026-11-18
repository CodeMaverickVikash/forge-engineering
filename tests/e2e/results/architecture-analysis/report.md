### FORGE Execution Report

**Task:** Analyze the project and suggest improvements. Analysis-only: no code was changed. Size: analysis of a ~72-line, 3-unit repo, so one wave of 2 specialists.

**Enhanced specification:** N/A. Findings are ranked by impact with `file:line` evidence. Nothing was built.

**Project understanding:**
- `apps/web`: Next.js 15.1 / React 19, Tailwind, Prisma (Postgres), next-auth `5.0.0-beta.25`, Stripe, Vitest and Playwright (pnpm).
- `services/orders`: FastAPI, SQLAlchemy, Alembic, pytest and ruff (uv).
- `services/inventory`: Go 1.23, chi and pgx.
- The whole repo is scaffolding. There are no routes, handlers, models or real tests, and I found no docs, ADRs or working CI.
- The git repo has no commits. All 27 files are staged.

**Specialists involved:** `forge-architect` and `forge-security-engineer`, run in parallel. I read all files myself first and spot-checked their key claims: `.env.local` staged and not ignored, no `.gitignore` at the repo root, and the three lockfiles at 0 bytes.

**Skills & capabilities:** Stack detector (`detect-stack.mjs`) and local discovery only. No online skill search and nothing installed.

**Implementation:** N/A. No files in the project were modified. Only `.forge/` (self-gitignored) was created.

**QA and verification:**

| Gate | Result |
|---|---|
| Stack detection | PASSED |
| Spot-check of specialist claims (git status, ignore status, empty lockfiles) | PASSED |
| EOL / unrelated-change check | PASSED (27 files, line endings unchanged) |
| Build / lint / unit tests | NOT RUN (analysis-only; no dependencies installed, lockfiles empty) |
| `pnpm audit --prod` | FAILED (empty lockfile) |
| `pip-audit`, `govulncheck`, `gitleaks` | UNAVAILABLE (not installed) |

**Browser QA:** N/A. No browser-visible change, and no app can be built yet.

**Issues (ranked findings and suggested improvements):**
1. **HIGH: `apps/web/.env.local` is staged in git and nothing ignores it.**
   - The repo has no `.gitignore` at the root or in `apps/web`.
   - Its only key is `STRIPE_SECRET_KEY`; I did not read the value. The security agent did run a `sed` command that read the file but printed only the key name. Neither of us checked whether the value is a real key or a placeholder.
   - Fix: run `git rm --cached apps/web/.env.local`, add a root `.gitignore` (`.env*` with `!.env.example`, `node_modules`, `.next`, `.venv`), and rotate the Stripe key if it is real.
2. **HIGH: CI never runs.**
   - `apps/web/.github/workflows/ci.yml:6` sits under `apps/web/`, but GitHub only reads workflows from the repo-root `.github/`.
   - It only does checkout (no install, lint, test or build), has no `permissions:` block, and covers neither Go nor Python.
   - Fix: move it to the root and add path-filtered jobs per unit, with least-privilege permissions, a dependency audit and secret scanning.
3. **HIGH: all three lockfiles are 0 bytes** (`pnpm-lock.yaml`, `go.sum`, `uv.lock`).
   - Installs are not reproducible, and `pnpm install --frozen-lockfile` will fail.
   - Fix: run `pnpm install`, `go mod tidy` and `uv lock`.
4. **HIGH (latent): no authn/authz anywhere.**
   - `dashboard/page.tsx:1` has no session check, and there is no `middleware.ts` or `auth.ts`.
   - `orders/app/main.py:2` is a bare `FastAPI()` (it also exposes `/docs` by default), and `inventory/main.go:3` is empty.
   - Nothing is exploitable today. Any route added will be anonymous unless deny-by-default auth is built first, along with ownership-scoped queries.
5. **MEDIUM: service boundaries and contracts are undefined.**
   - All three units are Postgres-bound, but nothing says who owns which tables.
   - Prisma Migrate and Alembic would both want to own migrations, and there is no API contract between the services.
   - Fix: write an ADR covering DB-per-service vs schema-per-service, migration ownership, and OpenAPI as the contract.
6. **MEDIUM: the web app probably won't build.**
   - Missing: `layout.tsx` and `globals.css`.
   - `tailwind.config.ts:1` globs only `app/**/*.tsx`, so `components/Card.tsx` is never scanned.
   - The Prisma schema has no `generator` block, and `tsconfig.json` lacks `include` and the Next plugin.
   - `playwright.config.ts:2` is `{}`, with no `webServer`, `baseURL` or `testDir`.
   - No ESLint config exists for `next lint`.
7. **MEDIUM: tests are placeholders.** `card.test.ts:2` asserts `1 === 1`, `test_health.py:2` asserts `True`, and `items_test.go:5` is empty. They pass but prove nothing. Replace them with a `Card` render test, a FastAPI `/health` test with `TestClient` (add the endpoint), and an `httptest` handler test.
8. **MEDIUM: the Dockerfile is not usable.**
   - `services/orders/Dockerfile:1` is only `FROM python:3.12-slim`: no install, `CMD` or non-root `USER`, and the base image is not digest-pinned. There is also no `.dockerignore`.
   - Inventory and web have no Dockerfile, and there is no compose file with Postgres.
   - Fix: `uv sync --frozen`, a non-root user, a `uvicorn` `CMD`, and a compose file.
9. **MEDIUM: dependency risks.**
   - `next-auth@5.0.0-beta.25` is a pre-release in a payments app. `NEXTAUTH_SECRET` (`.env.example:2`) is the v4 name, since v5 reads `AUTH_SECRET`.
   - `next@15.1.0` is likely behind published security patches, which the architect did not verify.
   - Python deps are floor ranges (`>=`) with an empty lock.
10. **LOW/MEDIUM: no security headers.**
   - `next.config.ts:1` is empty. Add a CSP, HSTS, `X-Content-Type-Options`, `frame-ancestors`, `Referrer-Policy` and `poweredByHeader: false`.
   - Alembic is also unconfigured: `alembic.ini` is empty, there is no `env.py`, and `0001_init.py` has no revision or `upgrade`/`downgrade`.
11. **LOW: no README, ADRs, or per-service env examples.**
12. **For later:** when adding Stripe, verify webhooks on the raw body with `constructEvent` and handle events idempotently. Add CORS without `*` plus credentials, and rate limiting.

**Assumptions:**
- This is an early scaffold, so the findings are about missing foundations rather than bugs.
- I assumed the three units may eventually share one Postgres instance, which needs the owner's decision.

**Remaining work:**
- Not verified: CVE status of Next 15.1.0 and next-auth beta.25, whether the `.env.local` value is a real key, and whether Vitest would pick up the Playwright specs.
- Re-audit once routes and auth exist.
- If you want fixes applied, I'd suggest starting with items 1–3 (`.gitignore`, root CI, lockfiles). They are small and low-risk.

**Git status:** Unchanged by this analysis: 27 files staged (`A`), no commits. The only addition is the self-gitignored `.forge/` folder, which holds the saved report at `.forge/tasks/analyze-improve/report.md` (a short summary rather than this full text).

No commit, push, or pull request was created.
