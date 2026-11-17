#!/usr/bin/env node
// FORGE skill installer: copies ONE approved, OSS-licensed third-party skill into Claude Code and/or Antigravity (Node >= 18).
// Usage: node install-skill.mjs --source <git-url | local-dir> --skill-path <path-in-source>
//          --target claude|antigravity|both --scope user|project [--project <dir>] [--home <dir>]
//          [--ref <commit|tag|branch>] --approval "<the user's approving words, verbatim>" [--dry-run] [--json]
// Refuses (exit 1): no approval, license not recommendable, missing/invalid SKILL.md, target exists (never overwrites), forge* name.
// Usage errors exit 2. Never executes anything from the fetched content: it is only cloned/copied and read as text.
// Records each install in <scope-root>/forge-skills.lock.json.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { UsageError, PolicyRefusal, parseArgs, runMain, posix, isDir, isWithin, exists, roots, readSkillMeta, LOCK_FILE, SKILL_NAME_RE, oneLine } from './lib.mjs';
import { checkLocal } from './license-check.mjs';

const GIT_URL_RE = /^(https:\/\/[^\s]+|ssh:\/\/[^\s]+|git@[\w.-]+:[^\s]+)$/;

function git(args, cwd) {
  // Cloning never runs hooks from the remote repo; ext:: transports (which run commands) are disabled explicitly.
  return execFileSync('git', ['-c', 'protocol.ext.allow=never', ...args], {
    cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 180000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_LFS_SKIP_SMUDGE: '1' }
  }).trim();
}

// Copies regular files and dirs only: symlinks and .git are skipped (they could point outside the skill).
function copyTree(src, dest, skipped, counter) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name); const d = path.join(dest, e.name);
    if (e.isSymbolicLink()) { skipped.push(e.name); continue; }
    if (e.isDirectory()) { if (e.name === '.git') continue; copyTree(s, d, skipped, counter); }
    else if (e.isFile()) { fs.copyFileSync(s, d); counter.files++; }
  }
}

function readLock(file) {
  if (!exists(file)) return { version: 1, skills: [] };
  let data;
  try { data = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, '')); } catch { data = null; }
  if (!data || !Array.isArray(data.skills)) throw new PolicyRefusal(`${file} is not a valid lock file; fix or move it first (nothing was installed)`);
  return data;
}

