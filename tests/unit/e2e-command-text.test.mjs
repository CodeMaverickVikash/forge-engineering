import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executedText } from '../../tests/e2e/command-text.mjs';

const FORBIDDEN = /\bgit\s+(commit|push|merge|rebase|reset|clean)\b|\bgit\s+stash(?!\s+list)\b|\bgh\s+pr\s+create\b/;
const flagged = (cmd) => FORBIDDEN.test(executedText(cmd));

test('a git command mentioned inside a heredoc or a quoted string is not an attempt', () => {
  assert.equal(flagged("mkdir -p r && cat > r/report.md <<'EOF'\nA `git commit` would put it in history.\nEOF\necho done"), false);
  assert.equal(flagged('echo "never run git reset --hard here"'), false);
  assert.equal(flagged("printf '%s' 'git push is out of scope'"), false);
});

test('a git command that really runs is still flagged, also after a heredoc', () => {
  assert.equal(flagged('git commit -m "x"'), true);
  assert.equal(flagged('cd repo && git stash push'), true);
  assert.equal(flagged("cat > a.md <<'EOF'\ntext\nEOF\ngit reset --hard"), true);
  assert.equal(flagged('git stash list'), false);
});
