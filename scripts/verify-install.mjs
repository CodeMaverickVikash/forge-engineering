#!/usr/bin/env node
// Verifies a FORGE install against the current build in dist/. Zero dependencies, read-only.
//
//   node scripts/verify-install.mjs [--target claude|antigravity|all] [--scope user|project] [--project DIR] [--absent] [--json]
//
// Installed mode checks, per target:
//   - the install manifest exists and its version matches the repository VERSION;
//   - every file of the fresh build is installed byte-for-byte (allowing only the installer's hook-path substitution),
//     with nothing missing and no stale FORGE files left over;
//   - Claude Code: every agent and the forge skill carry the git-guard hook, the hook path points to an existing
//     guard script, and that guard actually blocks `git commit` and allows `git status`.
// --absent checks that an uninstall left nothing behind: no manifest and no file from the build.
// Paths mirror scripts/install.sh (CLAUDE_CONFIG_DIR and FORGE_ANTIGRAVITY_HOME are honoured).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKEN = '${CLAUDE_PLUGIN_ROOT}/skills/forge';

export function targetRoots({ target = 'claude', scope = 'user', project = process.cwd(), home = os.homedir(), env = process.env } = {}) {
  const out = [];
  const want = target === 'all' ? ['claude', 'antigravity'] : String(target).split(',');
  if (want.includes('claude')) out.push({ name: 'claude', dist: 'claude-code', root: scope === 'project' ? path.join(project, '.claude') : (env.CLAUDE_CONFIG_DIR || path.join(home, '.claude')), workflow: null });
  if (want.includes('antigravity')) out.push(scope === 'project'
    ? { name: 'antigravity', dist: 'antigravity', root: path.join(project, '.agents'), workflow: 'workflows/forge.md' }
    : { name: 'antigravity', dist: 'antigravity', root: env.FORGE_ANTIGRAVITY_HOME || path.join(home, '.gemini', 'config'), workflow: 'global_workflows/forge.md' });
  return out;
}

function listFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? listFiles(p, base) : [path.relative(base, p).split(path.sep).join('/')];
  });
}

/** Expected installed files (relative to the target root) → expected content (Buffer), from the fresh build. */
function expectedFiles(t) {
  const src = path.join(ROOT, 'dist', t.dist);
  const files = new Map();
  for (const s of fs.readdirSync(path.join(src, 'skills'))) for (const f of listFiles(path.join(src, 'skills', s))) files.set(`skills/${s}/${f}`, path.join(src, 'skills', s, f));
  for (const a of fs.readdirSync(path.join(src, 'agents'))) files.set(`agents/${a}`, path.join(src, 'agents', a));
  if (t.workflow) files.set(t.workflow, path.join(src, 'workflows', 'forge.md'));
  return files;
}

const norm = (p) => p.replace(/\\/g, '/');

