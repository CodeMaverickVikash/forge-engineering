---
tags: [forge, database, java]
max_turns: 120
timeout_seconds: 2400
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash, Agent, TodoWrite]
---

Use FORGE to add a status column to the orders table with values PENDING, PAID and CANCELLED, defaulting to PENDING.

Input files: pom.xml, mvnw, src/
