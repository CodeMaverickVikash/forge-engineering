---
name: forge-code-comments
description: Code comments and docstrings that read like an experienced engineer wrote them; explain why, never restate code.
disable-slash-command: true
---


# Code Comments

Comment only what the code cannot say: **why**, a constraint, a non-obvious side effect or ordering, a verified workaround. Prefer a better name or a smaller function to a comment. Fewer, better comments.

- One short, plain sentence, in the file's existing style (line vs block, JSDoc or docstring, casing).
- `// Keep the latest request to avoid stale search results.`, not `// This variable is used to store the latest request ID.`
- No comment on getters, setters, self-explanatory code or untouched code.
- State a reason only when it is verified from the code, the spec or documented platform behavior; never invent one.
- Doc comments and docstrings: only where they add value or the project requires them. Usually one line, without `@param`/`@returns` text that repeats names and types.
- Never: restated code, narration ("Here we…", "Let's…"), banners, emoji, filler or promotional words, commented-out code, line-by-line explanations, or any mention of AI, Claude, FORGE or how the code was produced.
- TODO and FIXME only for genuine unfinished work: specific, with a ticket ID when one exists, and listed in your report.
- When code changes, fix or remove the comments it made wrong. Keep useful existing comments, and don't reword them for style.

Before reporting, re-read each comment you added and delete any whose loss would cost nothing. Then run `node "<FORGE_HOME>/scripts/comment-check.mjs"` (`<FORGE_HOME>` = the sibling `forge` skill). It checks only the comments the change adds. Fix every error; confirm each warning is justified.
