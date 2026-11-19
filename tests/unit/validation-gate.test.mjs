import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { plan, run, gate, mark, evidence, resumeTarget, visualResults, visualCheck, devtoolsCheck, shotBudget, affectedCommand, formatPlan, formatScope, formatGate, resolveCommand, taskBase } from '../../skills/forge/scripts/validation-gate.mjs';

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
      ['apps/web:test:PASSED', 'packages/ui:build:PASSED', 'packages/ui:test:PASSED'],
      "the app's production build is left to the user; the package's runs because its consumer imports the output");
    assert.deepEqual(r1.deferred, []);
    assert.ok(r1.results.every((x) => fs.existsSync(path.join(dir, x.log))), 'every check leaves its full log as evidence');
    assert.equal(r1.gate.result, 'OPEN');
    const buildRow = r1.gate.rows.find((x) => x.unit === 'apps/web' && x.check === 'build');
    assert.equal(buildRow.state, 'N/A');
    assert.equal(buildRow.userBuild, true, 'the production build is the user\'s, with its command kept for the answer');
    assert.equal(buildRow.blocking, false);
    assert.equal((await gate(dir, 't', { final: true })).result, 'OPEN', 'the final gate never requires a build that type check or tests cover');
    assert.equal(cli(dir, 'gate', '--task', 't').status, 0);

    const r2 = await run(dir, 't');
    assert.equal(r2.results.length, 0, 'checks already passing for the current code are not re-run');
    assert.equal(r2.skipped.length, 3);

    const rb = await run(dir, 't', { full: true });
    assert.deepEqual(rb.results, [], '--full never runs a production build left to the user');
    assert.equal(rb.gate.result, 'OPEN');

    w(dir, 'apps/web/page.js', 'export default 2;\n'); // only the web app changes
    const g = await gate(dir, 't');
    assert.equal(g.result, 'CLOSED');
    const state = Object.fromEntries(g.rows.map((x) => [`${x.unit}:${x.check}`, x.state]));
    assert.equal(state['apps/web:test'], 'STALE');
    assert.equal(state['apps/web:lint'], 'MISSING', 'own files changed now, so lint becomes required');
    assert.equal(state['packages/ui:test'], 'PASSED', 'upstream checks stay valid when only a consumer changed');
    assert.equal(cli(dir, 'gate', '--task', 't').status, 1);

    const r3 = await run(dir, 't');
    assert.deepEqual(r3.results.map((x) => `${x.unit}:${x.check}`).sort(), ['apps/web:lint', 'apps/web:test']);
    assert.equal(r3.cycle, 2, 'a run that executed nothing does not count as a cycle');
    assert.equal(r3.gate.result, 'OPEN');
  } finally { clean(dir); }
});

test("scripts run with the project's package manager, falling back to npm only when it is not installed", () => {
  const script = (command, name) => ({ command, source: `package.json#scripts.${name}` });
  const only = (...bins) => (b) => bins.includes(b);
  assert.equal(resolveCommand(script('pnpm typecheck', 'typecheck'), only('pnpm', 'npm')), 'pnpm typecheck');
  assert.equal(resolveCommand(script('pnpm typecheck', 'typecheck'), only('npm')), 'npm run typecheck');
  assert.equal(resolveCommand(script('yarn test', 'test'), only('npm')), 'npm run test');
  assert.equal(resolveCommand(script('bun run build', 'build'), only('npm')), 'npm run build');
  assert.equal(resolveCommand(script('npm run lint', 'lint'), only()), 'npm run lint');
  assert.equal(resolveCommand({ command: 'pnpm exec tsc --noEmit', source: 'inferred: tsconfig.json' }, only('npm')), 'pnpm exec tsc --noEmit', 'only package.json scripts fall back');
});

