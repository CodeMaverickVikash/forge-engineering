// FORGE as middleware: the core decides, adapters only describe their host. These are contract tests with
// fixtures and simulated profiles; real-host behavior is covered by the live e2e scenarios (docs/testing.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CAPABILITIES, validateProfile, loadPlatform, strongTier, renderPlatformDoc, supports, preApprovalProblems, allowedTools } from '../../skills/forge/scripts/platform.mjs';
import { escalation, formatEscalation } from '../../skills/forge/scripts/review-target.mjs';
import { run, plan, formatReviewDecision, portStatus, urlStatus } from '../../skills/forge/scripts/validation-gate.mjs';
import { build } from '../../scripts/build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const profile = (host) => JSON.parse(fs.readFileSync(path.join(ROOT, 'adapters', host, 'platform.json'), 'utf8'));
const HOSTS = ['claude-code', 'antigravity'];
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));
const walk = (dir) => fs.readdirSync(dir, { recursive: true }).map(String).filter((f) => fs.statSync(path.join(dir, f)).isFile()).map((f) => f.split(path.sep).join('/'));
const body = (t) => t.replace(/\r\n/g, '\n').replace(/^---\n[\s\S]*?\n---\n/, '').replace(/^\n+/, '');

test('every shipped profile meets the contract and declares each capability', () => {
  for (const host of HOSTS) {
    const p = profile(host);
    assert.deepEqual(validateProfile(p), [], host);
    assert.deepEqual(Object.keys(p.capabilities).sort(), Object.keys(CAPABILITIES).sort(), `${host} declares exactly the contract`);
  }
});

test('Scenario A: both adapters ship the same core: identical policies, scripts and instructions', () => {
  const out = tmp('forge-build-');
  try {
    build(out, { docs: false });
    const [a, b] = HOSTS.map((h) => path.join(out, h));
    const shared = walk(path.join(a, 'skills')).filter((f) => fs.existsSync(path.join(b, 'skills', f)));
    assert.ok(shared.length > 100, 'the skills tree is shared');
    const differ = shared.filter((f) => {
      const [x, y] = [a, b].map((d) => fs.readFileSync(path.join(d, 'skills', f), 'utf8'));
      return f.endsWith('SKILL.md') ? body(x) !== body(y) : x !== y;
    });
    assert.deepEqual(differ.sort(), ['forge/core/platform.md', 'forge/platform.json'], 'only the host profile differs; SKILL.md differs only in frontmatter');
    for (const ag of fs.readdirSync(path.join(a, 'agents'))) {
      assert.equal(body(fs.readFileSync(path.join(a, 'agents', ag), 'utf8')), body(fs.readFileSync(path.join(b, 'agents', ag), 'utf8')), `${ag}: same role instructions on both hosts`);
    }
  } finally { fs.rmSync(out, { recursive: true, force: true }); }
});

