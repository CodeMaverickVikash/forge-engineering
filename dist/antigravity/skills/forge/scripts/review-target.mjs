#!/usr/bin/env node
// FORGE review target detection. Read-only toward git and the hosting provider.
//
//   node review-target.mjs [--root .] [--pr <url>] [--no-network] [--json]
//       Works out what to review: a PR/MR (when a URL is given) or the current branch against its base.
//       Branch mode never assumes `main`; it ranks base candidates by evidence and reports confidence.
//       It lists committed, staged, unstaged and untracked changes separately and classifies the changed
//       files so the orchestrator can pick reviewers.
//   node review-target.mjs --lock   [--root .] [--target <text>]   start read-only review mode
//   node review-target.mjs --unlock [--root .]                     end it
//       While .forge/review.lock exists (and is younger than 3 hours), the FORGE git guard blocks Edit/Write
//       outside .forge/.
//
// Git commands used: rev-parse, symbolic-ref, branch, config, for-each-ref, merge-base, rev-list, diff,
// ls-files, status, log. Optional network: `gh pr view` (GitHub, read-only) unless --no-network.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { TOOL_OUTPUT_RE } from './verify-delta.mjs';

export const LOCK_MAX_AGE_MS = 3 * 3600 * 1000;
const GIT_CFG = ['-c', 'core.quotepath=false'];

function sh(cmd, args, cwd) {
  try { return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024 }).trim(); } catch { return null; }
}
const git = (root, ...a) => sh('git', [...GIT_CFG, ...a], root);
const lines = (s) => (s ? s.split('\n').map((x) => x.trim()).filter(Boolean) : []);

// ---------- PR URLs ----------

/** Parse a PR/MR URL from GitHub, GitLab, Bitbucket or Azure DevOps (including self-hosted GitHub/GitLab). */
export function parsePrUrl(url) {
  let u; try { u = new URL(url); } catch { return null; }
  const p = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  let m;
  if ((m = u.pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)/))) return { provider: 'github', host: u.host, owner: m[1], repo: m[2], number: Number(m[3]), url };
  if ((m = u.pathname.match(/^\/(.+?)\/-\/merge_requests\/(\d+)/))) { const parts = m[1].split('/'); return { provider: 'gitlab', host: u.host, owner: parts.slice(0, -1).join('/'), repo: parts.at(-1), number: Number(m[2]), url }; }
  if (u.host === 'bitbucket.org' && (m = u.pathname.match(/^\/([^/]+)\/([^/]+)\/pull-requests\/(\d+)/))) return { provider: 'bitbucket', host: u.host, owner: m[1], repo: m[2], number: Number(m[3]), url };
  if ((u.host === 'dev.azure.com' || u.host.endsWith('.visualstudio.com')) && (m = u.pathname.match(/\/_git\/([^/]+)\/pullrequest\/(\d+)/i))) return { provider: 'azure', host: u.host, owner: p[0], repo: m[1], number: Number(m[2]), url };
  return null;
}

