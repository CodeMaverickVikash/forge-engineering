---
type: llm
focus: trace
weight: 1
---

public/app.js now counts tasks that are not done when computing the "remaining" number (for example filtering on !t.done), so the three seeded tasks (one done) display "2 tasks remaining".
