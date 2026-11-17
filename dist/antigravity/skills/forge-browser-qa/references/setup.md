# Enabling browser QA capabilities

FORGE never installs or connects these on its own. Share the steps below with the user when a capability is `UNAVAILABLE`.

## Chrome DevTools MCP (https://github.com/ChromeDevTools/chrome-devtools-mcp)

- **Claude Code:** `claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest`
- **Antigravity:** add the server to `~/.gemini/config/mcp_config.json` (global) or `.agents/mcp_config.json` (workspace). You can also install it from the MCP Store.
  ```json
  { "mcpServers": { "chrome-devtools": { "command": "npx", "args": ["-y", "chrome-devtools-mcp@latest"] } } }
  ```

## Playwright MCP (https://github.com/microsoft/playwright-mcp)

- **Claude Code:** `claude mcp add playwright -- npx @playwright/mcp@latest`
- **Antigravity:** `{ "mcpServers": { "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] } } }`

## Project Playwright test runner

When the project already depends on `@playwright/test`, browsers may still need downloading: `npx playwright install chromium`. This is local and non-destructive, but it downloads around 150 MB, so mention it. Don't add `@playwright/test` to a project that lacks it unless the user authorizes the new dev dependency.

Restart the host session after adding an MCP server so its tools load. Run `claude mcp list` to confirm.
