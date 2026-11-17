# React and Next.js

## Identification

- `react` in `package.json` dependencies; `next` for Next.js; `vite` + `@vitejs/plugin-react` for a Vite SPA.
- Next.js **App Router**: an `app/` (or `src/app/`) directory with `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `route.ts`.
- Next.js **Pages Router**: a `pages/` directory with `_app.tsx`, `_document.tsx`, `pages/api/*`. Both routers can coexist; check which one owns the route you are changing.
- `next.config.(js|mjs|ts)`, `"use client"` / `"use server"` directives, `middleware.ts` at the project or `src/` root.

## Architecture practices

- **Server vs. client components (App Router):** components are server components by default. Add `"use client"` only at the smallest leaf that needs state, effects, event handlers or browser APIs. Never import server-only modules (DB clients, secrets) into a client component; use the `server-only` package if the project already does.
- **Data fetching (App Router):** fetch in server components or route handlers; mutations via Server Actions or route handlers, following the existing pattern. Understand the project's caching settings (`fetch` cache options, `revalidate`, `revalidatePath`/`revalidateTag`) before changing them; defaults differ between Next.js major versions, so read the installed version in `package.json`.
- **Data fetching (Pages Router):** `getServerSideProps`, `getStaticProps`, `getStaticPaths`, or client-side fetching through the project's cache library.
- **Client data:** if TanStack Query, SWR, Apollo or RTK Query is present, use it; keys must include every variable the request depends on.
- Use `loading.tsx` / `error.tsx` / `not-found.tsx` (App Router) or the existing pattern for states.
- Use `next/link`, `next/image`, `next/font` and the Metadata API when the project already uses them.

## Coding standards and hooks pitfalls

- Follow the Rules of Hooks: call hooks at the top level, never conditionally or in loops.
- Effect dependency arrays must list every reactive value used; do not silence `react-hooks/exhaustive-deps`. Return a cleanup for subscriptions, timers and fetches (`AbortController`).
- Do not use effects to compute derived state; compute it during render, with `useMemo` only when measured as expensive.
- Stable, unique `key` props from data IDs, never array indexes for reorderable lists.
- Do not mutate state; create new objects and arrays. Use functional updates when the next state depends on the previous one.
- Context changes re-render all consumers; keep high-frequency values out of broad contexts.
- In development, React Strict Mode runs effects twice; code must tolerate it rather than disable Strict Mode.

## Common security issues

- `dangerouslySetInnerHTML` with unsanitized content. Use the existing sanitizer or render as text.
- `href={userValue}` allowing `javascript:` URLs. Validate the scheme.
- Secrets leaked through `NEXT_PUBLIC_*` (or `VITE_*`) variables: these are inlined into the client bundle.
- Server Actions and route handlers are public HTTP endpoints: validate input and check authorization inside each one; middleware alone is not sufficient.
- Passing whole server objects (with private fields) as props to client components serializes them to the browser.
- Open redirects via `redirect()` or `router.push()` with an unvalidated `callbackUrl`/`next` parameter.

## Testing tools

- Unit/component: **Vitest** or **Jest** with **React Testing Library** (`@testing-library/react`, `@testing-library/user-event`). Query with `getByRole`/`getByLabelText`; use `findBy*` for async UI.
- API mocking: MSW when present.
- E2E: **Playwright** or Cypress (handled with `forge-browser-qa`). Async server components are better covered by E2E tests than unit tests.

## Lint and format

- ESLint (`eslint-config-next` / `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y` when configured), or Biome. Prettier when configured.

## Build and validation commands (if configured)

Discover the real scripts in `package.json` / `.forge/context.json` first. Typical ones:
- `npm run lint`, `npm run typecheck` or `npx tsc --noEmit`, `npm test`, `npm run build` (`next build` also type-checks and lints by default unless the config disables it), `npm run test:e2e`.
- Use the package manager the lockfile indicates (npm, pnpm, yarn, bun).

## Official docs

- React: https://react.dev
- Next.js: https://nextjs.org/docs
- Testing Library: https://testing-library.com/docs/react-testing-library/intro/
