---
name: forge-documentation
description: Docs that match a change (README, API docs, ADRs, changelog, runbooks) with verified commands.
user-invocable: false
---

# Documentation

Docs are part of the change. Wrong docs are worse than missing docs, so **every statement must match the code as it is now**, and every command must have been run or be marked untested.

## 1. Discover the existing doc system

- Find what exists: `README*`, `CONTRIBUTING*`, `docs/`, `CHANGELOG*`, `ARCHITECTURE*`, ADR folders (`docs/adr/`, `docs/decisions/`, `adr/`), OpenAPI/GraphQL schemas, docstrings or JSDoc conventions, doc-site config (MkDocs, Docusaurus, VitePress, Sphinx, Storybook docs), `CLAUDE.md`/`AGENTS.md`, runbooks.
- Match the structure, heading style, tone, person ("you" or "we"), language variety, code-fence languages and link style already used. Extend existing sections before creating new files. Don't create new top-level docs unless the work order asks for them.
- Use `.forge/context.json` for real commands, env var **names** and ports. Never invent flags, scripts or endpoints.

## 2. Decide what the change requires

| The change… | Update |
|---|---|
| Adds or changes setup, env vars, ports, prerequisites | README / setup guide, `.env.example` names (no values) |
| Adds or changes a public API, CLI flag, config option, event | API reference / OpenAPI / CLI help / config docs |
| Makes a significant or hard-to-reverse technical decision | ADR |
| Is user- or operator-visible (feature, fix, deprecation, breaking change) | CHANGELOG, if the project keeps one |
| Changes how the system is run, deployed, recovered | Runbook / ops docs |
| Adds non-obvious logic | Code comment explaining *why* |

If nothing user-visible or operational changed, say so and write nothing.

## 3. Document types

**README / setup / onboarding:** what it is (1–2 lines), prerequisites with versions taken from manifests or tool-version files, install, configure (env var names and where to get values), run, test, common problems. Commands in copy-pasteable blocks, in order, from a clean checkout.

**API docs:** for each endpoint or function: purpose, auth requirement, parameters (type, required, constraints), request and response examples, error codes and shapes, pagination, rate limits. If an OpenAPI or schema file is the source of truth, update it rather than hand-written prose, and keep examples valid against it.

**ADR** (follow the project's template if one exists; otherwise): `# ADR-<n>: <decision>`, Status, Context (the forces), Decision, Alternatives considered (with why rejected), Consequences (positive, negative, follow-ups). Number sequentially. Never rewrite an accepted ADR; supersede it with a new one.

**CHANGELOG:** if the project uses Keep a Changelog, add entries under `## [Unreleased]` in the right group (`Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`). Write for users, not committers: the effect, not the implementation. Mark breaking changes clearly with migration steps. Don't invent version numbers or dates; release versioning belongs to the release process. If the changelog is generated from commits or changesets, follow that mechanism instead (e.g. add a changeset file only if the project uses them).

**Code comments:** explain *why* (intent, constraints, trade-offs, links to issues or specs, non-obvious invariants, workarounds with their removal condition), not *what* the code already says. Update or delete comments made stale by the change. Follow the project's docstring format for public APIs. No commented-out code, no change-log comments ("added by…"). The full standard and its check script are in `forge-code-comments`.

**Runbooks:** trigger or alert, impact, diagnosis steps (commands, dashboards, log queries), mitigation, rollback, escalation, verification that the system has recovered. Steps must be executable by someone woken at 3 a.m.: exact commands, no assumed knowledge. Mark destructive steps clearly.

## 4. Writing rules

- Lead with the task the reader wants to accomplish. Short sentences, active voice, present tense, one idea per paragraph.
- Concrete examples over abstract descriptions. Realistic but fake data: no real emails, customer data, internal hostnames or secrets.
- Use placeholders that are obviously placeholders (`<your-api-key>`), never real-looking keys.
- Relative links within the repo; check they resolve.
- Don't document internals that change often in user-facing docs; link to code instead.
- No marketing language, no promises the code doesn't keep.

## 5. Verification

- **Run every command you add or change** in docs, in a local, non-destructive way (install, build, test, run, `--help`). Record the result.
- If a command cannot be run here (needs credentials, cloud access, a device, paid service, destructive action), keep it but mark it in your report as untested with the reason; add a visible note in the doc only if the project's style allows.
- Check code samples compile or run when practical; check API examples against the actual handlers or schema.
- Check links and anchors you added. Check the Markdown renders sensibly (headings, lists, fences closed).
- Re-read the diff of the docs against the code diff: every documented behavior must exist.

## Output

List each doc file changed and what was added or updated, each command documented with its verification status (PASSED, or untested with reason), and any doc gaps noticed but left out of scope.
