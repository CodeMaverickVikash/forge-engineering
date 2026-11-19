#!/usr/bin/env node
// FORGE git guard: a Claude Code PreToolUse hook that enforces "FORGE never commits, pushes or
// rewrites history". It reads the hook event JSON on stdin and exits 2 (block, reason on stderr)
// when a Bash/PowerShell command would commit, push, merge, rebase, discard work, open a PR or post
// reviews/comments/issues to the hosting platform. During a read-only FORGE review (.forge/review.lock,
// created by review-target.mjs --lock) it also blocks Edit/Write/MultiEdit/NotebookEdit outside .forge/.
//
//   node git-guard.mjs --scope agent    in FORGE agent frontmatter: always enforce (the hook only
//                                       runs while that FORGE agent is active)
//   node git-guard.mjs --scope skill    in the forge skill frontmatter: registered for the rest of the
//                                       session once /forge runs, so it enforces only while the current
//                                       turn is a FORGE turn; if that cannot be determined, it enforces
//   node git-guard.mjs --scope plugin   in plugin hooks/hooks.json (global): enforces for forge-* agents
//                                       and FORGE turns only; if undetermined, it allows
//
// Read-only git (status, diff, log, show, stash list...) is always allowed. A malformed event is
// allowed, so a guard problem never breaks ordinary shell use.
//
// It also answers "ask" (a permission prompt, whatever the allow rules say) for commands that change
// dependencies, publish or deploy. FORGE pre-approves its workflow with wildcard rules such as
// `pnpm --filter * test*`, and a rule's `*` matches spaces, so `pnpm --filter x add pkg test` would match.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------- command analysis ----------

// Backslash escapes only these (bash); elsewhere it is literal, so Windows paths survive.
const ESCAPABLE = /^["' \t;&|()`$\\]$/;
const SEPARATORS = new Set([';', '\n', '&', '|', '(', ')', '`']);

/** Split a shell command into simple-command segments, respecting quotes; $( ) and backticks open new segments. */
export function splitSegments(cmd) {
  const segs = []; let cur = ''; let q = null;
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (q) {
      if (c === q) { q = null; cur += c; continue; }
      if (q === '"' && (c === '`' || (c === '$' && cmd[i + 1] === '('))) { segs.push(cur); cur = ''; if (c === '$') i++; continue; }
      cur += c; continue;
    }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '\\' && ESCAPABLE.test(cmd[i + 1] ?? '')) { cur += c + cmd[++i]; continue; }
    if (c === '$' && cmd[i + 1] === '(') { segs.push(cur); cur = ''; i++; continue; }
    if (SEPARATORS.has(c)) { segs.push(cur); cur = ''; continue; }
    cur += c;
  }
  segs.push(cur);
  return segs.map((s) => s.trim()).filter(Boolean);
}

/** Whitespace tokenizer that strips quotes. */
export function tokenize(seg) {
  const out = []; let cur = ''; let q = null; let has = false;
  for (let i = 0; i < seg.length; i++) {
    const c = seg[i];
    if (q) { if (c === q) q = null; else cur += c; continue; }
    if (c === '"' || c === "'") { q = c; has = true; continue; }
    if (c === '\\' && ESCAPABLE.test(seg[i + 1] ?? '')) { cur += seg[++i]; has = true; continue; }
    if (/\s/.test(c)) { if (cur || has) out.push(cur); cur = ''; has = false; continue; }
    cur += c; has = true;
  }
  if (cur || has) out.push(cur);
  return out;
}

const WRAPPERS = new Set(['sudo', 'env', 'command', 'exec', 'nohup', 'time', 'nice', 'builtin', '&', '!', '{']);
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh', 'pwsh', 'powershell', 'cmd']);
const base = (t) => t.replace(/\\/g, '/').split('/').pop().toLowerCase().replace(/\.(exe|cmd|bat)$/, '');

const GIT_OPTS_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--super-prefix', '--config-env']);
const ALWAYS_BLOCK = new Set(['commit', 'push', 'pull', 'merge', 'rebase', 'cherry-pick', 'revert', 'am', 'filter-branch', 'filter-repo', 'commit-tree', 'update-ref', 'replace']);

