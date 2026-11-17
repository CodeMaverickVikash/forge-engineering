#!/usr/bin/env bash
# Full FORGE validation: repository validator, unit/integration tests, and (if the Claude CLI is available)
# the official `claude plugin validate` on the generated Claude Code plugin and marketplace.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
command -v node >/dev/null || { echo "validate.sh needs Node.js >= 18" >&2; exit 1; }

echo "== 1/3 FORGE repository validator"
node scripts/validate.mjs

echo "== 2/3 Tests"
node --test tests/unit/*.test.mjs

echo "== 3/3 Official Claude Code plugin validator"
CLAUDE_BIN="${CLAUDE_BIN:-$(command -v claude || true)}"
if [ -n "$CLAUDE_BIN" ]; then
  "$CLAUDE_BIN" plugin validate dist/claude-code
  "$CLAUDE_BIN" plugin validate .
else
  echo "SKIPPED: claude CLI not on PATH (set CLAUDE_BIN to enable)"
fi
