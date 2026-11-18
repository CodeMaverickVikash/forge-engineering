### FORGE Execution Report

**Task**
Analyze the project and suggest improvements. This was analysis only, so I made no code changes. Size: the codebase is about 70 lines, so I ran a single wave of two specialists.

**Enhanced specification**
N/A. For an analysis request the deliverable is findings ranked by impact, each with file evidence and a minimal fix.

**Project understanding**
The repo is a monorepo of three independent units with no shared layer. It has no commits yet and 27 staged files. Nearly everything is a placeholder.
- `apps/web`: Next.js 15.1 / React 19, Prisma, Auth.js 5 beta, Stripe, Vitest and Playwright (pnpm).
- `services/orders`: FastAPI, SQLAlchemy, Alembic, pytest and Ruff (uv).
- `services/inventory`: Go 1.23, chi, pgx and golangci-lint.

There is no `.gitignore`, no root manifest or README, and no docs or ADRs.

**Specialists involved**
- `forge-architect` ran and returned a report.
- `forge-security-engineer` ran and returned a report.
- Browser QA, the code reviewer and the engineers were not needed, because nothing changed.

**Skills & capabilities**
- I ran the stack detector (`.forge/context.json`).
- I did not run skill discovery, because there was no capability gap.
- Tools:
  - `pnpm audit` failed on the empty lockfile.
  - `govulncheck`, `pip-audit` and `gitleaks` are not installed, so no dependency audit or secret scan ran.

**Implementation**
N/A. Nothing was implemented. The only file I wrote is the stub `.forge/tasks/analyze-project/report.md`, and `.forge/` is git-ignored.

**QA and verification**

| Gate | Result |
|---|---|
| Findings spot-checked by me | Confirmed. `.env.local` is staged and there is no `.gitignore`. All three lockfiles are 0 bytes. There is no ESLint config and no `app/layout.tsx`. `alembic.ini` is empty. |
| Tests, typecheck, lint, build | Not run. Every test is a placeholder and no unit has a working toolchain, so a run would prove nothing. |
| Dependency and secret scan | Unavailable (see Skills & capabilities). |
| Diff review | N/A, since there is no diff. |

**Browser QA**
N/A. There is no browser-visible change, and the dashboard is a stub.

**Issues**
Ranked by impact. Items 1 to 4 should go in one PR.

1. **High: a secret file is staged.**
   - `apps/web/.env.local` is in the index and nothing ignores it. It holds `STRIPE_SECRET_KEY`.
   - The security agent says the value looks like a real Stripe secret key. I told it not to read values, and it reported only a prefix.
   - Fix: run `git rm --cached apps/web/.env.local`. Add a root `.gitignore` with `.env*` (except `.env.example`), `node_modules`, `.next`, `.venv` and `__pycache__`. Rotate the key if it is live. There are no commits yet, so history is clean.
2. **High: CI will never run.**
   - `apps/web/.github/workflows/ci.yml` sits in a subfolder, and GitHub only reads the root `.github/workflows`.
   - The job only checks out code. It has no install, lint, test or build steps, no `permissions:` block, and an unpinned `checkout@v4`.
   - Fix: move it to the repo root and add path-filtered jobs for the three units. Set `permissions: contents: read`, trigger on `push` to main plus `pull_request`, and use frozen-lockfile installs.
3. **High: all three lockfiles are empty.**
   - `pnpm-lock.yaml`, `uv.lock` and `go.sum` are all 0 bytes. Builds are unpinned and the dependency audit can't run.
   - `pyproject.toml:4-8` also uses floating `>=` ranges.
   - Fix: regenerate with `pnpm install`, `uv lock` and `go mod tidy`, then bound the Python ranges.
4. **High: tests prove nothing.**
   - `card.test.ts:2` asserts `1===1`, `test_health.py:2` asserts `True`, `items_test.go:5` has an empty body, and the Playwright config is `defineConfig({})`.
   - Fix: add real `/health` endpoints and test them. Hold off on E2E specs until a page does something.
5. **Medium: the web app can't build or lint.**
   - `app/layout.tsx` is missing and there is no ESLint config. `package.json` has no `@types/*`, `postcss` or `autoprefixer`, and `tsconfig.json` is minimal.
   - `tailwind.config.ts` doesn't scan `components/`, so classes in `Card.tsx` would be purged.
6. **Medium: no database ownership rule.**
   - Prisma and Alembic both migrate the same Postgres, and `alembic.ini` is empty with no `env.py`.
   - Fix: write a short ADR giving each service its own schema or database, with no cross-service queries. Add per-service `DATABASE_URL` entries.
7. **Medium: auth libraries and versions.**
   - `next-auth@5.0.0-beta.25` is a pre-release auth library.
   - `.env.example` uses `NEXTAUTH_SECRET`. Check the variable name against the Auth.js v5 docs.
   - Next 15.1.0 is old. The security agent recalled advisories in that line but did not verify them. Check and move to the latest patched 15.x.
8. **Medium-low: no cross-service contract.** Commit the FastAPI-generated OpenAPI spec and a short inventory spec. Skip code generation for now.
9. **Low: Docker and Go/Python config.**
   - The orders `Dockerfile` is one `FROM` line. It needs a digest pin, a non-root `USER`, install/run steps and a `.dockerignore`.
   - `go.mod` requires chi and pgx, but nothing imports them yet. `.golangci.yml` enables only `govet`.
   - Ruff has no `select` rules.
10. **Low: docs.** Add a root README with one build/test/lint command per unit.

**Design guidance for later** (these are not present vulnerabilities, since no handlers exist):
- Decide how the web session reaches the two services, with a deny-by-default router and owner-scoped lookups.
- Add security headers and CORS/rate-limit/body-size scaffolding.
- Stripe webhook: read the raw body, call `constructEvent`, store `event.id` for idempotency, and add `STRIPE_WEBHOOK_SECRET` to `.env.example`.

Not recommended yet: Nx or Turborepo, a shared-types package, queues, Kubernetes. They are premature at this size.

**Assumptions**
- The project is an early skeleton, so I treated missing code as guidance rather than defects.
- The Stripe key may be live or test; this is unknown.

**Remaining work**
- Confirm whether the Stripe key is live, and rotate it if so.
- Verify the Next.js advisories once a working lockfile exists.
- On approval, I can implement items 1 to 5 as a single change. That would be sized M and would run engineers, browser QA and a review.

**Git status**
27 files are staged (`A`) from before this session, and I added no tracked changes. `.forge/` is git-ignored. No commit, push, or pull request was created.
