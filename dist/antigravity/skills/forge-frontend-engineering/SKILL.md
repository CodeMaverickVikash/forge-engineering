---
name: forge-frontend-engineering
description: Framework-agnostic web frontend engineering covering stack discovery, component reuse, data fetching and caching, UI states, forms, routing, SSR/CSR, type safety, performance, accessibility and XSS-safe rendering. Use when implementing or fixing web UI in any framework.
disable-slash-command: true
---


# Web Frontend Engineering

Goal: ship UI changes that look and behave as if the existing team wrote them, work in every state, and stay safe, accessible and fast. Discover first, then build with what the project already has.

## 1. Discover the stack before writing code

Read `.forge/context.json` first, then confirm in code. Record each answer with a file path:

- [ ] **Framework and rendering model:** React/Next.js, Vue/Nuxt, Angular, Svelte/SvelteKit, other. SPA, SSR, SSG or mixed.
- [ ] **Router:** file-based (`app/`, `pages/`, `routes/`) or config-based (route table). Where guards, layouts and loaders live.
- [ ] **State:** local component state, context/provide-inject, a store (Redux, Zustand, Pinia, NgRx, Svelte stores), server-state cache (TanStack Query, SWR, Apollo, RTK Query).
- [ ] **Styling:** CSS Modules, Tailwind, CSS-in-JS, SCSS, component-scoped styles. Where theme tokens live.
- [ ] **Component library / design system:** shadcn/ui, MUI, Chakra, Angular Material, an in-house `components/ui` folder, Storybook.
- [ ] **Forms and validation:** form library and schema library already in use.
- [ ] **API layer:** the existing fetch wrapper or generated client, auth header handling, error mapping.
- [ ] **Commands:** dev, build, typecheck, lint, unit test, E2E, from `.forge/context.json`. Never assume one exists.

Then open the matching reference:

| Stack | Read |
|---|---|
| React, Next.js (App or Pages Router) | [references/react-nextjs.md](references/react-nextjs.md) when the stack is React or Next.js |
| Vue, Nuxt | [references/vue-nuxt.md](references/vue-nuxt.md) when the stack is Vue or Nuxt |
| Angular | [references/angular.md](references/angular.md) when the stack is Angular |
| Svelte, SvelteKit | [references/svelte.md](references/svelte.md) when the stack is Svelte or SvelteKit |

## 2. Reuse before you build

1. Find an existing screen similar to the one you are changing and copy its structure, naming and file layout.
2. Search the component folder before creating a component. Extend an existing one with a prop only when the change is small and backward compatible.
3. Use design tokens (colors, spacing, typography) instead of literal values. No one-off colors or magic pixel values.
4. Do not add a UI library, icon set, state library or CSS approach the project does not already use.

## 3. Data fetching and caching

- Use the project's existing data layer. If a server-state cache exists, every new read goes through it with a stable, specific cache key.
- After a mutation, invalidate or update exactly the affected cache entries. Do not refetch the world.
- Cancel or ignore stale responses (abort signals, cache libraries, or a guard on unmount) to avoid race conditions.
- Avoid request waterfalls: start independent requests in parallel; fetch on the server or in route loaders when the framework supports it.
- Never put secrets in client code. Anything bundled for the browser is public, including env vars exposed by the build tool's public prefix.

## 4. The four UI states (every data-driven view)

| State | Requirement |
|---|---|
| Loading | Skeleton or spinner matching existing patterns; no layout shift when data arrives |
| Empty | Explanatory message and the next action, not a blank area |
| Error | Human-readable message, retry where it makes sense, no raw stack traces or server messages |
| Success | The real data, including long text, many items and missing optional fields |

Also handle partial states: disabled buttons while submitting, optimistic updates with rollback on failure.

## 5. Forms and validation

- Use the existing form and schema libraries. Share the schema with the backend when the project already does.
- Validate on the client for UX and rely on the server for truth. Show server-side field errors next to their fields.
- Every input has a programmatic label. Errors are announced (`aria-describedby`, `aria-invalid`) and focus moves to the first invalid field on submit.
- Prevent double submission. Preserve user input on error.

## 6. Routing, SSR and CSR

- Add routes the way existing routes are added. Protected routes use the existing guard or middleware, and the server still enforces authorization.
- Code that touches `window`, `document` or `localStorage` must run only on the client in SSR frameworks. Avoid hydration mismatches: no `Date.now()`, random values or locale-dependent formatting that differs between server and client render.
- Keep server-only code (DB clients, secrets) out of client bundles using the framework's server-only boundaries.
- Set page titles and metadata the way the project already does.

## 7. Type safety

- Type props, API responses and store state. No `any` / untyped escapes without a comment explaining why.
- Prefer generated or shared API types over hand-written duplicates. Narrow unknown external data at the boundary (schema parse) before use.

## 8. Performance basics

- Lazy-load routes and heavy components the way the project already splits code. Check that a new import does not pull a large library into a shared bundle.
- Images: correct dimensions, modern formats via the framework's image component when present, `loading="lazy"` below the fold.
- Long lists: virtualize or paginate. Avoid re-rendering whole lists on every keystroke; debounce search input.
- Do not claim a performance improvement without a measurement (see `forge-performance-engineering`).

## 9. Accessibility by default

Semantic elements first (`button`, `a`, `label`, `nav`, headings in order). Everything works with the keyboard and has a visible focus style. Dialogs trap and restore focus. Images have meaningful `alt` or `alt=""` when decorative. Color is never the only signal. For deeper audits, load `forge-accessibility-engineering`.

## 10. Security

- **XSS sinks:** `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `dangerouslySetInnerHTML`, `v-html`, `{@html}`, Angular `bypassSecurityTrust*`. Avoid them. If rich HTML is unavoidable, sanitize with the project's existing sanitizer and note it in the report.
- **URL injection:** never put user-controlled values into `href`, `src` or redirects without allowing only `http:`/`https:` (block `javascript:` and `data:`). Validate post-login redirect targets against same-origin paths. Encode query parameters.
- **Tokens:** do not store long-lived auth tokens in `localStorage` or `sessionStorage` when the project can use httpOnly cookies. Follow the existing auth pattern; do not invent a new one.
- `target="_blank"` links to external sites use `rel="noopener noreferrer"`. Never log tokens or PII to the console.

## 11. Testing expectations

- Unit/component tests at the project's existing level, querying by role and label, asserting user-visible behavior, not implementation details.
- Cover the four states and validation errors for changed components.
- Every browser-visible change is handed to browser QA (Playwright plus DevTools). Your own checks do not make it browser-verified.

## Anti-patterns

- Building a new component when an equivalent exists; copying a component instead of reusing it.
- Fetching in effects without cleanup or cancellation; storing server data in a global store and a cache at the same time.
- `useEffect`/watchers used to sync derived state that can simply be computed.
- Silencing type errors, lint rules or hydration warnings instead of fixing the cause.
- `div` with click handlers instead of buttons; removing focus outlines.
- Hardcoded API URLs, colors or copy that the project keeps in config, tokens or i18n files.

## Output

Return, in your report: the stack facts you confirmed (with paths), components reused vs. created, states covered (loading, empty, error, success), any XSS sink or token handling touched and how it is made safe, commands run with results, and the pages and journeys browser QA must verify.
