import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parsePrUrl, findPrUrl, reviewTarget, classify, suggestTeam, setLock, readLock, lockPath } from '../../skills/forge/scripts/review-target.mjs';
import { decide, forbiddenOperation, activeReviewRoot } from '../../skills/forge/scripts/git-guard.mjs';

// Throwaway repositories in the OS temp dir (test scaffolding only; deleted after each test).
function repo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-review-'));
  const g = (...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.invalid', '-c', 'core.autocrlf=false', ...a], { cwd: dir, stdio: 'pipe', encoding: 'utf8' });
  g('init', '-q', '-b', 'main');
  const w = (f, s) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), s); };
  const commit = (msg, files) => { for (const [f, s] of Object.entries(files)) w(f, s); g('add', '-A'); g('commit', '-qm', msg); };
  return { dir, g, w, commit, done: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test('PR URLs from GitHub, GitLab, Bitbucket and Azure DevOps are parsed', () => {
  assert.deepEqual(parsePrUrl('https://github.com/acme/shop/pull/123/files'), { provider: 'github', host: 'github.com', owner: 'acme', repo: 'shop', number: 123, url: 'https://github.com/acme/shop/pull/123/files' });
  assert.equal(parsePrUrl('https://gitlab.com/group/sub/app/-/merge_requests/7').owner, 'group/sub');
  assert.equal(parsePrUrl('https://bitbucket.org/team/repo/pull-requests/9').provider, 'bitbucket');
  assert.equal(parsePrUrl('https://dev.azure.com/org/proj/_git/repo/pullrequest/42').number, 42);
  assert.equal(parsePrUrl('https://github.ghe.example.com/a/b/pull/5').host, 'github.ghe.example.com');
  assert.equal(parsePrUrl('https://github.com/acme/shop'), null);
  assert.equal(findPrUrl('/forge Review this PR: https://github.com/organization/repository/pull/123.').number, 123);
  assert.equal(findPrUrl('/forge Review my current branch'), null);
});

test('branch mode: base is the nearest fork point, not blindly main; scopes stay separate', () => {
  const r = repo();
  try {
    r.commit('base', { 'src/app.js': 'a\n', 'package.json': '{}\n' });
    r.g('checkout', '-q', '-b', 'develop');
    r.commit('dev work', { 'src/dev.js': 'd\n' });
    r.g('checkout', '-q', '-b', 'feature/login');
    r.commit('feat 1', { 'src/auth/login.ts': 'x\n' });
    r.commit('feat 2', { 'db/migrations/002_users.sql': 'create table u();\n' });
    r.w('src/app.js', 'a2\n'); r.g('add', 'src/app.js');      // staged
    r.w('src/dev.js', 'd2\n');                                  // unstaged
    r.w('notes.md', 'n\n');                                     // untracked
    const t = reviewTarget(r.dir, { network: false });
    assert.equal(t.mode, 'branch');
    assert.equal(t.currentBranch, 'feature/login');
    assert.equal(t.baseBranch.name, 'develop', 'the branch forked from develop, not main');
    assert.equal(t.committed.commits.length, 2);
    assert.deepEqual(t.committed.files.map((f) => f.path).sort(), ['db/migrations/002_users.sql', 'src/auth/login.ts']);
    assert.deepEqual(t.local.staged.map((f) => f.path), ['src/app.js']);
    assert.deepEqual(t.local.unstaged.map((f) => f.path), ['src/dev.js']);
    assert.deepEqual(t.local.untracked, ['notes.md']);
    assert.equal(t.localChanges, 'Present');
    assert.ok(t.areas.database.includes('db/migrations/002_users.sql'));
    assert.ok(t.areas.security.includes('src/auth/login.ts'));
    assert.ok(t.suggestedTeam.includes('forge-database-engineer') && t.suggestedTeam.includes('forge-security-engineer'));
    assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: r.dir, encoding: 'utf8' }).split('\n').filter(Boolean).length, 3, 'detection changed nothing');
  } finally { r.done(); }
});

test('branch mode: on the integration branch, and with no base candidate at all', () => {
  const r = repo();
  try {
    r.commit('base', { 'a.js': '1\n' });
    r.w('a.js', '2\n');
    const onMain = reviewTarget(r.dir, { network: false });
    assert.equal(onMain.onBaseBranch, true);
    assert.equal(onMain.baseBranch.confidence, 'none');
    assert.ok(onMain.limitations.some((l) => /integration branch/.test(l)));
    assert.deepEqual(onMain.changedFiles, ['a.js']);
    r.g('branch', '-m', 'main', 'trunk-x'); r.g('checkout', '-q', '-b', 'feature');
    const none = reviewTarget(r.dir, { network: false });
    assert.equal(none.baseBranch.confidence, 'none');
    assert.ok(none.limitations.some((l) => /could not be established/.test(l)));
  } finally { r.done(); }
});

