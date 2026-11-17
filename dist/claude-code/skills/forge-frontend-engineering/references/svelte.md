# Svelte and SvelteKit

## Identification

- `svelte` in `package.json`; `@sveltejs/kit` for SvelteKit. `*.svelte` components, `svelte.config.js`.
- SvelteKit routing: `src/routes/` with `+page.svelte`, `+page.ts` / `+page.server.ts`, `+layout.svelte`, `+server.ts`, `+error.svelte`. Hooks in `src/hooks.server.ts` / `src/hooks.client.ts`. Shared code in `src/lib/` (`$lib`), server-only code in `src/lib/server/`.
- **Svelte 5 runes** (`$state`, `$derived`, `$effect`, `$props`) vs. Svelte 4 syntax (`let` reactivity, `$:` statements, `export let`). Check the installed version and the style of the file; do not mix styles inside a component.
- Adapter in `svelte.config.js` (`adapter-auto`, `adapter-node`, `adapter-static`, ...) determines the rendering target.

## Architecture practices

- Load data in `load` functions. `+page.server.ts` / `+layout.server.ts` for anything needing secrets, DB access or cookies; universal `+page.ts` only for data that is safe to fetch from both server and browser. Use the `fetch` passed to `load` so requests are deduplicated and credentials are forwarded correctly.
- Mutations via form actions (`export const actions`) with `use:enhance` for progressive enhancement, or `+server.ts` endpoints, matching existing code.
- Use `invalidate` / `invalidateAll` after client-side mutations that change loaded data.
- Shared state: Svelte stores (`writable`, `derived`) or rune-based modules, as the project does. Do not keep per-user state in module-level variables on the server: it is shared across requests.
- Browser-only code runs in `onMount` or behind the `browser` flag from `$app/environment`.
- Use `+error.svelte` and `error()` / `redirect()` helpers from `@sveltejs/kit` for states and navigation.

## Coding standards

- Svelte 5: `$derived` for computed values; `$effect` only for side effects, with cleanup returned. Do not write state inside `$effect` that it also reads.
- Svelte 4: avoid reactive statements (`$:`) with hidden dependencies; keep them simple and ordered.
- Keyed `{#each items as item (item.id)}` blocks for lists that change.
- Unsubscribe manual store subscriptions; prefer the `$store` auto-subscription syntax in components.
- Type `load` functions and props with generated `./$types` (`PageLoad`, `PageServerLoad`, `PageData`).

## Common security issues

- `{@html ...}` with untrusted content. Render as text or sanitize with the project's existing sanitizer.
- Importing from `$env/static/private` or `$env/dynamic/private`, or `$lib/server`, is blocked in client code by SvelteKit; never work around it. `PUBLIC_*` env vars are shipped to the browser.
- Form actions and `+server.ts` endpoints are public: validate input and check authorization (e.g. from `locals` set in `hooks.server.ts`) inside each one.
- `redirect()` to a user-supplied URL is an open redirect; allow only same-origin paths.
- Returning whole DB records from server `load` serializes every field to the client; select only what the page needs.

## Testing tools

- Unit/component: **Vitest** with `@testing-library/svelte` when present.
- E2E: **Playwright** (the SvelteKit scaffolder offers it) or Cypress, via `forge-browser-qa`.
- `svelte-check` for type and template diagnostics.

## Lint and format

- ESLint with `eslint-plugin-svelte`, Prettier with `prettier-plugin-svelte`, when configured.

## Build and validation commands (if configured)

Discover the real scripts in `package.json` / `.forge/context.json` first. Typical ones:
- `npm run dev`, `npm run build`, `npm run preview`, `npm run check` (`svelte-kit sync && svelte-check`), `npm run lint`, `npm run test` / `npm run test:unit`.

## Official docs

- Svelte: https://svelte.dev/docs/svelte
- SvelteKit: https://svelte.dev/docs/kit
