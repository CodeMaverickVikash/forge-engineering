---
name: forge-accessibility-engineering
description: WCAG 2.2 AA accessibility review for web and mobile UI covering semantics, names, keyboard and focus, contrast, motion, forms and ARIA. Use for UI accessibility checks.
user-invocable: false
---

# Accessibility Engineering (WCAG 2.2 AA)

Target: **WCAG 2.2 level AA** for every new or changed UI. Automated tools catch only a part of the issues; keyboard, focus and accessibility-tree checks are always manual. Cite the success criterion (SC) for each finding.

## 1. Scope

1. From the spec and diff, list the affected screens, components and states (default, hover/focus, loading, empty, error, disabled, open/closed).
2. Find the design system or component library in use (`.forge/context.json`). Fix shared components at the source rather than patching every usage, and reuse the accessible primitives it already provides.
3. Start the app on local or test data via the `forge-browser-qa` workflow when runtime checks are needed.

## 2. Checklist

**Structure and semantics**
- Native elements first: `<button>` for actions, `<a href>` for navigation, `<label>`, `<table>` for tabular data, lists for lists. No clickable `<div>`s (SC 4.1.2).
- Landmarks: one `main`, plus `header`/`nav`/`footer` where relevant; multiple `nav`s get distinct labels (SC 1.3.1).
- Headings: one `h1` per page or view, no skipped levels for styling (SC 1.3.1, 2.4.6).
- Page `<title>` unique and descriptive; `lang` set on `<html>` (SC 2.4.2, 3.1.1).
- Skip link or equivalent bypass for repeated navigation (SC 2.4.1).

**Names, roles, values**
- Every interactive control has an accessible name matching its visible label (SC 4.1.2, 2.5.3). Icon-only buttons need `aria-label` or visually hidden text.
- Images: meaningful ones have `alt` describing purpose; decorative ones use `alt=""` (SC 1.1.1).
- State is exposed: `aria-expanded`, `aria-selected`, `aria-pressed`, `aria-current`, `disabled`.
- **ARIA only when native HTML can't do it.** No ARIA is better than wrong ARIA; a `role` brings the obligation to implement its keyboard behavior.

**Keyboard and focus**
- Everything operable with the keyboard alone, in a logical order; no keyboard traps (SC 2.1.1, 2.1.2, 2.4.3). No positive `tabindex`.
- Focus is always visible, never removed with `outline: none` without a replacement (SC 2.4.7), and not hidden behind sticky headers or overlays (SC 2.4.11).
- Dialogs: focus moves in on open, is contained while open, `Esc` closes, focus returns to the trigger on close. Menus, tabs, comboboxes follow the WAI-ARIA Authoring Practices keyboard patterns.
- On route change in SPAs, move focus to the new heading or main region and announce the change.
- Drag interactions have a single-pointer alternative (SC 2.5.7). Touch/click targets are at least 24×24 CSS px or spaced (SC 2.5.8).

**Visual**
- Text contrast **4.5:1**, large text (≥ 24 px, or ≥ 18.66 px bold) **3:1** (SC 1.4.3). UI components, focus indicators and meaningful graphics **3:1** against adjacent colors (SC 1.4.11).
- Color is not the only means of conveying information, such as errors or required fields (SC 1.4.1).
- Content reflows at 320 CSS px width without horizontal scrolling and works at 200% zoom and with increased text spacing (SC 1.4.10, 1.4.4, 1.4.12).
- Motion: respect `prefers-reduced-motion`; nothing flashes more than 3 times a second; auto-playing or moving content longer than 5 s can be paused (SC 2.3.1, 2.2.2; reduced motion maps to SC 2.3.3, which is AAA but cheap to honor).

**Forms and errors**
- Every input has a programmatic label; placeholders are not labels; group related controls with `fieldset`/`legend` (SC 1.3.1, 3.3.2).
- Errors are identified in text, tied to the field (`aria-describedby`, `aria-invalid`), and announced (focus the first error or use a live region) (SC 3.3.1, 3.3.3, 4.1.3).
- Use `autocomplete` tokens for personal data (SC 1.3.5). Don't make users re-enter information already given in the same flow (SC 3.3.7). Authentication doesn't rely on cognitive tests alone; allow paste and password managers (SC 3.3.8).
- Status messages (saved, results updated) use `role="status"` or `aria-live` (SC 4.1.3).

## 3. How to check

1. **Automated (if present):** the project's axe integration (`@axe-core/playwright`, `jest-axe`, `cypress-axe`), eslint a11y plugins, or `lighthouse_audit` via DevTools MCP. Use only tools that are already installed or available; otherwise mark `UNAVAILABLE`. Treat results as leads, then confirm them.
2. **Accessibility tree:** Playwright MCP `browser_snapshot` or DevTools `take_snapshot` on each state. Check roles, names, states and order as a screen reader would get them.
3. **Keyboard pass:** Tab, Shift+Tab, Enter, Space, Esc and arrow keys through the whole flow (`browser_press_key` / `press_key`); confirm focus is visible and lands where expected after each action.
4. **Contrast:** read computed colors (`get_css_styles` or `evaluate_script`) and calculate the ratio; check hover, focus, disabled and error states too.
5. **Zoom and reflow:** resize to 320 px wide and check 200% zoom.
6. **Reduced motion:** emulate `prefers-reduced-motion: reduce` when the browser tool supports it.
7. **Code review:** grep the diff for `onClick` on non-interactive elements, `outline: none`, `tabindex="[1-9]`, images without `alt`, inputs without labels, `aria-hidden` on focusable content.

State clearly that no real screen reader (NVDA, JAWS, VoiceOver, TalkBack) was used unless one actually was.

## 4. Mobile notes

- React Native: `accessibilityLabel`, `accessibilityRole`, `accessibilityState`, `accessibilityHint`; Flutter: `Semantics` widgets and `semanticsLabel`; native iOS/Android equivalents (`accessibilityLabel`, `contentDescription`).
- Touch targets at least 44×44 pt (iOS) / 48×48 dp (Android); support dynamic type and font scaling without clipping; logical focus order for VoiceOver and TalkBack; don't convey meaning by color or gesture alone.

## Output

Findings ranked by severity (**blocker**: a task can't be completed with keyboard or screen reader; **serious**; **moderate**; **minor**), each with the WCAG SC, the affected component and state, `file:line`, how it was found (tool, snapshot, keyboard, contrast calculation), and the concrete fix. Then the checks run with status, and those not run (with reason).
