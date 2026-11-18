#!/usr/bin/env node
// FORGE comment check. Zero dependencies, read-only.
//
//   node comment-check.mjs [--root <dir>] [--base <ref>] [--files a,b] [--json]
//
// Finds the comments a change adds (added diff lines against --base, default HEAD, plus untracked files)
// and flags the patterns the forge-code-comments standard forbids: comments that restate code, narration,
// mentions of how the code was generated, banners, emoji, obvious comments, commented-out code and empty
// TODOs. Those are errors (exit 1). Wording that only needs a second look is a warning: long blocks,
// promotional or conversational phrasing, and every new TODO or FIXME.
// --files checks whole files instead of a diff. It catches patterns; it cannot judge whether a comment
// is accurate or needed. That stays with the author and the reviewer.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const C_LIKE = new Set(['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'mts', 'cts', 'java', 'kt', 'kts', 'scala', 'groovy', 'gradle', 'go', 'rs', 'cs', 'fs', 'swift', 'dart', 'php', 'c', 'h', 'cc', 'cpp', 'hpp', 'm', 'mm', 'css', 'scss', 'less', 'vue', 'svelte', 'proto', 'graphql', 'gql']);
const HASH = new Set(['py', 'rb', 'sh', 'bash', 'zsh', 'ps1', 'psm1', 'yaml', 'yml', 'toml', 'r', 'pl', 'ex', 'exs', 'tf', 'cfg', 'ini', 'conf', 'php']);
const DASH = new Set(['sql', 'lua', 'hs']);
const MARKUP = new Set(['html', 'htm', 'xml', 'vue', 'svelte']);
const HASH_NAMES = /^(Dockerfile|Makefile|Gemfile|Rakefile|Procfile|\.env\.example)$/;

