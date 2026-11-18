---
name: forge-code-comments
description: Code comments and docstrings that read like an experienced engineer wrote them; explain why, never restate code.
user-invocable: false
---

# Code Comments and Inline Documentation

**Write a comment only when it adds context the code cannot express itself.** Fewer comments, better comments: every comment must earn its place. Readable names and structure come first; comments support them, they never replace them.

## 1. Before you write one

1. Look at how the file and its neighbors already comment: line vs block, JSDoc or docstrings, sentence case, punctuation. Match it.
2. Ask whether a better name, a smaller function or a named constant would make the comment unnecessary. If so, do that instead.
3. Comment code you added or changed. Leave untouched code alone unless an existing comment there is now wrong.

## 2. How a comment reads

- One short, direct sentence in plain professional English. Say **why**, or what is not obvious, not what the next line does.
- No restating names in sentence form, no narration, no filler ("basically", "simply", "of course"), no promotional or conversational tone, no emoji.

| Write | Not |
|---|---|
| `// Keep the latest request to avoid stale search results.` | `// This variable is used to store the latest request ID.` |
| `// Retry once when the service is temporarily unavailable.` | `// This function is responsible for fetching the data from the API.` |
| `// Normalize the email before checking for duplicates.` | `// This function normalizes the email address.` |
| `// Cache results to avoid repeated database queries.` | `// This class is used for handling user-related database operations.` |
| *(no comment: `if (isAuthenticated)` says it)* | `// Here we are checking if the user is authenticated or not.` |

## 3. What deserves a comment

- **Functions and methods:** non-obvious business rules, side effects, complex calculations, surprising constraints, required call order. Not simple getters, setters or self-explanatory helpers.
- **Constants and variables:** a threshold or default whose reason is not obvious, a business meaning the name cannot carry, a workaround. Prefer a descriptive name first.
- **Classes and components:** their responsibility, only when the name and the surrounding architecture do not already make it clear. Never "This component renders the user profile."
- **Complex logic:** why it exists, why this approach, the edge cases, and the constraints a future change must preserve.
- **Engineering decisions** that cannot be recovered from the code:
  - `// Keep this check before payment creation to prevent duplicate charges.`
  - `// Use UTC here because billing dates are shared across time zones.`
  - `// Preserve this fallback for accounts created before the migration.`

  Write these only when the reason is **verified** from the implementation, the spec or documented platform behavior. Never invent a rationale.

## 4. Doc comments and docstrings

Use the language's convention and the project's style. Add them only when they add value or the project requires them (for example a public API that generates docs):

```ts
/**
 * Returns the final price after applying eligible discounts.
 */
function calculateFinalPrice() {}
```

```py
def calculate_final_price():
    """Apply eligible discounts to the original price."""
```

One line is usually enough. Skip `@param` and `@returns` text that only repeats what the names and types already say, unless the project's lint rules require the tags.

## 5. Never add

- AI-style introductions ("Let's understand what happens here"), or comments that open with "This function is responsible for…".
- Obvious comments (`// Increment counter` above `counter++`), line-by-line explanations, or comments that repeat the code.
- Long multi-line explanations where one sentence works.
- Decorative banners and separators (`// ===== Helpers =====`).
- Commented-out code or leftover debugging (`// console.log(user)`).
- Fake or empty TODO, FIXME, HACK or NOTE markers.
- Claims the implementation does not fulfil.
- Any mention of AI, ChatGPT, Claude, FORGE or how the code was produced.

Do not reword existing meaningful comments for style.

## 6. TODO and FIXME

Only for genuine unfinished work, with the specific gap, and a ticket ID when one exists:
- `// TODO: Add pagination when the API supports cursor-based queries (ENG-142).`
- `// FIXME: Prevent duplicate events during reconnect.`

Completed code carries no temporary debugging notes, outdated explanations or placeholder TODOs. Every TODO you add appears in your report under remaining work.

## 7. Keeping comments true

- When code changes, update or remove the comments that describe it. A wrong comment is worse than none.
- Remove an existing comment only when it is demonstrably misleading or obsolete. Otherwise preserve useful documentation.

## 8. Final review (before you report)

For every comment you added or changed, ask:
- Does it say something the code does not?
- Is it short and natural, and does it explain why rather than what?
- Is it accurate and verified?
- Would an experienced engineer write it this way?
- Would anything be lost if it were deleted? If not, delete it.

Then run `node "<FORGE_HOME>/scripts/comment-check.mjs"` (`<FORGE_HOME>` is the sibling `forge` skill directory; `--base <ref>` for a branch, `--files a,b` for named files). It checks only the comments the change adds:
- **Errors (exit 1):** restated code, narration, generator mentions, banners, emoji, obvious comments, commented-out code, empty TODOs. Fix every one.
- **Warnings:** long blocks, promotional or conversational wording, and each new TODO. Confirm each one is justified.

It catches patterns only; whether a comment is needed and correct is still your judgment.

## Output

In your report: `comment-check.mjs` → result (errors, warnings), and any TODO you added with its reason.
