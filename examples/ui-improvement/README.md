# Example: UI/UX improvement (size M)

```
/forge Improve the task board UI: clear loading, empty and error states, and better accessibility.
```

## Expected flow
1. **Spec** (`.forge/tasks/<slug>/spec.md`). ACs cover each state: loading, empty, error and success. a11y NFRs: an accessible name for the delete button, label associations, focus visibility and contrast.
2. **Team:** `forge-product-manager`, `forge-ux-designer` (UX spec that reuses the existing CSS), `forge-frontend-engineer`, `forge-accessibility-specialist`, `forge-browser-qa`, `forge-code-reviewer`.
3. **Browser QA:**
   - Before and after screenshots.
   - Viewports 390×844, 768×1024 and 1440×900.
   - An error state forced by stopping the API or mocking a route.
   - A keyboard-only pass.
   - DevTools console and network checks.
4. **Report:** every AC mapped to evidence, plus the browser QA block and accessibility findings.

Real results: [`tests/e2e/results/ui-improvement/`](../../tests/e2e/results/ui-improvement/).
