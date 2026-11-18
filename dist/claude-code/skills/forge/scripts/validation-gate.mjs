#!/usr/bin/env node
// FORGE validation planner, check runner and pre-browser gate. Zero dependencies (Node >= 18).
//
//   node validation-gate.mjs plan --task <slug> [--units a,b] [--json]
//       Map the changed files to the project's units (apps and packages from the stack detector), add the
//       consumers of changed shared packages, and list each unit's type check, lint, test and build command.
//   node validation-gate.mjs run --task <slug> [--units a,b] [--checks lint,test] [--all] [--baseline] [--build]
//                                [--jobs N] [--timeout <min>] [--json]
//       Run only the plan's checks that are not already passing for the current code (missing, stale, failed
//       or blocked). Builds are DEFERRED (not run, not blocking the pre-browser gate) when type check or tests
//       cover the unit and no consumer imports its output; --build runs them once, right before `final`. Units run in parallel; checks within a unit run in order; tests of units that share a
//       database run one at a time; a shared package with prebuilt output is built before its consumers.
//       Each result goes to .forge/tasks/<slug>/validation/ledger.jsonl, each full log to
//       .forge/tasks/<slug>/evidence/reports/validation/. --all re-runs everything. --baseline records
//       pre-change results (use --units, since nothing has changed yet); the gate ignores them.
//       It prints the scope and ends with the gate verdict; without --units it exits like `gate`, so one
//       call validates and answers whether browser verification may start.
//   node validation-gate.mjs mark --task <slug> --unit <path> --check <name> --status <STATUS> --reason "<text>"
//       Record what the runner cannot: manual checks (contract, migration), PRE-EXISTING failures, BLOCKED or
//       NOT RUN with a reason, or the PASSED one-shot equivalent of a watch-mode or --fix script.
//   node validation-gate.mjs gate --task <slug> [--verbose] [--json]
//       Pre-browser completion gate (compact: only rows that need attention; --verbose lists all). Exit 0 = OPEN (every required check passed for the code as it is now),
//       1 = CLOSED (a check failed, is missing, or went stale because its files changed since it passed),
//       2 = BLOCKED (only environment blockers remain).
//   node validation-gate.mjs evidence --task <slug> [--init] [--json]
//       List the task's evidence files as clickable links and check that evidence/index.md cites only files
//       that exist. Exit 1 when it cites a missing file. --init creates the evidence folders.
//   node validation-gate.mjs final --task <slug> [--json]
//       Phase 9 in one call: the per-application table for the report, the final gate, line-ending flips,
//       errors in new comments, and evidence links. Exit 0 only when all of them are clean.
//
// Common: --root <dir> (default: cwd). It writes only inside .forge/ and runs no git command that changes the repo.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { changedFiles, isGitRepo, eolCheck } from './verify-delta.mjs';
import { check as checkComments } from './comment-check.mjs';
import { escalation, formatEscalation } from './review-target.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DETECTOR = path.join(HERE, '..', '..', 'forge-project-exploration', 'scripts', 'detect-stack.mjs');

export const STATUSES = ['PASSED', 'FAILED', 'PRE-EXISTING', 'BLOCKED', 'NOT RUN', 'UNAVAILABLE', 'N/A'];
const OK = new Set(['PASSED', 'PRE-EXISTING', 'N/A', 'UNAVAILABLE']);
const ORDER = ['typecheck', 'lint', 'format', 'test', 'build']; // execution order within a unit
const COLUMN = { typecheck: 'typecheck', lint: 'lint', format: 'lint', test: 'test', build: 'build', contract: 'extra', migration: 'extra' };
const EXACT = { typecheck: ['typecheck', 'type-check', 'tsc', 'types', 'check-types'], lint: ['lint'], format: ['format:check', 'format-check', 'fmt:check', 'check-format'], test: ['test'], build: ['build'] };
const SKIP_SCRIPT = /watch|coverage|:ui$|update|snapshot|debug|:open|:fix|:e2e/i;
const WATCH_RE = /(^|\s)--watch(?![=A-Za-z]*false)\b|(^|\s)-w(\s|$)|\bnodemon\b/;
const MUTATE_RE = /(^|\s)--(fix|write)\b/;
const CHECK_ONLY_RE = /(^|\s)--(check|test|diff|list-different)\b|(^|\s)-l(\s|$)/;
const DEPLOY_RE = /\b(eas\s+(build|submit|update)|fastlane|deploy|publish|release|docker\s+push|netlify\s+deploy|firebase\s+deploy|wrangler\s+(deploy|publish)|terraform\s+apply|gh\s+release)\b/i;
const NO_TEST_RE = /no test specified/i;
const NOT_FOUND_RE = /is not recognized as an internal or external command|command not found|could not determine executable to run|canceled due to missing packages|npm (error|ERR!) code E404|No such file or directory.*(mvnw|gradlew)/i;
const DOC_RE = /\.(md|txt|rst|adoc)$|(^|\/)(LICENSE|CHANGELOG|AUTHORS|CODEOWNERS)(\.[a-z]+)?$/i;
const CODE_RE = /\.([cm]?[jt]sx?|py|go|java|kt|kts|scala|php|rb|rs|cs|fs|swift|dart|vue|svelte|ex|exs|css|scss|html|sql|graphql|gql|proto)$/i;
const TEST_RE = /(^|\/)(tests?|__tests__|spec|e2e)\/|(^test_.*\.py$|_test\.(py|go)$|\.(test|spec)\.[cm]?[jt]sx?$|Tests?\.(java|kt|cs|swift)$|_spec\.rb$|Test\.php$|_test\.dart$)/;
const API_RE = /(^|\/)(openapi|swagger)[^/]*\.(ya?ml|json)$|\.(graphql|gql|proto)$/i;
const MIGRATION_RE = /(^|\/)(migrations|migrate|db\/migration|database\/migrations|alembic\/versions|prisma\/migrations|drizzle|supabase\/migrations)\/|(^|\/)(schema\.prisma|schema\.sql|structure\.sql|schema\.rb)$/;
const ROOT_SHARED_RE = /^(package\.json|pnpm-workspace\.yaml|pnpm-lock\.yaml|yarn\.lock|package-lock\.json|bun\.lockb?|turbo\.json|nx\.json|lerna\.json|go\.work(\.sum)?|tsconfig[^/]*\.json|\.eslintrc[^/]*|eslint\.config\.[^/]+|biome\.jsonc?|\.prettierrc[^/]*|prettier\.config\.[^/]+|babel\.config\.[^/]+|jest\.config\.[^/]+|vitest\.(config|workspace)\.[^/]+|\.golangci\.[^/]+|ruff\.toml|setup\.cfg|pyproject\.toml|Makefile|\.nvmrc|\.node-version|\.tool-versions|Directory\.Build\.props|settings\.gradle(\.kts)?)$/;
const EVIDENCE_DIRS = ['screenshots', 'playwright', 'traces', 'network', 'reports'];

