---
name: forge-product-management
description: Product management for engineering tasks covering value, user stories, RICE and MoSCoW, MVP slicing and cited competitive research. Use when deciding what to build.
user-invocable: false
---

# Product Management

Purpose: make sure the team builds the right thing at the right size. Product reasoning is grounded in the user's request, the existing product (code, docs, UI) and cited external sources. Never in imagined users or invented data.

## 1. Understand the product as it is

- Read the README, docs, landing or marketing pages in the repo, route and screen names, and the data model. List the core entities and the primary workflows.
- Identify the user roles from auth and permission code (roles, guards, tenancy), not from assumptions.
- Note what the product clearly does not do yet (missing routes, TODOs, disabled flags).

## 2. Define the value

For the request, write:
- **Problem**: what is painful or missing today, with evidence (user words, code, issue text).
- **Who**: the role(s) affected.
- **Outcome**: what changes for them when this ships.
- **Signal**: how anyone would know it worked (an observable behavior, or a metric the product already tracks). Do not invent analytics that do not exist.

## 3. Stories and acceptance criteria

Write stories as `As a <role>, I want <capability>, so that <outcome>`, then ACs in Given/When/Then. Load `forge-requirements-engineering` for the AC checklist and INVEST.

## 4. Prioritization

Use only when choosing among several candidates.
- **MoSCoW** (fast, for scope inside one task): Must = needed for the stated outcome; Should = clear value, low cost; Could = nice to have; Won't = explicitly deferred.
- **RICE** (for ranking a backlog of ideas): Reach x Impact x Confidence / Effort. State the basis for each number. When reach is unknown, use a relative scale (1 to 3) and say so. Confidence drops to 50% or below for anything not backed by evidence.
- Always show the reasoning, not only the score.

## 5. Scope cuts and MVP slicing

- Slice vertically: the thinnest end-to-end path that delivers the outcome for one role and the main data case.
- Cut in this order: polish, rare variants, configurability, secondary roles, automation of rare manual steps.
- Never cut: security, data integrity, accessibility basics, error handling on the main path.
- Record each cut under Out of scope with a one-line reason so it is a decision, not an omission.

## 6. Competitive and market research

Used by the product researcher, and by PM when the request asks how the product compares or what to build next.

1. **Frame the question**: which capability, for which user, compared with what (named competitors from the user, or the category).
2. **Find sources** with web search: official product pages, documentation, pricing pages, changelogs, reputable reviews. Prefer primary sources.
3. **Fetch and read** each source you cite. A search snippet alone is not evidence.
4. **Record findings** in a table: competitor, capability, how it works, source URL, date accessed.
5. **Mark confidence**: `verified` (seen on a primary source), `reported` (third-party source only), `unverified` (could not confirm). Never fill a gap with what a competitor "probably" offers.
6. **Translate to recommendations**: gaps and differentiators relative to the existing product, each tied to evidence on both sides (the competitor source and the repo's current behavior).
7. If web tools are unavailable, say so and limit the output to analysis of the repo. Do not answer from memory as if it were research.

Rules: no fabricated features, prices, user counts or market sizes. Quote numbers only with a source. Respect the user's privacy: do not put project names or code in search queries.

## Anti-patterns

- Personas and metrics invented to justify a feature.
- Scoring with false precision ("RICE 847").
- Bundling many features into one task because they seem related.
- Recommending a competitor's feature without checking it fits the product's users and architecture.

## Output

Return: problem and value statement, stories with ACs, MoSCoW scope (or RICE ranking when comparing options), the cuts with reasons, and for research tasks the cited comparison table with confidence marks and ranked recommendations.
