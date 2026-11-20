#!/usr/bin/env node
// FORGE validation planner, check runner and pre-browser gate. Zero dependencies (Node >= 18).
//
//   node validation-gate.mjs plan --task <slug> [--units a,b] [--json]
//       Map the changed files to the project's units (apps and packages from the stack detector), add the
//       consumers of changed shared packages, and list each unit's type check, lint, test and build command.
//   node validation-gate.mjs run --task <slug> [--units a,b] [--checks lint,test] [--all] [--baseline] [--full]
//                                [--base <ref>] [--jobs N] [--timeout <min>] [--json]
//       --base <ref> (branch work: "test this branch", "did it break anything"): the scope also covers what the
//       branch committed since it forked from <ref>. Stored for the task, so later run/gate/final keep it.
//       Run only the plan's checks that are not already passing for the current code (missing, stale, failed
//       or blocked). A production build that type check or tests already cover, and whose output no consumer
//       imports, is left to the user: never run, never required, and `final` prints its command. A build that
//       feeds a consumer or is the unit's only compile step still runs every cycle.
//       Tests: a unit whose test script is a plain vitest/jest call runs only the related tests (`--changed` /
//       `--changedSince`, traced through the module graph), and the gate and `final` accept that. The full
//       suite is left to the user, like the build: `final` prints its command. --full (alias --build) runs it
//       anyway, only when the user asks for a full-suite run. Other runners (pytest, go test, turbo test) have
//       no related-tests mode, so their test command still runs as is. A unit whose own and upstream changes
//       are only tests needs no browser or device verification.
//       Up to --jobs checks run at once, longest first (by the task's recorded durations). A unit's package.json
//       checks run side by side; other toolchains (Maven, Gradle, dotnet) keep type check → lint → tests; builds
//       run last. Tests of units that share a database run one at a time; a shared package with prebuilt output
//       is built before its consumers. One run per task at a time: a second run waits for the first, then runs
//       only what is still needed (exit 3 if it waited an hour). Progress lines go to stderr as checks end.
//       Each result goes to .forge/tasks/<slug>/validation/ledger.jsonl, each full log to
//       .forge/tasks/<slug>/evidence/reports/validation/. --all re-runs checks that still pass. A build that rewrites a tracked non-code file (a sitemap's lastmod) is reported,
//       and that file does not make other checks stale. --baseline records
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
//   node validation-gate.mjs resume [--json]
//       Which FORGE task owns the working tree's changes, and whether to resume it (its report is missing or
//       says BLOCKED, FAILED or NOT READY) or start a new task. The orchestrator's first command.
//   node validation-gate.mjs ports --ports 3000,5173 [--urls http://localhost:3000/api/health,...] [--wait <seconds>] [--host localhost] [--json]
//       --urls adds each local URL's HTTP status (local hosts only), instead of curl probes.
//       Which local ports accept connections (dev servers, API, database), in one call on any OS. --wait polls
//       until all listen (exit 1 if one never does), instead of a shell loop with sleep.
//   node validation-gate.mjs evidence --task <slug> [--init] [--json]
//       List the task's evidence as clickable links: screenshots and traces in .playwright-mcp/<slug>/
//       (screenshots/{before,after,responsive,workflows}, git-ignored), the rest in .forge/tasks/<slug>/evidence/.
//       Prints the answer's Visual Results table from the screenshot files. Exit 1 when evidence/index.md cites a
//       missing file. --init creates the folders. `final` also requires a screenshot of the final state, newer
//       than the last code edit, for browser- or device-visible changes (or "Visual evidence unavailable: <reason>").
//   node validation-gate.mjs final --task <slug> [--json]
//       Phase 9 in one call: the per-application table for the report, the final gate, line-ending flips,
//       errors in new comments, and evidence links. Exit 0 only when all of them are clean.
//
// Common: --root <dir> (default: cwd). It writes only inside .forge/ and runs no git command that changes the repo.

import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { changedFiles, isGitRepo, eolCheck, TOOL_OUTPUT_RE } from './verify-delta.mjs';
import { check as checkComments } from './comment-check.mjs';
import { escalation } from './review-target.mjs';
import { loadPlatform, strongTier } from './platform.mjs';

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
// Runner messages for a test that exceeded its own timeout (vitest, jest, mocha), the signature of an overloaded machine.
const LOAD_TIMEOUT_RE = /Test timed out in \d+ ?ms|Hook timed out in \d+ ?ms|Exceeded timeout of \d+ ?ms|Timeout - Async callback was not invoked|Timeout of \d+ ?ms exceeded/i;
const NOT_FOUND_RE = /is not recognized as an internal or external command|command not found|could not determine executable to run|canceled due to missing packages|npm (error|ERR!) code E404|No such file or directory.*(mvnw|gradlew)/i;
const DOC_RE = /\.(md|txt|rst|adoc)$|(^|\/)(LICENSE|CHANGELOG|AUTHORS|CODEOWNERS)(\.[a-z]+)?$/i;
const CODE_RE = /\.([cm]?[jt]sx?|py|go|java|kt|kts|scala|php|rb|rs|cs|fs|swift|dart|vue|svelte|ex|exs|css|scss|html|sql|graphql|gql|proto)$/i;
const TEST_RE = /(^|\/)(tests?|__tests__|spec|e2e)\/|(^test_.*\.py$|_test\.(py|go)$|\.(test|spec)\.[cm]?[jt]sx?$|Tests?\.(java|kt|cs|swift)$|_spec\.rb$|Test\.php$|_test\.dart$)/;
const API_RE = /(^|\/)(openapi|swagger)[^/]*\.(ya?ml|json)$|\.(graphql|gql|proto)$/i;
const MIGRATION_RE = /(^|\/)(migrations|migrate|db\/migration|database\/migrations|alembic\/versions|prisma\/migrations|drizzle|supabase\/migrations)\/|(^|\/)(schema\.prisma|schema\.sql|structure\.sql|schema\.rb)$/;
const ROOT_SHARED_RE = /^(package\.json|pnpm-workspace\.yaml|pnpm-lock\.yaml|yarn\.lock|package-lock\.json|bun\.lockb?|turbo\.json|nx\.json|lerna\.json|go\.work(\.sum)?|tsconfig[^/]*\.json|\.eslintrc[^/]*|eslint\.config\.[^/]+|biome\.jsonc?|\.prettierrc[^/]*|prettier\.config\.[^/]+|babel\.config\.[^/]+|jest\.config\.[^/]+|vitest\.(config|workspace)\.[^/]+|\.golangci\.[^/]+|ruff\.toml|setup\.cfg|pyproject\.toml|Makefile|\.nvmrc|\.node-version|\.tool-versions|Directory\.Build\.props|settings\.gradle(\.kts)?)$/;
const EVIDENCE_DIRS = ['network', 'reports'];
const VISUAL_DIRS = ['screenshots/before', 'screenshots/after', 'screenshots/responsive', 'screenshots/workflows', 'traces'];
const IMAGE_RE = /\.(png|jpe?g|webp|gif)$/i;

const posix = (p) => p.split(path.sep).join('/');
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const readText = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };
const taskDir = (root, task) => path.join(root, '.forge', 'tasks', task);
const baseFile = (root, task) => path.join(taskDir(root, task), 'validation', 'base');

/**
 * The branch base a task validates against. `--base <ref>` is stored on first use, so every later run, gate and
 * final of the task keeps the same scope without repeating it.
 */
export function taskBase(root, task, base = null) {
  if (base) {
    if (base.startsWith('-') || /\s/.test(base)) throw new Error(`--base ${base}: not a git ref`);
    fs.mkdirSync(path.dirname(baseFile(root, task)), { recursive: true });
    fs.writeFileSync(baseFile(root, task), base + '\n');
    return base;
  }
  try { return fs.readFileSync(baseFile(root, task), 'utf8').trim() || null; } catch { return null; }
}

/**
 * Files in scope: the working tree's changes, plus, with a base, everything the branch committed since it
 * forked from that base. Without the committed part, a branch's own API or package changes are never checked.
 */