const posix = (p) => p.split(path.sep).join('/');
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const readText = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };
const taskDir = (root, task) => path.join(root, '.forge', 'tasks', task);
const ledgerFile = (root, task) => path.join(taskDir(root, task), 'validation', 'ledger.jsonl');
const evidenceDir = (root, task) => path.join(taskDir(root, task), 'evidence');
const slugUnit = (u) => (u === '.' ? 'root' : u.replace(/[\\/]+/g, '_'));

function ensureWorkspace(root) {
  const ignore = path.join(root, '.forge', '.gitignore');
  fs.mkdirSync(path.dirname(ignore), { recursive: true });
  if (!fs.existsSync(ignore)) fs.writeFileSync(ignore, '*\n'); // keep the FORGE workspace out of git
}

async function loadContext(root) {
  if (fs.existsSync(DETECTOR)) {
    try { const { analyze } = await import(pathToFileURL(DETECTOR).href); return analyze(root); } catch { /* fall back */ }
  }
  const ctx = readJson(path.join(root, '.forge', 'context.json'));
  if (!ctx) throw new Error('no project map: run detect-stack.mjs --write first');
  return ctx;
}

function ownerOf(units, file) {
  let best = null;
  for (const u of units) if ((u.path === '.' || file === u.path || file.startsWith(u.path + '/')) && (!best || u.path.length > best.path.length || best.path === '.')) best = u;
  return best;
}

