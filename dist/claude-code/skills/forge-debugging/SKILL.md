---
name: forge-debugging
description: Systematic root-cause debugging for any stack. Reproduce, hypothesize, instrument, bisect, fix and add a regression test. Use for any defect or failing check.
user-invocable: false
---

# Systematic Debugging

A fix without a reproduction is a guess. A fix without a regression test is temporary. Work the loop below and keep notes as you go: each hypothesis, the evidence for or against it, and what you ruled out.

## The loop

1. **Reproduce.** Get the failure to happen on demand: a failing test, a script, a curl request, or browser steps. Record the exact command, inputs, environment and the observed vs expected output. If you cannot reproduce it, gather more evidence (logs, stack traces, user steps, versions) before changing code.
2. **Minimize.** Remove inputs, steps and code until the smallest case still fails. Turn it into an automated test at the project's existing test level when possible.
3. **Hypothesize.** Read the stack trace from the first frame in project code. List 2 or 3 candidate causes ranked by likelihood. For each, name an observation that would confirm or refute it.
4. **Instrument.** Test the top hypothesis with the cheapest decisive observation: a targeted log line, an assertion, a debugger breakpoint, a network capture, a query log. Change one variable at a time. Remove temporary instrumentation afterward.
5. **Bisect** when the cause is unclear but a known-good point exists:
   - Prefer **test or input bisection**: halve the data, the test set, the config or the code path until the trigger is isolated.
   - Prefer **log bisection**: `git log -p -- <path>` and `git log -S <symbol>` to find when the relevant code changed. These are read-only.
   - `git bisect` checks out other commits and changes the working tree. Use it only when the working tree is clean and the orchestrator has relayed the user's OK. Always end with `git bisect reset`. Never use it when there are uncommitted changes.
6. **Fix the root cause.** Fix where the wrong value or decision originates, not where it surfaces. Keep the fix minimal and in the project's style. If the root cause is outside your scope (another module, a dependency, infrastructure), report it with evidence and propose the fix.
7. **Regression test.** Add a test that failed before the fix and passes after. Confirm it actually failed before (run it on the unfixed code or reason from the reproduction).
8. **Verify.** Re-run the reproduction, the new test, the affected area's existing tests, and typecheck or build. Compare with the baseline to separate new failures from pre-existing ones.

Budget: at most 3 fix cycles per failure. After that, stop and report what you know, what you ruled out and what you need.

## Stack-agnostic tactics

| Symptom area | Tactics |
|---|---|
| Logs | Find the first error, not the loudest. Correlate by request or trace id and timestamp. Raise log level locally if the project supports it |
| Debugger | Use the project's configured debugger or runtime inspector; break on the first wrong value, then walk the call stack upward |
| Network / API | Compare actual request and response (status, headers, body) with the contract. Check CORS, auth headers, base URLs, serialization of dates and numbers. Redact tokens |
| Races and async | Look for unawaited promises, shared mutable state, check-then-act, missing locks or transactions, test order dependence. Reproduce with repetition or added delay |
| Environment / config drift | Compare env var names, config files, feature flags, runtime versions and OS between working and failing environments. Never print secret values |
| Dependencies | Check lockfile changes, version ranges, duplicate packages, transitive upgrades. Read the dependency's changelog for the installed version |
| Data | Inspect the actual record or fixture; check nulls, encodings, time zones, precision, stale caches |
| Build / tooling | Clean the project's build cache via its documented command; check generated files are up to date |
| Flaky tests | Run the test repeatedly and in isolation; look for time, randomness, shared state, network and ordering |

## Anti-patterns

- **Shotgun fixes**: changing several things at once until it passes.
- **Suppressing the symptom**: empty catch blocks, `try/except: pass`, null checks that hide a wrong value, retries around a deterministic bug.
- **Disabling the check**: skipping or loosening tests, lint or type rules to go green.
- **Fixing at the surface**: patching the UI when the API returns wrong data.
- **Trusting the hypothesis** without an observation that could have disproved it.
- **Leaving instrumentation**: debug logs and breakpoints left in the diff.

## Output

Return: reproduction (command or steps, and the failing output), root cause with `file:line` and the evidence that proved it, hypotheses ruled out, the fix, the regression test name, and verification results with statuses (PASSED, FAILED, PRE-EXISTING, NOT RUN).