export function verifyTarget(t, { absent = false } = {}) {
  const problems = []; const info = {};
  const expected = expectedFiles(t);
  const manifest = path.join(t.root, 'skills', 'forge', '.forge-install-manifest');
  if (absent) {
    if (fs.existsSync(manifest)) problems.push(`install manifest still present: ${manifest}`);
    const left = [...expected.keys()].filter((f) => fs.existsSync(path.join(t.root, f)));
    if (left.length) problems.push(`${left.length} FORGE file(s) still installed, e.g. ${left.slice(0, 3).join(', ')}`);
    return { target: t.name, root: t.root, ok: !problems.length, problems, info };
  }
  if (!fs.existsSync(manifest)) return { target: t.name, root: t.root, ok: false, problems: [`not installed (no manifest at ${manifest})`], info };
  const head = fs.readFileSync(manifest, 'utf8').split(/\r?\n/)[0];
  const version = fs.readFileSync(path.join(ROOT, 'VERSION'), 'utf8').trim();
  info.manifestVersion = (head.match(/manifest\s+(\S+)/) || [])[1];
  if (info.manifestVersion !== version) problems.push(`installed version ${info.manifestVersion} != repository ${version}`);

  const guardHome = norm(path.join(t.root, 'skills', 'forge'));
  let identical = 0; const mismatched = []; const missing = [];
  for (const [rel, srcFile] of expected) {
    const dst = path.join(t.root, rel);
    if (!fs.existsSync(dst)) { missing.push(rel); continue; }
    let want = fs.readFileSync(srcFile); const got = fs.readFileSync(dst);
    if (t.name === 'claude' && want.includes(TOKEN)) {
      // The installer writes the absolute guard path; accept exactly that substitution.
      const gotText = got.toString('utf8');
      const m = gotText.match(/node "([^"]+)\/scripts\/git-guard\.mjs"/);
      const home = m ? m[1] : guardHome;
      want = Buffer.from(want.toString('utf8').split(TOKEN).join(home).split(TOKEN.replace(/\//g, '\\')).join(home.replace(/\//g, '\\')));
    }
    if (Buffer.compare(want, got) === 0) identical++; else mismatched.push(rel);
  }
  if (missing.length) problems.push(`${missing.length} file(s) missing, e.g. ${missing.slice(0, 3).join(', ')}`);
  if (mismatched.length) problems.push(`${mismatched.length} file(s) differ from the current build (stale install?), e.g. ${mismatched.slice(0, 3).join(', ')}`);
  // Stale FORGE files: present in the install's FORGE folders but not in the current build.
  const forgeDirs = [...new Set([...expected.keys()].filter((k) => k.startsWith('skills/')).map((k) => k.split('/').slice(0, 2).join('/')))];
  const extra = forgeDirs.flatMap((d) => listFiles(path.join(t.root, d)).map((f) => `${d}/${f}`)).filter((f) => !expected.has(f) && !f.endsWith('.forge-install-manifest'));
  if (extra.length) problems.push(`${extra.length} stale file(s) not in the current build, e.g. ${extra.slice(0, 3).join(', ')}`);
  info.files = { expected: expected.size, identical };

  if (t.name === 'claude') {
    const hooked = [...expected.keys()].filter((k) => /^agents\/.*\.md$/.test(k) || k === 'skills/forge/SKILL.md');
    const paths = new Set(); const unhooked = [];
    for (const k of hooked) {
      const p = path.join(t.root, k); if (!fs.existsSync(p)) continue;
      const m = fs.readFileSync(p, 'utf8').match(/node "([^"]+git-guard\.mjs)" --scope (agent|skill)/);
      if (!m) unhooked.push(k); else paths.add(m[1]);
    }
    if (unhooked.length) problems.push(`${unhooked.length} file(s) without the git-guard hook, e.g. ${unhooked.slice(0, 3).join(', ')}`);
    if ([...paths].some((p) => p.includes('${'))) problems.push('hook path still contains the unresolved ${CLAUDE_PLUGIN_ROOT} token');
    for (const p of paths) if (!fs.existsSync(p)) problems.push(`hook points to a missing guard script: ${p}`);
    info.guardPaths = [...paths];
    const guard = [...paths][0];
    if (guard && fs.existsSync(guard)) {
      const run = (command) => spawnSync(process.execPath, [guard, '--scope', 'agent'], { input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }), encoding: 'utf8' }).status;
      info.guardBlocksCommit = run('git commit -m probe') === 2;
      info.guardAllowsStatus = run('git status') === 0;
      if (!info.guardBlocksCommit) problems.push('installed guard did not block `git commit`');
      if (!info.guardAllowsStatus) problems.push('installed guard blocked `git status`');
    }
    for (const s of ['git-guard.mjs', 'review-target.mjs', 'verify-delta.mjs', 'validation-gate.mjs', 'comment-check.mjs']) {
      const p = path.join(t.root, 'skills', 'forge', 'scripts', s);
      if (fs.existsSync(p) && spawnSync(process.execPath, ['--check', p]).status !== 0) problems.push(`${s} does not parse`);
    }
  }
  return { target: t.name, root: t.root, ok: !problems.length, problems, info };
}

function main() {
  const a = process.argv.slice(2);
  const opt = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
  const results = targetRoots({ target: opt('--target', 'claude'), scope: opt('--scope', 'user'), project: path.resolve(opt('--project', process.cwd())) })
    .map((t) => verifyTarget(t, { absent: a.includes('--absent') }));
  if (a.includes('--json')) console.log(JSON.stringify(results, null, 2));
  else for (const r of results) {
    const what = a.includes('--absent') ? 'fully removed' : `installed and current (${r.info.files?.identical}/${r.info.files?.expected} files identical to the build${r.info.guardBlocksCommit ? '; guard blocks git commit' : ''})`;
    console.log(`${r.ok ? '✓' : '✖'} ${r.target} at ${r.root}: ${r.ok ? what : 'FAILED'}`);
    for (const p of r.problems) console.log(`    - ${p}`);
  }
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
