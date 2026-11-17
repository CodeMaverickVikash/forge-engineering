---
name: forge
description: Run FORGE, the autonomous software engineering organization, on the request typed after /forge.
---

# /forge (legacy workflow entry point)

This workflow only exists for Antigravity surfaces where skills are not slash-invocable. Where a `forge` skill is available, it takes precedence over this file.

1. Treat everything the user typed after `/forge` as the FORGE request. If they typed nothing, the request is "Analyze the project and suggest improvements."
2. Load the `forge` skill by reading its SKILL.md. Look for it first at `.agents/skills/forge/SKILL.md` in the workspace, then at `~/.gemini/config/skills/forge/SKILL.md`.
3. Follow that skill exactly, through to the final FORGE Execution Report. Never commit, push or open pull requests.