function gitVerdict(args) {
  let i = 0;
  while (i < args.length && args[i].startsWith('-')) {
    const a = args[i];
    if (GIT_OPTS_WITH_VALUE.has(a)) i += 2; else i += 1;
  }
  const sub = args[i]; const rest = args.slice(i + 1);
  if (!sub) return null;
  const has = (...flags) => rest.some((r) => flags.includes(r) || flags.some((f) => f.endsWith('=') && r.startsWith(f)));
  const positional = rest.filter((r) => !r.startsWith('-'));
  if (ALWAYS_BLOCK.has(sub)) return `git ${sub}`;
  switch (sub) {
    case 'reset': return has('--hard', '--merge', '--keep') ? 'git reset --hard' : null;
    case 'stash': return ['list', 'show'].includes(rest[0]) ? null : `git stash${rest[0] && !rest[0].startsWith('-') ? ' ' + rest[0] : ''}`;
    case 'clean': return has('-n', '--dry-run') ? null : 'git clean';
    case 'checkout': return has('-f', '--force') || positional.includes('.') || positional.includes(':/') ? 'git checkout (discarding changes)' : null;
    case 'restore': return positional.includes('.') || positional.includes(':/') || has('--source', '--source=', '-s') ? 'git restore (discarding changes)' : null;
    case 'switch': return has('-f', '--force', '--discard-changes') ? 'git switch --discard-changes' : null;
    case 'branch': return has('-d', '-D', '--delete', '-f', '--force', '-m', '-M', '--move', '-c', '-C', '--copy') ? 'git branch (delete/force/move)' : null;
    case 'tag': return positional.length || has('-a', '-s', '-d', '--delete', '-f', '--force', '-u') ? 'git tag (create/delete)' : null;
    case 'worktree': return rest[0] === 'remove' || rest[0] === 'prune' ? `git worktree ${rest[0]}` : null;
    default: return null;
  }
}

function ghVerdict(args) {
  const [a, b] = args.filter((x) => !x.startsWith('-'));
  // Anything that writes to the hosting platform: PRs, reviews/approvals, comments, issues, releases.
  if (a === 'pr' && ['create', 'merge', 'review', 'comment', 'edit', 'close', 'reopen', 'ready', 'lock', 'unlock'].includes(b)) return `gh pr ${b}`;
  if (a === 'issue' && ['create', 'comment', 'edit', 'close', 'reopen', 'delete', 'transfer', 'lock', 'unlock', 'pin', 'unpin'].includes(b)) return `gh issue ${b}`;
  if (a === 'release' && ['create', 'upload', 'delete', 'edit'].includes(b)) return `gh release ${b}`;
  if (a === 'repo' && ['delete', 'archive', 'edit', 'rename'].includes(b)) return `gh repo ${b}`;
  if (a === 'api') {
    const m = args.findIndex((x) => x === '-X' || x === '--method');
    const method = m >= 0 ? String(args[m + 1] || '').toUpperCase() : args.find((x) => /^--method=/.test(x))?.split('=')[1]?.toUpperCase();
    const hasBody = args.some((x) => /^(-f|-F|--field|--raw-field|--input)$/.test(x) || /^--(raw-)?field=/.test(x));
    if ((method && method !== 'GET') || (!method && hasBody)) return 'gh api (write request)';
  }
  return null;
}

function glabVerdict(args) {
  const [a, b] = args.filter((x) => !x.startsWith('-'));
  if (a === 'mr' && ['create', 'merge', 'approve', 'revoke', 'note', 'update', 'close', 'reopen'].includes(b)) return `glab mr ${b}`;
  if (a === 'issue' && ['create', 'note', 'update', 'close', 'reopen', 'delete'].includes(b)) return `glab issue ${b}`;
  return null;
}

const PACKAGE_MANAGERS = new Set(['npm', 'pnpm', 'yarn', 'bun', 'npx', 'pnpx', 'bunx', 'pip', 'pip3', 'poetry', 'uv', 'cargo', 'go', 'composer', 'gem', 'bundle', 'dotnet', 'flutter', 'dart']);
const DEPENDENCY_VERBS = new Set(['add', 'install', 'i', 'ci', 'remove', 'rm', 'uninstall', 'un', 'update', 'up', 'upgrade', 'publish', 'unpublish', 'link', 'unlink', 'require', 'get', 'deprecate', 'dist-tag', 'owner']);
const DEPLOY_TOOLS = { eas: ['build', 'submit', 'update'], vercel: ['*'], netlify: ['deploy'], firebase: ['deploy'], wrangler: ['deploy', 'publish'], terraform: ['apply', 'destroy', 'import'], pulumi: ['up', 'destroy'], kubectl: ['apply', 'delete', 'create', 'replace', 'patch', 'rollout', 'scale'], helm: ['install', 'upgrade', 'uninstall', 'rollback'], fastlane: ['*'], fly: ['deploy'], flyctl: ['deploy'], heroku: ['*'], serverless: ['deploy'], sls: ['deploy'], docker: ['push'] };

