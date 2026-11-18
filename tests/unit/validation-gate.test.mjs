import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { plan, run, gate, mark, evidence, formatPlan } from '../../skills/forge/scripts/validation-gate.mjs';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../skills/forge/scripts/validation-gate.mjs');
const OK_JS = 'process.exit(0)\n';
const MAYBE_FAIL_JS = "process.exit(require('fs').existsSync(require('path').join(__dirname, 'FAIL')) ? 1 : 0)\n";

// A small monorepo: a shared UI package with prebuilt output, a Next.js app that consumes it,
// an Express API with an OpenAPI contract, and an Expo app.
function monorepo(extra = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-vg-'));
  const files = {
    '.gitignore': 'node_modules/\ndist/\n',
    'README.md': '# mono\n',
    'package.json': JSON.stringify({ name: 'mono', private: true, workspaces: ['packages/*', 'apps/*', 'services/*'] }),
    'packages/ui/package.json': JSON.stringify({ name: '@acme/ui', main: 'dist/index.js', scripts: { build: 'node ok.js', test: 'node t.js', 'test:watch': 'node t.js --watch' } }),
    'packages/ui/ok.js': OK_JS, 'packages/ui/t.js': MAYBE_FAIL_JS, 'packages/ui/src/index.js': 'export const a = 1;\n',
    'apps/web/package.json': JSON.stringify({ name: 'web', dependencies: { '@acme/ui': '*', next: '15.1.0', react: '19.0.0', 'react-dom': '19.0.0' }, scripts: { lint: 'node ok.js', test: 'node ok.js', build: 'node ok.js', dev: 'next dev' } }),
    'apps/web/next.config.js': 'module.exports = {};\n', 'apps/web/ok.js': OK_JS, 'apps/web/page.js': 'export default 1;\n',
    'services/api/package.json': JSON.stringify({ name: 'api', dependencies: { express: '4.21.0' }, scripts: { lint: 'eslint . --fix', test: 'node ok.js', build: 'npm publish' } }),
    'services/api/ok.js': OK_JS, 'services/api/openapi.yaml': 'openapi: 3.0.0\n', 'services/api/server.js': 'module.exports = 1;\n',
    'apps/mobile/package.json': JSON.stringify({ name: 'mobile', dependencies: { expo: '52.0.0', 'react-native': '0.76.0' }, scripts: { test: 'jest --watch' } }),
    'apps/mobile/app.json': '{"expo":{}}\n',
    ...extra,
  };
  for (const [f, s] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), s); }
  const g = (...a) => execFileSync('git', ['-c', 'core.autocrlf=false', ...a], { cwd: dir, stdio: 'pipe' });
  g('init', '-q'); g('add', '.'); g('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-qm', 'base');
  return dir;
}
const w = (dir, f, s) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), s); };
const entry = (p, unit) => p.entries.find((e) => e.unit === unit);
const check = (p, unit, key) => entry(p, unit)?.checks.find((c) => c.key === key);
const cli = (dir, ...a) => spawnSync(process.execPath, [SCRIPT, ...a, '--root', dir], { encoding: 'utf8' });
const clean = (dir) => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 });

test('plan scopes a shared-package change to the package and its consumers, with the next verification phase', async () => {
  const dir = monorepo();
  try {
    w(dir, 'packages/ui/src/index.js', 'export const a = 2;\n');
    const p = await plan(dir);
    assert.deepEqual(p.entries.map((e) => e.unit), ['apps/web', 'packages/ui']);
    assert.deepEqual(entry(p, 'apps/web').reasons, ['consumer of packages/ui']);
    assert.equal(check(p, 'apps/web', 'lint').status, 'N/A', 'a consumer whose own files are unchanged is not re-linted');
    assert.equal(check(p, 'apps/web', 'test').status, 'PENDING');
    assert.equal(check(p, 'packages/ui', 'test').command, 'npm run test', 'the exact test script wins over test:watch');
    assert.deepEqual(entry(p, 'apps/web').after, ['packages/ui'], 'prebuilt package builds before its consumer');
    assert.deepEqual(p.next.browser, ['apps/web']);
    assert.match(formatPlan(p), /After the gate opens: browser verification \(apps\/web\)/);
  } finally { clean(dir); }
});

