The "tasks remaining" number is calculated in the browser, in `render()` in `public/app.js:10-13`:

```js
// Count of tasks still to do.
const open = tasks.filter((t) => t.done).length;
remaining.textContent = `${open} task${open === 1 ? '' : 's'} remaining`;
```

- **Source data:** `load()` (`public/app.js:5-8`) fetches `/api/tasks` and passes the full array to `render()`. Each task has a boolean `done` field (`server.mjs:12-14`).
- **Computation:** it filters the tasks and takes the length of the result. The label is pluralised, so you get "1 task remaining" or "N tasks remaining".
- **Refresh:** `load()` runs again after every toggle, delete and add (`public/app.js:27, 35`). The number is recomputed from scratch each time and never cached.
- **Display:** the text goes into the `<p id="remaining" aria-live="polite">` element (`public/index.html:13`).

**This looks like a bug.** The filter is `t.done`, so it counts the **completed** tasks, not the remaining ones. The comment above it says "still to do", so the intent was `!t.done`. With the seed data (`server.mjs:12-14`: one done, two not done), the board shows "1 task remaining" when it should show "2 tasks remaining". The number also goes up when you tick a task and down when you untick it.

I haven't changed anything. The fix is a one-character change to `filter((t) => !t.done)`, and it should come with a regression test. Say so if you want me to make that change.