test('not a git repository and an unreadable PR are BLOCKED, never guessed', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-review-nogit-'));
  try {
    assert.equal(reviewTarget(dir, { network: false }).status, 'BLOCKED');
    const pr = reviewTarget(dir, { prUrl: 'https://github.com/a/b/pull/1', network: false });
    assert.equal(pr.status, 'BLOCKED');
    assert.ok(pr.limitations.some((l) => /not readable/.test(l)));
    assert.equal(reviewTarget(dir, { prUrl: 'https://example.com/x', network: false }).status, 'BLOCKED');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('small diffs get a lean team; large diffs get the full one', () => {
  const small = classify(['server.mjs', 'public/app.js']);
  assert.deepEqual(suggestTeam(small, { 'server.mjs': 2, 'public/app.js': 1 }), ['forge-code-reviewer', 'forge-security-engineer']);
  assert.deepEqual(suggestTeam(classify(['src/components/Card.tsx']), { 'src/components/Card.tsx': 40 }), ['forge-code-reviewer', 'forge-accessibility-specialist', 'forge-browser-qa']);
  assert.ok(suggestTeam(classify(['db/migrations/1.sql']), { 'db/migrations/1.sql': 5 }).includes('forge-database-engineer'));
  const big = suggestTeam(small, { 'server.mjs': 300, 'public/app.js': 200 });
  for (const a of ['forge-architect', 'forge-qa-lead', 'forge-browser-qa']) assert.ok(big.includes(a), a);
});

test('team selection follows the changed areas', () => {
  assert.deepEqual(suggestTeam(classify(['README.md'])), ['forge-code-reviewer']);
  const ui = suggestTeam(classify(['src/components/Button.tsx']));
  for (const a of ['forge-code-reviewer', 'forge-accessibility-specialist', 'forge-browser-qa']) assert.ok(ui.includes(a), a);
  assert.ok(suggestTeam(classify(['package-lock.json'])).includes('forge-security-engineer'));
  assert.ok(suggestTeam(classify(['api/routes/orders.py', 'models/order.py'])).includes('forge-architect'));
});

test('review lock: guard blocks source edits during a review, allows .forge/, expires', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-lock-'));
  try {
    const ev = (tool, file, extra = {}) => ({ tool_name: tool, cwd: dir, tool_input: { file_path: file }, ...extra });
    assert.equal(decide(ev('Edit', 'src/app.js'), 'agent').block, false, 'no lock, no block');
    setLock(dir, 'feature/login');
    assert.ok(readLock(dir));
    assert.equal(activeReviewRoot(path.join(dir, 'src')), dir, 'found from a subdirectory');
    for (const tool of ['Edit', 'Write', 'MultiEdit']) assert.equal(decide(ev(tool, 'src/app.js'), 'agent').block, true, tool);
    assert.equal(decide({ tool_name: 'NotebookEdit', cwd: dir, tool_input: { notebook_path: path.join(dir, 'nb.ipynb') } }, 'agent').block, true);
    assert.match(decide(ev('Write', path.join(dir, 'src', 'x.ts')), 'agent').reason, /review mode is read-only/);
    assert.equal(decide(ev('Write', '.forge/tasks/review-x/report.md'), 'agent').block, false, 'FORGE workspace is writable');
    assert.equal(decide(ev('Edit', 'src/app.js', { agent_type: 'Explore' }), 'plugin').block, false, 'non-FORGE agents are unaffected');
    const j = JSON.parse(fs.readFileSync(lockPath(dir), 'utf8')); j.createdAt = new Date(Date.now() - 4 * 3600e3).toISOString();
    fs.writeFileSync(lockPath(dir), JSON.stringify(j));
    assert.equal(decide(ev('Edit', 'src/app.js'), 'agent').block, false, 'a stale lock expires');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('hosting-platform writes are blocked; reads are allowed', () => {
  for (const c of ['gh pr review 12 --approve', 'gh pr comment 12 -b "lgtm"', 'gh pr edit 12 --add-label x', 'gh issue create -t bug', 'gh api repos/o/r/pulls/1/reviews -f event=APPROVE', 'gh api -X POST repos/o/r/issues', 'gh api --method=PATCH repos/o/r', 'glab mr approve 3', 'glab mr note 3 -m hi'])
    assert.ok(forbiddenOperation(c), `should block: ${c}`);
  for (const c of ['gh pr view 12 --json files', 'gh pr diff 12', 'gh pr checks 12', 'gh api repos/o/r/pulls/1', 'gh api -X GET repos/o/r/pulls/1/files', 'gh issue view 4', 'glab mr diff 3'])
    assert.equal(forbiddenOperation(c), null, `should allow: ${c}`);
});
