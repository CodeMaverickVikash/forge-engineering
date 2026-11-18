The "tasks remaining" number is calculated in the browser, in `render()` in `public/app.js:10-13`. As written, it counts the wrong tasks.

```js
// Count of tasks still to do.
const open = tasks.filter((t) => t.done).length;
remaining.textContent = `${open} task${open === 1 ? '' : 's'} remaining`;
```

- **Source data:** `load()` (`public/app.js:5-8`) fetches `GET /api/tasks` and passes the full task array to `render()`. The server sends no count, so the number is computed entirely on the client.
- **Calculation:** `render()` filters the tasks and takes the length of the result. The label is pluralised: "1 task remaining" and "N tasks remaining". It is written into `<p id="remaining" aria-live="polite">` (`public/index.html:13`).
- **When it updates:** `load()` runs again after every checkbox toggle, delete and add (`public/app.js:27` and `:35`), so the number is recalculated from a fresh fetch each time.

**The filter is inverted.** It is `filter((t) => t.done)`, so it counts the completed tasks. The comment above it says "tasks still to do", and the label says "remaining", so the intended filter is `!t.done`.

With the seed data in `server.mjs:12-14`, one task is done and two are not. The board therefore shows "1 task remaining" when it should show "2 tasks remaining". Checking a task makes the number go up instead of down.

The fix is a one-character change, `t.done` to `!t.done`, plus a regression test. You only asked how the number is calculated, so I haven't changed anything. Tell me if you want the fix applied.