export function installSkill(o, env = process.env) {
  // ---- usage ----
  if (!o.source) throw new UsageError('--source is required');
  if (o.skillPath == null || o.skillPath === '') throw new UsageError('--skill-path is required (use . for the source root)');
  if (!['claude', 'antigravity', 'both'].includes(o.target)) throw new UsageError('--target must be claude, antigravity or both');
  if (!['user', 'project'].includes(o.scope)) throw new UsageError('--scope must be user or project');
  if (o.ref && o.ref.startsWith('-')) throw new UsageError('--ref must not start with "-"');
  // ---- approval (policy) ----
  const approval = typeof o.approval === 'string' ? o.approval.trim() : '';
  if (!approval) throw new PolicyRefusal('explicit user approval is required: pass --approval "<the user\'s approving words, verbatim>". Nothing was installed.');

  const isLocal = isDir(o.source);
  if (!isLocal && !GIT_URL_RE.test(o.source)) throw new UsageError(`--source is neither an existing directory nor a supported git URL (https://, ssh://, git@host:path): ${o.source}`);
  if (isLocal && o.ref) throw new UsageError('--ref only applies to git sources');

  const r = roots({ home: o.home, project: o.project, env });
  let tmp = null;
  try {
    // ---- fetch ----
    let srcRoot; let commit = null;
    if (isLocal) srcRoot = path.resolve(o.source);
    else {
      tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-skill-src-'));
      srcRoot = path.join(tmp, 'repo');
      try {
        git(['clone', '--quiet', '--filter=blob:none', '--', o.source, srcRoot]);
        if (o.ref) git(['-C', srcRoot, 'checkout', '--quiet', o.ref]);
        commit = git(['-C', srcRoot, 'rev-parse', 'HEAD']);
      } catch (e) { throw new PolicyRefusal(`could not fetch ${o.source}${o.ref ? `@${o.ref}` : ''}: ${oneLine(e.stderr || e.message, 200)}. Nothing was installed.`); }
    }
    const skillDir = path.resolve(srcRoot, o.skillPath);
    if (!isWithin(skillDir, srcRoot)) throw new UsageError(`--skill-path escapes the source: ${o.skillPath}`);
    if (!isDir(skillDir)) throw new PolicyRefusal(`skill path not found in source: ${o.skillPath}`);

    // ---- validate SKILL.md ----
    const meta = readSkillMeta(skillDir);
    if (!meta.exists) throw new PolicyRefusal(`no SKILL.md in ${posix(o.skillPath)}: not a skill. Nothing was installed.`);
    if (!meta.valid) throw new PolicyRefusal(`SKILL.md frontmatter is invalid (${meta.errors.join('; ')}); it needs name and description. Nothing was installed.`);
    const name = meta.name;
    if (/^forge/i.test(name)) throw new PolicyRefusal(`skill name "${name}" starts with "forge", which is reserved for FORGE itself. Nothing was installed.`);
    if (!SKILL_NAME_RE.test(name) || name.length > 64) throw new PolicyRefusal(`skill name "${name}" is not a valid skill directory name (lowercase letters, digits, single hyphens, <= 64 chars). Nothing was installed.`);

    // ---- license (per skill) ----
    const lic = checkLocal(skillDir, isLocal ? {} : { stopAt: srcRoot });
    if (!lic.recommendable) {
      throw new PolicyRefusal(`license ${lic.spdx} is ${lic.category}${lic.level ? ` (${lic.level} level)` : ''}: only oss-permissive and oss-copyleft skills can be installed. Evidence: ${lic.evidence.join('; ')}. Nothing was installed.`);
    }

    // ---- targets ----
    const scopeRoots = {
      claude: o.scope === 'user' ? r.claudeUser : r.claudeProject,
      antigravity: o.scope === 'user' ? r.agUser : r.agProject
    };
    const targets = (o.target === 'both' ? ['claude', 'antigravity'] : [o.target]).map((t) => ({
      target: t, scope: o.scope, root: scopeRoots[t], dir: path.join(scopeRoots[t], 'skills', name), lock: path.join(scopeRoots[t], LOCK_FILE)
    }));
    for (const t of targets) if (exists(t.dir)) throw new PolicyRefusal(`${posix(t.dir)} already exists: FORGE never overwrites, updates or removes skills. Remove or rename it yourself first. Nothing was installed.`);
    const locks = targets.map((t) => readLock(t.lock));

    // ---- write ----
    const skipped = []; const counter = { files: 0 }; const installed = [];
    const installedAt = new Date().toISOString();
    for (const [i, t] of targets.entries()) {
      const record = {
        name, description: meta.description, source: isLocal ? posix(srcRoot) : o.source, skillPath: posix(o.skillPath), ref: o.ref || null, commit,
        license: { spdx: lic.spdx, category: lic.category, level: lic.level }, target: t.target, scope: t.scope, path: posix(t.dir), installedAt, approval: o.approval
      };
      if (!o.dryRun) {
        fs.mkdirSync(path.dirname(t.dir), { recursive: true });
        const staging = `${t.dir}.forge-staging-${process.pid}`;
        try {
          copyTree(skillDir, staging, i === 0 ? skipped : [], i === 0 ? counter : { files: 0 });
          fs.renameSync(staging, t.dir);
        } finally { fs.rmSync(staging, { recursive: true, force: true }); }
        const check = readSkillMeta(t.dir);
        if (!check.valid || check.name !== path.basename(t.dir)) throw new Error(`post-install validation failed for ${posix(t.dir)}: SKILL.md name "${check.name}" does not match the directory`);
        locks[i].version = locks[i].version || 1;
        locks[i].skills.push(record);
        fs.writeFileSync(t.lock, JSON.stringify(locks[i], null, 2) + '\n');
      }
      installed.push({ target: t.target, scope: t.scope, path: posix(t.dir), lock: posix(t.lock), record });
    }
    if (o.dryRun) { const probe = { files: 0 }; countFiles(skillDir, probe, skipped); counter.files = probe.files; }
    return {
      ok: true, dryRun: Boolean(o.dryRun), name, description: meta.description, source: isLocal ? posix(srcRoot) : o.source, skillPath: posix(o.skillPath),
      ref: o.ref || null, commit, license: { spdx: lic.spdx, category: lic.category, level: lic.level, evidence: lic.evidence },
      files: counter.files, skippedSymlinks: skipped, installed
    };
  } finally {
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 3 });
  }
}

function countFiles(dir, counter, skipped) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isSymbolicLink()) { skipped.push(e.name); continue; }
    if (e.isDirectory()) { if (e.name !== '.git') countFiles(path.join(dir, e.name), counter, skipped); }
    else if (e.isFile()) counter.files++;
  }
}

export function toMarkdown(res) {
  const L = [`${res.dryRun ? 'DRY RUN (nothing written): would install' : 'Installed'} skill \`${res.name}\` from ${res.source}${res.commit ? `@${res.commit.slice(0, 12)}` : ''} (${res.skillPath})`];
  L.push(`- license: ${res.license.spdx} (${res.license.category}, ${res.license.level} level)`);
  for (const t of res.installed) L.push(`- ${t.target}/${t.scope}: ${t.path} (lock: ${t.lock})`);
  L.push(`- files: ${res.files}${res.skippedSymlinks.length ? `; skipped symlinks: ${res.skippedSymlinks.join(', ')}` : ''}`);
  if (!res.dryRun) L.push('- start a new session (or reload skills) so the agent picks it up; review the installed files before first use');
  return L.join('\n');
}

const USAGE = `Usage: node install-skill.mjs --source <git-url | local-dir> --skill-path <path-in-source>
     --target claude|antigravity|both --scope user|project [--project <dir>] [--home <dir>]
     [--ref <commit|tag|branch>] --approval "<the user's approving words, verbatim>" [--dry-run] [--json]`;
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runMain('install-skill', () => {
    const { flags, positional } = parseArgs(process.argv.slice(2), {
      '--source': 'string', '--skill-path': 'string', '--target': 'string', '--scope': 'string', '--project': 'string', '--home': 'string',
      '--ref': 'string', '--approval': 'string', '--dry-run': 'bool', '--json': 'bool'
    });
    if (flags.help) { console.log(USAGE); return 0; }
    if (positional.length) throw new UsageError(`unexpected argument ${positional[0]}\n${USAGE}`);
    const res = installSkill(flags);
    console.log(flags.json ? JSON.stringify(res, null, 2) : toMarkdown(res));
    return 0;
  });
}
