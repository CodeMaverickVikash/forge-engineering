#!/usr/bin/env node
// FORGE verification delta + line-ending guard. Zero dependencies, read-only toward git.
//
//   node verify-delta.mjs snapshot --task <slug> [--root <dir>] [--paths a,b]
//       Record the current content of every changed file as verification round N
//       (.forge/tasks/<slug>/verified/round-N/). Take one right before each verification wave.
//   node verify-delta.mjs delta --task <slug> [--root <dir>] [--stat] [--json]
//       Show only what changed since the latest snapshot. This is the fix delta a retest reviews.
//   node verify-delta.mjs eol [--root <dir>] [--json]
//       Flag changed files whose line endings flipped (LF<->CRLF) or became mixed versus git's
//       baseline. Exit 1 when any file is flagged.
//
// It never runs git commands that change the repository: only status, cat-file and diff --no-index.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const GIT_CFG = ['-c', 'core.autocrlf=false', '-c', 'core.safecrlf=false', '-c', 'core.quotepath=false'];

function git(root, args, { allowExit1 = false } = {}) {
  try {
    return execFileSync('git', [...GIT_CFG, ...args], { cwd: root, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    if (allowExit1 && e.status === 1 && e.stdout) return e.stdout;
    throw e;
  }
}

export function isGitRepo(root) {
  try { return git(root, ['rev-parse', '--is-inside-work-tree']).toString().trim() === 'true'; } catch { return false; }
}

/** Changed + untracked files relative to root, excluding the .forge workspace. */
// Output that browser tools write into the project on every action or test run: Playwright MCP snapshots,
// console logs and screenshots, and Playwright Test results. Untracked, they are never source; counting them
// made every passed check stale after browser QA and re-ran all suites.
export const TOOL_OUTPUT_RE =/(^|\/)(\.playwright-mcp|test-results|playwright-report|blob-report)\//;

export function changedFiles(root) {
  const out = git(root, ['status', '--porcelain=v1', '-z', '-uall', '--', '.']).toString();
  const parts = out.split('\0');
  const files = [];
  for (let i = 0; i < parts.length; i++) {
    const entry = parts[i];
    if (!entry) continue;
    const xy = entry.slice(0, 2);
    if (!(xy === '??' && TOOL_OUTPUT_RE.test(entry.slice(3)))) files.push(entry.slice(3));
    if (xy[0] === 'R' || xy[0] === 'C') i++; // -z rename/copy: next field is the source path
  }
  return [...new Set(files)].filter((f) => !f.startsWith('.forge/')).sort();
}

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const isBinary = (buf) => buf.subarray(0, 8000).includes(0);

/** 'none' | 'lf' | 'crlf' | 'mixed' | 'binary' */
export function eolStyle(buf) {
  if (isBinary(buf)) return 'binary';
  let crlf = 0, lf = 0;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 10) { if (i > 0 && buf[i - 1] === 13) crlf++; else lf++; }
  }
  if (!crlf && !lf) return 'none';
  if (crlf && lf) return 'mixed';
  return crlf ? 'crlf' : 'lf';
}

const taskDir = (root, task) => path.join(root, '.forge', 'tasks', task, 'verified');

function rounds(root, task) {
  const dir = taskDir(root, task);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).map((d) => /^round-(\d+)$/.exec(d)).filter(Boolean).map((m) => Number(m[1])).sort((a, b) => a - b);
}

function readIfFile(p) {
  try { return fs.statSync(p).isFile() ? fs.readFileSync(p) : null; } catch { return null; }
}

