# Node.js / TypeScript backends (Express, NestJS, Fastify, Hono)

## Identification

- `package.json` dependencies: `express`, `@nestjs/core`, `fastify`, `hono`. `tsconfig.json` means TypeScript.
- Package manager from the lockfile: `package-lock.json` (npm), `pnpm-lock.yaml` (pnpm), `yarn.lock` (Yarn), `bun.lockb` / `bun.lock` (Bun). Use only that one.
- Module system: `"type": "module"` in `package.json` means ESM; otherwise CommonJS. Match it in new files.
- Runtime target: `engines.node`, `.nvmrc` or `.node-version`.

## Architecture practices

- **Express**: routers per resource, middleware for auth and validation, a single error-handling middleware (4 arguments) registered last. In Express 4, async handler rejections are not caught automatically; follow the project's wrapper or helper. Express 5 forwards rejected promises to the error handler.
- **NestJS**: modules, controllers, providers with constructor DI. Validation via `ValidationPipe` with DTO classes (`class-validator`) or the project's chosen pipe. Guards for auth, interceptors for cross-cutting concerns, exception filters for the error shape.
- **Fastify**: plugins and encapsulation; JSON Schema on routes for validation and serialization; `fastify.decorate` for shared services; hooks (`onRequest`, `preHandler`) for auth.
- **Hono**: lightweight routers, middleware via `app.use`, validators such as `@hono/zod-validator` when present. Often deployed on edge runtimes, so check which Node APIs are available.
- Keep services framework-free so they are unit-testable without spinning up the server.
- Validate with the library already in use (zod, joi, yup, class-validator, TypeBox, Fastify JSON Schema). Do not add a second one.

## Coding standards

- `async`/`await` throughout; never leave a promise floating. Handle `unhandledRejection` the way the project already does.
- Type request and response bodies; avoid `any`. Derive types from the schema (`z.infer`) when the project does.
- Return early on validation failures. Use the project's error classes, not ad hoc `res.status(500).send()`.
- Do not block the event loop: no sync crypto, `fs.*Sync` or heavy JSON work in request paths.
- Read config through the existing config module, not scattered `process.env` reads.

## Common security issues

- Prototype pollution through deep merges of request bodies; mass assignment by spreading `req.body` into ORM `create` or `update`.
- NoSQL injection: passing raw query objects (`{ "$gt": "" }`) from the request to MongoDB queries.
- Missing `helmet`/security headers, permissive CORS (`origin: '*'` with credentials), no rate limiting on auth endpoints (use what the project has).
- JWT: always verify signature and algorithm; never `decode` instead of `verify`.
- Path traversal in file downloads; SSRF in URL-fetching features; ReDoS from user-supplied regex.
- `child_process.exec` with interpolated input; prefer `execFile` with an argument array.

## Testing tools

- Runners: Jest, Vitest, Mocha, or `node:test`. Use the one configured.
- HTTP: `supertest` for Express/Nest/Fastify apps; `fastify.inject()` for Fastify; `app.request()` for Hono.
- NestJS: `Test.createTestingModule` with provider overrides.
- Databases: the project's test container or test DB setup. Never point tests at shared environments.

## Lint / format

- ESLint (`eslint.config.*` or `.eslintrc*`), Biome (`biome.json`), Prettier (`.prettierrc*`). Run only what is configured.
- Typecheck with `tsc --noEmit` when there is no dedicated script.

## Build / validation commands (if configured)

Prefer the scripts in `package.json`, invoked through the detected package manager:
```bash
npm test              # or: pnpm test / yarn test / bun test
npm run lint
npm run typecheck     # if the script exists; otherwise npx tsc --noEmit
npm run build
```
Use `npm ci` (or the manager's frozen-lockfile install) only when dependencies are missing.

## Official docs

- Node.js: https://nodejs.org/docs/latest/api/
- Express: https://expressjs.com/
- NestJS: https://docs.nestjs.com/
- Fastify: https://fastify.dev/docs/latest/
- Hono: https://hono.dev/docs/