export function findPrUrl(text) {
  for (const m of String(text || '').matchAll(/https?:\/\/[^\s<>()"']+/g)) { const pr = parsePrUrl(m[0].replace(/[.,;:]+$/, '')); if (pr) return pr; }
  return null;
}

function remoteMatches(root, pr) {
  const urls = lines(git(root, 'remote', '-v')).map((l) => l.split(/\s+/)[1] || '');
  const want = `${pr.owner}/${pr.repo}`.toLowerCase().replace(/\.git$/, '');
  return urls.some((r) => r.toLowerCase().replace(/\.git$/, '').endsWith(want) && r.toLowerCase().includes(pr.host.toLowerCase().split(':')[0]));
}

function ghPr(pr, root) {
  if (pr.provider !== 'github' || !sh('gh', ['--version'])) return { available: false, reason: 'GitHub CLI (gh) not installed' };
  if (sh('gh', ['auth', 'status', '--hostname', pr.host]) === null) return { available: false, reason: `gh is not authenticated for ${pr.host} (run: gh auth login)` };
  const fields = 'number,title,body,state,isDraft,author,baseRefName,headRefName,headRepositoryOwner,url,additions,deletions,changedFiles,files,mergeable';
  const raw = sh('gh', ['pr', 'view', pr.url, '--json', fields], root);
  if (!raw) return { available: false, reason: 'gh could not read the PR (no access, or it does not exist)' };
  const j = JSON.parse(raw);
  return { available: true, meta: { ...j, files: (j.files || []).map((f) => ({ path: f.path, additions: f.additions, deletions: f.deletions })) }, diffCommand: `gh pr diff ${pr.url}` };
}

// ---------- branch mode ----------

const BASE_CANDIDATES = ['main', 'master', 'develop', 'development', 'dev', 'trunk', 'staging'];

function refExists(root, ref) { return git(root, 'rev-parse', '--verify', '--quiet', `${ref}^{commit}`) !== null; }

function isIntegrationBranch(root, name) {
  const originHead = git(root, 'symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD');
  return name === originHead?.replace(/^origin\//, '') || BASE_CANDIDATES.includes(name);
}

/** Rank base branch candidates for the current branch. Returns { name, ref, confidence, evidence, candidates }. */
export function detectBase(root, current, { network = true } = {}) {
  const evidence = []; const candidates = [];
  // 1. An open PR for this branch states its base exactly.
  if (network && current && sh('gh', ['--version'])) {
    const raw = sh('gh', ['pr', 'view', current, '--json', 'baseRefName,url,state'], root);
    if (raw) {
      const j = JSON.parse(raw);
      if (j.baseRefName && j.state === 'OPEN') {
        const ref = ['origin/' + j.baseRefName, j.baseRefName].find((r) => refExists(root, r));
        if (ref) return { name: j.baseRefName, ref, confidence: 'high', evidence: [`open PR ${j.url} targets ${j.baseRefName}`], candidates: [] };
        evidence.push(`open PR targets ${j.baseRefName}, but that ref is not available locally (fetch it to compare)`);
      }
    }
  }
  // 2. A configured base (set by `gh pr create`/`git config branch.<b>.gh-merge-base`).
  const configured = current && git(root, 'config', '--get', `branch.${current}.gh-merge-base`);
  if (configured) {
    const ref = ['origin/' + configured, configured].find((r) => refExists(root, r));
    if (ref) return { name: configured, ref, confidence: 'high', evidence: [`branch.${current}.gh-merge-base = ${configured}`], candidates: [] };
  }
  // 3. Candidates: the remote default branch plus conventional integration branches, ranked by fork-point distance.
  const originHead = git(root, 'symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD');
  const defaultName = originHead ? originHead.replace(/^origin\//, '') : null;
  if (defaultName) evidence.push(`origin default branch is ${defaultName}`);
  const names = [...new Set([defaultName, ...BASE_CANDIDATES].filter(Boolean))].filter((n) => n !== current);
  for (const name of names) {
    const ref = ['origin/' + name, name].find((r) => refExists(root, r));
    if (!ref) continue;
    const mb = git(root, 'merge-base', 'HEAD', ref);
    if (!mb) continue;
    const ahead = Number(git(root, 'rev-list', '--count', `${mb}..HEAD`));
    const behind = Number(git(root, 'rev-list', '--count', `${mb}..${ref}`));
    candidates.push({ name, ref, mergeBase: mb, ahead, behind, isDefault: name === defaultName });
  }
  if (!candidates.length) return { name: null, ref: null, confidence: 'none', evidence: [...evidence, 'no base candidate found (no remote default branch and none of ' + BASE_CANDIDATES.join(', ') + ' exist)'], candidates };
  // The true base is the branch this one forked from most recently: fewest commits ahead of the fork point.
  candidates.sort((a, b) => a.ahead - b.ahead || Number(b.isDefault) - Number(a.isDefault) || a.behind - b.behind);
  const best = candidates[0];
  const tied = candidates.filter((c) => c.ahead === best.ahead && c !== best);
  let confidence = 'high';
  if (candidates.length > 1 && tied.length && !best.isDefault) confidence = 'low';
  else if (candidates.length > 1 && tied.length) confidence = 'medium';
  else if (!best.isDefault && defaultName) confidence = 'medium';
  evidence.push(`${best.name}: ${best.ahead} commit(s) on this branch since the fork point` + (tied.length ? `; tied with ${tied.map((t) => t.name).join(', ')}` : ''));
  return { name: best.name, ref: best.ref, mergeBase: best.mergeBase, confidence, evidence, candidates };
}

/** Changed lines per file across the committed range, staged, unstaged and untracked scopes. */
function lineCounts(root, mergeBase, untracked) {
  const counts = {};
  const add = (out) => { for (const l of lines(out)) { const [a, d, f] = l.split('\t'); if (f && !f.startsWith('.forge/')) counts[f] = (counts[f] || 0) + (Number(a) || 0) + (Number(d) || 0); } };
  if (mergeBase) add(git(root, 'diff', '--numstat', `${mergeBase}..HEAD`));
  add(git(root, 'diff', '--cached', '--numstat'));
  add(git(root, 'diff', '--numstat'));
  for (const f of untracked) {
    try { const s = fs.statSync(path.join(root, f)); counts[f] = s.size > 1e6 ? 0 : fs.readFileSync(path.join(root, f), 'utf8').split('\n').length; } catch { counts[f] = 0; }
  }
  return counts;
}

function nameStatus(out) {
  return lines(out).map((l) => { const [s, ...rest] = l.split('\t'); return { status: s, path: rest.at(-1) }; });
}

// ---------- classification ----------

const DATABASE_RE = /(^|\/)(migrations?|migrate|alembic|flyway|liquibase|db\/migrate|prisma)(\/|$)|\.sql$|schema\.prisma$|(^|\/)V\d+__.*\.sql$|models?\.(py|rb)$|entity|\.entity\.ts$/i;

const CLASSES = [
  ['database', DATABASE_RE],
  ['frontend', /\.(tsx|jsx|vue|svelte|astro|css|scss|sass|less|html)$|(^|\/)(components|pages|app|public|styles|views|layouts|ui)\//i],
  ['mobile', /(^|\/)(android|ios)\/|\.(kt|swift|dart)$|app\.json$|eas\.json$/i],
  ['security', /auth|login|logout|session|token|jwt|oauth|password|permission|rbac|acl|policy|middleware|crypto|secret|csrf|cors|\.env/i],
  ['api', /(^|\/)(api|routes?|controllers?|handlers?|endpoints?|graphql|resolvers?)(\/|\.|$)|openapi|swagger|\.proto$/i],
  ['tests', /(^|\/)(tests?|__tests__|spec|e2e|cypress|playwright)\/|\.(test|spec)\.[jt]sx?$|_test\.(go|py)$|Test\.java$|_spec\.rb$/i],
  ['dependencies', /(^|\/)(package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|requirements[^/]*\.txt|pyproject\.toml|poetry\.lock|uv\.lock|go\.mod|go\.sum|Cargo\.(toml|lock)|composer\.(json|lock)|Gemfile(\.lock)?|pom\.xml|build\.gradle(\.kts)?|pubspec\.(yaml|lock))$/i],
  ['config', /(^|\/)(\.github|\.gitlab-ci|\.circleci|docker|k8s|helm|terraform|infra)\b|Dockerfile|docker-compose|\.ya?ml$|\.toml$|\.ini$|\.config\.[cm]?[jt]s$|tsconfig/i],
  ['docs', /\.(md|mdx|rst|txt)$|(^|\/)docs\//i],
];

export function classify(files) {
  const by = {};
  for (const f of files) {
    const hits = CLASSES.filter(([, re]) => re.test(f)).map(([k]) => k);
    if (!hits.length) hits.push(/\.(py|go|java|kt|php|rb|rs|cs|[cm]?[jt]s)$/.test(f) ? 'backend' : 'other');
    else if (!hits.some((h) => ['frontend', 'mobile', 'tests', 'docs', 'config', 'dependencies'].includes(h)) && /\.(py|go|java|kt|php|rb|rs|cs|[cm]?[jt]s)$/.test(f)) hits.push('backend');
    for (const h of hits) (by[h] ||= []).push(f);
  }
  return by;
}

// Workflows where a wrong verdict is expensive and hard to catch later. Matched on whole path words
// (camelCase split first), so `author.ts` or `console.ts` never count as auth.
const CRITICAL = [
  ['auth', /(^|[/_.-])(auth|authn|authz|authenticat\w*|authoriz\w*|login|logout|sign-?in|sign-?up|sessions?|jwt|oauth\w*|oidc|sso|saml|passwords?|permissions?|rbac|acl|roles?|csrf|token)([/_.-]|$)/i],
  ['payment', /(^|[/_.-])(payments?|billing|checkout|stripe|paypal|braintree|razorpay|adyen|invoices?|refunds?|payouts?|charges?|subscriptions?|wallets?)([/_.-]|$)/i],
  // Schema and migrations only: an ORM model or entity edit without a migration is ordinary logic.
  ['database', /(^|\/)(migrations?|migrate|alembic|flyway|liquibase|prisma)(\/|$)|\.sql$|schema\.(prisma|rb|sql)$|structure\.sql$/i],
];
const NOT_LOGIC_RE = /\.(md|mdx|rst|txt|png|jpe?g|gif|svg|webp|ico|css|scss|sass|less)$|(^|\/)docs\//i;

/** Changed files grouped by critical workflow: auth (authentication/authorization), payment, database schema. */
export function criticalAreas(files) {
  const out = {};
  for (const f of files) {
    if (NOT_LOGIC_RE.test(f)) continue;
    const words = f.replace(/([a-z0-9])([A-Z])/g, '$1-$2');
    for (const [k, re] of CRITICAL) if (re.test(words)) (out[k] ||= []).push(f);
  }
  return out;
}

/**
 * Model escalation for a change set (core/delegation.md#model-escalation). The independent review of any
 * critical workflow runs on Opus. Auth and payment also move test design and the security review up, because
 * a missed edge case there is a breach or lost money. A schema change keeps its tests on Sonnet: the database
 * engineer already runs on the main model and migrations are verified by running them.
 * Returns null when nothing critical changed, so routine work stays on Sonnet.
 */
export function escalation(files) {
  const areas = criticalAreas(files);
  if (!Object.keys(areas).length) return null;
  const roles = ['forge-code-reviewer'];
  if (areas.auth || areas.payment) roles.push('forge-security-engineer', 'forge-test-automation-engineer');
  return { model: 'opus', areas, roles };
}

export function formatEscalation(e) {
  if (!e) return 'Opus escalation: none (no auth, payment or database files changed); review and test roles stay on their default models.';
  const areas = Object.entries(e.areas).map(([k, v]) => `${k} (${v.length} file${v.length > 1 ? 's' : ''})`).join(', ');
  return `Opus escalation: ${areas} changed. Launch ${e.roles.join(', ')} with model opus, unless one already runs on a model at least as capable (core/delegation.md#model-escalation).`;
}

export const SMALL_DIFF_LINES = 100;

/**
 * Reviewer team for the changed areas (spec roles mapped to FORGE agents). `counts` (file → changed lines)
 * keeps small reviews lean: under SMALL_DIFF_LINES, the code reviewer plus only the specialists the main risk needs.
 */
export function suggestTeam(byClass, counts = null) {
  const has = (k) => (byClass[k] || []).length > 0;
  if (counts) {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const linesIn = (k) => (byClass[k] || []).reduce((a, f) => a + (counts[f] || 0), 0);
    if (total < SMALL_DIFF_LINES) {
      const team = ['forge-code-reviewer'];
      if (has('database')) team.push('forge-database-engineer');
      if (['security', 'api', 'backend', 'dependencies'].some(has)) team.push('forge-security-engineer');
      if (has('frontend') && linesIn('frontend') * 2 >= total) team.push('forge-accessibility-specialist', 'forge-browser-qa');
      return team;
    }
  }
  const code = ['backend', 'frontend', 'mobile', 'api', 'database', 'security'].some(has);
  const team = new Set();
  if (code || has('config') || has('dependencies')) team.add('forge-code-reviewer'); // senior developer
  if (code) { team.add('forge-security-engineer'); team.add('forge-qa-lead'); }
  if (has('api') || has('database') || ['backend', 'frontend', 'mobile'].filter(has).length > 1 || Object.values(byClass).flat().length > 15) team.add('forge-architect');
  if (has('database')) team.add('forge-database-engineer');
  if (has('frontend')) { team.add('forge-accessibility-specialist'); team.add('forge-browser-qa'); }
  if (has('database') || has('api') || has('frontend')) team.add('forge-performance-engineer');
  if (has('dependencies')) team.add('forge-security-engineer');
  if (!team.size && Object.keys(byClass).length) team.add('forge-code-reviewer');
  return [...team];
}

// ---------- main ----------

export function reviewTarget(root, { prUrl = null, network = true } = {}) {
  const inRepo = git(root, 'rev-parse', '--is-inside-work-tree') === 'true';
  const repoRoot = inRepo ? git(root, 'rev-parse', '--show-toplevel') : null;
  const repoName = repoRoot ? path.basename(repoRoot) : path.basename(path.resolve(root));
  const current = inRepo ? git(root, 'branch', '--show-current') || null : null;
  const hasCommits = inRepo && refExists(root, 'HEAD');
  const local = inRepo ? {
    staged: nameStatus(git(root, 'diff', '--cached', '--name-status')).filter((f) => !f.path.startsWith('.forge/')),
    unstaged: nameStatus(git(root, 'diff', '--name-status')).filter((f) => !f.path.startsWith('.forge/')),
    untracked: lines(git(root, 'ls-files', '--others', '--exclude-standard')).filter((f) => !f.startsWith('.forge/') && !TOOL_OUTPUT_RE.test(f)),
  } : { staged: [], unstaged: [], untracked: [] };
  const localPresent = local.staged.length + local.unstaged.length + local.untracked.length > 0;
  const out = { mode: prUrl ? 'pr' : 'branch', repository: repoName, inGitRepo: inRepo, currentBranch: current, hasCommits, local, localChanges: localPresent ? 'Present' : 'Not present', limitations: [] };

  if (prUrl) {
    const pr = parsePrUrl(prUrl);
    if (!pr) { out.limitations.push(`not a recognised PR/MR URL: ${prUrl}`); out.status = 'BLOCKED'; return out; }
    out.pr = pr;
    out.prRepoIsLocal = inRepo && remoteMatches(root, pr);
    if (pr.provider === 'github') {
      const g = network ? ghPr(pr, root) : { available: false, reason: '--no-network' };
      out.prAccess = g;
      if (g.available) {
        out.baseBranch = { name: g.meta.baseRefName, confidence: 'high', evidence: ['from the PR metadata'] };
        out.headBranch = g.meta.headRefName;
        out.prCheckedOut = out.prRepoIsLocal && current === g.meta.headRefName;
        out.changedFiles = g.meta.files.map((f) => f.path);
        if (!out.prRepoIsLocal) out.limitations.push('the PR repository is not this local checkout: surrounding code can only be read through the hosting API, and tests and browser checks cannot run');
        else if (!out.prCheckedOut) out.limitations.push(`the PR branch (${g.meta.headRefName}) is not checked out; FORGE does not switch branches during a review, so local tests and browser checks reflect the current checkout (${current}) unless you check the PR out yourself`);
      } else { out.limitations.push(`PR not readable: ${g.reason}`); out.status = 'BLOCKED'; }
    } else {
      out.prAccess = { available: false, reason: `${pr.provider} is not readable by FORGE's built-in tooling; use the provider CLI or API if authenticated (glab for GitLab), otherwise the review is BLOCKED` };
      out.limitations.push(out.prAccess.reason);
    }
  } else if (!inRepo) {
    out.limitations.push('not a git repository: there is no branch or diff to review'); out.status = 'BLOCKED';
  } else if (!hasCommits) {
    out.baseBranch = { name: null, confidence: 'none', evidence: ['the repository has no commits yet'] };
    out.limitations.push('no commits yet: only local (uncommitted) changes can be reviewed');
  } else if (current && isIntegrationBranch(root, current)) {
    // On the integration branch itself: the reviewable work is unpushed commits plus local changes.
    const up = git(root, 'rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}');
    out.baseBranch = { name: up || null, ref: up || null, confidence: up ? 'high' : 'none', evidence: [up ? `on ${current}, an integration branch; comparing with its upstream ${up} (unpushed commits)` : `on ${current}, an integration branch with no upstream; only local changes can be reviewed`] };
    out.onBaseBranch = true;
    out.limitations.push(`you are on ${current}, an integration branch: reviewing ${up ? `commits not yet in ${up} plus ` : ''}uncommitted local changes`);
    if (up) {
      const mb = git(root, 'merge-base', 'HEAD', up);
      out.mergeBase = mb;
      out.committed = { range: `${up}..HEAD`, commits: lines(git(root, 'log', '--format=%h %s', `${mb}..HEAD`)), files: nameStatus(git(root, 'diff', '--name-status', `${mb}..HEAD`)).filter((f) => !f.path.startsWith('.forge/')), stat: git(root, 'diff', '--shortstat', `${mb}..HEAD`) || '' };
      out.diffCommands = { committed: `git diff ${up}...HEAD`, staged: 'git diff --cached', unstaged: 'git diff' };
    }
    out.changedFiles = [...new Set([...(out.committed?.files || []).map((f) => f.path), ...local.staged.map((f) => f.path), ...local.unstaged.map((f) => f.path), ...local.untracked])];
  } else {
    const base = detectBase(root, current, { network });
    out.baseBranch = { name: base.name, ref: base.ref, confidence: base.confidence, evidence: base.evidence, candidates: base.candidates.map(({ name, ahead, behind }) => ({ name, ahead, behind })) };
    if (!current) out.limitations.push('detached HEAD: reviewing HEAD against the detected base');
    if (base.mergeBase) {
      out.mergeBase = base.mergeBase;
      out.committed = { range: `${base.mergeBase.slice(0, 12)}..HEAD`, commits: lines(git(root, 'log', '--format=%h %s', `${base.mergeBase}..HEAD`)), files: nameStatus(git(root, 'diff', '--name-status', `${base.mergeBase}..HEAD`)).filter((f) => !f.path.startsWith('.forge/')), stat: git(root, 'diff', '--shortstat', `${base.mergeBase}..HEAD`) || '' };
      out.diffCommands = { committed: `git diff ${base.mergeBase.slice(0, 12)}..HEAD`, staged: 'git diff --cached', unstaged: 'git diff' };
    } else out.limitations.push('base branch could not be established confidently; committed changes cannot be separated from history, so the review covers local changes and recent commits only');
    if (base.confidence === 'low' || base.confidence === 'none') out.limitations.push(`base branch confidence is ${base.confidence}: ${base.evidence.join('; ')}`);
    const fetchHead = path.join(git(root, 'rev-parse', '--git-dir') || '.git', 'FETCH_HEAD');
    const fh = path.isAbsolute(fetchHead) ? fetchHead : path.join(root, fetchHead);
    if (fs.existsSync(fh)) out.remoteRefsAgeHours = Math.round((Date.now() - fs.statSync(fh).mtimeMs) / 3600000);
    out.changedFiles = [...new Set([...(out.committed?.files || []).map((f) => f.path), ...local.staged.map((f) => f.path), ...local.unstaged.map((f) => f.path), ...local.untracked])];
  }
  if (out.changedFiles) {
    out.areas = classify(out.changedFiles);
    out.changedLines = out.prAccess?.available
      ? Object.fromEntries(out.prAccess.meta.files.map((f) => [f.path, (f.additions || 0) + (f.deletions || 0)]))
      : lineCounts(root, out.mergeBase, local.untracked);
    out.totalChangedLines = Object.values(out.changedLines).reduce((a, b) => a + b, 0);
    out.suggestedTeam = suggestTeam(out.areas, out.changedLines);
    out.escalation = escalation(out.changedFiles);
  }
  return out;
}

// ---------- review lock ----------

export const lockPath = (root) => path.join(root, '.forge', 'review.lock');

export function setLock(root, target) {
  fs.mkdirSync(path.join(root, '.forge'), { recursive: true });
  const ignore = path.join(root, '.forge', '.gitignore');
  if (!fs.existsSync(ignore)) fs.writeFileSync(ignore, '*\n');
  fs.writeFileSync(lockPath(root), JSON.stringify({ mode: 'review', target: target || null, createdAt: new Date().toISOString() }, null, 2) + '\n');
}

export function readLock(root, now = Date.now()) {
  try {
    const j = JSON.parse(fs.readFileSync(lockPath(root), 'utf8'));
    return now - Date.parse(j.createdAt) < LOCK_MAX_AGE_MS ? j : null;
  } catch { return null; }
}

function main() {
  const a = process.argv.slice(2);
  const opt = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
  const root = path.resolve(opt('--root') || '.');
  if (a.includes('--lock')) { setLock(root, opt('--target')); console.log('review mode ON: source edits are blocked outside .forge/ until --unlock (or 3 hours)'); return; }
  if (a.includes('--unlock')) { fs.rmSync(lockPath(root), { force: true }); console.log('review mode OFF'); return; }
  const t = reviewTarget(root, { prUrl: opt('--pr') || null, network: !a.includes('--no-network') });
  if (a.includes('--json')) { console.log(JSON.stringify(t, null, 2)); return; }
  const b = t.baseBranch || {};
  console.log([
    `Review type: ${t.mode === 'pr' ? 'PR Review' : 'Current Branch Review'}`,
    `Repository: ${t.repository}`,
    `Current branch: ${t.currentBranch ?? '(detached or none)'}`,
    `Base branch: ${b.name ?? 'unknown'} (confidence ${b.confidence ?? 'n/a'}${b.evidence ? `; ${b.evidence.join('; ')}` : ''})`,
    t.pr ? `PR: ${t.pr.url} (${t.prAccess?.available ? `readable; diff: ${t.prAccess.diffCommand}` : `not readable: ${t.prAccess?.reason}`})` : 'PR URL: Not provided',
    t.committed ? `Committed changes: ${t.committed.commits.length} commit(s), ${t.committed.files.length} file(s) ${t.committed.stat ? `(${t.committed.stat})` : ''}` : null,
    `Local changes: ${t.localChanges} (staged ${t.local.staged.length}, unstaged ${t.local.unstaged.length}, untracked ${t.local.untracked.length})`,
    t.areas ? `Areas: ${Object.entries(t.areas).map(([k, v]) => `${k} ${v.length}`).join(', ')}` : null,
    t.suggestedTeam ? `Suggested reviewers: ${t.suggestedTeam.join(', ')}` : null,
    t.changedFiles ? formatEscalation(t.escalation) : null,
    ...t.limitations.map((l) => `LIMITATION: ${l}`),
  ].filter(Boolean).join('\n'));
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
if (isMain) main();