export function snapshot(root, task, paths) {
  const files = paths?.length ? paths : changedFiles(root);
  const n = (rounds(root, task).at(-1) ?? 0) + 1;
  const dir = path.join(taskDir(root, task), `round-${n}`);
  const manifest = { round: n, createdAt: new Date().toISOString(), files: [] };
  for (const f of files) {
    const buf = readIfFile(path.join(root, f));
    if (buf) {
      const dst = path.join(dir, 'files', f);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.writeFileSync(dst, buf);
    }
    manifest.files.push({ path: f, exists: !!buf, sha256: buf ? sha(buf) : null });
  }
  fs.mkdirSync(dir, { recursive: true });
  const ignore = path.join(root, '.forge', '.gitignore');
  if (!fs.existsSync(ignore)) fs.writeFileSync(ignore, '*\n'); // keep the FORGE workspace out of git
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

export function delta(root, task, { stat = false } = {}) {
  const n = rounds(root, task).at(-1);
  if (!n) throw new Error(`no snapshot for task "${task}"; run: snapshot --task ${task}`);
  const dir = path.join(taskDir(root, task), `round-${n}`);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  const known = new Map(manifest.files.map((f) => [f.path, f]));
  const candidates = new Set(known.keys());
  if (isGitRepo(root)) for (const f of changedFiles(root)) candidates.add(f);

  const rel = (p) => path.relative(root, p).split(path.sep).join('/');
  const changed = [];
  let patch = '';
  const bases = baselines(root, [...candidates].filter((f) => !known.has(f)));
  for (const f of [...candidates].sort()) {
    const cur = readIfFile(path.join(root, f));
    const entry = known.get(f);
    // A file that was unchanged at snapshot time was, at that moment, identical to git's baseline.
    let beforePath = null;
    if (entry?.exists) beforePath = path.join(dir, 'files', f);
    else if (!entry) {
      const base = bases.get(f) ?? null;
      if (base) {
        beforePath = path.join(dir, 'baseline', f);
        fs.mkdirSync(path.dirname(beforePath), { recursive: true });
        fs.writeFileSync(beforePath, base);
      }
    }
    const before = beforePath ? fs.readFileSync(beforePath) : null;
    if (before && cur && sha(cur) === sha(before)) continue;
    if (!before && !cur) continue;
    const status = !before ? 'added' : !cur ? 'deleted' : 'modified';
    changed.push({ path: f, status });
    const a = before ? rel(beforePath) : '/dev/null';
    const b = cur ? f : '/dev/null';
    if (stat) {
      const [add = '?', del = '?'] = git(root, ['diff', '--no-index', '--numstat', '--', a, b], { allowExit1: true }).toString().trim().split(/\s+/);
      patch += `${f} | +${add} -${del} (${status})\n`;
      continue;
    }
    const out = git(root, ['diff', '--no-index', '--no-color', '--', a, b], { allowExit1: true }).toString();
    // Show the project path instead of the snapshot copy's path.
    patch += before ? out.split(a).join(f) : out;
  }
  return { round: n, changed, patch };
}

/**
 * Git's baseline of each file: its committed content, else its staged content. One `git cat-file --batch` per
 * source instead of a `git show` per file: on Windows each process costs ~0.5 s, and a 110-file branch took 77 s.
 */
export function baselines(root, files) {
  const found = new Map();
  let pending = files.filter((f) => !/[\r\n]/.test(f)); // a batch line cannot carry a newline
  for (const prefix of ['HEAD:', ':']) {
    if (!pending.length) break;
    let buf;
    try {
      buf = execFileSync('git', [...GIT_CFG, 'cat-file', '--batch'], { cwd: root, input: pending.map((f) => prefix + f).join('\n') + '\n', maxBuffer: 1024 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch { break; }
    const missing = [];
    let pos = 0;
    for (const f of pending) {
      const nl = buf.indexOf(10, pos);
      if (nl < 0) { missing.push(f); continue; }
      const m = /^[0-9a-f]+ (\w+) (\d+)$/.exec(buf.subarray(pos, nl).toString());
      pos = nl + 1;
      if (!m) { missing.push(f); continue; } // "<spec> missing" (or ambiguous): try the next source
      const size = Number(m[2]);
      if (m[1] === 'blob') found.set(f, buf.subarray(pos, pos + size));
      pos += size + 1;
    }
    pending = missing;
  }
  return found;
}


export function eolCheck(root) {
  const results = [];
  const files = changedFiles(root);
  const bases = baselines(root, files);
  for (const f of files) {
    const cur = readIfFile(path.join(root, f));
    if (!cur) continue;
    const now = eolStyle(cur);
    if (now === 'binary') continue;
    const base = bases.get(f) ?? null;
    const was = base ? eolStyle(base) : null;
    let problem = null;
    if (now === 'mixed') problem = 'mixed line endings';
    else if (was && (was === 'lf' || was === 'crlf') && now !== 'none' && now !== was) problem = `line endings changed ${was.toUpperCase()} -> ${now.toUpperCase()}`;
    results.push({ path: f, baseline: was ?? 'new file', now, problem });
  }
  return { flagged: results.filter((r) => r.problem), checked: results.length };
}

function parseArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--stat' || a === '--json') o[a.slice(2)] = true;
    else if (a.startsWith('--')) o[a.slice(2)] = argv[++i];
    else o._.push(a);
  }
  return o;
}

function main() {
  const o = parseArgs(process.argv.slice(2));
  const cmd = o._[0];
  const root = path.resolve(o.root ?? '.');
  const paths = o.paths ? o.paths.split(',').map((s) => s.trim()).filter(Boolean) : null;
  const usage = 'usage: verify-delta.mjs snapshot|delta --task <slug> [--root <dir>] [--paths a,b] [--stat] [--json] | eol [--root <dir>] [--json]';
  if (!['snapshot', 'delta', 'eol'].includes(cmd)) { console.error(usage); process.exit(2); }
  if (!isGitRepo(root) && !(cmd === 'snapshot' && paths)) {
    console.error(`UNAVAILABLE: ${root} is not a git repository${cmd === 'snapshot' ? ' (pass --paths to snapshot explicit files)' : ''}`);
    process.exit(2);
  }
  if (cmd !== 'eol' && !o.task) { console.error(usage); process.exit(2); }

  if (cmd === 'snapshot') {
    const m = snapshot(root, o.task, paths);
    if (o.json) console.log(JSON.stringify(m, null, 2));
    else console.log(`verification round ${m.round}: snapshot of ${m.files.length} changed file(s)`);
  } else if (cmd === 'delta') {
    const d = delta(root, o.task, { stat: o.stat });
    if (o.json) console.log(JSON.stringify(d, null, 2));
    else if (!d.changed.length) console.log(`No changes since verification round ${d.round}.`);
    else {
      console.log(`Changes since verification round ${d.round}: ${d.changed.map((c) => `${c.path} (${c.status})`).join(', ')}\n`);
      process.stdout.write(d.patch);
    }
  } else {
    const r = eolCheck(root);
    if (o.json) console.log(JSON.stringify(r, null, 2));
    else if (!r.flagged.length) console.log(`EOL OK: ${r.checked} changed text file(s) keep their line endings.`);
    else for (const f of r.flagged) console.log(`EOL FLAG ${f.path}: ${f.problem} (baseline: ${f.baseline})`);
    process.exit(r.flagged.length ? 1 : 0);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try { main(); } catch (e) { console.error(`verify-delta: ${e.message}`); process.exit(2); }
}
