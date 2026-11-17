# Angular

## Identification

- `@angular/core` in `package.json`, `angular.json` at the workspace root, `*.component.ts` / `*.service.ts` / `*.module.ts` files.
- **Standalone vs. NgModule:** `standalone: true` (the default in recent versions) and `bootstrapApplication` in `main.ts`, or `AppModule` with `declarations`. Follow the style of the feature you are changing.
- Signals (`signal`, `computed`, `input()`, `output()`) vs. decorators (`@Input`, `@Output`) and RxJS-heavy code. Check the installed major version before using newer APIs.
- Control flow: `@if` / `@for` blocks vs. `*ngIf` / `*ngFor`. Match the surrounding templates.
- SSR: `@angular/ssr` (or older `@nguniversal/*`), `server.ts`.

## Architecture practices

- Smart (container) components fetch and orchestrate; presentational components take inputs and emit outputs.
- Data access in injectable services using `HttpClient`. Cross-cutting concerns (auth headers, error mapping) belong in HTTP interceptors that already exist.
- State: services with signals or `BehaviorSubject`, or NgRx / other store when present. Do not introduce a store library.
- Routing: lazy-load features with `loadComponent` / `loadChildren`. Guards (`canActivate`, functional guards) and resolvers follow existing patterns; the server still enforces authorization.
- Forms: Reactive Forms (`FormGroup`, `FormControl`, `Validators`) or template-driven forms, consistent with the feature. Use typed forms where the project does.
- Use `ChangeDetectionStrategy.OnPush` when the project does; then do not mutate inputs in place.

## Coding standards

- Unsubscribe from long-lived observables: `async` pipe, `takeUntilDestroyed()`, or the project's existing pattern. Avoid nested `subscribe` calls; compose with RxJS operators (`switchMap`, `combineLatest`).
- `track` in `@for` (or `trackBy` with `*ngFor`) for lists.
- Keep logic out of templates; no heavy function calls in bindings.
- Use the Angular CLI schematics (`ng generate component ...`) only if that matches how the project creates files; otherwise mirror existing files by hand.
- Strict TypeScript and `strictTemplates` when enabled; do not loosen them.

## Common security issues

- Angular sanitizes `[innerHTML]` and URL bindings by default. `DomSanitizer.bypassSecurityTrustHtml/Url/ResourceUrl/Script/Style` disables that protection; never call it on user-controlled data.
- Direct DOM access via `ElementRef.nativeElement.innerHTML` or `document` bypasses sanitization.
- Secrets in `environment.ts` files are bundled into the client.
- `HttpClient` XSRF support only works if the backend issues the expected cookie and header; do not disable it.
- Route guards are UX only; protected data must be authorized server-side.

## Testing tools

- Unit: Karma + Jasmine (classic default) or Jest / Vitest when the project has migrated. `TestBed`, `ComponentFixture`, `HttpTestingController` for HTTP.
- Component behavior: Angular Testing Library (`@testing-library/angular`) when present; component harnesses for Angular Material.
- E2E: Playwright or Cypress (via `forge-browser-qa`). Protractor is deprecated; do not add it.

## Lint and format

- `@angular-eslint` (`ng lint` when configured), Prettier when configured.

## Build and validation commands (if configured)

Discover the real scripts in `package.json`, `angular.json` and `.forge/context.json` first. Typical ones:
- `npm start` / `ng serve`, `npm run build` / `ng build`, `npm test` / `ng test` (add `--watch=false` for a single run; Karma also needs a headless browser available), `ng lint`.
- `ng build` performs AOT compilation and template type-checking; treat its errors as G3 typecheck failures.

## Official docs

- Angular: https://angular.dev
- Angular security guide: https://angular.dev/best-practices/security
- RxJS: https://rxjs.dev
