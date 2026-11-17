---
name: forge-ui-ux-engineering
description: UI and UX engineering for web and mobile changes. Covers user journeys, information architecture, layout and responsive strategy, design-system discovery and consistency, interaction states, microcopy, accessibility hooks and Nielsen heuristic review, producing a UX spec engineers can build.
disable-slash-command: true
---


# UI/UX Engineering

Design for the product that exists. Discover its design system first, then specify the change so precisely that an engineer can build it without inventing anything, and a tester can verify it.

## 1. Discover the design system (before proposing anything)

- **Tokens**: theme files, CSS custom properties, Tailwind config, design-token JSON, SCSS variables. Record color, spacing, type scale, radius, shadow and breakpoint names.
- **Components**: the shared component folder or UI library in use (from `.forge/context.json`). List the ones relevant to the change: buttons, inputs, forms, modals, toasts, tables, empty states, skeletons.
- **Patterns**: an existing screen most similar to the one being changed. How does it handle loading, errors, validation, navigation, confirmation?
- **Copy voice**: sentence case or title case, tone, how errors are phrased.

Rule: reuse existing tokens and components. Propose a new component or token only when nothing fits, and say why.

## 2. Journeys and information architecture

- Write the primary journey as numbered steps from entry point to goal, including where the user comes from (link, nav, notification, deep link).
- Add secondary journeys at risk: returning user, first-time user with no data, user without permission, mobile user.
- Check IA: where does the feature live in navigation, what is it called (match existing nav labels), what is the URL or route, what is the hierarchy of content on the screen.

## 3. Layout and responsive strategy

- Describe layout in the project's grid and spacing tokens, by region (header, primary content, secondary, actions).
- Specify behavior at the project's breakpoints, or at 390, 768 and 1440 px wide when none are defined: what stacks, collapses, hides, or becomes a sheet or menu.
- Touch targets at least 24x24 CSS px (WCAG 2.2 AA) and ideally 44x44 on touch devices; primary action reachable on mobile.
- Long content: truncation rules, wrapping, overflow, very long words and names.

## 4. Interaction states (all required for every data-driven view)

| State | Specify |
|---|---|
| Loading | Skeleton or spinner (per existing pattern), what stays interactive |
| Empty | Message, explanation, primary action to get out of it |
| Error | Message, retry path, what data is preserved |
| Success | Confirmation pattern (toast, inline, redirect) |
| Disabled | Why it is disabled and how the user learns it |
| Validation | When validation runs (blur, submit), message placement |
| Partial / stale | Offline, partial data, optimistic update rollback |

## 5. Microcopy

- Use the product's terms; never introduce a synonym for an existing concept.
- Buttons are verbs that describe the outcome ("Save changes", not "OK").
- Errors say what happened and what to do next; no blame, no raw codes, no stack traces.
- Avoid revealing sensitive facts (for example, whether an email is registered).

## 6. Accessibility hooks (for engineers to implement)

- Semantic elements first (button, link, label, heading order, landmarks).
- Every input has a visible label; errors are associated with their field.
- Focus order, focus visibility, and focus management after modal open or close and route change.
- Status changes announced (live region) for async results.
- Color is never the only signal; contrast meets AA with the existing tokens.
- Respect reduced motion. Hand deeper checks to `forge-accessibility-engineering`.

## 7. UX review heuristics (Nielsen)

Review the current and proposed UI against: visibility of system status; match with the real world; user control and freedom (undo, cancel); consistency and standards; error prevention; recognition over recall; flexibility and efficiency; aesthetic and minimalist design; help users recover from errors; help and documentation. Report each issue with the screen, the heuristic, severity and evidence (screenshot or `path:line`).

## Output: UX spec for engineers

You do not write code. Return a UX spec containing: design-system inventory used (tokens and components with paths), journeys, IA placement, layout per breakpoint, a state table per view, final microcopy strings, accessibility requirements, new components or tokens with justification (or "none"), and testable UI acceptance criteria for browser QA.
