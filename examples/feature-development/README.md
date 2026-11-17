# Example: new feature (size M)

```
/forge Let users edit the title of an existing task.
```

## Expected flow
1. **Specify.** `forge-product-manager` and `forge-business-analyst` (in parallel) cover these rules:
   - Validation: no empty or whitespace-only titles, and a length bound.
   - A 404 for an unknown id.
   - The behavior when editing a completed task.

   ACs are written as Given/When/Then.
2. **Architect.** Freeze the contract first: `PATCH /api/tasks/:id { title }` → 200 with the task, 400 or 404 on error.
3. **Implement in parallel with disjoint ownership:**
   - `forge-backend-engineer` owns `server.mjs`.
   - `forge-frontend-engineer` owns `public/*`.
   - `forge-test-automation-engineer` owns `test/*`.
4. **Verify:**
   - `npm test`, including the new API tests.
   - `forge-browser-qa` runs the edit journey (inline edit, then save, cancel, and a validation error).
   - DevTools confirms the PATCH request and response.
5. **Review and report.**

No live run is recorded yet. Record one with `node tests/e2e/run-scenario.mjs new-feature`.