export function scopeFiles(root, base = null) {
  const files = changedFiles(root);
  if (!base) return files;
  const r = spawnSync('git', ['-c', 'core.quotepath=false', 'diff', '--name-only', '-z', `${base}...HEAD`], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`--base ${base}: git diff ${base}...HEAD failed (${(r.stderr || '').trim().split('\n')[0]})`);
  const committed = r.stdout.split('\0').filter((f) => f && !f.startsWith('.forge/') && !TOOL_OUTPUT_RE.test(f));
  return [...new Set([...files, ...committed])].sort();
}
const ledgerFile = (root, task) => path.join(taskDir(root, task), 'validation', 'ledger.jsonl');
const evidenceDir = (root, task) => path.join(taskDir(root, task), 'evidence');
const visualDir = (root, task) => path.join(root, '.playwright-mcp', task);
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

/**
 * The command that runs only the tests related to the changed files, for a test script that is a plain vitest
 * or jest call (anything chained, piped or wrapped, like `turbo test`, always runs in full). Every cycle uses
 * it, and the final gate accepts it: the full suite is the user's, run only with `run --full` when asked.
 */
export function affectedCommand(c, base = null) {
  const m = (c.body || '').trim().match(/^(vitest|jest)((?:\s+[^\s&|;<>`$()]+)*)$/);
  if (!m || /\s(watch|dev|bench|--ui)\b/.test(m[2])) return null;
  const exec = c.command.startsWith('pnpm ') ? 'pnpm exec' : 'npx --no-install';
  const since = m[1] === 'vitest' ? (base ? `--changed ${base}` : '--changed') : (base ? `--changedSince=${base}` : '--onlyChanged');
  return `${exec} ${m[1]}${m[2]} ${since} --passWithNoTests`;
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
export async function plan(root, { units: only = null, ctx = null, base = null } = {}) {
  ctx ??= await loadContext(root);
  const U = describeUnits(root, ctx);
  const monorepo = U.length > 1;
  const git = isGitRepo(root);
  const changed = git ? scopeFiles(root, base) : [];
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
  const gitBase = base;
  const esc = escalation(relevant);
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
        else if (name === 'test' && git) {
          // Related tests, with type check, lint and browser QA, are the verdict. The full suite is the user's.
          const cmd = affectedCommand(c, gitBase);
          if (cmd) base.affected = cmd;
        }
        checks.push(base);
      });
    }
    if (a.own.some((f) => contractFiles.includes(f))) checks.push({ key: 'contract', column: 'extra', manual: true, required: true, status: 'PENDING', reason: 'G6: API contract changed; validate schema, status codes, error shapes and backward compatibility, then mark' });
    if (a.own.some((f) => migrationFiles.includes(f))) checks.push({ key: 'migration', column: 'extra', manual: true, required: true, status: 'PENDING', reason: 'G12: migration or schema changed; apply and roll back on a local database and run the DB-backed tests, then mark' });
    const ownRuntime = a.own.some((f) => !TEST_RE.test(f)) || !!broad.length || a.reasons.some((r) => r !== 'changed files' && !r.startsWith('consumer of'));
    entries.push({ unit: u.path, kinds: u.kinds, reasons: a.reasons, files: a.own, database: u.database, upstream: [...u.deps].filter((d) => affected.has(d)), closure: [...upstreamClosure(U, u)].filter((d) => affected.has(d)), ownRuntime, checks });
  }
  entries.sort((x, y) => x.unit.localeCompare(y.unit));
  for (const e of entries) {
    // A consumer waits for an upstream package whose consumers import its build output.
    e.after = e.upstream.filter((d) => { const up = U.find((x) => x.path === d); const ue = entries.find((x) => x.unit === d); return prebuilt(up) && ue?.checks.some((c) => c.column === 'build' && c.status === 'PENDING'); });
  }
  // Drop any ordering edge that closes a cycle, so the runner can never deadlock.
  const reaches = (from, to, seen = new Set()) => from === to || (!seen.has(from) && seen.add(from) && (entries.find((x) => x.unit === from)?.after || []).some((d) => reaches(d, to, seen)));
  for (const e of entries) e.after = e.after.filter((d) => !reaches(d, e.unit));
  // A production build re-proves what type check, lint and tests already proved, and it was the slowest
  // check (a mobile build took ~3 minutes), so it is left to the user. It still runs when consumers import its
  // output, or when it is the unit's only compile step.
  for (const e of entries) {
    const covered = e.checks.some((c) => (c.column === 'typecheck' || c.column === 'test') && c.required);
    const feedsConsumers = entries.some((x) => x.after.includes(e.unit));
    for (const c of e.checks) if (c.column === 'build' && c.status === 'PENDING' && covered && !feedsConsumers) Object.assign(c, { status: 'N/A', required: false, userBuild: true, reason: USER_BUILD });
  }
  const dbUnits = entries.filter((e) => e.database && e.checks.some((c) => c.column === 'test' && c.status === 'PENDING')).map((e) => e.unit);
  const next = { browser: [], device: [], api: [] };
  // Browser and device verification follow runtime impact: a unit whose own and upstream changes are only
  // tests has nothing new to see in a browser.
  for (const e of entries) e.runtime = e.ownRuntime || e.closure.some((d) => entries.find((x) => x.unit === d)?.ownRuntime);
  for (const e of entries.filter((x) => x.runtime)) {
    if (e.kinds.includes('web')) next.browser.push(e.unit);
    if (e.kinds.includes('mobile')) next.device.push(e.unit);
    if (e.kinds.includes('backend') && !e.kinds.includes('web')) next.api.push(e.unit);
  }
  return { git, base, changed: changed.length, docsOnly: changed.length > 0 && !relevant.length, broad, unowned, contractFiles, migrationFiles, serializeTests: dbUnits.length > 1 ? dbUnits : [], escalation: esc, entries, next, units: U };
}

const USER_BUILD = 'left to the user: type check, lint and tests cover it';
const hashOf = (root, f) => { try { return sha(fs.readFileSync(path.join(root, f))); } catch { return 'deleted'; } };

/** Non-code files a build of this task rewrote (path → hash it left), from the ledger. */
function buildOutputs(root, task) {
  const out = new Map();
  for (const r of readLedger(root, task)) for (const [f, h] of Object.entries(r.wrote || {})) out.set(f, h);
  return out;
}

/** Hashes of the working tree's changed non-code files, taken around a build to see what it rewrote. */
function nonCodeState(root) {
  return new Map(changedFiles(root).filter((f) => !CODE_RE.test(f)).map((f) => [f, hashOf(root, f)]));
}

function fingerprints(root, p, task = null) {
  if (!p.git) return {};
  // A file is ignored while it still holds exactly what a build wrote (a sitemap's lastmod, a version stamp).
  // That is a side effect of checking, not an edit; any later edit changes the hash and counts again.
  const outputs = task ? buildOutputs(root, task) : new Map();
  const hashes = new Map(scopeFiles(root, p.base).filter((f) => !DOC_RE.test(f)).map((f) => [f, hashOf(root, f)]));
  for (const [f, h] of outputs) if (hashes.get(f) === h) hashes.delete(f);
  const files = [...hashes.keys()];
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

/**
 * A Windows path with an upper-case drive letter. Started from `c:\…` (a VS Code terminal's usual cwd), Vitest
 * loaded React twice, once per drive-letter spelling, and a measured run saw 235 tests fail with "Cannot read
 * properties of null (reading 'useEffect')". The same code passed from `C:\…`.
 */
export const upperDrive = (p) => (process.platform === 'win32' ? p.replace(/^([a-z]):/, (_, d) => `${d.toUpperCase()}:`) : p);

const headOf = (root) => { const r = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : null; };

/**
 * Full passes recorded by the project's other tasks, keyed by unit, check and code fingerprint, for this HEAD
 * only. Same commit plus identical changed files is the same code, so the result still holds: a measured
 * run spent 266 s re-running a baseline that the previous task had already passed on that exact tree.
 */
function otherTaskPasses(root, task, head) {
  const out = new Map();
  if (!head) return out;
  let tasks = [];
  try { tasks = fs.readdirSync(path.join(root, '.forge', 'tasks')).filter((t) => t !== task); } catch { return out; }
  for (const t of tasks) {
    for (const r of readLedger(root, t)) {
      if (r.head === head && r.status === 'PASSED' && r.source === 'runner' && !r.scope && r.fingerprint) out.set(`${r.unit}\0${r.check}\0${r.fingerprint}`, { task: t, cycle: r.cycle, log: r.log });
    }
  }
  return out;
}

const STATUS_RE = /Completion status:?\**:?\s*\**\s*(VERIFIED WITH LIMITATIONS|VERIFIED|BLOCKED|FAILED|NOT READY)/i;

/**
 * Which task the working tree's changes belong to, so a run that stopped (a permission wall, an ended turn)
 * is resumed where it stopped instead of restarted as a new task over the same code. A task owns the tree when
 * an app's changed files are still byte for byte what one of its checks saw. A resume picks that task up when
 * its report is missing or says BLOCKED, FAILED or NOT READY. Decided by the script, not by reading reports:
 * a measured re-run read a newer VERIFIED report (whose code had been stashed) and started a new pass instead.
 */
export async function resumeTarget(root, { ctx = null } = {}) {
  let tasks = [];
  try { tasks = fs.readdirSync(path.join(root, '.forge', 'tasks')); } catch { return null; }
  const p = await plan(root, { ctx });
  if (!p.git) return null;
  const changed = p.entries.filter((e) => e.files.length).map((e) => e.unit);
  if (!changed.length) return null;
  const fps = fingerprints(root, p);
  const cands = [];
  for (const t of tasks) {
    const recs = readLedger(root, t).filter((r) => r.fingerprint && r.cycle !== 'baseline');
    const matched = changed.filter((u) => recs.some((r) => r.unit === u && r.fingerprint === fps[u]));
    if (!matched.length) continue;
    const report = readText(path.join(root, '.forge', 'tasks', t, 'report.md'));
    const status = report ? (report.match(STATUS_RE)?.[1].toUpperCase() ?? 'UNKNOWN') : 'NO REPORT';
    cands.push({ task: t, status, matched, changed, last: recs.at(-1)?.at ?? '' });
  }
  cands.sort((a, b) => b.matched.length - a.matched.length || String(b.last).localeCompare(String(a.last)));
  const best = cands[0];
  return best ? { ...best, resume: !best.status.startsWith('VERIFIED') } : null;
}

export function formatResume(r) {
  if (!r) return 'NEW TASK: no FORGE task owns the current changes. Start at step 1.';
  const why = `${r.matched.join(', ')} still hold${r.matched.length === 1 ? 's' : ''} exactly the code its checks saw`;
  if (!r.resume) return `NEW TASK: the current changes are task ${r.task}'s (${r.status}; ${why}). Build on them as a new task.`;
  return [
    `RESUME ${r.task}: its report says ${r.status} and ${why}.`,
    'Resume it (unless the request names a clearly different feature). Reports of other tasks, newer VERIFIED ones included, describe code that is not in the working tree: never start a new pass from them.',
    `Keep its slug, spec.md and plan.md; skip steps 1-6. Run \`run --task ${r.task}\` (it re-runs only what is stale or missing), then do only what its report.md lists as open (unverified fixes, browser retests), then \`final --task ${r.task}\`.`,
  ].join('\n');
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
export async function gate(root, task, { ctx = null, p = null } = {}) {
  p ??= await plan(root, { ctx, base: taskBase(root, task) });
  const all = readLedger(root, task);
  const ledger = all.filter((r) => r.cycle !== 'baseline');
  const fps = fingerprints(root, p, task);
  const rows = [];
  for (const e of p.entries) {
    for (const c of e.checks) {
      const row = { unit: e.unit, check: c.key, column: c.column, command: c.command ?? null, required: c.required };
      const last = ledger.filter((r) => r.unit === e.unit && r.check === c.key).at(-1);
      if (c.userBuild) Object.assign(row, { state: 'N/A', reason: c.reason, userBuild: true });
      else if (!c.required && !last) Object.assign(row, { state: c.status, reason: c.reason });
      else if (!last) Object.assign(row, { state: c.status === 'NOT RUN' ? 'NOT RUN' : 'MISSING', reason: c.reason ?? 'not run for the current code' });
      else {
        const stale = p.git && last.fingerprint && last.fingerprint !== fps[e.unit];
        const state = (last.status === 'PASSED' || last.status === 'PRE-EXISTING') && stale ? 'STALE' : last.status;
        Object.assign(row, { state, cycle: last.cycle, reason: state === 'STALE' ? `files in scope changed since cycle ${last.cycle}` : last.reason, log: last.log });
        // A pass of the related tests (the runner traces them through the module graph) is final; `final`
        // hands the full-suite command to the user, as it does the build.
        if (last.scope === 'affected' && state === 'PASSED') Object.assign(row, { reason: 'related tests (dependency-traced)', relatedOnly: true });
        if (state === 'FAILED' && all.some((r) => r.cycle === 'baseline' && r.unit === e.unit && r.check === c.key && r.status === 'FAILED')) row.hint = 'also failed on the baseline: if it is the same failure, mark it PRE-EXISTING';
        else if (state === 'FAILED') {
          // A second failing cycle means the first diagnosis and fix did not hold: the policy trigger for Opus.
          const failedCycles = new Set(ledger.filter((r) => r.unit === e.unit && r.check === c.key && r.status === 'FAILED').map((r) => r.cycle));
          if (failedCycles.size >= 2) Object.assign(row, { escalate: true, hint: `failed in ${failedCycles.size} cycles: move the root-cause analysis to the strong model tier before the next fix (core/delegation.md#model-escalation)` });
        }
      }
      row.blocking = c.required && !OK.has(row.state);
      rows.push(row);
    }
  }
  const blocking = rows.filter((r) => r.blocking);
  const result = !blocking.length ? 'OPEN' : blocking.every((r) => r.state === 'BLOCKED') ? 'BLOCKED' : 'CLOSED';
  const g = { result, at: new Date().toISOString(), rows, scope: p.entries.map((e) => ({ unit: e.unit, kinds: e.kinds, reasons: e.reasons })), next: p.next, changed: p.changed, docsOnly: p.docsOnly, running: runInProgress(root, task) };
  if (fs.existsSync(path.join(root, '.forge'))) {
    fs.mkdirSync(path.dirname(ledgerFile(root, task)), { recursive: true });
    fs.writeFileSync(path.join(path.dirname(ledgerFile(root, task)), 'gate.json'), JSON.stringify(g, null, 2) + '\n');
  }
  return g;
}

/**
 * At most n jobs at once, and at most caps[kind] of one kind; a free slot goes to the waiting job with the highest
 * priority whose kind still has room. One queue, so a capped kind never lets a lower-priority job jump ahead.
 * Starting is deferred to the next macrotask so every job queued in the same tick competes for the first slots.
 */
function limiter(n, caps = {}) {
  let active = 0; const q = []; const byKind = {};
  const room = (kind) => caps[kind] == null || (byKind[kind] || 0) < caps[kind];
  const next = () => {
    while (active < n) {
      let i = -1;
      for (let j = 0; j < q.length; j++) if (room(q[j].kind) && (i < 0 || q[j].prio > q[i].prio)) i = j;
      if (i < 0) return;
      const { fn, res, rej, kind } = q.splice(i, 1)[0];
      active++; byKind[kind] = (byKind[kind] || 0) + 1;
      fn().then(res, rej).finally(() => { active--; byKind[kind]--; next(); });
    }
  };
  return (fn, prio = 0, kind = '') => new Promise((res, rej) => { q.push({ fn, res, rej, prio, kind }); setImmediate(next); });
}

const lockFile = (root, task) => path.join(taskDir(root, task), 'validation', 'run.lock');
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

/** The run holding the task's lock, when it belongs to another live process. */
export function runInProgress(root, task) {
  const held = readJson(lockFile(root, task));
  return held?.pid && held.pid !== process.pid && alive(held.pid) ? held : null;
}

/**
 * One `run` per task at a time. A second run waits for the first and then re-plans, so it runs only what is
 * still needed. In a measured run, a backgrounded run looked dead, a second one started, and both ran the two
 * slowest suites (140 s and 263 s) side by side.
 */
async function acquireRunLock(root, task, { waitMs, onWait }) {
  const file = lockFile(root, task);
  ensureWorkspace(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const t0 = Date.now(); let told = false;
  for (;;) {
    try {
      fs.writeFileSync(file, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }), { flag: 'wx' });
      return () => { try { if (readJson(file)?.pid === process.pid) fs.rmSync(file, { force: true }); } catch { /* already gone */ } };
    } catch (e) { if (e.code !== 'EEXIST') throw e; }
    const held = readJson(file);
    let ageMs = Infinity; try { ageMs = Date.now() - fs.statSync(file).mtimeMs; } catch { /* removed meanwhile */ }
    const halfWritten = !held && ageMs < 10000;
    if (!halfWritten && (!held?.pid || !alive(held.pid) || ageMs > 6 * 3600000)) { fs.rmSync(file, { force: true }); continue; }
    if (Date.now() - t0 >= waitMs) {
      const err = new Error(`another validation run for task "${task}" is still in progress (pid ${held?.pid}, started ${held?.startedAt}). Wait for it; do not start another.`);
      err.code = 'BUSY'; throw err;
    }
    if (!told && held) { onWait?.(held); told = true; }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

// Expected duration of a check with no history in this task: tests and builds first, they set the wall time.
const DEFAULT_MS = { test: 60000, build: 60000, typecheck: 20000, lint: 15000, format: 5000 };
// package.json scripts (tsc, eslint, prettier, vitest/jest) only read the unit, so they can run side by side.
// Maven, Gradle, dotnet and make compile into one shared output folder, so their checks keep running in order.
const PARALLEL_SAFE = (c) => /^package\.json#scripts\./.test(c.source || '');

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
    const child = spawn(command, { cwd: upperDrive(path.join(root, unit)), shell: true, windowsHide: true, detached: process.platform !== 'win32', env: { ...process.env, CI: process.env.CI || '1', FORCE_COLOR: '0', NO_COLOR: '1' } });
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
export async function run(root, task, opts = {}) {
  const release = await acquireRunLock(root, task, { waitMs: opts.waitMs ?? 60 * 60000, onWait: opts.onWait });
  try { return await runLocked(root, task, opts); } finally { release(); }
}

async function runLocked(root, task, { units = null, checks = null, all = false, baseline = false, full = false, build = false, base = null, jobs = 0, timeout = 15, ctx = null, onProgress = null } = {}) {
  const p = await plan(root, { units, ctx, base: taskBase(root, task, base) });
  // --full runs the full test suites, only when the user asks for them. --build is its old name, from when
  // this pass also ran the production builds.
  const fullPass = full || build;
  const before = baseline ? null : await gate(root, task, { p });
  const fresh = new Set((before?.rows || []).filter((r) => OK.has(r.state) && !(fullPass && r.relatedOnly)).map((r) => `${r.unit}\0${r.check}`));
  const prior = readLedger(root, task);
  const cycle = baseline ? 'baseline' : 1 + Math.max(0, ...prior.map((r) => (typeof r.cycle === 'number' ? r.cycle : 0)));
  const fps = fingerprints(root, p, task);
  const head = p.git ? headOf(root) : null;
  const elsewhere = all ? new Map() : otherTaskPasses(root, task, head);
  const reused = [];
  const work = p.entries.map((e) => ({ e, todo: e.checks.filter((c) => {
    if (c.manual || c.status !== 'PENDING' || (checks && !checks.includes(c.key.split('#')[0])) || (!all && !baseline && fresh.has(`${e.unit}\0${c.key}`))) return false;
    const hit = elsewhere.get(`${e.unit}\0${c.key}\0${fps[e.unit]}`);
    if (!hit) return true;
    const rec = { cycle, unit: e.unit, check: c.key, column: c.column, command: c.command, status: 'PASSED', reason: `reused: task ${hit.task} cycle ${hit.cycle} passed on the same commit and files`, durationMs: 0, log: hit.log, fingerprint: fps[e.unit], head, source: 'runner', reusedFrom: hit.task };
    append(root, task, rec); reused.push(rec);
    return false;
  }) })).filter((w) => w.todo.length);
  const width = jobs > 0 ? jobs : Math.max(2, Math.min(4, Math.floor(os.cpus().length / 2)));
  // Test runners already use every core, so at most half the slots run suites; 4 at once on 8 cores timed out.
  const slot = limiter(width, { test: Math.max(1, Math.floor(width / 2)) });
  const dbLock = limiter(1);
  const retryAlone = [];
  const results = [];
  // Longest first: the slowest suite (263 s in a measured web app) used to start only after its unit's type
  // check, lint and format. Units that others wait on go before everything.
  const lastMs = new Map(prior.filter((r) => r.source === 'runner' && r.durationMs).map((r) => [`${r.unit}\0${r.check}`, r.durationMs]));
  const upstream = new Set(p.entries.flatMap((e) => e.after));
  const prio = (unit, c) => (upstream.has(unit) ? 1e9 : 0) + (lastMs.get(`${unit}\0${c.key}`) ?? DEFAULT_MS[c.key.split('#')[0]] ?? 30000);
  onProgress?.(`Validation cycle ${cycle}: running ${work.reduce((n, w) => n + w.todo.length, 0)} check(s), up to ${width} at a time (pid ${process.pid}).`);
  const runCheck = (e, c, { alone = false } = {}) => {
    const timed = () => slot(async () => {
      const pre = c.column === 'build' ? nonCodeState(root) : null;
      // Only the tests related to the change run. The full suite (the web's took 155-263 s in measured runs)
      // re-proves what type check, related tests and browser QA already cover, so it is the user's.
      const affectedRun = !!c.affected && !fullPass && !baseline;
      const r = await execCheck(root, task, e.unit, affectedRun ? { ...c, command: c.affected, source: '' } : c, cycle, timeout);
      // A test that times out while other suites load the machine is not a verdict yet: re-run it alone once the
      // batch ends. A measured cycle reported admin tests FAILED ("Test timed out in 5000ms"); alone they passed.
      if (!alone && c.column === 'test' && r.status === 'FAILED' && LOAD_TIMEOUT_RE.test(r.tail.slice(-20000))) {
        retryAlone.push({ e, c });
        onProgress?.(`  … ${e.unit}:${c.key} timed out under load; re-running it alone after the batch`);
        return;
      }
      const rec = { cycle, unit: e.unit, check: c.key, column: c.column, command: r.command, status: r.status, exitCode: r.exitCode, reason: alone && r.status === 'PASSED' ? 'passed when re-run alone after timing out under load' : r.reason, durationMs: r.durationMs, log: r.log, fingerprint: fps[e.unit] ?? null, head, source: 'runner', ...(affectedRun && { scope: 'affected' }) };
      if (pre) {
        const wrote = Object.fromEntries([...nonCodeState(root)].filter(([f, h]) => pre.get(f) !== h && h !== 'deleted'));
        if (Object.keys(wrote).length) rec.wrote = wrote;
      }
      append(root, task, rec);
      results.push({ ...rec, tail: r.tail });
      onProgress?.(`  ${r.status === 'PASSED' ? '✓' : '✗'} ${e.unit}:${c.key}${affectedRun ? ' (affected)' : ''}${alone ? ' (alone)' : ''}${r.status === 'PASSED' ? '' : ` ${r.status}`} ${(r.durationMs / 1000).toFixed(1)}s`);
    }, prio(e.unit, c), c.column === 'test' ? 'test' : '');
    // Tests that share a database wait for it before taking a slot, so no slot sits idle.
    return c.column === 'test' && p.serializeTests.includes(e.unit) ? dbLock(timed) : timed();
  };
  // Each unit's chain resolves its own deferred, so a consumer can wait for an upstream chain started after it.
  const done = new Map(work.map((w) => { let resolve; const promise = new Promise((r) => { resolve = r; }); return [w.e.unit, { promise, resolve }]; }));
  const runUnit = async ({ e, todo }) => {
    try {
      await Promise.all(e.after.map((d) => done.get(d)?.promise));
      const checksFirst = todo.filter((c) => c.column !== 'build');
      const inOrder = async (list) => { for (const c of list) await runCheck(e, c); };
      await Promise.all([...checksFirst.filter(PARALLEL_SAFE).map((c) => runCheck(e, c)), inOrder(checksFirst.filter((c) => !PARALLEL_SAFE(c)))]);
      // Builds last, so their output never changes files under a running check.
      await inOrder(todo.filter((c) => c.column === 'build'));
    } finally { done.get(e.unit).resolve(); }
  };
  await Promise.all(work.map(runUnit));
  for (const { e, c } of retryAlone) await runCheck(e, c, { alone: true });
  const after = fingerprints(root, p, task);
  const modified = Object.keys(fps).filter((u) => fps[u] !== after[u] && p.entries.some((e) => e.unit === u));
  const g = baseline ? null : await gate(root, task, { ctx });
  const skipped = p.entries.flatMap((e) => e.checks.filter((c) => c.status === 'PENDING' && !c.manual && fresh.has(`${e.unit}\0${c.key}`)).map((c) => `${e.unit}:${c.key}`));
  const sideEffects = results.flatMap((x) => Object.keys(x.wrote || {}).map((f) => ({ check: `${x.unit}:${x.check}`, file: f })));
  // New-comment errors surface here, where the author still owns the file. Found only by `final`, a fix
  // landed after the gate and browser QA, so it made checks and screenshots stale.
  const commentErrors = baseline ? [] : checkComments(root).findings.filter((c) => c.level === 'error' && (!units || units.some((u) => u === '.' || c.file.startsWith(u.replace(/\/$/, '') + '/'))));
  return { cycle, plan: p, results, reused, skipped, final: fullPass, modifiedDuringRun: modified, sideEffects, commentErrors, gate: g };
}

export async function mark(root, task, { unit, check, status, reason, ctx = null }) {
  if (!STATUSES.includes(status)) throw new Error(`--status must be one of ${STATUSES.join(', ')}`);
  if (!unit || !check || !reason || !reason.trim()) throw new Error('mark needs --unit, --check, --status and a non-empty --reason');
  if (status === 'PASSED' && reason.trim().length < 12) throw new Error('PASSED needs evidence in --reason: the command you ran and its key output line');
  const p = await plan(root, { ctx, base: taskBase(root, task) });
  const u = unit === 'root' ? '.' : unit.replace(/\\/g, '/').replace(/\/$/, '');
  if (!p.units.some((x) => x.path === u)) throw new Error(`unknown unit "${unit}" (units: ${p.units.map((x) => x.path).join(', ')})`);
  const prior = readLedger(root, task);
  const cycle = Math.max(0, ...prior.map((r) => (typeof r.cycle === 'number' ? r.cycle : 0))) || 1;
  const rec = { cycle, unit: u, check, column: COLUMN[check.split('#')[0]] ?? 'extra', status, reason: reason.trim(), fingerprint: fingerprints(root, p)[u] ?? null, source: 'manual' };
  append(root, task, rec);
  return rec;
}

const listFiles = (root, dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).map((f) => posix(path.relative(root, path.join(dir, String(f))))).filter((f) => fs.statSync(path.join(root, f)).isFile()) : []);
const shotName = (f) => path.posix.basename(f).replace(/\.[^.]+$/, '');
const isBefore = (f) => /\/before\//.test(f) || /(^|[-_])before([-_]|$)/i.test(shotName(f));
// "login-before-fix" and "login-after-fix" (or before/x and after/x) are one comparison.
const pairKey = (f) => shotName(f).replace(/(^|[-_])(before|after)(?=[-_]|$)/gi, '').replace(/^[-_]+/, '');
const humanize = (f) => shotName(f).replace(/[-_]+/g, ' ').trim();

/**
 * A task's evidence: screenshots and traces in .playwright-mcp/<slug>/ (where Playwright MCP saves them, with a
 * .gitignore of its own so they never show in git status), everything else (index.md, qa-session.md, network,
 * validation logs) in .forge/tasks/<slug>/evidence/. Paths are relative to the project root, so links open.
 */
export function evidence(root, task, { init = false } = {}) {
  const dir = evidenceDir(root, task); const vdir = visualDir(root, task);
  if (init) {
    ensureWorkspace(root);
    for (const d of EVIDENCE_DIRS) fs.mkdirSync(path.join(dir, d), { recursive: true });
    for (const d of VISUAL_DIRS) fs.mkdirSync(path.join(vdir, d), { recursive: true });
    if (!fs.existsSync(path.join(vdir, '.gitignore'))) fs.writeFileSync(path.join(vdir, '.gitignore'), '*\n');
  }
  const relRoot = posix(path.relative(root, dir)); const vRoot = posix(path.relative(root, vdir));
  const files = [...listFiles(root, dir), ...listFiles(root, vdir)].filter((f) => f !== `${relRoot}/index.md` && path.posix.basename(f) !== '.gitignore');
  const index = readText(path.join(dir, 'index.md'));
  const resolve = (c) => {
    if (c.startsWith('.forge/') || c.startsWith('.playwright-mcp/')) return c;
    return [`${relRoot}/${c}`, `${vRoot}/${c}`].find((f) => fs.existsSync(path.join(root, f))) ?? `${relRoot}/${c}`;
  };
  const cited = [...new Set([...index.matchAll(/\]\(([^)\s]+)\)|`([^`\s]+\.[A-Za-z0-9]{2,5})`/g)].map((m) => decodeURI(m[1] || m[2]).replace(/^\.\//, '')))]
    .filter((c) => !/^[a-z]+:\/\//i.test(c));
  const missing = cited.filter((c) => !fs.existsSync(path.join(root, resolve(c))));
  const citedFiles = new Set(cited.map(resolve));
  const label = (f) => (f.startsWith(relRoot + '/') ? f.slice(relRoot.length + 1) : f.startsWith(vRoot + '/') ? f.slice(vRoot.length + 1) : f);
  const unindexed = files.filter((f) => !f.startsWith(`${relRoot}/reports/validation/`) && !citedFiles.has(f)).map(label);
  const link = (f) => `[${label(f)}](${encodeURI(f)})`;
  // Any image the browser pass saved counts, wherever it landed: a measured run lost two minutes and five
  // permission prompts moving correct screenshots from .playwright-mcp/<slug>/ into screenshots/after/.
  const screenshots = files.filter((f) => IMAGE_RE.test(f) && !/(^|\/)traces\//.test(f));
  return { dir: relRoot, visualDir: vRoot, absolute: dir, files: files.map(label), links: files.map(link), missing, unindexed, screenshots, screenshotsAbsolute: screenshots.map((f) => path.join(root, f)), index, budget: shotBudget(screenshots), visual: visualResults(root, screenshots, index) };
}

/**
 * The answer's Visual Results table, built only from screenshot files that exist, so no link is typed by hand.
 * Each row takes its description from the evidence/index.md line naming the file; before/after shots share a row.
 */
export function visualResults(root, screenshots, index = '') {
  if (!screenshots.length) return '';
  const lines = index.split('\n');
  const describe = (f) => {
    const line = lines.find((l) => l.includes(path.posix.basename(f)));
    const text = line?.replace(/\[[^\]]*\]\([^)]*\)|`[^`]*`/g, '').replace(/^[\s\-*:—–|]+|[\s\-*:—–|]+$/g, '').trim();
    return (text || humanize(f)).replace(/\|/g, '\\|');
  };
  const groups = new Map();
  for (const f of [...screenshots].sort()) { const k = pairKey(f) + '\0' + path.posix.dirname(f).replace(/\/(before|after)$/, ''); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f); }
  // Rank: before/after pairs, then final states, then unpaired before shots; the answer shows at most 8 rows.
  const ranked = [...groups.values()].flatMap((g) => {
    const before = g.filter(isBefore); const after = g.filter((f) => !isBefore(f));
    if (before.length === 1 && after.length === 1) return [{ rank: 0, files: 2, row: `| ${describe(after[0])} | [View before](${encodeURI(before[0])}) · [View after](${encodeURI(after[0])}) |` }];
    return g.map((f) => ({ rank: isBefore(f) ? 2 : 1, files: 1, row: `| ${describe(f)} | [View ${isBefore(f) ? 'before' : humanize(f)}](${encodeURI(f)}) |` }));
  }).map((r, i) => ({ ...r, i })).sort((a, b) => a.rank - b.rank || a.i - b.i);
  const rows = ranked.slice(0, MAX_VISUAL_ROWS).map((r) => r.row);
  if (ranked.length > MAX_VISUAL_ROWS) {
    const at = screenshots[0].indexOf('/screenshots/');
    const folder = at >= 0 ? screenshots[0].slice(0, at + '/screenshots/'.length) : path.posix.dirname(screenshots[0]) + '/';
    rows.push(`| ${ranked.slice(MAX_VISUAL_ROWS).reduce((n, r) => n + r.files, 0)} more screenshot(s) | [Open the folder](${encodeURI(folder)}) |`);
  }
  return ['### Visual Results', '', '| What it shows | Screenshot |', '|---|---|', ...rows].join('\n');
}

const MAX_VISUAL_ROWS = 8;
// A measured discovery pass took 17 "before" shots and its retest 16 more: browser time, tokens and a wall of
// links. Before shots cover the screens the change touches; final shots, one per changed screen and state.
const SHOT_BUDGET = { before: 3, final: 8 };
export function shotBudget(screenshots) {
  const before = screenshots.filter(isBefore).length; const final = screenshots.length - before;
  return [
    before > SHOT_BUDGET.before && `${before} before screenshots (budget ${SHOT_BUDGET.before}: only the screens the change touches)`,
    final > SHOT_BUDGET.final && `${final} final-state screenshots (budget about ${SHOT_BUDGET.final}: one per changed screen and state)`,
  ].filter(Boolean);
}

const cell = (c) => (c ? (c.status === 'PENDING' ? `\`${c.command}\`` : `${c.status}${c.reason ? ` (${c.reason})` : ''}`) : 'N/A');

export function formatPlan(p) {
  const L = [`FORGE validation plan: ${p.changed} changed file(s), ${p.entries.length} affected unit(s)`];
  if (p.docsOnly) L.push('Only documentation changed: no type check, lint, test or build is required.');
  if (!p.entries.length) return L.join('\n');
  L.push('', '| Unit | Kind | Why | Type check | Lint | Tests | Build | Manual |', '|---|---|---|---|---|---|---|---|');
  for (const e of p.entries) {
    const col = (k) => e.checks.filter((c) => c.column === k).map(cell).join('<br>') || 'N/A';
    L.push(`| ${e.unit} | ${e.kinds.join('+') || 'shared/other'} | ${e.reasons.join('; ')} | ${col('typecheck')} | ${col('lint')} | ${col('test')} | ${col('build')} | ${e.checks.filter((c) => c.manual).map((c) => c.key).join(', ') || '-'} |`);
  }
  L.push('', 'Schedule: longest checks first, in parallel; required builds last in each unit; each check once per cycle.');
  if (p.serializeTests.length) L.push(`Serialized: tests of ${p.serializeTests.join(', ')} (shared database).`);
  for (const e of p.entries) if (e.after.length) L.push(`Ordered: ${e.after.join(', ')} build(s) before ${e.unit} (consumes built output).`);
  if (p.broad.length) L.push(`Broad impact: root config changed (${p.broad.join(', ')}), so every unit is in scope.`);
  if (p.contractFiles.length) L.push(`API contract changed (${p.contractFiles.join(', ')}): G6 \`contract\` check, plus its web/mobile consumers.`);
  if (p.migrationFiles.length) L.push(`Migration or schema changed (${p.migrationFiles.join(', ')}): G12 \`migration\` check.`);
  if (p.unowned.length) L.push(`Changed outside any unit (nothing to run): ${p.unowned.slice(0, 8).join(', ')}${p.unowned.length > 8 ? ', …' : ''}`);
  L.push(formatReviewDecision(p));
  const n = p.next; const parts = [];
  if (n.browser.length) parts.push(`browser verification (${n.browser.join(', ')})`);
  if (n.device.length) parts.push(`emulator/device verification (${n.device.join(', ')})`);
  if (n.api.length) parts.push(`API-level verification (${n.api.join(', ')})`);
  L.push(`After the gate opens: ${parts.join('; ') || 'no browser or device verification needed'}.`);
  return L.join('\n');
}

/**
 * Whether the change needs the independent code review (G13). Not by default: tests, the gate and browser QA
 * verify routine changes. It runs when the user asked for a review, or when auth, payment or schema files
 * changed, and then only on those files, on Opus.
 */
export function formatReviewDecision(p, platform = loadPlatform()) {
  const e = p.escalation;
  if (!e) return 'Code review: not required (no auth, payment or schema change). Run forge-code-reviewer only if the user asked for a review.';
  const files = [...new Set(Object.values(e.areas).flat())];
  const list = files.slice(0, 8).join(', ') + (files.length > 8 ? ', …' : '');
  const areas = Object.entries(e.areas).map(([k, v]) => `${k} (${v.length})`).join(', ');
  return `Code review: required for ${areas}, on these files only: ${list}. ${strongTier(platform, e.roles)} (core/delegation.md#model-escalation).`;
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
  const scope = p.base ? `Scope (branch since ${p.base} + working tree)` : 'Scope';
  return `${scope}: ${units}. After the gate: ${next || 'no browser or device verification'}.${flags.length ? ` ${flags.join('; ')}.` : ''}${orchestrator ? `\n${formatReviewDecision(p)}` : ''}`;
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
  const running = g.running ? [`A validation run for this task is in progress (pid ${g.running.pid}, started ${g.running.startedAt}): rows may change when it ends. Wait for it; never start a second run.`] : [];
  return [...L, ...running, summary, final ? `Final gate: ${g.result}` : `Pre-browser gate: ${VERDICT[g.result]}`].join('\n');
}

const KIND = (kinds) => (kinds.includes('mobile') ? 'Mobile' : kinds.includes('web') ? 'Web' : kinds.includes('backend') ? 'Backend/API' : 'Shared');
const RANK = ['FAILED', 'BLOCKED', 'STALE', 'MISSING', 'NOT RUN', 'PRE-EXISTING', 'UNAVAILABLE', 'PASSED', 'N/A'];

/** The report's per-application table: the worst status per column for each unit. */
export function appTable(g) {
  const L = ['| Application | Type check | Lint | Tests | Build |', '|---|---|---|---|---|'];
  for (const s of g.scope) {
    const col = (k) => g.rows.filter((r) => r.unit === s.unit && r.column === k).map((r) => r.state).sort((a, b) => RANK.indexOf(a) - RANK.indexOf(b))[0] ?? 'N/A';
    const related = g.rows.some((r) => r.unit === s.unit && r.relatedOnly);
    const tests = col('test') === 'PASSED' && related ? 'PASSED (related)' : col('test');
    L.push(`| ${KIND(s.kinds)}: ${s.unit} | ${col('typecheck')} | ${col('lint')} | ${tests} | ${col('build')} |`);
  }
  return L.join('\n');
}

/** Everything phase 9 needs in one call: final gate, line endings, new comments and evidence links. */
export async function finalCheck(root, task) {
  const g = await gate(root, task);
  const eol = eolCheck(root);
  const comments = checkComments(root);
  const ev = evidence(root, task);
  const visual = visualCheck(root, task, g, ev);
  const devtools = devtoolsCheck(root, task, g, ev);
  const problems = [
    g.result !== 'OPEN' && `gate ${g.result}`,
    eol.flagged.length && `${eol.flagged.length} line-ending flip(s)`,
    comments.errors && `${comments.errors} comment error(s)`,
    ev.missing.length && `${ev.missing.length} missing evidence file(s)`,
    visual,
    devtools,
  ].filter(Boolean);
  return { ready: !problems.length, problems, gate: g, eol, comments, evidence: ev };
}

/**
 * A browser-visible change needs the DevTools console and network read, recorded in evidence/devtools.md, or a
 * stated reason it could not run. A measured browser pass loaded only the Playwright tools, never read DevTools,
 * and the answer still called the web "fully verified".
 */
export function devtoolsCheck(root, task, g, ev) {
  if (!(g.next?.browser ?? []).length) return null;
  if (/^\s*[-*]?\s*(Visual evidence|DevTools( MCP)?) unavailable:\s*\S/im.test(ev.index)) return null;
  if (fs.existsSync(path.join(evidenceDir(root, task), 'devtools.md'))) return null;
  // A browser QA report that records both, read with DevTools, counts too. Parallel QA passes each leave the
  // shared evidence files to the orchestrator, and a measured run spent a minute copying that record over.
  const reports = path.join(taskDir(root, task), 'reports');
  let names = []; try { names = fs.readdirSync(reports).filter((f) => /browser|qa/i.test(f) && f.endsWith('.md')); } catch { /* none */ }
  if (names.some((f) => { const t = readText(path.join(reports, f)); return /devtools/i.test(t) && /^[^#\n]*\bconsole\b[^\n]*:/im.test(t) && /^[^#\n]*\bnetwork\b[^\n]*:/im.test(t); })) return null;
  return 'no DevTools console/network record: read them with the Chrome DevTools MCP into evidence/devtools.md, or write "DevTools unavailable: <reason>" in evidence/index.md (then the web is not browser-verified)';
}

/**
 * A browser- or device-visible change needs a screenshot of its final state, taken after the last code edit.
 * The honest way out, when no browser or device tool could run, is a "Visual evidence unavailable: <reason>"
 * line in evidence/index.md; the answer then says so.
 */
export function visualCheck(root, task, g, ev) {
  const scope = [...(g.next?.browser ?? []), ...(g.next?.device ?? [])];
  if (!scope.length || /^\s*[-*]?\s*Visual evidence unavailable:\s*\S/im.test(ev.index)) return null;
  const finals = ev.screenshots.filter((f) => !isBefore(f));
  if (!finals.length) return `no screenshot of the final state (${scope.join(', ')}): capture it, or write "Visual evidence unavailable: <reason>" in evidence/index.md`;
  const mtime = (f) => { try { return fs.statSync(path.join(root, f)).mtimeMs; } catch { return 0; } };
  const shot = Math.max(...finals.map(mtime));
  const edited = scopeFiles(root, taskBase(root, task)).filter((f) => CODE_RE.test(f) && !TEST_RE.test(f)).map((f) => [f, mtime(f)]).sort((a, b) => b[1] - a[1])[0];
  if (edited && edited[1] > shot + 1000) return `screenshots predate the last code change (${edited[0]}): retake the final state`;
  return null;
}

/**
 * Which local ports accept connections (dev servers, API, database). One call, any OS: a measured run spent
 * 8 tool calls on netstat and Get-NetTCPConnection variants, half of them stopped by permission prompts.
 */
export function portStatus(ports, host = 'localhost', timeoutMs = 800) {
  const probe = (port) => new Promise((resolve) => {
    const sock = net.createConnection({ port, host });
    const done = (listening) => { sock.destroy(); resolve({ port, listening }); };
    sock.setTimeout(timeoutMs, () => done(false));
    sock.once('connect', () => done(true));
    sock.once('error', () => done(false));
  });
  return Promise.all(ports.map(probe));
}

/**
 * The HTTP status of local URLs (an app's page, an API health route). Measured runs probed them with
 * `curl -s -o /dev/null -w "%{http_code}"`, which hit a permission prompt every time. Local hosts only:
 * this is a dev-server check, never a way to reach the network.
 */
export async function urlStatus(urls, timeoutMs = 5000) {
  const LOCAL = /^(localhost|127(\.\d{1,3}){3}|\[::1\]|0\.0\.0\.0)$/i;
  return Promise.all(urls.map(async (url) => {
    let u; try { u = new URL(url); } catch { return { url, status: null, error: 'not a URL' }; }
    if (!/^https?:$/.test(u.protocol) || !LOCAL.test(u.hostname)) return { url, status: null, error: 'only http(s) URLs on this machine are checked' };
    try {
      const r = await fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) });
      return { url, status: r.status };
    } catch (e) { return { url, status: null, error: e?.cause?.code || e?.name || 'unreachable' }; }
  }));
}

/** Wait until every port listens or the time runs out, so nobody polls with a shell loop and sleep. */
export async function waitForPorts(ports, { host = 'localhost', seconds = 60, intervalMs = 1000 } = {}) {
  const until = Date.now() + seconds * 1000;
  for (;;) {
    const st = await portStatus(ports, host);
    if (st.every((x) => x.listening) || Date.now() >= until) return st;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

/**
 * What FORGE leaves to the user, with the commands for the answer: the production builds that type check and
 * tests cover, and the full test suites of units where only the related tests ran.
 */
export function userCommands(g) {
  const list = (rows) => [...new Map(rows.map((r) => [`${r.unit}\0${r.command}`, `\`${r.command}\` (${r.unit})`])).values()];
  return {
    tests: list(g.rows.filter((r) => r.relatedOnly && r.command)),
    builds: list(g.rows.filter((r) => r.userBuild && r.command)),
  };
}

function parseArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (['--json', '--all', '--baseline', '--full', '--build', '--init', '--verbose'].includes(a)) o[a.slice(2)] = true;
    else if (a.startsWith('--')) o[a.slice(2)] = argv[++i];
    else o._.push(a);
  }
  return o;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const cmd = o._[0]; const root = upperDrive(path.resolve(o.root ?? '.'));
  const list = (s) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : null);
  const usage = 'usage: validation-gate.mjs plan|run|mark|gate|evidence|final --task <slug> [--root <dir>] [--units a,b] [--json] | ports --ports 3000,5173 (--help lists every option)';
  if (cmd === 'ports') {
    const ports = (o.ports || '').split(',').map((x) => Number(x.trim())).filter((n) => Number.isInteger(n) && n > 0 && n < 65536);
    const urls = (o.urls || '').split(',').map((x) => x.trim()).filter(Boolean);
    if (!ports.length && !urls.length) { console.error('usage: validation-gate.mjs ports --ports 3000,5173 [--urls http://localhost:3000/health,...] [--wait <seconds>] [--host localhost] [--json]'); process.exit(2); }
    const wait = Number(o.wait) || 0;
    const st = !ports.length ? [] : wait > 0 ? await waitForPorts(ports, { host: o.host || 'localhost', seconds: Math.min(wait, 540) }) : await portStatus(ports, o.host || 'localhost');
    const http = await urlStatus(urls);
    console.log(o.json ? JSON.stringify(urls.length ? { ports: st, urls: http } : st) : [
      ...st.map((x) => `${x.port}: ${x.listening ? 'listening' : 'free'}`),
      ...http.map((x) => `${x.url}: ${x.status ?? `no response (${x.error})`}`),
    ].join('\n'));
    // With --wait, a port that never came up is a failure the caller must see; so is a URL with no response.
    process.exit((wait > 0 && !st.every((x) => x.listening)) || http.some((x) => x.status === null) ? 1 : 0);
  }
  if (cmd === 'resume') {
    const r = await resumeTarget(root);
    console.log(o.json ? JSON.stringify(r) : formatResume(r));
    process.exit(0);
  }
  if (!['plan', 'run', 'mark', 'gate', 'evidence', 'final'].includes(cmd) || !o.task || !/^[\w.-]+$/.test(o.task)) { console.error(usage); process.exit(2); }
  if (cmd !== 'evidence' && !isGitRepo(root) && !o.units) {
    console.error(`UNAVAILABLE: ${root} is not a git repository, so changed files and staleness cannot be tracked (pass --units to validate named units)`);
    process.exit(2);
  }
  const out = (data, text) => console.log(o.json ? JSON.stringify(data, (k, v) => (v instanceof Set ? [...v] : k === 'units' || k === 'tail' ? undefined : v), 2) : text);
  if (cmd === 'plan') { const p = await plan(root, { units: list(o.units), base: taskBase(root, o.task, o.base) }); out(p, formatPlan(p)); }
  else if (cmd === 'gate') { const g = await gate(root, o.task); out(g, formatGate(g, { verbose: o.verbose })); process.exit(g.result === 'OPEN' ? 0 : g.result === 'BLOCKED' ? 2 : 1); }
  else if (cmd === 'final') {
    const f = await finalCheck(root, o.task);
    const L = [appTable(f.gate), '', formatGate(f.gate, { verbose: o.verbose, final: true })];
    L.push(f.eol.flagged.length ? f.eol.flagged.map((x) => `✗ EOL ${x.path}: ${x.problem}`).join('\n') : `EOL: OK (${f.eol.checked} file(s)).`);
    for (const c of f.comments.findings) L.push(`${c.level === 'error' ? '✗' : '-'} comment ${c.file}:${c.line} [${c.rule}] "${c.text}" → ${c.fix}`);
    L.push(`Comments: ${f.comments.comments} new line(s), ${f.comments.errors} error(s), ${f.comments.warnings} warning(s).`);
    if (f.evidence.files.length) {
      L.push(`Evidence (${f.evidence.files.length} file(s)):`, ...f.evidence.links.map((l) => `- ${l}`));
      if (f.evidence.missing.length) L.push(`✗ index.md cites missing file(s): ${f.evidence.missing.join(', ')}`);
      if (f.evidence.unindexed.length) L.push(`- not described in index.md: ${f.evidence.unindexed.join(', ')}`);
      for (const b of f.evidence.budget) L.push(`- over the screenshot budget: ${b}. The answer's table shows the most useful ${MAX_VISUAL_ROWS}.`);
    } else L.push('Evidence: none (no browser or device run recorded).');
    if (f.evidence.visual) L.push('', 'Paste this into the answer as is (every link points to a file that exists):', f.evidence.visual, '');
    const user = userCommands(f.gate);
    if (user.tests.length) L.push(`Full test suite: not run by FORGE (type check, lint, the related tests and browser QA cover the change). Tell the user to run ${user.tests.join(', ')} before release; it does not lower the completion status.`);
    if (user.builds.length) L.push(`Production build: not run by FORGE (type check, lint and tests cover it). Tell the user to run ${user.builds.join(', ')} before release; it does not lower the completion status.`);
    L.push(f.ready ? 'FINAL: READY to report.' : `FINAL: NOT READY: ${f.problems.join('; ')}.`);
    L.push('Completion status: exactly one of VERIFIED | VERIFIED WITH LIMITATIONS | BLOCKED | FAILED (rules in quality-gates.md). Words such as DONE, COMPLETE or DONE_WITH_CONCERNS are not valid.', 'Save the full report to report.md; answer the user per templates/final-response.md (their outcome, screenshots above for UI work, the **Status:** line), not with the report.');
    out(f, L.join('\n'));
    process.exit(f.ready ? 0 : f.problems.length === 1 && f.gate.result === 'BLOCKED' ? 2 : 1);
  }
  else if (cmd === 'mark') { const r = await mark(root, o.task, { unit: o.unit, check: o.check, status: o.status, reason: o.reason }); out(r, `recorded ${r.unit}:${r.check} = ${r.status} (cycle ${r.cycle})`); }
  else if (cmd === 'evidence') {
    const ev = evidence(root, o.task, { init: o.init });
    const text = [`Evidence: ${ev.dir}/ and ${ev.visualDir}/ (${ev.files.length} file(s))`, ...ev.links.map((l) => `- ${l}`)];
    if (ev.visual) text.push('', ev.visual);
    if (ev.missing.length) text.push(`MISSING: index.md cites files that do not exist: ${ev.missing.join(', ')}`);
    if (ev.unindexed.length) text.push(`Not described in index.md yet: ${ev.unindexed.join(', ')}`);
    for (const b of ev.budget) text.push(`Over the screenshot budget: ${b}. Capture no more.`);
    out(ev, text.join('\n'));
    process.exit(ev.missing.length ? 1 : 0);
  } else {
    // Progress goes to stderr as each check ends, so a run in the background never looks dead; stdout keeps the summary.
    const progress = (line) => process.stderr.write(line + '\n');
    const onWait = (held) => progress(`Waiting for the validation run already in progress for this task (pid ${held.pid}, started ${held.startedAt}). Afterwards only the checks still needed run.`);
    let r;
    try {
      r = await run(root, o.task, { units: list(o.units), checks: list(o.checks), all: o.all, baseline: o.baseline, full: o.full || o.build, base: o.base, jobs: Number(o.jobs) || 0, timeout: Number(o.timeout) || 15, onProgress: progress, onWait });
    } catch (e) {
      if (e.code !== 'BUSY') throw e;
      console.error(`BUSY: ${e.message}`); process.exit(3);
    }
    // Compact on purpose: passing checks take one line in total; only failures get their output.
    const passed = r.results.filter((x) => x.status === 'PASSED');
    const L = [formatScope(r.plan, { orchestrator: !o.units }), `Validation cycle ${r.cycle}: ran ${r.results.length} check(s)${r.skipped.length ? `, ${r.skipped.length} already passing for the current code (not re-run)` : ''}${r.reused.length ? `, ${r.reused.length} reused from another task on the same commit and files (${r.reused.map((x) => `${x.unit}:${x.check} ← ${x.reusedFrom}`).join(', ')})` : ''}.`];
    if (passed.length) L.push(`PASSED: ${passed.map((x) => `${x.unit}:${x.check} \`${x.command}\` ${(x.durationMs / 1000).toFixed(1)}s`).join(', ')}`);
    for (const x of r.results.filter((y) => y.status !== 'PASSED')) L.push('', `✗ ${x.unit}:${x.check} ${x.status} \`${x.command}\`${x.reason ? ` (${x.reason})` : ''}; full log: ${x.log}`, x.tail.trimEnd().split('\n').slice(-25).join('\n'));
    if (r.sideEffects.length) {
      const files = [...new Set(r.sideEffects.map((x) => x.file))].join(' ');
      L.push('', `Build side effect: ${r.sideEffects.map((x) => `${x.check} rewrote ${x.file}`).join(', ')}. Not a code change, so no check went stale. If it should not ship: git checkout -- ${files}`);
    }
    if (r.modifiedDuringRun.length) L.push('', `WARNING: files in ${r.modifiedDuringRun.join(', ')} changed while the checks ran. Review them (G14). ${o.baseline ? 'This baseline is unreliable: record it before any edit starts.' : 'If an implementer was still editing, these results are already stale: run checks only after every editor has returned.'}`);
    if (r.commentErrors.length) L.push('', ...r.commentErrors.map((c) => `✗ comment ${c.file}:${c.line} [${c.rule}] "${c.text}" → ${c.fix}`), 'Fix these comments now, before the work goes on: `final` fails on them, and a late fix makes checks and screenshots stale.');
    if (r.gate) L.push('', formatGate(r.gate, { final: r.final }));
    out({ ...r, plan: undefined }, L.join('\n'));
    // A full run exits with the gate verdict, so one call both validates and answers "may the browser start?".
    if (r.gate && !o.units) process.exit(r.gate.result === 'OPEN' ? 0 : r.gate.result === 'BLOCKED' ? 2 : 1);
    const s = new Set(r.results.map((x) => x.status));
    process.exit(s.has('FAILED') ? 1 : s.has('BLOCKED') ? 2 : 0);
  }
}

// --help prints the usage block at the top of this file, so nobody has to read the source to learn the options.
const usageBlock = () => {
  const out = [];
  for (const l of fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split(String.fromCharCode(10)).slice(1)) {
    if (!l.startsWith('//')) break;
    out.push(l.slice(l.startsWith('// ') ? 3 : 2).trimEnd());
  }
  return out.join(String.fromCharCode(10));
};
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain && (process.argv.includes('--help') || process.argv.includes('-h'))) { console.log(usageBlock()); process.exit(0); }
if (isMain) main().catch((e) => { console.error(`validation-gate: ${e.message}`); process.exit(2); });