test('Scenario A: the same change gets the same engineering decision on every host; only the native wording differs', () => {
  const files = ['services/api/auth/session.ts'];
  const [c, g] = HOSTS.map((h) => escalation(files, profile(h)));
  assert.deepEqual(c.roles, g.roles, 'same reviewers and testers');
  assert.deepEqual(c.areas, g.areas);
  assert.match(formatEscalation(c, profile('claude-code')), /with model opus/);
  assert.match(formatEscalation(g, profile('antigravity')), /can't pick a model per delegation .*record the escalation as unavailable/, 'no claim of an escalation the host cannot do');
});

test('Scenario B: a missing or corrupt host profile degrades to neutral wording; nothing claims a host', () => {
  const dir = tmp('forge-prof-');
  try {
    assert.equal(loadPlatform(path.join(dir, 'missing.json')), null);
    fs.writeFileSync(path.join(dir, 'bad.json'), '{ not json');
    assert.equal(loadPlatform(path.join(dir, 'bad.json')), null);
    fs.writeFileSync(path.join(dir, 'invalid.json'), JSON.stringify({ platform: 'x' }));
    assert.equal(loadPlatform(path.join(dir, 'invalid.json')), null, 'a profile that breaks the contract is not trusted');
    assert.match(strongTier(null, ['forge-code-reviewer']), /strong model tier/);
    assert.equal(supports(null, 'subagents'), false, 'unknown host: no capability is assumed');
    const cli = spawnSync(process.execPath, [path.join(ROOT, 'skills/forge/scripts/platform.mjs')], { encoding: 'utf8', env: { ...process.env, FORGE_PLATFORM_FILE: path.join(dir, 'missing.json') } });
    assert.equal(cli.status, 2);
    assert.match(cli.stderr, /UNAVAILABLE/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('Scenario C: capability detection: invalid declarations are rejected; unsupported ones carry a fallback', () => {
  const p = profile('claude-code');
  const broken = structuredClone(p);
  delete broken.capabilities.subagents;
  broken.capabilities.perCallModel = { status: 'unsupported' };
  broken.capabilities.teleport = { status: 'supported', native: 'x' };
  broken.capabilities.userQuestion = { status: 'maybe', native: 'x' };
  const problems = validateProfile(broken).join('\n');
  assert.match(problems, /capability subagents is not declared/);
  assert.match(problems, /perCallModel: an unsupported capability needs a fallback/);
  assert.match(problems, /teleport is not part of the contract/);
  assert.match(problems, /userQuestion: status must be one of/);

  const noModel = structuredClone(p);
  noModel.capabilities.perCallModel = { status: 'unsupported', fallback: 'record it' };
  assert.match(strongTier(noModel, ['forge-code-reviewer']), /can't pick a model per delegation/);
  const doc = renderPlatformDoc(profile('antigravity'));
  assert.match(doc, /\| gitGuardHook \| unsupported \| Fallback: /, 'the orchestrator sees the fallback, not a silent gap');
  assert.match(doc, /Verification: \*\*docs-only\*\*/, 'an unverified host says so');
});

test("Scenario G: FORGE pre-approves only its workflow, never history, dependency or deployment changes", () => {
  const bad = ['git commit*', 'git push*', 'git merge main*', 'pnpm add*', 'npm install*', 'npm publish*', 'pnpm*', '*', 'rm -rf *', 'terraform apply*',
    'node -e *', 'node C:/evil/scripts/*', 'node "C:/x/skills/forge/scripts/../../evil/*', 'python -c *', 'bash -c *', 'powershell -Command *',
    'git stash*', 'git stash pop*', 'git stash drop*'];
  assert.deepEqual(preApprovalProblems({ commands: ['git stash show*', 'git stash list*', 'git ls-tree*'] }), [], 'read-only stash and tree views are fine');
  for (const c of bad) assert.equal(preApprovalProblems({ commands: [c] }).length, 1, `${c} is refused`);
  const claude = profile('claude-code');
  assert.deepEqual(preApprovalProblems(claude.preApproved), [], 'the shipped set passes');
  const rules = allowedTools(claude);
  for (const r of ['Bash(pnpm --filter * exec vitest*)', 'PowerShell(pnpm test*)', 'Bash(git diff*)', 'mcp__playwright', 'mcp__chrome-devtools', 'Read(~/.claude/skills/forge*/**)']) assert.ok(rules.includes(r), r);
  assert.doesNotMatch(rules, /Bash\((git (commit|push)|pnpm add|npm (install|publish))/);
  const noPre = structuredClone(claude); delete noPre.preApproved;
  assert.match(validateProfile(noPre).join(';'), /preApproved\.commands must list/, 'a host claiming pre-approval must say exactly what');
});

test('the build writes each host its own profile, and the scripts read it at run time', () => {
  const out = tmp('forge-build-');
  try {
    build(out, { docs: false });
    for (const host of HOSTS) {
      const file = path.join(out, host, 'skills', 'forge', 'platform.json');
      assert.equal(loadPlatform(file)?.platform, host);
      const r = spawnSync(process.execPath, [path.join(out, host, 'skills', 'forge', 'scripts', 'platform.mjs'), '--json'], { encoding: 'utf8' });
      assert.equal(r.status, 0, r.stderr);
      assert.equal(JSON.parse(r.stdout).platform, host, 'an installed copy finds its own profile next to it');
    }
    assert.ok(fs.existsSync(path.join(out, 'claude-code', 'hooks', 'hooks.json')), 'the git guard ships where the host supports hooks');
    assert.ok(!fs.existsSync(path.join(out, 'antigravity', 'hooks')), 'and not where it does not');
    const skill = (h) => fs.readFileSync(path.join(out, h, 'skills', 'forge', 'SKILL.md'), 'utf8');
    assert.match(skill('claude-code'), /^allowed-tools: Read\(/m, 'Claude Code gets the pre-approved workflow');
    assert.doesNotMatch(skill('antigravity'), /allowed-tools/, 'a host without pre-approval gets no rules it cannot honor');
  } finally { fs.rmSync(out, { recursive: true, force: true }); }
});

const OK_JS = 'process.exit(0)\n';
function project(name) {
  const dir = tmp(`forge-${name}-`);
  const w = (f, c) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), c); };
  w('package.json', JSON.stringify({ name, scripts: { test: 'node ok.js', lint: 'node ok.js' } }));
  w('ok.js', OK_JS); w('src/a.js', 'export const a = 1;\n');
  const g = (...a) => spawnSync('git', ['-c', 'core.autocrlf=false', ...a], { cwd: dir });
  g('init', '-q'); g('add', '.'); g('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-qm', 'base');
  return { dir, w, g };
}

test('Scenario E: a later task reuses passes from the same commit and files, never across projects or commits', async () => {
  const one = project('one'); const two = project('two');
  try {
    one.w('src/a.js', 'export const a = 2;\n');
    two.w('src/a.js', 'export const a = 2;\n');
    const first = await run(one.dir, 'task-a');
    assert.equal(first.results.length, 2, 'type check-free project: lint and tests ran');
    const again = await run(one.dir, 'task-b', { baseline: true });
    assert.equal(again.results.length, 0, 'nothing re-ran');
    assert.deepEqual(again.reused.map((r) => `${r.check}<-${r.reusedFrom}`).sort(), ['lint<-task-a', 'test<-task-a']);
    const other = await run(two.dir, 'task-a');
    assert.equal(other.reused.length, 0, "another project's ledger is never read");
    assert.equal(other.results.length, 2);
    one.w('src/a.js', 'export const a = 3;\n');
    assert.equal((await run(one.dir, 'task-c')).reused.length, 0, 'changed files: no reuse');
    one.g('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-qam', 'next');
    one.w('src/a.js', 'export const a = 2;\n');
    assert.equal((await run(one.dir, 'task-d')).reused.length, 0, 'same files on a new commit: no reuse');
    assert.equal((await run(one.dir, 'task-e', { all: true })).reused.length, 0, '--all always re-runs');
  } finally { for (const p of [one, two]) fs.rmSync(p.dir, { recursive: true, force: true }); }
});

test('ports reports listening and free ports in one call', async () => {
  const srv = net.createServer().listen(0, '127.0.0.1');
  await new Promise((r) => srv.once('listening', r));
  const port = srv.address().port;
  try {
    const [open] = await portStatus([port], '127.0.0.1');
    assert.equal(open.listening, true);
  } finally { await new Promise((r) => srv.close(r)); }
  const [closed] = await portStatus([port], '127.0.0.1');
  assert.equal(closed.listening, false);
});

test('ports --urls gives local HTTP status in the same call, and never reaches the network', async () => {
  // Measured runs probed servers with `curl -o /dev/null -w "%{http_code}"`, a permission prompt every time.
  const srv = http.createServer((req, res) => { res.statusCode = req.url === '/health' ? 200 : 404; res.end(); }).listen(0, '127.0.0.1');
  await new Promise((r) => srv.once('listening', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  try {
    const [ok, missing, remote] = await urlStatus([`${base}/health`, `${base}/nope`, 'https://example.com/']);
    assert.equal(ok.status, 200);
    assert.equal(missing.status, 404);
    assert.equal(remote.status, null);
    assert.match(remote.error, /only http\(s\) URLs on this machine/);
  } finally { await new Promise((r) => srv.close(r)); }
});

test('the escalation line in a validation plan comes from the host profile', async () => {
  const { dir, w } = project('auth');
  try {
    w('src/auth/session.js', 'export const s = 1;\n');
    const p = await plan(dir);
    assert.match(formatReviewDecision(p, profile('claude-code')), /with model opus/);
    assert.match(formatReviewDecision(p, profile('antigravity')), /record the escalation as unavailable/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