function scriptBody(abs, c) {
  const m = c.source.match(/^(package|composer)\.json#scripts\.(.+)$/);
  if (!m) return c.command;
  const b = readJson(path.join(abs, `${m[1]}.json`))?.scripts?.[m[2]];
  return Array.isArray(b) ? b.join(' && ') : String(b ?? c.command);
}

/** Units with kinds, commands per check and dependencies on other units (workspace names or relative paths). */
export function describeUnits(root, ctx) {
  const units = ctx.units.map((u) => {
    const abs = path.join(root, u.path);
    const cats = new Set(u.technologies.map((t) => t.category));
    const kinds = [cats.has('frontend') && 'web', cats.has('backend') && 'backend', cats.has('mobile') && 'mobile'].filter(Boolean);
    const commands = u.commands.map((c) => ({ ...c, body: scriptBody(abs, c) }));
    return { path: u.path, abs, kinds, commands, manifests: u.manifests, database: ['database', 'orm', 'migrations'].some((c) => cats.has(c)), pkg: readJson(path.join(abs, 'package.json')), deps: new Set() };
  });
  const byName = new Map(units.filter((u) => u.pkg?.name).map((u) => [u.pkg.name, u]));
  for (const u of units) {
    for (const k of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      for (const n of Object.keys(u.pkg?.[k] || {})) { const d = byName.get(n); if (d && d !== u) u.deps.add(d.path); }
    }
    for (const m of [...u.manifests, 'settings.gradle', 'settings.gradle.kts', 'go.work']) {
      for (const r of readText(path.join(u.abs, m)).matchAll(/(?:^|["'\s=(:])((?:\.\.?[\\/])+[^\s"'<>(),;]*)/g)) {
        const target = posix(path.relative(root, path.resolve(u.abs, r[1])));
        if (target.startsWith('..')) continue;
        const d = ownerOf(units, target);
        // A native shell nested in a JS app (React Native's android/app reaching ../../node_modules) is not
        // that app's consumer: the app's own build bundles the JS, so its native build need not re-run.
        const nativeShell = d && d.pkg && !u.pkg && d.path !== '.' && u.path.startsWith(d.path + '/');
        if (d && d !== u && d.path !== '.' && !nativeShell) u.deps.add(d.path);
      }
    }
  }
  return units;
}

function upstreamClosure(units, unit) {
  const seen = new Set(); const stack = [...unit.deps];
  while (stack.length) { const p = stack.pop(); if (seen.has(p)) continue; seen.add(p); stack.push(...(units.find((u) => u.path === p)?.deps || [])); }
  return seen;
}

function pickCommands(unit, name) {
  const script = (c) => (c.source.match(/#scripts\.(.+)$/) || [])[1];
  let cands = unit.commands.filter((c) => c.category === name && !(script(c) && SKIP_SCRIPT.test(script(c))));
  if (name === 'test') cands = cands.filter((c) => !NO_TEST_RE.test(c.body));
  if (name === 'format') cands = cands.filter((c) => CHECK_ONLY_RE.test(c.body));
  const exact = cands.find((c) => EXACT[name].includes(script(c)));
  if (exact) return [exact];
  const seen = new Set();
  return cands.filter((c) => !seen.has(c.command) && seen.add(c.command));
}

const prebuilt = (u) => !!u.pkg && /(^|[^\w-])(dist|build|lib|out)\//.test(JSON.stringify([u.pkg.main, u.pkg.module, u.pkg.types, u.pkg.exports]));

/** The validation plan for the current working tree. `units` restricts it (and adds units with no changes). */
export async function plan(root, { units: only = null, ctx = null } = {}) {
  ctx ??= await loadContext(root);
  const U = describeUnits(root, ctx);
  const monorepo = U.length > 1;
  const git = isGitRepo(root);
  const changed = git ? changedFiles(root) : [];
  const relevant = changed.filter((f) => !DOC_RE.test(f));
  const affected = new Map();
  const touch = (u, reason, full) => {
    const a = affected.get(u.path) ?? { unit: u, reasons: [], own: [], full: false };
    if (!a.reasons.includes(reason)) a.reasons.push(reason);
    a.full ||= full; affected.set(u.path, a); return a;
  };
  const broad = []; const unowned = [];
  for (const f of relevant) {
    const o = ownerOf(U, f);
    if (monorepo && (!o || o.path === '.') && !f.includes('/') && ROOT_SHARED_RE.test(f)) { broad.push(f); continue; }
    if (!o || (monorepo && o.path === '.' && !CODE_RE.test(f))) { unowned.push(f); continue; }
    touch(o, 'changed files', true).own.push(f);
  }
  if (broad.length) for (const u of U) if (!(monorepo && u.path === '.')) touch(u, `root config changed (${broad.join(', ')})`, true);
  for (let grew = true; grew;) {
    grew = false;
    for (const u of U) {
      if (affected.has(u.path) || (monorepo && u.path === '.')) continue;
      const up = [...u.deps].find((d) => affected.has(d));
      if (up) { touch(u, `consumer of ${up}`, false); grew = true; }
    }
  }
  const contractFiles = relevant.filter((f) => API_RE.test(f));
  const migrationFiles = relevant.filter((f) => MIGRATION_RE.test(f));
  if (contractFiles.length) {
    for (const u of U) if (!affected.has(u.path) && !(monorepo && u.path === '.') && u.kinds.some((k) => k === 'web' || k === 'mobile')) touch(u, 'possible consumer of the changed API contract', false);
  }
  if (only) {
    for (const p of only) {
      const u = U.find((x) => x.path === p.replace(/\\/g, '/').replace(/\/$/, '') || (p === 'root' && x.path === '.'));
      if (!u) throw new Error(`unknown unit "${p}" (units: ${U.map((x) => x.path).join(', ')})`);
      touch(u, 'requested', true);
    }
  }
  const wanted = only ? new Set(only.map((p) => (p === 'root' ? '.' : p.replace(/\\/g, '/').replace(/\/$/, '')))) : null;

  const entries = [];
  for (const a of affected.values()) {
    if (wanted && !wanted.has(a.unit.path)) continue;
    const u = a.unit; const checks = [];
    const testOnly = a.own.length > 0 && a.own.every((f) => TEST_RE.test(f)) && !broad.length && !a.reasons.includes('requested');
    for (const name of ORDER) {
      const cmds = pickCommands(u, name);
      if (!cmds.length) {
        if (name === 'format') continue;
        const missing = name === 'lint' || name === 'test';
        checks.push({ key: name, column: COLUMN[name], status: missing ? 'UNAVAILABLE' : 'N/A', required: false, reason: missing ? `no ${name === 'lint' ? 'linter' : 'test command'} configured` : `no ${name} step configured` });
        continue;
      }
      cmds.forEach((c, i) => {
        const base = { key: cmds.length > 1 ? `${name}#${i + 1}` : name, column: COLUMN[name], command: c.command, source: c.source, required: true, status: 'PENDING' };
        if (!a.full && (name === 'lint' || name === 'format')) Object.assign(base, { status: 'N/A', required: false, reason: 'own files unchanged (validated as a consumer)' });
        else if (testOnly && name === 'build') Object.assign(base, { status: 'N/A', required: false, reason: 'only test files changed' });
        else if (DEPLOY_RE.test(c.body)) Object.assign(base, { status: 'NOT RUN', required: false, reason: 'script deploys or publishes; needs user authorization' });
        else if (MUTATE_RE.test(c.body)) Object.assign(base, { status: 'NOT RUN', reason: 'script modifies files (--fix/--write); run a check-only equivalent and record it with mark' });
        else if (WATCH_RE.test(c.body)) Object.assign(base, { status: 'NOT RUN', reason: 'watch-mode script; run a one-shot equivalent and record it with mark' });
        checks.push(base);
      });
    }
    if (a.own.some((f) => contractFiles.includes(f))) checks.push({ key: 'contract', column: 'extra', manual: true, required: true, status: 'PENDING', reason: 'G6: API contract changed; validate schema, status codes, error shapes and backward compatibility, then mark' });
    if (a.own.some((f) => migrationFiles.includes(f))) checks.push({ key: 'migration', column: 'extra', manual: true, required: true, status: 'PENDING', reason: 'G12: migration or schema changed; apply and roll back on a local database and run the DB-backed tests, then mark' });
    entries.push({ unit: u.path, kinds: u.kinds, reasons: a.reasons, files: a.own, database: u.database, upstream: [...u.deps].filter((d) => affected.has(d)), checks });
  }
  entries.sort((x, y) => x.unit.localeCompare(y.unit));
  for (const e of entries) {
    // A consumer waits for an upstream package whose consumers import its build output.
    e.after = e.upstream.filter((d) => { const up = U.find((x) => x.path === d); const ue = entries.find((x) => x.unit === d); return prebuilt(up) && ue?.checks.some((c) => c.column === 'build' && c.status === 'PENDING'); });
  }
  // Drop any ordering edge that closes a cycle, so the runner can never deadlock.
  const reaches = (from, to, seen = new Set()) => from === to || (!seen.has(from) && seen.add(from) && (entries.find((x) => x.unit === from)?.after || []).some((d) => reaches(d, to, seen)));
  for (const e of entries) e.after = e.after.filter((d) => !reaches(d, e.unit));
  // Builds are the slowest checks and the browser runs on the dev server, so a build waits for the final
  // check (`run --build`) when type check or tests already cover the unit before the browser. It still runs
  // up front when consumers import its output, or when it is the unit's only compile step.
  for (const e of entries) {
    const covered = e.checks.some((c) => (c.column === 'typecheck' || c.column === 'test') && c.required);
    const feedsConsumers = entries.some((x) => x.after.includes(e.unit));
    for (const c of e.checks) if (c.column === 'build' && c.required && covered && !feedsConsumers) c.deferrable = true;
  }
  const dbUnits = entries.filter((e) => e.database && e.checks.some((c) => c.column === 'test' && c.status === 'PENDING')).map((e) => e.unit);
  const next = { browser: [], device: [], api: [] };
  for (const e of entries) {
    if (e.kinds.includes('web')) next.browser.push(e.unit);
    if (e.kinds.includes('mobile')) next.device.push(e.unit);
    if (e.kinds.includes('backend') && !e.kinds.includes('web')) next.api.push(e.unit);
  }
  return { git, changed: changed.length, docsOnly: changed.length > 0 && !relevant.length, broad, unowned, contractFiles, migrationFiles, serializeTests: dbUnits.length > 1 ? dbUnits : [], escalation: escalation(relevant), entries, next, units: U };
}

function fingerprints(root, p) {
  if (!p.git) return {};
  const files = changedFiles(root).filter((f) => !DOC_RE.test(f));
  const hashes = new Map(files.map((f) => { try { return [f, sha(fs.readFileSync(path.join(root, f)))]; } catch { return [f, 'deleted']; } }));
  const monorepo = p.units.length > 1; const out = {};
  for (const u of p.units) {
    const scope = new Set([u.path, ...upstreamClosure(p.units, u)]);
    const mine = files.filter((f) => {
      if (!monorepo) return true;
      const o = ownerOf(p.units, f);
      if (o && scope.has(o.path) && (o.path !== '.' || u.path === '.')) return true;
      return !f.includes('/') && ROOT_SHARED_RE.test(f) && (!o || o.path === '.');
    });
    out[u.path] = sha(mine.map((f) => `${f}:${hashes.get(f)}`).join('\n'));
  }
  return out;
}

export function readLedger(root, task) {
  return readText(ledgerFile(root, task)).split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

function append(root, task, rec) {
  ensureWorkspace(root);
  fs.mkdirSync(path.dirname(ledgerFile(root, task)), { recursive: true });
  fs.appendFileSync(ledgerFile(root, task), JSON.stringify({ at: new Date().toISOString(), ...rec }) + '\n');
}

/** Gate rows for the current plan: each required check's latest result, checked against the current code. */
export async function gate(root, task, { ctx = null, p = null, final = false } = {}) {
  p ??= await plan(root, { ctx });
  const all = readLedger(root, task);
  const ledger = all.filter((r) => r.cycle !== 'baseline');
  const fps = fingerprints(root, p);
  const rows = [];
  for (const e of p.entries) {
    for (const c of e.checks) {
      const row = { unit: e.unit, check: c.key, column: c.column, command: c.command ?? null, required: c.required };
      const last = ledger.filter((r) => r.unit === e.unit && r.check === c.key).at(-1);
      if (!c.required && !last) Object.assign(row, { state: c.status, reason: c.reason });
      else if (!last) Object.assign(row, { state: c.status === 'NOT RUN' ? 'NOT RUN' : 'MISSING', reason: c.reason ?? 'not run for the current code' });
      else {
        const stale = p.git && last.fingerprint && last.fingerprint !== fps[e.unit];
        const state = (last.status === 'PASSED' || last.status === 'PRE-EXISTING') && stale ? 'STALE' : last.status;
        Object.assign(row, { state, cycle: last.cycle, reason: state === 'STALE' ? `files in scope changed since cycle ${last.cycle}` : last.reason, log: last.log });
        if (state === 'FAILED' && all.some((r) => r.cycle === 'baseline' && r.unit === e.unit && r.check === c.key && r.status === 'FAILED')) row.hint = 'also failed on the baseline: if it is the same failure, mark it PRE-EXISTING';
        else if (state === 'FAILED') {
          // A second failing cycle means the first diagnosis and fix did not hold: the policy trigger for Opus.
          const failedCycles = new Set(ledger.filter((r) => r.unit === e.unit && r.check === c.key && r.status === 'FAILED').map((r) => r.cycle));
          if (failedCycles.size >= 2) Object.assign(row, { escalate: true, hint: `failed in ${failedCycles.size} cycles: move the root-cause analysis to Opus before the next fix (core/delegation.md#model-escalation)` });
        }
      }
      if (c.deferrable && (row.state === 'MISSING' || row.state === 'STALE')) {
        if (!final) Object.assign(row, { state: 'DEFERRED', reason: 'runs once before the final check: `run --build`' });
        else row.hint = 'run `run --task <slug> --build`';
      }
      row.blocking = c.required && row.state !== 'DEFERRED' && !OK.has(row.state);
      rows.push(row);
    }
  }
  const blocking = rows.filter((r) => r.blocking);
  const result = !blocking.length ? 'OPEN' : blocking.every((r) => r.state === 'BLOCKED') ? 'BLOCKED' : 'CLOSED';
  const g = { result, at: new Date().toISOString(), rows, scope: p.entries.map((e) => ({ unit: e.unit, kinds: e.kinds, reasons: e.reasons })), next: p.next, changed: p.changed, docsOnly: p.docsOnly };
  if (fs.existsSync(path.join(root, '.forge'))) {
    fs.mkdirSync(path.dirname(ledgerFile(root, task)), { recursive: true });
    fs.writeFileSync(path.join(path.dirname(ledgerFile(root, task)), 'gate.json'), JSON.stringify(g, null, 2) + '\n');
  }
  return g;
}

function limiter(n) {
  let active = 0; const q = [];
  const next = () => {
    if (active >= n || !q.length) return;
    active++; const { fn, res, rej } = q.shift();
    fn().then(res, rej).finally(() => { active--; next(); });
  };
  return (fn) => new Promise((res, rej) => { q.push({ fn, res, rej }); next(); });
}

function killTree(child) {
  try {
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else process.kill(-child.pid, 'SIGKILL');
  } catch { /* already gone */ }
}

const toolCache = new Map();
const hasTool = (bin) => {
  if (!toolCache.has(bin)) toolCache.set(bin, spawnSync(`${bin} --version`, { shell: true, stdio: 'ignore', windowsHide: true }).status === 0);
  return toolCache.get(bin);
};

/**
 * The project's own package manager runs its scripts (`pnpm typecheck` in a pnpm workspace). Only when that
 * manager is not installed here does a package.json script fall back to `npm run`, which executes the same
 * script from the same package.json.
 */
export function resolveCommand(check, available = hasTool) {
  const m = check.command.match(/^(pnpm|yarn|bun)(?: run)? (\S+)$/);
  const script = (check.source || '').match(/^package\.json#scripts\.(.+)$/)?.[1];
  if (m && script === m[2] && !available(m[1]) && available('npm')) return `npm run ${script}`;
  return check.command;
}

function execCheck(root, task, unit, check, cycle, timeoutMin) {
  const command = resolveCommand(check).replace(/^npx (?!--no-install\b)/, 'npx --no-install '); // never download a tool
  const log = path.join(evidenceDir(root, task), 'reports', 'validation', `c${cycle}-${slugUnit(unit)}-${check.key.replace('#', '-')}.log`);
  fs.mkdirSync(path.dirname(log), { recursive: true });
  return new Promise((resolve) => {
    const t0 = Date.now();
    const out = fs.createWriteStream(log);
    out.write(`$ ${command}\n# cwd: ${unit}\n\n`);
    let tail = ''; let timedOut = false; let done = false;
    const finish = (r) => { if (done) return; done = true; clearTimeout(timer); out.end(); resolve({ command, durationMs: Date.now() - t0, log: posix(path.relative(root, log)), tail, ...r }); };
    const child = spawn(command, { cwd: path.join(root, unit), shell: true, windowsHide: true, detached: process.platform !== 'win32', env: { ...process.env, CI: process.env.CI || '1', FORCE_COLOR: '0', NO_COLOR: '1' } });
    const keep = (d) => { out.write(d); tail = (tail + d.toString()).slice(-20000); };
    child.stdout.on('data', keep); child.stderr.on('data', keep);
    const timer = setTimeout(() => { timedOut = true; killTree(child); }, timeoutMin * 60000);
    child.on('error', (e) => finish({ status: 'BLOCKED', exitCode: null, reason: `could not start: ${e.message}` }));
    child.on('close', (code) => {
      if (timedOut) return finish({ status: 'FAILED', exitCode: code, reason: `timed out after ${timeoutMin} min (watch mode or a hang?)` });
      if (code === 0) return finish({ status: 'PASSED', exitCode: 0 });
      if (code === 127 || code === 9009 || NOT_FOUND_RE.test(tail.slice(-3000))) return finish({ status: 'BLOCKED', exitCode: code, reason: "command or toolchain not found: install the project's declared dependencies (allowed) or report BLOCKED" });
      finish({ status: 'FAILED', exitCode: code, reason: `exit ${code}` });
    });
  });
}

/** Run the plan's checks that are not already passing for the current code, in a dependency-aware schedule. */
export async function run(root, task, { units = null, checks = null, all = false, baseline = false, build = false, jobs = 0, timeout = 15, ctx = null } = {}) {
  const p = await plan(root, { units, ctx });
  const withBuilds = build || all;
  const before = baseline ? null : await gate(root, task, { p, final: withBuilds });
  const fresh = new Set((before?.rows || []).filter((r) => OK.has(r.state)).map((r) => `${r.unit}\0${r.check}`));
  const prior = readLedger(root, task);
  const cycle = baseline ? 'baseline' : 1 + Math.max(0, ...prior.map((r) => (typeof r.cycle === 'number' ? r.cycle : 0)));
  const fps = fingerprints(root, p);
  const work = p.entries.map((e) => ({ e, todo: e.checks.filter((c) => !c.manual && c.status === 'PENDING' && (withBuilds || !c.deferrable) && (!checks || checks.includes(c.key.split('#')[0])) && (all || baseline || !fresh.has(`${e.unit}\0${c.key}`))) })).filter((w) => w.todo.length);
  const slot = limiter(jobs > 0 ? jobs : Math.max(2, Math.min(4, Math.floor(os.cpus().length / 2))));
  const dbLock = limiter(1);
  const results = [];
  // Each unit's chain resolves its own deferred, so a consumer can wait for an upstream chain started after it.
  const done = new Map(work.map((w) => { let resolve; const promise = new Promise((r) => { resolve = r; }); return [w.e.unit, { promise, resolve }]; }));
  const runUnit = async ({ e, todo }) => {
    try {
      await Promise.all(e.after.map((d) => done.get(d)?.promise));
      await slot(async () => {
        for (const c of todo) {
          const exec = () => execCheck(root, task, e.unit, c, cycle, timeout);
          const r = c.column === 'test' && p.serializeTests.includes(e.unit) ? await dbLock(exec) : await exec();
          const rec = { cycle, unit: e.unit, check: c.key, column: c.column, command: r.command, status: r.status, exitCode: r.exitCode, reason: r.reason, durationMs: r.durationMs, log: r.log, fingerprint: fps[e.unit] ?? null, source: 'runner' };
          append(root, task, rec);
          results.push({ ...rec, tail: r.tail });
        }
      });
    } finally { done.get(e.unit).resolve(); }
  };
  await Promise.all(work.map(runUnit));
  const after = fingerprints(root, p);
  const modified = Object.keys(fps).filter((u) => fps[u] !== after[u] && p.entries.some((e) => e.unit === u));
  const g = baseline ? null : await gate(root, task, { ctx, final: withBuilds });
  const skipped = p.entries.flatMap((e) => e.checks.filter((c) => c.status === 'PENDING' && !c.manual && fresh.has(`${e.unit}\0${c.key}`)).map((c) => `${e.unit}:${c.key}`));
  const deferred = withBuilds ? [] : p.entries.flatMap((e) => e.checks.filter((c) => c.deferrable && !fresh.has(`${e.unit}\0${c.key}`)).map((c) => `${e.unit}:${c.key}`));
  return { cycle, plan: p, results, skipped, deferred, final: withBuilds, modifiedDuringRun: modified, gate: g };
}

export async function mark(root, task, { unit, check, status, reason, ctx = null }) {
  if (!STATUSES.includes(status)) throw new Error(`--status must be one of ${STATUSES.join(', ')}`);
  if (!unit || !check || !reason || !reason.trim()) throw new Error('mark needs --unit, --check, --status and a non-empty --reason');
  if (status === 'PASSED' && reason.trim().length < 12) throw new Error('PASSED needs evidence in --reason: the command you ran and its key output line');
  const p = await plan(root, { ctx });
  const u = unit === 'root' ? '.' : unit.replace(/\\/g, '/').replace(/\/$/, '');
  if (!p.units.some((x) => x.path === u)) throw new Error(`unknown unit "${unit}" (units: ${p.units.map((x) => x.path).join(', ')})`);
  const prior = readLedger(root, task);
  const cycle = Math.max(0, ...prior.map((r) => (typeof r.cycle === 'number' ? r.cycle : 0))) || 1;
  const rec = { cycle, unit: u, check, column: COLUMN[check.split('#')[0]] ?? 'extra', status, reason: reason.trim(), fingerprint: fingerprints(root, p)[u] ?? null, source: 'manual' };
  append(root, task, rec);
  return rec;
}

export function evidence(root, task, { init = false } = {}) {
  const dir = evidenceDir(root, task);
  if (init) { ensureWorkspace(root); for (const d of EVIDENCE_DIRS) fs.mkdirSync(path.join(dir, d), { recursive: true }); }
  const files = fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).map((f) => posix(String(f))).filter((f) => fs.statSync(path.join(dir, f)).isFile() && f !== 'index.md') : [];
  const index = readText(path.join(dir, 'index.md'));
  const relRoot = posix(path.relative(root, dir));
  const cited = [...new Set([...index.matchAll(/\]\(([^)\s]+)\)|`([^`\s]+\.[A-Za-z0-9]{2,5})`/g)].map((m) => decodeURI(m[1] || m[2]).replace(/^\.\//, '')))]
    .filter((c) => !/^[a-z]+:\/\//i.test(c))
    .map((c) => (c.startsWith(relRoot + '/') ? c.slice(relRoot.length + 1) : c));
  const missing = cited.filter((c) => !fs.existsSync(path.join(dir, c)));
  const unindexed = files.filter((f) => !f.startsWith('reports/validation/') && !cited.includes(f));
  const link = (f) => `[${f}](${encodeURI(`${relRoot}/${f}`)})`;
  return { dir: relRoot, absolute: dir, files, links: files.map(link), missing, unindexed };
}

const cell = (c) => (c ? (c.status === 'PENDING' ? `\`${c.command}\`${c.deferrable ? ' (deferred to `run --build`)' : ''}` : `${c.status}${c.reason ? ` (${c.reason})` : ''}`) : 'N/A');

export function formatPlan(p) {
  const L = [`FORGE validation plan: ${p.changed} changed file(s), ${p.entries.length} affected unit(s)`];
  if (p.docsOnly) L.push('Only documentation changed: no type check, lint, test or build is required.');
  if (!p.entries.length) return L.join('\n');
  L.push('', '| Unit | Kind | Why | Type check | Lint | Tests | Build | Manual |', '|---|---|---|---|---|---|---|---|');
  for (const e of p.entries) {
    const col = (k) => e.checks.filter((c) => c.column === k).map(cell).join('<br>') || 'N/A';
    L.push(`| ${e.unit} | ${e.kinds.join('+') || 'shared/other'} | ${e.reasons.join('; ')} | ${col('typecheck')} | ${col('lint')} | ${col('test')} | ${col('build')} | ${e.checks.filter((c) => c.manual).map((c) => c.key).join(', ') || '-'} |`);
  }
  L.push('', 'Schedule: units in parallel; within a unit type check → lint → tests → build, each check once per cycle.');
  if (p.serializeTests.length) L.push(`Serialized: tests of ${p.serializeTests.join(', ')} (shared database).`);
  for (const e of p.entries) if (e.after.length) L.push(`Ordered: ${e.after.join(', ')} build(s) before ${e.unit} (consumes built output).`);
  if (p.broad.length) L.push(`Broad impact: root config changed (${p.broad.join(', ')}), so every unit is in scope.`);
  if (p.contractFiles.length) L.push(`API contract changed (${p.contractFiles.join(', ')}): G6 \`contract\` check, plus its web/mobile consumers.`);
  if (p.migrationFiles.length) L.push(`Migration or schema changed (${p.migrationFiles.join(', ')}): G12 \`migration\` check.`);
  if (p.unowned.length) L.push(`Changed outside any unit (nothing to run): ${p.unowned.slice(0, 8).join(', ')}${p.unowned.length > 8 ? ', …' : ''}`);
  if (p.escalation) L.push(formatEscalation(p.escalation));
  const n = p.next; const parts = [];
  if (n.browser.length) parts.push(`browser verification (${n.browser.join(', ')})`);
  if (n.device.length) parts.push(`emulator/device verification (${n.device.join(', ')})`);
  if (n.api.length) parts.push(`API-level verification (${n.api.join(', ')})`);
  L.push(`After the gate opens: ${parts.join('; ') || 'no browser or device verification needed'}.`);
  return L.join('\n');
}

/**
 * One line of scope: what is validated, why, and which verification follows the gate. The escalation line is
 * for the orchestrator only (`orchestrator: false` for implementers' `--units` runs, who cannot launch agents).
 */
export function formatScope(p, { orchestrator = true } = {}) {
  if (!p.entries.length) return p.docsOnly ? 'Scope: documentation only; no checks needed.' : 'Scope: no changed code.';
  const units = p.entries.map((e) => `${e.unit} [${e.kinds.join('+') || 'shared'}] (${e.reasons.join('; ')})`).join('; ');
  const n = p.next; const next = [n.browser.length && `browser ${n.browser.join(', ')}`, n.device.length && `device ${n.device.join(', ')}`, n.api.length && `API-level ${n.api.join(', ')}`].filter(Boolean).join('; ');
  const flags = [p.contractFiles.length && 'G6 contract check (mark)', p.migrationFiles.length && 'G12 migration check (mark)', p.serializeTests.length && `tests serialized: ${p.serializeTests.join(', ')}`].filter(Boolean);
  return `Scope: ${units}. After the gate: ${next || 'no browser or device verification'}.${flags.length ? ` ${flags.join('; ')}.` : ''}${orchestrator && p.escalation ? `\n${formatEscalation(p.escalation)}` : ''}`;
}

const VERDICT = {
  OPEN: 'OPEN: every required check passed for the current code. Browser/device verification may start.',
  CLOSED: 'CLOSED: fix or run the ✗ rows (`run` re-runs only those). Browser verification must not start.',
  BLOCKED: 'BLOCKED: only environment blockers remain (✗). Unblock them or report BLOCKED. Browser verification must not start.'
};

/** Compact by default: only rows that need attention, plus counts. `verbose` prints every row. */
export function formatGate(g, { verbose = false, final = false } = {}) {
  const shown = verbose ? g.rows : g.rows.filter((r) => r.blocking || !['PASSED', 'N/A'].includes(r.state));
  const L = shown.map((r) => `${r.blocking ? '✗' : '-'} ${r.unit}:${r.check} ${r.state}${r.cycle != null ? ` (cycle ${r.cycle})` : ''}${[r.command && ` \`${r.command}\``, r.reason && ` ${r.reason}`, r.hint && ` → ${r.hint}`, r.blocking && r.log && ` log: ${r.log}`].filter(Boolean).join('')}`);
  const counts = {}; for (const r of g.rows) counts[r.state] = (counts[r.state] || 0) + 1;
  const summary = g.rows.length ? `Checks: ${Object.entries(counts).map(([s, n]) => `${n} ${s}`).join(', ')}.` : g.docsOnly ? 'Only documentation changed.' : 'No changed code to validate.';
  return [...L, summary, final ? `Final gate (builds included): ${g.result}` : `Pre-browser gate: ${VERDICT[g.result]}`].join('\n');
}

const KIND = (kinds) => (kinds.includes('mobile') ? 'Mobile' : kinds.includes('web') ? 'Web' : kinds.includes('backend') ? 'Backend/API' : 'Shared');
const RANK = ['FAILED', 'BLOCKED', 'STALE', 'MISSING', 'DEFERRED', 'NOT RUN', 'PRE-EXISTING', 'UNAVAILABLE', 'PASSED', 'N/A'];

/** The report's per-application table: the worst status per column for each unit. */
export function appTable(g) {
  const L = ['| Application | Type check | Lint | Tests | Build |', '|---|---|---|---|---|'];
  for (const s of g.scope) {
    const col = (k) => g.rows.filter((r) => r.unit === s.unit && r.column === k).map((r) => r.state).sort((a, b) => RANK.indexOf(a) - RANK.indexOf(b))[0] ?? 'N/A';
    L.push(`| ${KIND(s.kinds)}: ${s.unit} | ${col('typecheck')} | ${col('lint')} | ${col('test')} | ${col('build')} |`);
  }
  return L.join('\n');
}

/** Everything phase 9 needs in one call: final gate, line endings, new comments and evidence links. */
export async function finalCheck(root, task) {
  const g = await gate(root, task, { final: true });
  const eol = eolCheck(root);
  const comments = checkComments(root);
  const ev = fs.existsSync(evidenceDir(root, task)) ? evidence(root, task) : null;
  const problems = [
    g.result !== 'OPEN' && `gate ${g.result}`,
    eol.flagged.length && `${eol.flagged.length} line-ending flip(s)`,
    comments.errors && `${comments.errors} comment error(s)`,
    ev?.missing.length && `${ev.missing.length} missing evidence file(s)`,
  ].filter(Boolean);
  return { ready: !problems.length, problems, gate: g, eol, comments, evidence: ev };
}

function parseArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (['--json', '--all', '--baseline', '--build', '--init', '--verbose'].includes(a)) o[a.slice(2)] = true;
    else if (a.startsWith('--')) o[a.slice(2)] = argv[++i];
    else o._.push(a);
  }
  return o;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const cmd = o._[0]; const root = path.resolve(o.root ?? '.');
  const list = (s) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : null);
  const usage = 'usage: validation-gate.mjs plan|run|mark|gate|evidence|final --task <slug> [--root <dir>] [--units a,b] [--json] (see the header for options)';
  if (!['plan', 'run', 'mark', 'gate', 'evidence', 'final'].includes(cmd) || !o.task || !/^[\w.-]+$/.test(o.task)) { console.error(usage); process.exit(2); }
  if (cmd !== 'evidence' && !isGitRepo(root) && !o.units) {
    console.error(`UNAVAILABLE: ${root} is not a git repository, so changed files and staleness cannot be tracked (pass --units to validate named units)`);
    process.exit(2);
  }
  const out = (data, text) => console.log(o.json ? JSON.stringify(data, (k, v) => (v instanceof Set ? [...v] : k === 'units' || k === 'tail' ? undefined : v), 2) : text);
  if (cmd === 'plan') { const p = await plan(root, { units: list(o.units) }); out(p, formatPlan(p)); }
  else if (cmd === 'gate') { const g = await gate(root, o.task); out(g, formatGate(g, { verbose: o.verbose })); process.exit(g.result === 'OPEN' ? 0 : g.result === 'BLOCKED' ? 2 : 1); }
  else if (cmd === 'final') {
    const f = await finalCheck(root, o.task);
    const L = [appTable(f.gate), '', formatGate(f.gate, { verbose: o.verbose, final: true })];
    L.push(f.eol.flagged.length ? f.eol.flagged.map((x) => `✗ EOL ${x.path}: ${x.problem}`).join('\n') : `EOL: OK (${f.eol.checked} file(s)).`);
    for (const c of f.comments.findings) L.push(`${c.level === 'error' ? '✗' : '-'} comment ${c.file}:${c.line} [${c.rule}] "${c.text}" → ${c.fix}`);
    L.push(`Comments: ${f.comments.comments} new line(s), ${f.comments.errors} error(s), ${f.comments.warnings} warning(s).`);
    if (f.evidence) {
      L.push(`Evidence (${f.evidence.files.length} file(s)):`, ...f.evidence.links.map((l) => `- ${l}`));
      if (f.evidence.missing.length) L.push(`✗ index.md cites missing file(s): ${f.evidence.missing.join(', ')}`);
      if (f.evidence.unindexed.length) L.push(`- not described in index.md: ${f.evidence.unindexed.join(', ')}`);
    } else L.push('Evidence: none (no browser or device run recorded).');
    L.push(f.ready ? 'FINAL: READY to report.' : `FINAL: NOT READY: ${f.problems.join('; ')}.`);
    L.push('Completion status: exactly one of VERIFIED | VERIFIED WITH LIMITATIONS | BLOCKED | FAILED (rules in quality-gates.md). Words such as DONE, COMPLETE or DONE_WITH_CONCERNS are not valid.');
    out(f, L.join('\n'));
    process.exit(f.ready ? 0 : f.problems.length === 1 && f.gate.result === 'BLOCKED' ? 2 : 1);
  }
  else if (cmd === 'mark') { const r = await mark(root, o.task, { unit: o.unit, check: o.check, status: o.status, reason: o.reason }); out(r, `recorded ${r.unit}:${r.check} = ${r.status} (cycle ${r.cycle})`); }
  else if (cmd === 'evidence') {
    const ev = evidence(root, o.task, { init: o.init });
    const text = [`Evidence: ${ev.dir}/ (${ev.files.length} file(s))`, ...ev.links.map((l) => `- ${l}`)];
    if (ev.missing.length) text.push(`MISSING: index.md cites files that do not exist: ${ev.missing.join(', ')}`);
    if (ev.unindexed.length) text.push(`Not described in index.md yet: ${ev.unindexed.join(', ')}`);
    out(ev, text.join('\n'));
    process.exit(ev.missing.length ? 1 : 0);
  } else {
    const r = await run(root, o.task, { units: list(o.units), checks: list(o.checks), all: o.all, baseline: o.baseline, build: o.build, jobs: Number(o.jobs) || 0, timeout: Number(o.timeout) || 15 });
    // Compact on purpose: passing checks take one line in total; only failures get their output.
    const passed = r.results.filter((x) => x.status === 'PASSED');
    const L = [formatScope(r.plan, { orchestrator: !o.units }), `Validation cycle ${r.cycle}: ran ${r.results.length} check(s)${r.skipped.length ? `, ${r.skipped.length} already passing for the current code (not re-run)` : ''}.`];
    if (passed.length) L.push(`PASSED: ${passed.map((x) => `${x.unit}:${x.check} \`${x.command}\` ${(x.durationMs / 1000).toFixed(1)}s`).join(', ')}`);
    for (const x of r.results.filter((y) => y.status !== 'PASSED')) L.push('', `✗ ${x.unit}:${x.check} ${x.status} \`${x.command}\`${x.reason ? ` (${x.reason})` : ''}; full log: ${x.log}`, x.tail.trimEnd().split('\n').slice(-25).join('\n'));
    if (r.deferred.length) L.push(`DEFERRED until the final check: ${r.deferred.join(', ')}. Run \`run --task ${o.task} --build\` once, right before \`final\`.`);
    if (r.modifiedDuringRun.length) L.push('', `WARNING: files in ${r.modifiedDuringRun.join(', ')} changed while the checks ran. Review them (G14). ${o.baseline ? 'This baseline is unreliable: record it before any edit starts.' : 'If an implementer was still editing, these results are already stale: run checks only after every editor has returned.'}`);
    if (r.gate) L.push('', formatGate(r.gate, { final: r.final }));
    out({ ...r, plan: undefined }, L.join('\n'));
    // A full run exits with the gate verdict, so one call both validates and answers "may the browser start?".
    if (r.gate && !o.units) process.exit(r.gate.result === 'OPEN' ? 0 : r.gate.result === 'BLOCKED' ? 2 : 1);
    const s = new Set(r.results.map((x) => x.status));
    process.exit(s.has('FAILED') ? 1 : s.has('BLOCKED') ? 2 : 0);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((e) => { console.error(`validation-gate: ${e.message}`); process.exit(2); });