test('a native shell nested in a JS app is not that app\'s consumer, so a JS change never requires its native build', async () => {
  const dir = monorepo({
    'apps/mobile/android/settings.gradle': "rootProject.name = 'mobile'\ninclude ':app'\n",
    'apps/mobile/android/build.gradle': 'buildscript {}\n',
    'apps/mobile/android/gradlew': '#!/bin/sh\n',
    'apps/mobile/android/app/build.gradle': 'apply plugin: "com.android.application"\napply from: file("../../node_modules/@react-native-community/cli-platform-android/native_modules.gradle")\n',
  });
  try {
    w(dir, 'apps/mobile/screen.js', 'export default 2;\n');
    const p = await plan(dir);
    const shell = p.units.find((u) => u.path === 'apps/mobile/android/app');
    assert.ok(shell, 'the fixture is detected as a nested native unit');
    assert.ok(!shell.deps.has('apps/mobile'));
    assert.deepEqual(p.entries.map((e) => e.unit), ['apps/mobile']);
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

test('a check that fails in two cycles asks for Opus root-cause analysis; the first failure does not', async () => {
  const dir = monorepo();
  try {
    w(dir, 'packages/ui/FAIL', '1');
    w(dir, 'packages/ui/src/index.js', 'export const a = 2;\n');
    const first = (await run(dir, 't')).gate.rows.find((x) => x.unit === 'packages/ui' && x.check === 'test');
    assert.equal(first.state, 'FAILED');
    assert.equal(first.escalate, undefined, 'one failure is routine: the owner fixes it on its own model');
    w(dir, 'packages/ui/src/index.js', 'export const a = 3;\n'); // an attempted fix that did not hold
    const second = (await run(dir, 't')).gate.rows.find((x) => x.unit === 'packages/ui' && x.check === 'test');
    assert.equal(second.escalate, true);
    assert.match(second.hint, /failed in 2 cycles.*strong model tier/);
  } finally { clean(dir); }
});

test('browser tool artifacts in the project do not make passed checks stale', async () => {
  // Playwright MCP writes page snapshots, console logs and screenshots to ./.playwright-mcp/ after every action.
  // In a project that does not gitignore it, those files used to change the fingerprint, so the gate went STALE
  // after browser QA and every suite ran again before `final`.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-vg-'));
  try {
    w(dir, 'package.json', JSON.stringify({ name: 'single', scripts: { test: 'node ok.js' } }));
    w(dir, 'ok.js', OK_JS); w(dir, 'src/a.js', 'export const a = 1;\n');
    const g = (...a) => execFileSync('git', ['-c', 'core.autocrlf=false', ...a], { cwd: dir, stdio: 'pipe' });
    g('init', '-q'); g('add', '.'); g('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-qm', 'base');
    w(dir, 'src/a.js', 'export const a = 2;\n');
    assert.equal((await run(dir, 't')).gate.result, 'OPEN');
    w(dir, '.playwright-mcp/page-2026-11-18T10-59-14-043Z.yml', '- main [ref=e2]\n');
    w(dir, '.playwright-mcp/console-2026-11-18T10-59-13-859Z.log', 'error\n');
    w(dir, 'test-results/journey/trace.zip', 'x');
    w(dir, 'playwright-report/index.html', '<html></html>');
    const after = await gate(dir, 't');
    assert.equal(after.result, 'OPEN', 'tool output is not a code change');
    assert.ok(!after.rows.some((r) => r.state === 'STALE'));
    w(dir, 'src/a.js', 'export const a = 3;\n');
    assert.equal((await gate(dir, 't')).result, 'CLOSED', 'a real edit still makes the result stale');
  } finally { clean(dir); }
});

test('code review is required only for auth, payment or schema changes, scoped to those files', async () => {
  const dir = monorepo();
  try {
    w(dir, 'packages/ui/src/index.js', 'export const a = 2;\n');
    const routine = await plan(dir);
    assert.equal(routine.escalation, null);
    assert.match(formatScope(routine), /Code review: not required .*only if the user asked/);
    w(dir, 'services/api/auth/session.js', 'module.exports = 2;\n');
    const p = await plan(dir);
    assert.deepEqual(p.escalation.areas, { auth: ['services/api/auth/session.js'] });
    assert.match(formatPlan(p), /Code review: required for auth \(1\), on these files only: services\/api\/auth\/session\.js\. Launch forge-code-reviewer, forge-security-engineer, forge-test-automation-engineer on the strong model tier \(core\/platform\.md names it\) \(core\/delegation\.md#model-escalation\)\.\n/, 'one sentence, one period');
    assert.doesNotMatch(formatScope(p, { orchestrator: false }), /Code review/, 'implementers cannot launch agents, so their --units runs skip the line');
    const units = cli(dir, 'run', '--task', 't', '--units', 'services/api');
    assert.doesNotMatch(units.stdout, /Code review/);
  } finally { clean(dir); }
});

test('--base adds what the branch committed, is kept for the task, and is validated', async () => {
  const dir = monorepo();
  try {
    const g = (...a) => execFileSync('git', ['-c', 'core.autocrlf=false', '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', ...a], { cwd: dir, stdio: 'pipe' });
    g('branch', 'base');
    w(dir, 'services/api/server.js', 'module.exports = 2;\n'); g('commit', '-qam', 'branch work');
    w(dir, 'packages/ui/src/index.js', 'export const a = 2;\n'); // uncommitted
    assert.deepEqual((await plan(dir)).entries.map((e) => e.unit), ['apps/web', 'packages/ui'], 'without a base the committed API change is invisible');
    const r = await run(dir, 't', { base: 'base', checks: ['lint'] });
    assert.ok(r.plan.entries.some((e) => e.unit === 'services/api'), 'the branch commit puts the API in scope');
    assert.equal(r.plan.base, 'base');
    const later = await gate(dir, 't');
    assert.ok(later.scope.some((s) => s.unit === 'services/api'), 'gate keeps the stored base');
    assert.throws(() => taskBase(dir, 'x', '--output=/tmp/x'), /not a git ref/);
    await assert.rejects(run(dir, 'y', { base: 'no-such-branch' }), /git diff no-such-branch\.\.\.HEAD failed/);
  } finally { clean(dir); }
});

test('a production build covered by tests never runs; a build that rewrites a tracked file does not stale other checks', async () => {
  // Measured runs: `--all` rebuilt mobile (173s) and web every cycle, and the web build rewrote the sitemap's
  // lastmod, which made every web check stale and cost a full extra cycle. Builds that tests cover are the user's.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-vg-'));
  try {
    const stamp = "require('fs').writeFileSync('public/sitemap.xml', '<lastmod>' + Date.now() + '</lastmod>\\n')\n";
    w(dir, 'package.json', JSON.stringify({ name: 'site', scripts: { test: 'node ok.js', build: 'node stamp.js' } }));
    w(dir, 'ok.js', OK_JS); w(dir, 'stamp.js', stamp); w(dir, 'public/sitemap.xml', '<lastmod>0</lastmod>\n'); w(dir, 'src/a.js', '1\n');
    const g = (...a) => execFileSync('git', ['-c', 'core.autocrlf=false', ...a], { cwd: dir, stdio: 'pipe' });
    g('init', '-q'); g('add', '.'); g('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-qm', 'base');
    w(dir, 'src/a.js', '2\n');
    for (const opts of [{ all: true }, { full: true }, { build: true }]) {
      const r = await run(dir, 't', opts);
      assert.ok(!r.results.some((x) => x.column === 'build'), `${JSON.stringify(opts)} never runs a build that tests cover`);
    }
    // The build as the only compile step (no type check, no tests) still runs every cycle.
    w(dir, 'package.json', JSON.stringify({ name: 'site', scripts: { build: 'node stamp.js' } }));
    g('add', 'package.json'); g('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-qm', 'build only');
    const built = await run(dir, 't');
    assert.deepEqual(built.sideEffects, [{ check: '.:build', file: 'public/sitemap.xml' }]);
    assert.deepEqual(built.modifiedDuringRun, [], 'a build output is not an edit made during the run');
    assert.equal(built.gate.result, 'OPEN');
    w(dir, 'public/sitemap.xml', '<lastmod>hand edit</lastmod>\n');
    assert.ok((await gate(dir, 't')).rows.some((r) => r.state === 'STALE'), 'a later edit of that file counts again');
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
    for (const d of ['network', 'reports']) assert.ok(fs.existsSync(path.join(ev0.absolute, d)));
    for (const d of ['screenshots/before', 'screenshots/after', 'screenshots/responsive', 'screenshots/workflows', 'traces']) assert.ok(fs.existsSync(path.join(dir, '.playwright-mcp/t', d)), d);
    w(dir, '.playwright-mcp/t/screenshots/after/cart-390.png', 'png');
    w(dir, '.forge/tasks/t/evidence/index.md', '- [after](screenshots/after/cart-390.png): cart, 390x844\n- `screenshots/before/cart-390.png`: before\n');
    const ev = evidence(dir, 't');
    assert.deepEqual(ev.links, ['[screenshots/after/cart-390.png](.playwright-mcp/t/screenshots/after/cart-390.png)'], 'screenshots live in .playwright-mcp/<task>/, linked from the project root');
    assert.deepEqual(ev.missing, ['screenshots/before/cart-390.png']);
    assert.equal(cli(dir, 'evidence', '--task', 't').status, 1);
    assert.equal(spawnSync('git', ['status', '--porcelain'], { cwd: dir, encoding: 'utf8' }).stdout.trim(), '', ".forge and the task's screenshots stay out of git");
  } finally { clean(dir); }
});

test('a screenshot saved anywhere in the task folder counts, so nothing has to be moved before final', () => {
  // A measured run spent two minutes and five permission prompts moving screenshots into screenshots/after/.
  const dir = monorepo();
  try {
    w(dir, '.playwright-mcp/t/j1-auto-picked-1440.png', 'png');
    w(dir, '.playwright-mcp/t/traces/trace.png', 'png');
    const ev = evidence(dir, 't');
    assert.deepEqual(ev.screenshots, ['.playwright-mcp/t/j1-auto-picked-1440.png'], 'traces are not screenshots');
    assert.match(ev.visual, /\[View j1 auto picked 1440\]\(\.playwright-mcp\/t\/j1-auto-picked-1440\.png\)/);
  } finally { clean(dir); }
});

test('resume finds the stopped task that owns the working tree, not the newest report', async () => {
  // A measured re-run read a newer VERIFIED report whose code had been stashed, and started a new pass over
  // a BLOCKED task's tree instead of finishing it.
  const dir = monorepo();
  try {
    assert.equal(await resumeTarget(dir), null, 'a clean tree has nothing to resume');
    w(dir, 'apps/web/page.js', 'export default 2;\n');
    assert.equal(cli(dir, 'run', '--task', 'a').status, 0);
    w(dir, '.forge/tasks/a/report.md', '**Completion status:** BLOCKED. The last fix was never checked.\n');
    w(dir, 'apps/web/page.js', 'export default 3;\n');
    assert.equal(cli(dir, 'run', '--task', 'b').status, 0);
    w(dir, '.forge/tasks/b/report.md', '**Completion status:** VERIFIED\n');
    w(dir, 'apps/web/page.js', 'export default 2;\n'); // b's code stashed, a's restored
    const r = await resumeTarget(dir);
    assert.equal(r.task, 'a'); assert.equal(r.resume, true); assert.deepEqual(r.matched, ['apps/web']);
    assert.match(cli(dir, 'resume').stdout, /^RESUME a: its report says BLOCKED/);
    w(dir, '.forge/tasks/a/report.md', '**Completion status:** VERIFIED WITH LIMITATIONS\n');
    assert.equal((await resumeTarget(dir)).resume, false, 'a finished task is built on, not resumed');
    w(dir, 'apps/web/page.js', 'export default 4;\n');
    assert.match(cli(dir, 'resume').stdout, /^NEW TASK: no FORGE task owns/);
  } finally { clean(dir); }
});

test('one run call validates and answers the gate; final checks everything phase 9 needs in one call', async () => {
  const dir = monorepo();
  try {
    w(dir, 'packages/ui/src/index.js', '// This function is responsible for exporting a.\nexport const a = 2;\n');
    const r = cli(dir, 'run', '--task', 't');
    assert.equal(r.status, 0, 'run exits with the gate verdict (OPEN)');
    assert.match(r.stdout, /^Scope: apps\/web \[web\] \(consumer of packages\/ui\); packages\/ui \[shared\] \(changed files\)\. After the gate: browser apps\/web\./m);
    assert.match(r.stdout, /Pre-browser gate: OPEN/);
    assert.doesNotMatch(r.stdout, /packages\/ui:test PASSED \(cycle/, 'passing rows are summarized, not listed');
    assert.doesNotMatch(r.stdout, /DEFERRED|apps\/web:build/, 'no build is pending or deferred');
    assert.match(r.stdout, /✗ comment packages\/ui\/src\/index\.js:1 \[restates-code\][\s\S]*Fix these comments now/, 'comment errors surface in the author\'s run, not first in final');
    const other = await run(dir, 't', { units: ['apps/web'], checks: ['test'] });
    assert.deepEqual(other.commentErrors, [], "an implementer's run shows only its own units' comments");

    const pending = cli(dir, 'final', '--task', 't');
    assert.doesNotMatch(pending.stdout, /apps\/web:build (MISSING|STALE)/, 'the final check never requires the production build');
    assert.match(pending.stdout, /Production build: not run by FORGE .*`npm run build` \(apps\/web\)/, 'final hands the build command to the user');
    const b = cli(dir, 'run', '--task', 't', '--build');
    assert.equal(b.status, 0);
    assert.match(b.stdout, /ran 0 check\(s\), 3 already passing/, '--build (old name of --full) runs no build');
    assert.match(b.stdout, /Final gate \(full test suites\): OPEN/);

    const f = cli(dir, 'final', '--task', 't');
    assert.equal(f.status, 1, 'a comment error makes the final check fail');
    assert.match(f.stdout, /\| Web: apps\/web \| N\/A \| N\/A \| PASSED \| N\/A \|/);
    assert.match(f.stdout, /\| Shared: packages\/ui \| N\/A \| UNAVAILABLE \| PASSED \| PASSED \|/);
    assert.match(f.stdout, /✗ comment packages\/ui\/src\/index\.js:1 \[restates-code\]/);
    assert.match(f.stdout, /FINAL: NOT READY: 1 comment error\(s\)/);

    w(dir, 'packages/ui/src/index.js', '// Consumers import the built output, so keep this export stable.\nexport const a = 2;\n');
    const stale = cli(dir, 'final', '--task', 't');
    assert.match(stale.stdout, /FINAL: NOT READY: gate CLOSED/, 'an edit after the last run makes the checks stale');
    cli(dir, 'run', '--task', 't', '--build');
    const noShot = cli(dir, 'final', '--task', 't');
    assert.equal(noShot.status, 1);
    assert.match(noShot.stdout, /FINAL: NOT READY: no screenshot of the final state \(apps\/web\)/, 'a browser-visible change needs visual evidence');
    w(dir, '.playwright-mcp/t/screenshots/after/board.png', 'png');
    const noDevtools = cli(dir, 'final', '--task', 't');
    assert.match(noDevtools.stdout, /FINAL: NOT READY: no DevTools console\/network record/, 'screenshots alone are not browser verification');
    w(dir, '.forge/tasks/t/evidence/devtools.md', '- /: no console errors; 0 failed requests\n');
    const ok = cli(dir, 'final', '--task', 't');
    assert.equal(ok.status, 0);
    assert.match(ok.stdout, /### Visual Results[\s\S]*\| board \| \[View board\]\(\.playwright-mcp\/t\/screenshots\/after\/board\.png\) \|/);
    assert.match(ok.stdout, /FINAL: READY to report\./);
  } finally { clean(dir); }
});

test('a test-only change needs no browser or device verification; a runtime change does', async () => {
  const dir = monorepo();
  try {
    w(dir, 'apps/web/page.test.js', 'test("x", () => {});\n');
    const p = await plan(dir);
    assert.deepEqual(p.next.browser, [], 'nothing new to see in a browser');
    const g = await gate(dir, 't');
    const ev = evidence(dir, 't');
    assert.equal(visualCheck(dir, 't', g, ev), null, 'no screenshot is required');
    assert.equal(devtoolsCheck(dir, 't', g, ev), null);
    w(dir, 'packages/ui/src/index.js', 'export const a = 2;\n');
    assert.deepEqual((await plan(dir)).next.browser, ['apps/web'], 'a changed upstream package is runtime impact for its web consumer');
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

// One package whose checks sleep for the given milliseconds (argv[2]).
const SLEEP_JS = 'setTimeout(() => {}, Number(process.argv[2]) || 0);\n';
function solo(ms) {
  const scripts = Object.fromEntries(Object.entries(ms).map(([k, v]) => [k, `node sleep.js ${v}`]));
  return monorepo({ 'packages/solo/package.json': JSON.stringify({ name: 'solo', scripts }), 'packages/solo/sleep.js': SLEEP_JS, 'packages/solo/src/a.js': 'export const a = 1;\n' });
}
const interval = (r) => ({ check: r.check, end: Date.parse(r.at), start: Date.parse(r.at) - r.durationMs });
const ledgerRows = (dir, cycle) => fs.readFileSync(path.join(dir, '.forge/tasks/t/validation/ledger.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).filter((r) => r.cycle === cycle && r.unit === 'packages/solo');

test("a unit's package.json checks run side by side; its production build is left to the user", async () => {
  const dir = solo({ typecheck: 1500, lint: 1500, test: 1500, build: 0 });
  try {
    w(dir, 'packages/solo/src/a.js', 'export const a = 2;\n');
    const r = await run(dir, 't', { jobs: 4, full: true });
    assert.deepEqual(r.results.filter((x) => x.unit === 'packages/solo').map((x) => `${x.check}:${x.status}`).sort(), ['lint:PASSED', 'test:PASSED', 'typecheck:PASSED']);
    const checks = ledgerRows(dir, r.cycle).map(interval);
    assert.ok(Math.max(...checks.map((x) => x.start)) < Math.min(...checks.map((x) => x.end)), 'type check, lint and tests overlap instead of queueing');
  } finally { clean(dir); }
});

test('a build that is the unit\'s only compile step still runs, after its other checks', async () => {
  const dir = solo({ lint: 1500, build: 0 });
  try {
    w(dir, 'packages/solo/src/a.js', 'export const a = 2;\n');
    const r = await run(dir, 't', { jobs: 4 });
    assert.deepEqual(r.results.filter((x) => x.unit === 'packages/solo').map((x) => `${x.check}:${x.status}`).sort(), ['build:PASSED', 'lint:PASSED']);
    const rows = ledgerRows(dir, r.cycle).map(interval);
    assert.ok(rows.find((x) => x.check === 'build').start >= rows.find((x) => x.check === 'lint').end - 50, 'the build starts after the other checks end');
  } finally { clean(dir); }
});

test('the longest check starts first, by default and then by its recorded duration', async () => {
  const dir = solo({ typecheck: 1500, lint: 0, test: 0 });
  try {
    w(dir, 'packages/solo/src/a.js', 'export const a = 2;\n');
    const r1 = await run(dir, 't', { jobs: 1, units: ['packages/solo'] });
    assert.equal(ledgerRows(dir, r1.cycle)[0].check, 'test', 'with no history, tests go first');
    w(dir, 'packages/solo/src/a.js', 'export const a = 3;\n');
    const r2 = await run(dir, 't', { jobs: 1, units: ['packages/solo'] });
    assert.equal(ledgerRows(dir, r2.cycle)[0].check, 'typecheck', 'the slowest check last cycle goes first');
  } finally { clean(dir); }
});

test('one run per task: a second run waits for the first, a dead holder is ignored, BUSY after the wait limit', async () => {
  const dir = solo({ test: 0 });
  const lock = path.join(dir, '.forge/tasks/t/validation/run.lock');
  const holder = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)']);
  try {
    w(dir, 'packages/solo/src/a.js', 'export const a = 2;\n');
    fs.mkdirSync(path.dirname(lock), { recursive: true });
    fs.writeFileSync(lock, JSON.stringify({ pid: holder.pid, startedAt: new Date().toISOString() }));
    const g = await gate(dir, 't');
    assert.equal(g.running.pid, holder.pid);
    assert.match(formatGate(g), /in progress .*never start a second run/);

    await assert.rejects(run(dir, 't', { units: ['packages/solo'], waitMs: 1200 }), (e) => e.code === 'BUSY');
    const waits = [];
    const waiting = run(dir, 't', { units: ['packages/solo'], waitMs: 30000, onWait: (h) => waits.push(h.pid) });
    await new Promise((r) => setTimeout(r, 1500));
    holder.kill();
    const r = await waiting;
    assert.deepEqual(waits, [holder.pid], 'it says once whom it waits for');
    assert.equal(r.results.length, 1, 'then it runs');
    assert.equal(fs.existsSync(lock), false, 'and releases the lock');
    assert.equal((await gate(dir, 't')).running, null);
  } finally { holder.kill(); clean(dir); }
});

test('visual evidence: before/after rows from real files; the final-state shot must postdate the last code edit', async () => {
  const dir = monorepo();
  try {
    w(dir, 'apps/web/page.js', 'export default 2;\n');
    const shots = ['.playwright-mcp/t/screenshots/before/login-fix.png', '.playwright-mcp/t/screenshots/after/login-fix.png', '.playwright-mcp/t/screenshots/responsive/login-390.png'];
    const table = visualResults(dir, shots, '- `screenshots/after/login-fix.png`: login button no longer hidden by the keyboard\n');
    assert.match(table, /^### Visual Results/);
    assert.ok(table.includes('| login button no longer hidden by the keyboard | [View before](.playwright-mcp/t/screenshots/before/login-fix.png) · [View after](.playwright-mcp/t/screenshots/after/login-fix.png) |'), table);
    assert.ok(table.includes('| login 390 | [View login 390](.playwright-mcp/t/screenshots/responsive/login-390.png) |'), 'a screenshot with no index line gets a readable name');
    assert.equal(visualResults(dir, []), '', 'no screenshots, no table: nothing is invented');

    const g = await gate(dir, 't');
    const ev = () => evidence(dir, 't');
    assert.match(visualCheck(dir, 't', g, ev()), /no screenshot of the final state \(apps\/web\)/);
    w(dir, shots[0], 'png');
    assert.match(visualCheck(dir, 't', g, ev()), /no screenshot of the final state/, 'a before shot alone does not show the result');
    w(dir, shots[1], 'png');
    assert.equal(visualCheck(dir, 't', g, ev()), null);
    const later = new Date(Date.now() + 60000);
    fs.utimesSync(path.join(dir, 'apps/web/page.js'), later, later);
    assert.match(visualCheck(dir, 't', g, ev()), /screenshots predate the last code change \(apps\/web\/page\.js\)/);
    w(dir, '.forge/tasks/t/evidence/index.md', '- Visual evidence unavailable: Playwright MCP is not connected\n');
    assert.equal(visualCheck(dir, 't', g, ev()), null, 'an honest, stated limitation is accepted');
  } finally { clean(dir); }
});

test('affectedCommand narrows only plain vitest and jest scripts', () => {
  assert.equal(affectedCommand({ body: 'vitest run', command: 'pnpm test' }), 'pnpm exec vitest run --changed --passWithNoTests');
  assert.equal(affectedCommand({ body: 'vitest run', command: 'pnpm test' }, 'main'), 'pnpm exec vitest run --changed main --passWithNoTests');
  assert.equal(affectedCommand({ body: 'jest --ci', command: 'npm run test' }), 'npx --no-install jest --ci --onlyChanged --passWithNoTests');
  assert.equal(affectedCommand({ body: 'jest', command: 'yarn test' }, 'main'), 'npx --no-install jest --changedSince=main --passWithNoTests');
  for (const body of ['turbo test', 'vitest run && node x.js', 'npm run unit', 'vitest --ui', 'vitest bench', 'NODE_ENV=test jest', 'node t.js']) assert.equal(affectedCommand({ body, command: 'npm run test' }), null, body);
});

// A fake vitest that records its arguments outside the repo, so the call log never changes the code fingerprint.
const FAKE_VITEST = {
  'packages/lib/node_modules/vitest/package.json': JSON.stringify({ name: 'vitest', version: '0.0.0', bin: { vitest: 'cli.js' } }),
  'packages/lib/node_modules/vitest/cli.js': "require('fs').appendFileSync(process.env.FAKE_VITEST_LOG, process.argv.slice(2).join(' ') + String.fromCharCode(10));\n",
  'packages/lib/node_modules/.bin/vitest': '#!/bin/sh\nexec node "$(dirname "$0")/../vitest/cli.js" "$@"\n',
  'packages/lib/node_modules/.bin/vitest.cmd': '@node "%~dp0/../vitest/cli.js" %*\r\n',
};

test('a low-risk change is final with its related tests; no full suite runs', async () => {
  const dir = monorepo({ 'packages/lib/package.json': JSON.stringify({ name: 'lib', scripts: { test: 'vitest run' } }), 'packages/lib/src/a.js': 'export const a = 1;\n', ...FAKE_VITEST });
  const log = path.join(dir, '..', path.basename(dir) + '-vitest.log');
  process.env.FAKE_VITEST_LOG = log;
  const calls = () => (fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n') : []);
  try {
    w(dir, 'packages/lib/src/a.js', 'export const a = 2;\n');
    await run(dir, 't', { units: ['packages/lib'] });
    assert.deepEqual(calls(), ['run --changed --passWithNoTests']);
    const row = (await gate(dir, 't', { final: true })).rows.find((x) => x.unit === 'packages/lib' && x.check === 'test');
    assert.equal(row.state, 'PASSED', 'the runner traced the related tests through the module graph; that is enough here');
    const again = await run(dir, 't', { units: ['packages/lib'], full: true });
    assert.deepEqual(again.results, [], '--full has nothing to add for a low-risk change');
    assert.deepEqual(calls(), ['run --changed --passWithNoTests']);
  } finally { delete process.env.FAKE_VITEST_LOG; fs.rmSync(log, { force: true }); clean(dir); }
});

test('auth, payment or schema changes: fix cycles run the related tests; the final gate needs the full suite', async () => {
  const dir = monorepo({ 'packages/lib/package.json': JSON.stringify({ name: 'lib', scripts: { test: 'vitest run' } }), 'packages/lib/src/auth/session.js': 'export const a = 1;\n', ...FAKE_VITEST });
  const log = path.join(dir, '..', path.basename(dir) + '-vitest.log');
  process.env.FAKE_VITEST_LOG = log;
  const calls = () => (fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n') : []);
  try {
    w(dir, 'packages/lib/src/auth/session.js', 'export const a = 2;\n');
    const r1 = await run(dir, 't', { units: ['packages/lib'] });
    assert.equal(r1.results[0].status, 'PASSED', r1.results[0].tail);
    assert.deepEqual(calls(), ['run --changed --passWithNoTests'], 'a fix cycle runs only the related tests');
    assert.equal((await gate(dir, 't')).result, 'OPEN', 'which is enough for the browser');
    const fin = await gate(dir, 't', { final: true });
    assert.equal(fin.rows.find((x) => x.unit === 'packages/lib' && x.check === 'test').state, 'MISSING', 'but not for the final gate of an auth change');

    const full = await run(dir, 't', { units: ['packages/lib'], full: true });
    assert.deepEqual(full.results.map((x) => `${x.check}:${x.status}`), ['test:PASSED']);
    assert.deepEqual(calls().slice(1), ['run'], '--full runs the full suite once');
    assert.equal((await gate(dir, 't', { final: true })).rows.find((x) => x.unit === 'packages/lib' && x.check === 'test').state, 'PASSED');
  } finally { delete process.env.FAKE_VITEST_LOG; fs.rmSync(log, { force: true }); clean(dir); }
});

test('with a changed upstream package, related tests run only after a full pass has seen that upstream state', async () => {
  // packages/lib consumes packages/ui (prebuilt), the shape of an app consuming a changed shared contract.
  const dir = monorepo({ 'packages/lib/package.json': JSON.stringify({ name: 'lib', dependencies: { '@acme/ui': '*' }, scripts: { test: 'vitest run' } }), 'packages/lib/src/a.js': 'export const a = 1;\n', ...FAKE_VITEST });
  const log = path.join(dir, '..', path.basename(dir) + '-vitest.log');
  process.env.FAKE_VITEST_LOG = log;
  const last = () => fs.readFileSync(log, 'utf8').trim().split('\n').at(-1);
  try {
    w(dir, 'packages/ui/src/index.js', 'export const a = 2;\n');
    w(dir, 'packages/lib/src/a.js', 'export const a = 2;\n');
    assert.equal(check(await plan(dir), 'packages/lib', 'test').affectedNeedsProof, true);
    const libTest = async (final) => (await gate(dir, 't', { final })).rows.find((x) => x.unit === 'packages/lib' && x.check === 'test');
    await run(dir, 't', { units: ['packages/lib'], checks: ['test'] });
    assert.equal(last(), 'run --changed --passWithNoTests', 'the related tests first: they open the pre-browser gate quickly');
    assert.equal((await libTest(false)).state, 'PASSED');
    const owed = await libTest(true);
    assert.equal(owed.state, 'MISSING', "but final needs a full pass: the lib's tests can't trace the package's changed sources");
    assert.match(owed.reason, /a package it uses changed/);
    await run(dir, 't', { units: ['packages/lib'], checks: ['test'], full: true });
    assert.equal(last(), 'run', '--full runs the suite the final gate still needs');
    assert.equal((await libTest(true)).state, 'PASSED');
    w(dir, 'packages/lib/src/a.js', 'export const a = 3;\n');
    await run(dir, 't', { units: ['packages/lib'], checks: ['test'] });
    assert.equal(last(), 'run --changed --passWithNoTests');
    assert.equal((await libTest(true)).state, 'PASSED', 'with the package unchanged since that full pass, the related tests are final');
    w(dir, 'packages/ui/src/index.js', 'export const a = 4;\n');
    await run(dir, 't', { units: ['packages/lib'], checks: ['test'] });
    assert.equal((await libTest(true)).state, 'MISSING', 'a new package change owes a full pass again');
    w(dir, 'packages/ui/src/index.js', 'export const a = 5;\n');
    await run(dir, 't', { units: ['packages/lib'], checks: ['test'], serial: true });
    assert.equal(last(), 'run', '--serial runs that full pass in the foreground instead');
  } finally { delete process.env.FAKE_VITEST_LOG; fs.rmSync(log, { force: true }); clean(dir); }
});

test('the full pass a consumer owes runs in the background while browser QA starts, and --full waits for it', async () => {
  // A measured run held browser QA for a 148 s full web suite; now the gate opens on the related tests.
  const dir = monorepo({ 'packages/lib/package.json': JSON.stringify({ name: 'lib', dependencies: { '@acme/ui': '*' }, scripts: { test: 'vitest run' } }), 'packages/lib/src/a.js': 'export const a = 1;\n', ...FAKE_VITEST });
  const log = path.join(dir, '..', path.basename(dir) + '-vitest.log');
  process.env.FAKE_VITEST_LOG = log;
  try {
    w(dir, 'packages/ui/src/index.js', 'export const a = 2;\n');
    w(dir, 'packages/lib/src/a.js', 'export const a = 2;\n');
    const r = cli(dir, 'run', '--task', 't');
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /Pre-browser gate: OPEN/);
    assert.match(r.stdout, /Full suites for [^\n]*packages\/lib:test[^\n]* are now running in the background \(pid \d+/);
    const fin = cli(dir, 'run', '--task', 't', '--full');
    assert.equal(fin.status, 0, fin.stdout + fin.stderr);
    assert.match(fin.stdout, /Final gate \(full test suites\): OPEN/);
    assert.ok(fs.readFileSync(log, 'utf8').split('\n').includes('run'), 'the full suite ran once, in the background');
    const serial = cli(dir, 'run', '--task', 't2', '--serial');
    assert.doesNotMatch(serial.stdout, /in the background/, '--serial keeps everything in the foreground');
  } finally { delete process.env.FAKE_VITEST_LOG; fs.rmSync(log, { force: true }); clean(dir); }
});

test('--help prints every option, so nobody reads the script source to learn them', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-vg-help-'));
  try {
    for (const s of ['validation-gate.mjs', 'verify-delta.mjs', 'comment-check.mjs', 'review-target.mjs']) {
      const r = spawnSync(process.execPath, [path.join(path.dirname(SCRIPT), s), '--help'], { cwd: dir, encoding: 'utf8' });
      assert.equal(r.status, 0, s);
      assert.match(r.stdout, /node \S+\.mjs/, `${s} prints its usage`);
      assert.doesNotMatch(r.stdout, /^(import|const|function) /m, `${s} prints only the documented header`);
    }
    assert.match(cli(dir, '--help').stdout, /run --task <slug>[\s\S]*final --task <slug>/);
    assert.match(cli(dir, 'bogus').stderr, /--help lists every option/);
  } finally { clean(dir); }
});

test('at most half the slots run test suites, and a suite that timed out under load is re-run alone once', async () => {
  // FLAKY_MARK lives outside the repo: the first call "times out" like an overloaded vitest run, the second passes.
  const flaky = "const fs=require('fs');const m=process.env.FLAKY_MARK;if(!fs.existsSync(m)){fs.writeFileSync(m,'1');console.log('Error: Test timed out in 5000ms.');process.exit(1)}\n";
  const dir = monorepo({
    'packages/a/package.json': JSON.stringify({ name: 'a', scripts: { test: 'node sleep.js 1500' } }), 'packages/a/sleep.js': SLEEP_JS, 'packages/a/src/x.js': '1;\n',
    'packages/b/package.json': JSON.stringify({ name: 'b', scripts: { test: 'node sleep.js 1500' } }), 'packages/b/sleep.js': SLEEP_JS, 'packages/b/src/x.js': '1;\n',
    'packages/c/package.json': JSON.stringify({ name: 'c', scripts: { test: 'node sleep.js 1500' } }), 'packages/c/sleep.js': SLEEP_JS, 'packages/c/src/x.js': '1;\n',
    'packages/f/package.json': JSON.stringify({ name: 'f', scripts: { test: 'node flaky.js' } }), 'packages/f/flaky.js': flaky, 'packages/f/src/x.js': '1;\n',
    'packages/g/package.json': JSON.stringify({ name: 'g', scripts: { test: 'node fail.js' } }), 'packages/g/fail.js': "console.log('expected 2, got 3');process.exit(1)\n", 'packages/g/src/x.js': '1;\n',
  });
  const mark = path.join(dir, '..', path.basename(dir) + '-flaky');
  process.env.FLAKY_MARK = mark;
  try {
    for (const u of ['a', 'b', 'c', 'f', 'g']) w(dir, `packages/${u}/src/x.js`, '2;\n');
    const r = await run(dir, 't', { jobs: 4, units: ['packages/a', 'packages/b', 'packages/c', 'packages/f', 'packages/g'] });
    const rows = fs.readFileSync(path.join(dir, '.forge/tasks/t/validation/ledger.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    const spans = rows.filter((x) => ['packages/a', 'packages/b', 'packages/c'].includes(x.unit)).map(interval);
    const overlap = Math.max(...spans.map((s) => spans.filter((o) => o.start <= s.start && s.start < o.end).length)); // suites running at each start
    assert.equal(overlap, 2, 'with 4 slots, at most 2 suites run at once');
    const f = rows.filter((x) => x.unit === 'packages/f');
    assert.deepEqual(f.map((x) => x.status), ['PASSED'], 'the timed-out attempt is not recorded as a verdict');
    assert.match(f[0].reason, /re-run alone after timing out under load/);
    const g = r.results.filter((x) => x.unit === 'packages/g');
    assert.deepEqual(g.map((x) => x.status), ['FAILED'], 'a real failure is reported once, never retried');
  } finally { delete process.env.FLAKY_MARK; fs.rmSync(mark, { force: true }); clean(dir); }
});

test('the Visual Results table shows at most 8 rows, pairs first, and evidence flags shots over budget', () => {
  // The shape of a measured run: 17 before shots and 16 after shots, only some of them pairs.
  const before = Array.from({ length: 17 }, (_, i) => `.playwright-mcp/t/screenshots/before/${String(i + 1).padStart(2, '0')}-screen.png`);
  const after = [1, 3, 6, 7, 8, 10, 11, 14, 15].map((i) => `.playwright-mcp/t/screenshots/after/${String(i).padStart(2, '0')}-screen.png`)
    .concat(['15b', '15c', '15d', '15e', '16x', '18', '19'].map((n) => `.playwright-mcp/t/screenshots/after/${n}-extra.png`));
  const table = visualResults('.', [...before, ...after]);
  const rows = table.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| What'));
  assert.equal(rows.length, 9, '8 rows plus the folder link');
  assert.ok(rows.slice(0, 8).every((r) => r.includes('[View before]') && r.includes('[View after]')), 'before/after pairs come first');
  assert.match(rows[8], /^\| 17 more screenshot\(s\) \| \[Open the folder\]\(\.playwright-mcp\/t\/screenshots\/\) \|$/);
  assert.deepEqual(shotBudget([...before, ...after]), ['17 before screenshots (budget 3: only the screens the change touches)', '16 final-state screenshots (budget about 8: one per changed screen and state)']);
  assert.deepEqual(shotBudget(before.slice(0, 3).concat(after.slice(0, 5))), []);
});

test('devtoolsCheck: a browser-visible change needs a DevTools record or a stated reason', async () => {
  const dir = monorepo();
  try {
    w(dir, 'apps/web/page.js', 'export default 2;\n');
    const g = await gate(dir, 't');
    const ev = () => evidence(dir, 't');
    assert.match(devtoolsCheck(dir, 't', g, ev()), /no DevTools console\/network record/);
    w(dir, '.forge/tasks/t/evidence/index.md', '- DevTools unavailable: the Chrome DevTools MCP is not connected\n');
    assert.equal(devtoolsCheck(dir, 't', g, ev()), null, 'a stated reason is accepted (and the answer may not say browser-verified)');
    w(dir, '.forge/tasks/t/evidence/index.md', '');
    w(dir, '.forge/tasks/t/reports/browser-qa-2.md', 'SUMMARY: Chrome DevTools MCP only.\n### Console / network\n- Console: no errors.\n');
    assert.match(devtoolsCheck(dir, 't', g, ev()), /no DevTools console\/network record/, 'a report without the network record is not enough');
    w(dir, '.forge/tasks/t/reports/browser-qa-2.md', 'SUMMARY: Chrome DevTools MCP only.\n### Console / network\n- Console: no errors.\n- Network: all 200/304.\n');
    assert.equal(devtoolsCheck(dir, 't', g, ev()), null, "a parallel QA pass's own report with both records counts");
    fs.rmSync(path.join(dir, '.forge/tasks/t/reports'), { recursive: true });
    w(dir, '.forge/tasks/t/evidence/devtools.md', '- /studio: no new console errors\n');
    assert.equal(devtoolsCheck(dir, 't', g, ev()), null);
    w(dir, 'apps/web/page.js', 'export default 1;\n');
    w(dir, 'services/api/server.js', 'module.exports = 2;\n');
    assert.equal(devtoolsCheck(dir, 't', await gate(dir, 't'), ev()), null, 'a backend-only change needs no browser record');
  } finally { clean(dir); }
});