// Package-manager options that take a value, so `pnpm --filter web test` reads its subcommand as `test`.
const PM_VALUE_FLAGS = new Set(['--filter', '-F', '-C', '--dir', '--prefix', '--workspace', '-w', '--cwd', '-p', '--package', '--project']);
function subcommand(args) {
  for (let i = 0; i < args.length; i++) {
    if (PM_VALUE_FLAGS.has(args[i])) { i++; continue; }
    if (!args[i].startsWith('-')) return [args[i].toLowerCase(), args.slice(i + 1)];
  }
  return [null, []];
}

// curl options whose value is not a URL (skipped), and options that send the request somewhere else (always ask).
const CURL_VALUE_FLAGS = new Set(['-o', '--output', '-w', '--write-out', '-H', '--header', '-X', '--request', '-m', '--max-time', '--connect-timeout', '--retry', '-A', '--user-agent', '-d', '--data', '--data-raw', '--data-binary', '--data-urlencode', '-F', '--form', '-b', '--cookie', '-c', '--cookie-jar', '-e', '--referer', '-u', '--user']);
const CURL_REDIRECT_FLAGS = /^(-x|--proxy|-K|--config|--connect-to|--resolve)$/;
const LOCAL_HOST = /^(localhost|127(\.\d{1,3}){3}|\[::1\]|0\.0\.0\.0)$/i;
const isLocalUrl = (u) => LOCAL_HOST.test((String(u).match(/^(?:[a-z][\w+.-]*:\/\/)?(?:[^@/\s]*@)?(\[[^\]]*\]|[^/:?#\s]+)/i) || [])[1] ?? '');
/** True when a curl call reaches anything but this machine: FORGE pre-approves curl only for local servers. */
function remoteCurl(args) {
  for (let i = 0; i < args.length; i++) {
    const x = args[i];
    if (CURL_REDIRECT_FLAGS.test(x)) return true;
    if (x === '--url') { if (!isLocalUrl(args[++i])) return true; continue; }
    if (CURL_VALUE_FLAGS.has(x)) { i++; continue; }
    if (!x.startsWith('-') && !isLocalUrl(x)) return true;
  }
  return false;
}

/**
 * A command that needs the user's say-so even inside FORGE's pre-approved workflow: dependency changes,
 * publishing, deployments, and curl to anything but a local server (a rule's `*` matches spaces, so
 * `curl * http://localhost:*` alone would also match a call that adds a remote URL). Returns a short
 * description, or null.
 */
export function askOperation(command, depth = 0) {
  if (typeof command !== 'string' || depth > 3) return null;
  for (const seg of splitSegments(command)) {
    let t = tokenize(seg);
    while (t.length && (WRAPPERS.has(t[0]) || /^[A-Za-z_][A-Za-z0-9_]*=/.test(t[0]))) t = t.slice(1);
    if (!t.length) continue;
    const head = base(t[0]);
    const words = t.slice(1).filter((x) => !x.startsWith('-')).map((x) => x.toLowerCase());
    if (head === 'curl' && remoteCurl(t.slice(1))) return 'curl to a remote host';
    if (PACKAGE_MANAGERS.has(head)) {
      const [sub, rest] = subcommand(t.slice(1));
      if (DEPENDENCY_VERBS.has(sub)) return `${head} ${sub}`;
      if (sub === 'dlx') return `${head} dlx`;
      // `pnpm exec npm install x` is still an install.
      if (sub === 'exec' || sub === 'x') { const v = askOperation(rest.join(' '), depth + 1); if (v) return v; }
    }
    if (DEPLOY_TOOLS[head]) { const any = DEPLOY_TOOLS[head].includes('*'); const v = any ? words[0] : words.find((w) => DEPLOY_TOOLS[head].includes(w)); if (any || v) return v ? `${head} ${v}` : head; }
    if (SHELLS.has(head) || head === 'eval') {
      const k = t.findIndex((x, n) => n > 0 && /^(-c|-command|\/c|\/k)$/i.test(x));
      const inner = head === 'eval' ? t.slice(1).join(' ') : k > 0 ? t.slice(k + 1).join(' ') : null;
      if (inner) { const v = askOperation(inner, depth + 1); if (v) return v; }
    }
  }
  return null;
}

/** Returns the first forbidden operation found in a command string, or null. */
export function forbiddenOperation(command, depth = 0) {
  if (typeof command !== 'string' || depth > 3) return null;
  for (const seg of splitSegments(command)) {
    let t = tokenize(seg);
    while (t.length && (WRAPPERS.has(t[0]) || /^[A-Za-z_][A-Za-z0-9_]*=/.test(t[0]) || (t[0] === 'env' && t[1]?.startsWith('-')))) t = t.slice(1);
    if (!t.length) continue;
    const head = base(t[0]);
    if (head === 'git') { const v = gitVerdict(t.slice(1)); if (v) return v; continue; }
    if (head === 'gh') { const v = ghVerdict(t.slice(1)); if (v) return v; continue; }
    if (head === 'glab') { const v = glabVerdict(t.slice(1)); if (v) return v; continue; }
    if (head === '&' && t[1]) { const v = forbiddenOperation(t.slice(1).join(' '), depth + 1); if (v) return v; continue; }
    if (SHELLS.has(head) || head === 'eval') {
      const k = t.findIndex((x, n) => n > 0 && /^(-c|-command|\/c|\/k|-encodedcommand)$/i.test(x));
      const inner = head === 'eval' ? t.slice(1).join(' ') : k > 0 ? t.slice(k + 1).join(' ') : null;
      if (inner) { const v = forbiddenOperation(inner, depth + 1); if (v) return v; }
    }
  }
  return null;
}

// ---------- scope detection ----------

const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const skillRe = (name) => new RegExp(`^(?:[\\w.-]+:)?${esc(name)}$`);
const FORGE_AGENT = /^(?:[\w.-]+:)?forge-[a-z0-9-]+$/;

function readTail(file, bytes = 4 * 1024 * 1024) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size; const len = Math.min(size, bytes);
    const buf = Buffer.alloc(len); fs.readSync(fd, buf, 0, len, size - len);
    return buf.toString('utf8');
  } finally { fs.closeSync(fd); }
}

const isSkillCommand = (text, name) =>
  new RegExp(`<command-name>/(?:[\\w.-]+:)?${esc(name)}</command-name>`).test(text) || new RegExp(`^\\s*/(?:[\\w.-]+:)?${esc(name)}(?:\\s|$)`).test(text);

/**
 * Is the current turn of the main conversation a FORGE turn? true | false | null (undeterminable).
 * Walks the transcript backwards to the latest genuine user prompt, looking for /forge or a Skill(forge) call.
 */
export function forgeTurnActive(transcriptPath, skill = 'forge') {
  if (!transcriptPath) return null;
  let text;
  try { text = readTail(transcriptPath); } catch { return null; }
  const lines = text.split('\n');
  let sawEntry = false;
  for (let i = lines.length - 1; i >= 0; i--) {
    let e; try { e = JSON.parse(lines[i]); } catch { continue; }
    sawEntry = true;
    const c = e.message?.content;
    if (e.type === 'assistant' && Array.isArray(c) && c.some((b) => b.type === 'tool_use' && b.name === 'Skill' && skillRe(skill).test(String(b.input?.skill ?? b.input?.command ?? '')))) return true;
    if (e.type === 'user' && !e.isMeta && !e.isSidechain) {
      if (Array.isArray(c) && c.some((b) => b.type === 'tool_result')) continue;
      const t = typeof c === 'string' ? c : Array.isArray(c) ? c.filter((b) => b.type === 'text').map((b) => b.text).join('\n') : '';
      if (!t.trim()) continue;
      if (isSkillCommand(t, skill)) return true;
      if (/^<(?:local-command|command-name|ide_|system-reminder)/.test(t.trim()) && !/<command-name>/.test(t)) continue; // UI noise, not a prompt
      return false;
    }
  }
  return sawEntry ? false : null;
}

export function shouldEnforce(scope, event, skill = 'forge') {
  if (scope === 'agent') return true;
  const agent = event.agent_type || '';
  if (agent) return FORGE_AGENT.test(agent);
  const active = forgeTurnActive(event.transcript_path, skill);
  if (active !== null) return active;
  return scope === 'skill'; // skill hooks exist only after /forge ran: fail closed. Plugin hooks are global: fail open.
}

// ---------- read-only review mode ----------

const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const REVIEW_LOCK_MAX_AGE_MS = 3 * 3600 * 1000; // keep in sync with review-target.mjs

/** Finds an active .forge/review.lock at or above dir; returns the project root that holds it, or null. */
export function activeReviewRoot(dir, now = Date.now()) {
  let d = path.resolve(dir || '.');
  for (let i = 0; i < 25; i++) {
    const lock = path.join(d, '.forge', 'review.lock');
    try {
      const j = JSON.parse(fs.readFileSync(lock, 'utf8'));
      return now - Date.parse(j.createdAt) < REVIEW_LOCK_MAX_AGE_MS ? d : null;
    } catch { /* keep walking */ }
    const up = path.dirname(d); if (up === d) break; d = up;
  }
  return null;
}

function reviewEditVerdict(event) {
  const root = activeReviewRoot(event.cwd);
  if (!root) return null;
  const target = event.tool_input?.file_path || event.tool_input?.notebook_path;
  if (!target) return null;
  const abs = path.resolve(event.cwd || root, target);
  const inside = path.relative(path.join(root, '.forge'), abs);
  if (inside && !inside.startsWith('..') && !path.isAbsolute(inside)) return null; // FORGE's own workspace is fine
  return `${event.tool_name} ${path.relative(root, abs) || abs}`;
}

export function decide(event, scope, skill = 'forge') {
  if (event && EDIT_TOOLS.has(event.tool_name)) {
    const op = reviewEditVerdict(event);
    if (!op || !shouldEnforce(scope, event, skill)) return { block: false, op };
    return {
      block: true, op,
      reason: `FORGE review mode is read-only: blocked \`${op}\`. A review never modifies the reviewed code. Put the finding and its recommended fix in the review report. ` +
        'If the user asks for fixes, end review mode first (review-target.mjs --unlock) and switch to the normal FORGE lifecycle.'
    };
  }
  if (!event || !['Bash', 'PowerShell'].includes(event.tool_name)) return { block: false };
  const op = forbiddenOperation(event.tool_input?.command);
  if (!op) {
    const ask = askOperation(event.tool_input?.command);
    if (!ask || !shouldEnforce(scope, event, skill)) return { block: false };
    return { block: false, ask: true, op: ask, reason: `FORGE asks before \`${ask}\`: it changes dependencies, publishes, deploys or reaches a remote host, which FORGE never does without the user's approval.` };
  }
  if (!shouldEnforce(scope, event, skill)) return { block: false, op };
  return {
    block: true, op,
    reason: `FORGE git guard blocked \`${op}\`. FORGE never commits, pushes, merges, rewrites history, discards the user's work, opens PRs, or posts reviews, comments or issues to the hosting platform. ` +
      'Leave all changes uncommitted and list them in the report; the user commits. (To run git yourself, use your own terminal.)'
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const i = process.argv.indexOf('--scope');
  const scope = i > 0 ? process.argv[i + 1] : 'agent';
  const k = process.argv.indexOf('--skill'); // the orchestrator skill's name (default forge); lets tests use a probe name
  const skill = k > 0 ? process.argv[k + 1] : 'forge';
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => { raw += d; });
  process.stdin.on('end', () => {
    let event; try { event = JSON.parse(raw); } catch { process.exit(0); }
    // Fast path: a shell command with nothing git-, hosting-, package-, deploy- or curl-like in it needs no further checks.
    if (!EDIT_TOOLS.has(event?.tool_name) && !/\b(git|gh|glab|curl|npm|pnpm|yarn|bun|npx|pnpx|bunx|pip3?|poetry|uv|cargo|go|composer|gem|bundle|dotnet|flutter|dart|eas|vercel|netlify|firebase|wrangler|terraform|pulumi|kubectl|helm|fastlane|fly|flyctl|heroku|serverless|sls|docker)\b/i.test(String(event?.tool_input?.command ?? ''))) process.exit(0);
    const d = decide(event, scope, skill);
    if (d.block) { process.stderr.write(d.reason + '\n'); process.exit(2); }
    // "ask" overrides any allow rule: the user sees a permission prompt (a headless run treats it as denied).
    if (d.ask) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: d.reason } }) + '\n');
    process.exit(0);
  });
}