test('run executes each check once, the gate opens, and only checks whose files changed go stale', async () => {
  const dir = monorepo();
  try {
    w(dir, 'packages/ui/src/index.js', 'export const a = 2;\n');
    const r1 = await run(dir, 't', { jobs: 2 });
    assert.deepEqual(r1.results.map((x) => `${x.unit}:${x.check}:${x.status}`).sort(),
      ['apps/web:build:PASSED', 'apps/web:test:PASSED', 'packages/ui:build:PASSED', 'packages/ui:test:PASSED']);
    assert.ok(r1.results.every((x) => fs.existsSync(path.join(dir, x.log))), 'every check leaves its full log as evidence');
    assert.equal(r1.gate.result, 'OPEN');
    assert.equal(cli(dir, 'gate', '--task', 't').status, 0);

    const r2 = await run(dir, 't');
    assert.equal(r2.results.length, 0, 'checks already passing for the current code are not re-run');
    assert.equal(r2.skipped.length, 4);

    w(dir, 'apps/web/page.js', 'export default 2;\n'); // only the web app changes
    const g = await gate(dir, 't');
    assert.equal(g.result, 'CLOSED');
    const state = Object.fromEntries(g.rows.map((x) => [`${x.unit}:${x.check}`, x.state]));
    assert.equal(state['apps/web:test'], 'STALE');
    assert.equal(state['apps/web:lint'], 'MISSING', 'own files changed now, so lint becomes required');
    assert.equal(state['packages/ui:test'], 'PASSED', 'upstream checks stay valid when only a consumer changed');
    assert.equal(cli(dir, 'gate', '--task', 't').status, 1);

    const r3 = await run(dir, 't');
    assert.deepEqual(r3.results.map((x) => `${x.unit}:${x.check}`).sort(), ['apps/web:build', 'apps/web:lint', 'apps/web:test']);
    assert.equal(r3.cycle, 2, 'a run that executed nothing does not count as a cycle');
    assert.equal(r3.gate.result, 'OPEN');
  } finally { clean(dir); }
});

test('a failing check closes the gate until fixed or recorded as PRE-EXISTING with a reason', async () => {
  const dir = monorepo();
  try {
    w(dir, 'packages/ui/FAIL', '1');
    await run(dir, 't', { units: ['packages/ui'], baseline: true });
    w(dir, 'packages/ui/src/index.js', 'export const a = 2;\n');
    const r = await run(dir, 't');
    const failed = r.results.find((x) => x.check === 'test' && x.unit === 'packages/ui');
    assert.equal(failed.status, 'FAILED');
    assert.equal(r.gate.result, 'CLOSED');
    assert.match(r.gate.rows.find((x) => x.unit === 'packages/ui' && x.check === 'test').hint, /PRE-EXISTING/);
    await assert.rejects(mark(dir, 't', { unit: 'packages/ui', check: 'test', status: 'PASSED', reason: 'ok' }), /evidence/);
    await mark(dir, 't', { unit: 'packages/ui', check: 'test', status: 'PRE-EXISTING', reason: 'fails identically on the baseline (FAIL marker)' });
    assert.equal((await gate(dir, 't')).result, 'OPEN');
  } finally { clean(dir); }
});

test('contract changes need a manual G6 check; --fix and watch scripts are never run; deploy builds are not required', async () => {
  const dir = monorepo();
  try {
    w(dir, 'services/api/openapi.yaml', 'openapi: 3.1.0\n');
    w(dir, 'apps/mobile/screen.js', 'export default 1;\n');
    const p = await plan(dir);
    assert.ok(entry(p, 'apps/web').reasons.includes('possible consumer of the changed API contract'));
    assert.equal(check(p, 'services/api', 'contract').manual, true);
    assert.match(check(p, 'services/api', 'lint').reason, /modifies files/);
    assert.equal(check(p, 'services/api', 'build').required, false);
    assert.match(check(p, 'services/api', 'build').reason, /deploys or publishes/);
    assert.match(check(p, 'apps/mobile', 'test').reason, /watch-mode/);
    assert.deepEqual(p.next.device, ['apps/mobile']);
    assert.deepEqual(p.next.api, ['services/api']);

    const r = await run(dir, 't');
    assert.ok(!r.results.some((x) => x.check === 'lint' && x.unit === 'services/api'), 'a --fix script is never executed');
    assert.ok(!r.results.some((x) => x.unit === 'apps/mobile'), 'a watch-mode script is never executed');
    assert.equal(r.gate.result, 'CLOSED');
    await mark(dir, 't', { unit: 'services/api', check: 'contract', status: 'PASSED', reason: 'openapi lint: 0 errors; additive change only' });
    await mark(dir, 't', { unit: 'services/api', check: 'lint', status: 'PASSED', reason: 'npx --no-install eslint . → 0 problems' });
    await mark(dir, 't', { unit: 'apps/mobile', check: 'test', status: 'PASSED', reason: 'npx --no-install jest --ci → 3 passed' });
    const g = await gate(dir, 't');
    assert.equal(g.result, 'OPEN');
    assert.equal(g.rows.find((x) => x.unit === 'services/api' && x.check === 'build').blocking, false);
  } finally { clean(dir); }
});

