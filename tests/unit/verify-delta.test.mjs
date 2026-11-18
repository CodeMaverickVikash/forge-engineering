import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { snapshot, delta, eolCheck, eolStyle, changedFiles, baselines } from '../../skills/forge/scripts/verify-delta.mjs';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../skills/forge/scripts/verify-delta.mjs');

function repo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-vd-'));
  const g = (...a) => execFileSync('git', ['-c', 'core.autocrlf=false', ...a], { cwd: dir, stdio: 'pipe' });
  g('init', '-q');
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src/app.js'), 'a\nb\nc\n');
  fs.writeFileSync(path.join(dir, 'keep.js'), 'x\n');
  fs.writeFileSync(path.join(dir, 'win.txt'), 'one\r\ntwo\r\n');
  g('add', '.');
  g('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-qm', 'base');
  return dir;
}
const w = (dir, f, s) => fs.writeFileSync(path.join(dir, f), s);

test('eolStyle classifies line endings', () => {
  assert.equal(eolStyle(Buffer.from('a\nb\n')), 'lf');
  assert.equal(eolStyle(Buffer.from('a\r\nb\r\n')), 'crlf');
  assert.equal(eolStyle(Buffer.from('a\r\nb\n')), 'mixed');
  assert.equal(eolStyle(Buffer.from('abc')), 'none');
  assert.equal(eolStyle(Buffer.from([0, 1, 10])), 'binary');
});

test('delta shows only changes made after the snapshot, and ignores .forge/', () => {
  const dir = repo();
  try {
    w(dir, 'src/app.js', 'a\nB\nc\n');
    w(dir, 'added.js', 'new\n');
    assert.deepEqual(changedFiles(dir), ['added.js', 'src/app.js']);
    assert.equal(snapshot(dir, 't').round, 1);
    assert.equal(delta(dir, 't').changed.length, 0, 'nothing changed since the snapshot');

    w(dir, 'src/app.js', 'a\nB2\nc\n'); // modified again after the snapshot
    w(dir, 'keep.js', 'x\ny\n');        // untouched at snapshot time, so it is diffed against git's baseline
    w(dir, 'later.js', 'brand\n');      // new after the snapshot
    fs.rmSync(path.join(dir, 'added.js'));
    const d = delta(dir, 't');
    assert.deepEqual(d.changed, [
      { path: 'added.js', status: 'deleted' },
      { path: 'keep.js', status: 'modified' },
      { path: 'later.js', status: 'added' },
      { path: 'src/app.js', status: 'modified' },
    ]);
    assert.match(d.patch, /-B\n\+B2/);
    assert.doesNotMatch(d.patch, /-a\n/, 'lines unchanged since the snapshot are not in the delta');
    assert.doesNotMatch(d.patch, /\.forge\//, 'paths are shown as project paths');

    assert.equal(snapshot(dir, 't').round, 2);
    assert.equal(delta(dir, 't').changed.length, 0, 'a new round starts from a clean delta');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('untracked browser tool output is not a changed file; tracked files in those folders still are', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-vd-'));
  try {
    const g = (...a) => execFileSync('git', ['-c', 'core.autocrlf=false', ...a], { cwd: dir, stdio: 'pipe' });
    const w = (f, s) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), s); };
    w('test-results/fixture.json', '{}\n');
    g('init', '-q'); g('add', '.'); g('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-qm', 'base');
    w('.playwright-mcp/page-1.yml', 'x\n'); w('apps/web/.playwright-mcp/page-2.png', 'x');
    w('apps/web/test-results/run/trace.zip', 'x'); w('playwright-report/index.html', 'x'); w('blob-report/r.zip', 'x');
    w('src/app.js', 'x\n'); w('test-results/fixture.json', '{"edited":true}\n');
    assert.deepEqual(changedFiles(dir), ['src/app.js', 'test-results/fixture.json']);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('eol flags flipped and mixed line endings and exits 1', () => {
  const dir = repo();
  try {
    w(dir, 'src/app.js', 'a\r\nb\r\nc\r\n'); // LF -> CRLF
    w(dir, 'win.txt', 'one\r\ntwo\r\nthree\r\n'); // CRLF kept: fine
    w(dir, 'new.js', 'p\r\nq\n'); // new and mixed
    const r = eolCheck(dir);
    assert.deepEqual(r.flagged.map((f) => [f.path, f.problem]), [
      ['new.js', 'mixed line endings'],
      ['src/app.js', 'line endings changed LF -> CRLF'],
    ]);
    let code = 0;
    try { execFileSync(process.execPath, [SCRIPT, 'eol', '--root', dir], { stdio: 'pipe' }); } catch (e) { code = e.status; }
    assert.equal(code, 1);

    w(dir, 'src/app.js', 'a\nb\nc\nd\n');
    w(dir, 'new.js', 'p\nq\n');
    const out = execFileSync(process.execPath, [SCRIPT, 'eol', '--root', dir], { encoding: 'utf8' });
    assert.match(out, /^EOL OK/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('CLI reports a missing snapshot and a non-git folder without a stack trace', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-vd-nogit-'));
  try {
    const run = (args) => { try { execFileSync(process.execPath, [SCRIPT, ...args], { stdio: 'pipe' }); return { status: 0 }; } catch (e) { return { status: e.status, err: e.stderr.toString() }; } };
    const r1 = run(['delta', '--task', 'x', '--root', dir]);
    assert.equal(r1.status, 2);
    assert.match(r1.err, /UNAVAILABLE: .* not a git repository/);
    const g = repo();
    const r2 = run(['delta', '--task', 'nope', '--root', g]);
    assert.equal(r2.status, 2);
    assert.match(r2.err, /no snapshot for task "nope"/);
    assert.doesNotMatch(r2.err, /at delta/);
    fs.rmSync(g, { recursive: true, force: true });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('baselines reads committed, then staged content in one batch per source, byte for byte', () => {
  const dir = repo();
  try {
    const g = (...a) => execFileSync('git', ['-c', 'core.autocrlf=false', ...a], { cwd: dir, stdio: 'pipe' });
    fs.writeFileSync(path.join(dir, 'with space.txt'), 'old\r\n');
    g('add', '.'); g('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-qm', 'more');
    w(dir, 'with space.txt', 'new\n');
    w(dir, 'staged.js', 'staged\n'); g('add', 'staged.js'); w(dir, 'staged.js', 'edited after staging\n');
    w(dir, 'untracked.js', 'u\n');
    const b = baselines(dir, ['win.txt', 'with space.txt', 'staged.js', 'untracked.js', 'src/app.js']);
    assert.equal(b.get('win.txt').toString(), 'one\r\ntwo\r\n', 'committed CRLF bytes are kept');
    assert.equal(b.get('with space.txt').toString(), 'old\r\n');
    assert.equal(b.get('staged.js').toString(), 'staged\n', 'a new file falls back to its staged content');
    assert.equal(b.has('untracked.js'), false, 'an untracked file has no baseline');
    assert.equal(b.get('src/app.js').toString(), 'a\nb\nc\n');
    assert.equal(baselines(dir, []).size, 0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