const DIRECTIVE = /^(eslint[- ]|@ts-|prettier-ignore|istanbul ignore|c8 ignore|v8 ignore|biome-ignore|nolint|noqa|type:|pragma|pylint:|fmt:|rubocop:|swiftlint:|@license|SPDX-License-Identifier|#?region\b|#?endregion\b|-\*-|@vite-ignore|webpackChunkName|@jsx|language=|@flow|@format|go:|\+build|<reference |#\s*(include|define|if|endif|import))/i;

const RULES = [
  // errors
  { id: 'restates-code', level: 'error', re: /^(this|the following|the above|below)\s+(function|method|class|component|variable|var|constant|const|hook|module|file|helper|code|block|line|snippet|loop|statement|interface|type|enum|property|field|parameter|param|object|route|handler|endpoint)\b|^(this|it) is (used|responsible) (to|for)\b/i, fix: 'say why it exists or what is not obvious, or delete it' },
  { id: 'narration', level: 'error', re: /^(here|now|next|first|then|finally),? we\b|^we (are|will|now|then|need to|can)\b|^let'?s\b|^in this (function|method|section|block|file|code)\b|^as you can see\b/i, fix: 'drop the narration and state the reason directly' },
  { id: 'ai-mention', level: 'error', re: /\b(generated|written|created|added|produced|authored|refactored|updated) (by|with|using|via) (an? )?(ai|chatgpt|gpt[-\s]?\d*(\.\d+)?|claude|copilot|gemini|forge|llm|language model|ai assistant)\b|\bai[- ]generated\b|\bas an ai\b|\b(claude|chatgpt|copilot|forge) (says|suggested|wrote|generated)\b/i, fix: 'remove it; comments never say how the code was produced' },
  { id: 'banner', level: 'error', re: /^[=\-*#~_+\/<>.|]{4,}$|^[=\-*#~_]{3,}\s*\S.*?\s*[=\-*#~_]{3,}$/, fix: 'remove decorative separators' },
  { id: 'emoji', level: 'error', test: (t) => /\p{Extended_Pictographic}/u.test(t.replace(/[©®™]/g, '')), fix: 'remove the emoji' },
  { id: 'obvious', level: 'error', test: (t) => t.split(/\s+/).length <= 5 && /^(increment|decrement|initiali[sz]e|declare|define|import|export|return|call|loop (through|over)|iterate (through|over)|create|instantiate|set|get|add|assign|update) (the |a |an )?(counter|count|variable|var|value|values|array|list|loop|function|result|results|index|i|j|imports?|dependencies|modules?|object|instance|state|props?|constructor|data)s?\.?$|^(constructor|getters?|setters?|imports?|exports?|variables?|constants?|main function|end( of)? (function|loop|if|class|method))\.?$/i.test(t), fix: 'delete it; the code already says this' },
  { id: 'commented-out-code', level: 'error', re: /^(console\.(log|debug|info|warn|error)\(|print\(|debugger;?$|var_dump\(|dd\(|System\.out\.print|fmt\.Print|logger\.debug\()|^(const|let|var) \w+\s*=|^(if|for|while|switch) ?\(.*\)\s*\{?$|^import\s.+\sfrom\s|^from\s\S+\simport\s|^def \w+\(|^function \w*\(|^\w+(\.\w+)*\(.*\);$|^return\s.*;$|^[}{]\s*$/, fix: 'delete commented-out or debugging code' },
  { id: 'todo-empty', level: 'error', re: /^(TODO|FIXME|HACK|XXX)\b[\s:.\-]*$/, fix: 'describe the unfinished work (with a ticket ID if one exists) or remove it' },
  // warnings
  { id: 'todo', level: 'warn', re: /\b(TODO|FIXME|HACK|XXX)\b/, fix: 'keep only for genuine unfinished work; add a ticket ID if one exists' },
  { id: 'promotional', level: 'warn', re: /\b(blazing(ly)?[- ]fast|seamless(ly)?|cutting[- ]edge|best[- ]in[- ]class|state[- ]of[- ]the[- ]art|world[- ]class|powerful|elegant(ly)?|magic(al(ly)?)?|awesome|amazing|super (fast|easy|simple))\b/i, fix: 'use plain, neutral wording' },
  { id: 'conversational', level: 'warn', re: /\b(don'?t worry|feel free|you'?ll notice|as mentioned (above|earlier)|basically|obviously|clearly|of course)\b|!\s*$/i, fix: 'use plain, neutral wording' },
];
const LONG_BLOCK = 6;

const ext = (f) => { const b = path.basename(f); return b.includes('.') ? b.split('.').pop().toLowerCase() : ''; };
const SKIP_FILE = /(^|\/)(\.forge|node_modules|vendor|dist|build|coverage|\.git)\/|\.(md|mdx|txt|rst|adoc|json|lock|svg|png|jpe?g|gif|webp|ico|pdf|min\.js|map|snap)$|(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|CHANGELOG(\.\w+)?|LICENSE(\.\w+)?)$/i;

function git(root, args) {
  return execFileSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: root, maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
}

/** Added lines per file: Map<path, Array<{ line, text }>> from the diff against `base` plus untracked files. */
export function addedLines(root, base = 'HEAD') {
  const out = new Map();
  let patch = '';
  try { patch = git(root, ['diff', base, '-U0', '--no-color', '--no-ext-diff', '--', '.']); }
  catch { patch = git(root, ['diff', '--cached', '-U0', '--no-color', '--', '.']) + git(root, ['diff', '-U0', '--no-color', '--', '.']); } // no commits yet
  let file = null; let n = 0;
  for (const l of patch.split('\n')) {
    if (l.startsWith('+++ ')) { file = l === '+++ /dev/null' ? null : l.slice(6); continue; }
    const h = l.match(/^@@ -\S+ \+(\d+)/);
    if (h) { n = Number(h[1]); continue; }
    if (file && l.startsWith('+')) { if (!out.has(file)) out.set(file, []); out.get(file).push({ line: n++, text: l.slice(1) }); }
  }
  for (const f of git(root, ['ls-files', '--others', '--exclude-standard', '--', '.']).split('\n').filter(Boolean)) out.set(f, fileLines(root, f));
  return out;
}

function fileLines(root, f) {
  let buf; try { buf = fs.readFileSync(path.join(root, f)); } catch { return []; }
  if (buf.subarray(0, 8000).includes(0)) return [];
  return buf.toString('utf8').split(/\r?\n/).map((text, i) => ({ line: i + 1, text }));
}

const evenQuotes = (s) => ['"', "'", '`'].every((q) => (s.split(q).length - 1) % 2 === 0);

/** Comment text found on each line, tracking block comments across consecutive lines. */
export function extractComments(file, lines) {
  const e = ext(file); const base = path.basename(file);
  const cLike = C_LIKE.has(e); const hash = HASH.has(e) || HASH_NAMES.test(base); const dash = DASH.has(e); const markup = MARKUP.has(e); const py = e === 'py';
  if (!cLike && !hash && !dash && !markup) return [];
  const found = []; let block = null; let prev = -1;
  for (const { line, text } of lines) {
    if (line !== prev + 1) block = null; // a gap in the diff: block state is unknown
    prev = line;
    const t = text.trim();
    let c = null;
    if (block) {
      const end = t.indexOf(block);
      c = (end >= 0 ? t.slice(0, end) : t).replace(/^\*+\s?/, '');
      if (end >= 0) block = null;
    } else if (cLike && /^\/\/+!?/.test(t)) c = t.replace(/^\/\/+!?\s?/, '');
    else if (cLike && t.startsWith('/*')) {
      const end = t.indexOf('*/', 2);
      c = (end >= 0 ? t.slice(0, end) : t).replace(/^\/\*+!?\s?/, '');
      if (end < 0) block = '*/';
    } else if (markup && t.startsWith('<!--')) {
      const end = t.indexOf('-->');
      c = (end >= 0 ? t.slice(4, end) : t.slice(4));
      if (end < 0) block = '-->';
    } else if (py && /^[rRuU]?("""|''')/.test(t)) {
      const q = t.match(/("""|''')/)[1]; const rest = t.slice(t.indexOf(q) + 3); const end = rest.indexOf(q);
      c = end >= 0 ? rest.slice(0, end) : rest;
      if (end < 0) block = q;
    } else if (hash && t.startsWith('#') && !(line === 1 && t.startsWith('#!'))) c = t.replace(/^#+\s?/, '');
    else if (dash && t.startsWith('--')) c = t.replace(/^--+\s?/, '');
    else if (cLike) { const m = text.match(/^(.*?\S.*?)\s\/\/\s+(.*)$/); if (m && !/:$/.test(m[1]) && evenQuotes(m[1])) c = m[2]; }
    else if (hash) { const m = text.match(/^(.*?\S.*?)\s#\s+(.*)$/); if (m && evenQuotes(m[1])) c = m[2]; }
    if (c === null) continue;
    c = c.replace(/\s*\*\/\s*$/, '').trim();
    found.push({ line, text: c, directive: !c || DIRECTIVE.test(c) || /^@\w+/.test(c) });
  }
  return found;
}

export function checkComments(file, comments) {
  const findings = [];
  for (const c of comments) {
    if (c.directive) continue;
    for (const r of RULES) {
      const hit = r.test ? r.test(c.text) : r.re.test(c.text);
      if (!hit) continue;
      findings.push({ file, line: c.line, rule: r.id, level: r.level, text: c.text.slice(0, 120), fix: r.fix });
      if (r.level === 'error' || r.id === 'todo') break; // one finding per line is enough
    }
  }
  // Long prose blocks: consecutive comment lines, ignoring tag lines and a license header at the top of a file.
  let run = [];
  const flush = () => {
    const prose = run.filter((c) => !c.directive);
    if (prose.length > LONG_BLOCK && !(run[0].line <= 3 && /copyright|license/i.test(run.map((c) => c.text).join(' ')))) {
      findings.push({ file, line: run[0].line, rule: 'long', level: 'warn', text: `${prose.length}-line comment block`, fix: 'shorten it to the one or two sentences that carry the reason' });
    }
    run = [];
  };
  for (const c of comments) { if (run.length && c.line !== run.at(-1).line + 1) flush(); run.push(c); }
  if (run.length) flush();
  return findings.sort((a, b) => a.line - b.line);
}

export function check(root, { base = 'HEAD', files = null } = {}) {
  const sources = files ? new Map(files.map((f) => [f, fileLines(root, f)])) : addedLines(root, base);
  const findings = []; let checked = 0; let comments = 0;
  for (const [f, lines] of sources) {
    if (SKIP_FILE.test(f)) continue;
    const found = extractComments(f, lines);
    if (!found.length && !lines.length) continue;
    checked++; comments += found.filter((c) => !c.directive).length;
    findings.push(...checkComments(f, found));
  }
  return { checked, comments, errors: findings.filter((x) => x.level === 'error').length, warnings: findings.filter((x) => x.level === 'warn').length, findings };
}

function main() {
  const a = process.argv.slice(2);
  const opt = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
  const root = path.resolve(opt('--root') ?? '.');
  const files = opt('--files')?.split(',').map((s) => s.trim()).filter(Boolean) ?? null;
  let inRepo = false;
  try { inRepo = git(root, ['rev-parse', '--is-inside-work-tree']).trim() === 'true'; } catch { /* not a repo */ }
  if (!inRepo && !files) { console.error(`UNAVAILABLE: ${root} is not a git repository (pass --files to check named files)`); process.exit(2); }
  const r = check(root, { base: opt('--base') ?? 'HEAD', files });
  if (a.includes('--json')) console.log(JSON.stringify(r, null, 2));
  else {
    for (const f of r.findings) console.log(`${f.level === 'error' ? 'ERROR' : 'WARN '} ${f.file}:${f.line} [${f.rule}] "${f.text}" → ${f.fix}`);
    console.log(`${r.errors ? 'Comment check FAILED' : 'Comment check OK'}: ${r.comments} new comment line(s) in ${r.checked} file(s); ${r.errors} error(s), ${r.warnings} warning(s).`);
  }
  process.exit(r.errors ? 1 : 0);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try { main(); } catch (e) { console.error(`comment-check: ${e.message}`); process.exit(2); }
}
