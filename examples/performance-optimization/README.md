# Example: performance optimization

```
/forge The dashboard is slow to load. Make it faster.
```

## Expected flow
1. **Measure first.** `forge-performance-engineer` takes a baseline under stated conditions:
   - Through `forge-browser-qa`: a Chrome DevTools MCP trace (`performance_start_trace` → reload → `performance_analyze_insight`) for LCP, CLS and long tasks.
   - The network waterfall.
   - Server latency for the dashboard API calls.
2. **Diagnose.** Attribute the time to a cause, for example a render-blocking bundle, N+1 queries, waterfall requests or missing caching. Cite `file:line`.
3. **Team:** `forge-architect`, `forge-performance-engineer`, the relevant engineer and `forge-qa-lead`. Add `forge-browser-qa` for frontend metrics. Add `forge-database-engineer` for query issues.
4. **Fix** the top bottleneck(s) with minimal changes.
5. **Re-measure** under the same conditions. The report gives before and after numbers. **No improvement is claimed without measurements.**

No live run was recorded, because this scenario needs a real application with measurable load.
