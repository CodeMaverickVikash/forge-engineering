---
name: forge-test-automation
description: Writing deterministic unit, integration and E2E tests in the project's existing frameworks (Jest, Vitest, Pytest, JUnit, Go, PHPUnit/Pest, RSpec, xUnit, Playwright, Cypress, Detox, Maestro, flutter_test). Covers conventions discovery, mocking boundaries and flaky-test triage.
disable-slash-command: true
---


# Test Automation

Tests are executable acceptance criteria. A good test fails for exactly one reason, reads like a specification and gives the same result on every run.

## 1. Discover conventions first

Before writing a test, find out how this project already tests:
1. `.forge/context.json`: test frameworks and the real test commands (package scripts, Makefile, CI workflow). Confirm `inferred:` commands before use.
2. Framework config: `jest.config.*`, `vitest.config.*` / `vite.config.*`, `pytest.ini` / `pyproject.toml [tool.pytest]` / `conftest.py`, `phpunit.xml`, `.rspec`, `playwright.config.*`, `cypress.config.*`, Gradle/Maven test config, `*.csproj` test projects.
3. Open the 2–3 nearest existing tests for the affected code. Copy their location, naming, fixture and factory helpers, mocking library, assertion style and setup/teardown pattern.
4. Never introduce a second framework, assertion library or mocking library when one exists. A new test dependency requires authorization.

## 2. Framework quick reference

Typical defaults only. Verify against the project config and scripts before running.

| Framework | Typical file pattern | Typically run a single test with |
|---|---|---|
| Jest | `*.test.ts`, `*.spec.js`, `__tests__/` | `npx jest path/to/file.test.ts -t "name"` |
| Vitest | `*.test.ts`, `*.spec.ts` | `npx vitest run path/to/file.test.ts -t "name"` |
| Pytest | `test_*.py`, `*_test.py` | `pytest path/test_x.py::test_name` or `pytest -k name` |
| JUnit | `src/test/java/**/*Test.java` | `mvn test -Dtest=ClassTest#method` / `./gradlew test --tests "pkg.ClassTest.method"` |
| Go testing | `*_test.go` beside the code | `go test ./path/to/pkg -run '^TestName$'` |
| PHPUnit / Pest | `tests/**/*Test.php` | `vendor/bin/phpunit --filter name` / `vendor/bin/pest --filter name` |
| RSpec | `spec/**/*_spec.rb` | `bundle exec rspec spec/x_spec.rb:42` |
| xUnit (.NET) | `*.Tests` project, `*Tests.cs` | `dotnet test --filter "FullyQualifiedName~Name"` |
| Playwright | `*.spec.ts` under the config's `testDir` | `npx playwright test path/to/x.spec.ts -g "name"` |
| Cypress | `cypress/e2e/**/*.cy.ts` | `npx cypress run --spec path/to/x.cy.ts` |
| Detox | `e2e/*.test.js` | `npx detox test -c <configuration> e2e/x.test.js` |
| Maestro | `.maestro/*.yaml` flows | `maestro test .maestro/flow.yaml` |
| flutter_test | `test/**/*_test.dart` | `flutter test test/x_test.dart --plain-name "name"` |

If the project wraps the runner (`npm test`, `make test`, `composer test`), prefer the wrapper and pass the filter through it.

## 3. Writing tests

- **Level:** unit for pure logic and branches; integration for DB, HTTP handlers, queues and contracts; E2E for the few journeys that prove the wiring. Don't test the same thing at every level.
- **Naming:** describe behavior and condition: `returns 404 when the order belongs to another user`, not `test1` or `testGetOrder`. Follow the project's naming pattern.
- **Structure:** Arrange, Act, Assert. One behavior per test; several assertions are fine when they describe one outcome.
- **Coverage per change:** every AC, each error path, the boundaries (empty, zero, max, invalid), and for bug fixes a regression test that **fails before the fix** (run it to prove that).
- **Assertions:** assert observable outcomes (return values, responses, persisted state, rendered text), not private implementation details or call counts unless the call *is* the behavior (e.g. a payment was charged once).
- **UI tests:** query by role, label or text before test IDs. Use web-first or auto-waiting assertions.

## 4. Determinism

- **No sleeps.** Wait for a condition, event or response. Never use fixed delays such as `sleep` or `waitForTimeout` to "fix" timing.
- **Time:** inject or fake the clock (fake timers, a fixed `now`, a frozen time helper the project already uses).
- **Randomness:** seed generators or inject IDs; never assert on random output.
- **Data isolation:** each test creates what it needs (factories or fixtures) and cleans up or runs in a rolled-back transaction. No order dependence, no shared mutable globals, unique keys for parallel runs.
- **Network:** no real third-party calls. Stub at the HTTP boundary or use the project's recorded fixtures; local test DBs and containers are fine when the project already uses them.
- **Environment:** no reliance on the developer's timezone, locale, file paths or env values. Set what the test needs explicitly.

## 5. Mocking

Mock **boundaries you don't own**: external HTTP APIs, payment providers, email/SMS, clock, randomness, file system or OS when needed. Don't mock the unit under test, its internal collaborators or simple value objects. Over-mocked tests pass while production breaks. Prefer fakes the project already provides. Keep mocks faithful to the real contract (status codes, error shapes).

## 6. Flaky test triage

1. Re-run the single test several times in isolation, then together with its file or suite, to see whether it fails alone or only with others.
2. Typical causes: timing or waits, shared state or ordering, real clock or time zone, unseeded randomness, network, resource leaks, parallel workers sharing data.
3. Fix the cause. If it cannot be fixed in scope, report it as flaky with evidence. Never add retries or skips silently.

## 7. Rules

- **Never weaken, skip, delete or `.only` tests to get green**, and never loosen assertions or update snapshots blindly. Snapshot updates need a reviewed diff explaining why the output changed.
- A failing pre-existing test is reported as PRE-EXISTING, not "fixed" by editing its expectation.
- Coverage is a signal for finding untested risk, not a target. Don't write assertion-free tests to raise a number. Run coverage only if the project configures it.
- Edit only test files, fixtures and helpers you own. Request production-code changes (for testability) through your report.

## Output

List the tests added or changed (file, test name, AC covered), the exact commands run with PASSED/FAILED and counts, a proof that bug regression tests failed before the fix, and any flaky or pre-existing failures found, with evidence.