test('a missing toolchain is BLOCKED, not FAILED, and the gate reports BLOCKED with exit 2', async () => {
  const dir = monorepo({ 'tools/cli/package.json': JSON.stringify({ name: 'cli', scripts: { test: 'definitely-not-a-cmd-xyz --run' } }), 'tools/cli/main.js': '1\n' });
  try {
    w(dir, 'tools/cli/main.js', '2\n');
    const r = await run(dir, 't');
    assert.equal(r.results.find((x) => x.unit === 'tools/cli').status, 'BLOCKED');
    assert.equal(r.gate.result, 'BLOCKED');
    assert.equal(cli(dir, 'gate', '--task', 't').status, 2);
  } finally { clean(dir); }
});

test('documentation-only changes need no checks, and the gate is open', async () => {
  const dir = monorepo();
  try {
    w(dir, 'README.md', '# mono\nmore\n');
    const p = await plan(dir);
    assert.equal(p.docsOnly, true);
    assert.equal(p.entries.length, 0);
    assert.equal((await gate(dir, 't')).result, 'OPEN');
  } finally { clean(dir); }
});

test('evidence lists real files as links and flags an index that cites a missing file', () => {
  const dir = monorepo();
  try {
    const ev0 = evidence(dir, 't', { init: true });
    for (const d of ['screenshots', 'playwright', 'traces', 'network', 'reports']) assert.ok(fs.existsSync(path.join(ev0.absolute, d)));
    w(dir, '.forge/tasks/t/evidence/screenshots/after-cart-390.png', 'png');
    w(dir, '.forge/tasks/t/evidence/index.md', '- [after](screenshots/after-cart-390.png): cart, 390x844\n- `screenshots/before-cart-390.png`: before\n');
    const ev = evidence(dir, 't');
    assert.deepEqual(ev.links, ['[screenshots/after-cart-390.png](.forge/tasks/t/evidence/screenshots/after-cart-390.png)']);
    assert.deepEqual(ev.missing, ['screenshots/before-cart-390.png']);
    assert.equal(cli(dir, 'evidence', '--task', 't').status, 1);
    assert.equal(spawnSync('git', ['status', '--porcelain'], { cwd: dir, encoding: 'utf8' }).stdout.trim(), '', '.forge stays out of git');
  } finally { clean(dir); }
});

test('one run call validates and answers the gate; final checks everything phase 9 needs in one call', () => {
  const dir = monorepo();
  try {
    w(dir, 'packages/ui/src/index.js', '// This function is responsible for exporting a.\nexport const a = 2;\n');
    const r = cli(dir, 'run', '--task', 't');
    assert.equal(r.status, 0, 'run exits with the gate verdict (OPEN)');
    assert.match(r.stdout, /^Scope: apps\/web \[web\] \(consumer of packages\/ui\); packages\/ui \[shared\] \(changed files\)\. After the gate: browser apps\/web\./m);
    assert.match(r.stdout, /Pre-browser gate: OPEN/);
    assert.doesNotMatch(r.stdout, /packages\/ui:test PASSED \(cycle/, 'passing rows are summarized, not listed');

    const f = cli(dir, 'final', '--task', 't');
    assert.equal(f.status, 1, 'a comment error makes the final check fail');
    assert.match(f.stdout, /\| Web: apps\/web \| N\/A \| N\/A \| PASSED \| PASSED \|/);
    assert.match(f.stdout, /\| Shared: packages\/ui \| N\/A \| UNAVAILABLE \| PASSED \| PASSED \|/);
    assert.match(f.stdout, /✗ comment packages\/ui\/src\/index\.js:1 \[restates-code\]/);
    assert.match(f.stdout, /FINAL: NOT READY: 1 comment error\(s\)/);

    w(dir, 'packages/ui/src/index.js', '// Consumers import the built output, so keep this export stable.\nexport const a = 2;\n');
    const stale = cli(dir, 'final', '--task', 't');
    assert.match(stale.stdout, /FINAL: NOT READY: gate CLOSED/, 'an edit after the last run makes the checks stale');
    cli(dir, 'run', '--task', 't');
    const ok = cli(dir, 'final', '--task', 't');
    assert.equal(ok.status, 0);
    assert.match(ok.stdout, /FINAL: READY to report\./);
  } finally { clean(dir); }
});

test('CLI rejects a bad task slug and a non-git folder without a stack trace', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-vg-nogit-'));
  try {
    const bad = cli(dir, 'gate', '--task', '../x');
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /usage/);
    const nogit = cli(dir, 'plan', '--task', 't');
    assert.equal(nogit.status, 2);
    assert.match(nogit.stderr, /UNAVAILABLE: .* not a git repository/);
    assert.doesNotMatch(nogit.stderr, /at .*\.mjs:\d+/);
  } finally { clean(dir); }
});
