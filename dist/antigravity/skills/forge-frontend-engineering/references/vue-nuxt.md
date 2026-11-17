# Vue and Nuxt

## Identification

- `vue` in `package.json`; `nuxt` for Nuxt. `*.vue` single-file components.
- Nuxt: `nuxt.config.(ts|js)`, `pages/`, `layouts/`, `components/`, `composables/`, `server/api/`, `middleware/`, `app.vue`. Nuxt 4 projects may place these under `app/`; check the installed version.
- Vue SPA: `vite.config.*` with `@vitejs/plugin-vue`, `src/router/` (`vue-router`), `src/stores/` (Pinia) or `src/store/` (Vuex).
- API style: `<script setup>` (Composition API) vs. `export default { data(), methods }` (Options API). Match what the file and its neighbors use.

## Architecture practices

- Components: props down, events up (`defineProps`, `defineEmits`). Use `v-model` with `defineModel` or the `modelValue`/`update:modelValue` pair consistently with existing components.
- Extract reusable logic into composables (`useX`) in the project's composables folder.
- State: Pinia stores for shared client state, following the existing store style (setup vs. options stores). Do not add Vuex to a Pinia project or vice versa.
- Nuxt data fetching: `useFetch` / `useAsyncData` for SSR-safe data with a unique key; `$fetch` for event-triggered calls. Fetching with plain `fetch` in `setup` during SSR causes double requests and hydration issues.
- Nuxt auto-imports components and composables; follow the folder conventions instead of manual imports where the project relies on them.
- Client-only code: `<ClientOnly>`, `onMounted`, or `.client.vue` / `.client.ts` plugins.
- Route guards: Nuxt `middleware/` or `vue-router` `beforeEach`, as the project already does.

## Coding standards

- Do not destructure `reactive()` objects or props without `toRefs` / reactive props destructure support in the installed version; reactivity is lost.
- `computed` for derived state; `watch` only for side effects. Clean up timers and listeners in `onUnmounted`.
- `:key` on every `v-for`, using stable IDs. Do not combine `v-if` and `v-for` on the same element.
- Do not mutate props; emit an event or use a local copy.
- Type props and emits with TypeScript generics when the project uses TS.

## Common security issues

- `v-html` with untrusted content. Render as text or sanitize with the project's existing sanitizer.
- Binding user input to `:href` / `:src` without scheme validation (`javascript:` URLs).
- Secrets in `runtimeConfig.public` (Nuxt) or `VITE_*` variables are shipped to the browser. Server secrets go in private `runtimeConfig` and are read only in `server/`.
- Nuxt `server/api` handlers are public endpoints: validate input and enforce authorization in each.
- User-controlled template compilation (runtime templates) is code execution; never compile templates from user input.

## Testing tools

- Unit/component: **Vitest** with **@vue/test-utils** or **@testing-library/vue**; `@nuxt/test-utils` for Nuxt-aware tests.
- E2E: Playwright or Cypress (via `forge-browser-qa`).

## Lint and format

- ESLint with `eslint-plugin-vue` (or `@nuxt/eslint`), Prettier when configured. `vue-tsc` for type-checking SFCs.

## Build and validation commands (if configured)

Discover the real scripts in `package.json` / `.forge/context.json` first. Typical ones:
- Vue + Vite: `npm run dev`, `npm run build`, `npm run type-check` (often `vue-tsc --noEmit`), `npm run lint`, `npm run test:unit`.
- Nuxt: `npm run dev` (`nuxi dev`), `npm run build` (`nuxi build`), `npx nuxi typecheck` when the project supports it, `npm run generate` for static output.

## Official docs

- Vue: https://vuejs.org/guide/
- Nuxt: https://nuxt.com/docs
- Pinia: https://pinia.vuejs.org
- Vue Test Utils: https://test-utils.vuejs.org
