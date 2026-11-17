# FORGE test fixtures

| Fixture | Stack | Runnable here | Purpose |
|---|---|---|---|
| `nextjs-app` | TypeScript, Next.js 15, Prisma, NextAuth, Stripe, Vitest, Playwright | detection only (deps not installed) | Detector and routing |
| `python-fastapi` | Python, FastAPI, SQLAlchemy, Alembic, pytest, Ruff (uv) | detection only | Detector and routing |
| `expo-app` | React Native, Expo 52, Clerk, Jest | detection only | Detector and routing |
| `spring-boot-app` | Java 17, Spring Boot 3, JPA, Flyway, Spring Security | detection only | Detector and routing |
| `go-service` | Go 1.23, chi, pgx, golangci-lint | detection only | Detector and routing |
| `laravel-app` | PHP 8.2, Laravel 11, Sanctum, Stripe, PHPUnit, Pint, Larastan | detection only | Detector and routing |
| `web-tasks` | Node (zero deps) web app + JSON API | **yes** (`npm start`, `npm test`) | End-to-end `/forge` scenarios incl. browser QA |

## Seeded defects in `web-tasks` (answer key, keep out of the fixture itself)

E2E scenarios copy the fixture to a temp directory, so this file is never visible to FORGE during a run.

1. **Logic bug:** the "N tasks remaining" counter counts *completed* tasks (`public/app.js`, `render`). Expected: the open count (2 of 3 seeded).
2. **Stored XSS:** task titles are rendered via `innerHTML` (`public/app.js`).
3. **Input validation:** `POST /api/tasks` accepts empty, whitespace-only and unbounded titles (`server.mjs`).
4. **Missing UX states:** no loading/error state when the API fails; the delete button has no accessible name ("x").
