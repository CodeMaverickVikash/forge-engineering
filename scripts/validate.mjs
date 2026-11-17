#!/usr/bin/env node
// FORGE repository validator (zero dependencies).
//   node scripts/validate.mjs [--quiet]
// Checks sources (skills, agents, core, registry), cross-references, platform constraints and dist freshness.
// Exit code 0 = valid, 1 = errors found.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './lib/frontmatter.mjs';
import { build, catalogs, ROOT } from './build.mjs';

const errors = []; const warnings = []; const stats = {};
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);
const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/; // agentskills.io: lowercase, digits, single hyphens
const CLAUDE_TOOLS = new Set(['Read', 'Edit', 'Write', 'Grep', 'Glob', 'Bash', 'Skill', 'WebSearch', 'WebFetch', 'NotebookEdit', 'Agent', 'TodoWrite', 'PowerShell']);
const COLORS = new Set(['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan']);
const MODELS = new Set(['inherit', 'sonnet', 'opus', 'haiku', 'fable']);
const SKILL_KEYS = new Set(['name', 'description', 'user-invocable', 'argument-hint', 'disable-model-invocation', 'allowed-tools', 'when_to_use', 'license', 'metadata', 'compatibility']);
const AGENT_KEYS = new Set(['name', 'description', 'tools', 'disallowedTools', 'model', 'color', 'skills']);

function checkYamlSafety(where, fm) {
  for (const line of fm.raw.split('\n')) {
    const m = line.match(/^([\w-]+):\s+(.+)$/);
    if (!m) continue;
    const v = m[2].trim();
    if (/^["']/.test(v)) continue;
    if (/: /.test(v) || / #/.test(v)) err(where, `unquoted value for "${m[1]}" contains ": " or " #" and breaks real YAML parsers`);
  }
}

function checkLinks(file, text) {
  for (const m of text.matchAll(/\]\((?!https?:|mailto:|#)([^)\s]+?)(#[^)]*)?\)/g)) {
    const target = path.resolve(path.dirname(file), m[1]);
    if (!fs.existsSync(target)) err(rel(file), `broken relative link: ${m[1]}`);
  }
}

// ---------------- skills ----------------
const skillsDir = path.join(ROOT, 'skills');
const skills = fs.readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
const skillSet = new Set(skills);
let descChars = 0;
for (const s of skills) {
  const file = path.join(skillsDir, s, 'SKILL.md'); const where = rel(file);
  if (!fs.existsSync(file)) { err(where, 'missing SKILL.md'); continue; }
  const text = read(file); const fm = parseFrontmatter(text);
  if (!fm.data) { err(where, fm.error); continue; }
  checkYamlSafety(where, fm);
  for (const k of Object.keys(fm.data)) if (!SKILL_KEYS.has(k)) err(where, `unknown frontmatter key "${k}"`);
  if (fm.data.name !== s) err(where, `name "${fm.data.name}" must equal directory name "${s}"`);
  if (!NAME_RE.test(s) || s.length > 64) err(where, 'name must be lowercase-hyphenated and <= 64 chars (Agent Skills spec)');
  const d = fm.data.description;
  if (typeof d !== 'string' || d.length < 40) err(where, 'description missing or too short');
  else {
    if (d.length > 1024) err(where, `description ${d.length} chars > 1024 (Agent Skills spec)`);
    if (/[<>]/.test(d)) err(where, 'description must not contain < or >');
    if (s !== 'forge' && d.length > 200) warn(where, `description ${d.length} chars; keep specialist descriptions <= 200 (always-loaded context)`);
    descChars += d.length;
  }
  if (s === 'forge') { if (fm.data['user-invocable'] === false) err(where, 'forge must be user-invocable'); }
  else if (fm.data['user-invocable'] !== false) err(where, 'specialist skills must set user-invocable: false (single /forge entry point)');
  if (fm.data['disable-model-invocation'] === true && s !== 'forge') err(where, 'disable-model-invocation prevents subagent preloading');
  const lines = text.split('\n').length;
  if (lines > 500) err(where, `${lines} lines > 500 (keep SKILL.md concise; move detail to references/)`);
  else if (s !== 'forge' && lines > 160) warn(where, `${lines} lines; specialist skills should stay <= ~150`);
  checkLinks(file, text);
  for (const f of walkMd(path.join(skillsDir, s))) if (f !== file) checkLinks(f, read(f));
}
stats.skills = skills.length; stats.skillDescriptionChars = descChars;

function walkMd(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkMd(p)); else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

// ---------------- agents ----------------
const agentsDir = path.join(ROOT, 'agents');
const agents = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)).sort();
const agentSet = new Set(agents);
let agentDescChars = 0;
const footer = read(path.join(agentsDir, '_shared', 'operating-rules.md'));
for (const a of agents) {
  const file = path.join(agentsDir, `${a}.md`); const where = rel(file);
  const text = read(file); const fm = parseFrontmatter(text);
  if (!fm.data) { err(where, fm.error); continue; }
  checkYamlSafety(where, fm);
  for (const k of Object.keys(fm.data)) if (!AGENT_KEYS.has(k)) err(where, `unknown/unsupported frontmatter key "${k}"`);
  if (fm.data.name !== a) err(where, `name must equal file name "${a}"`);
  if (!a.startsWith('forge-') || !NAME_RE.test(a)) err(where, 'agent names must be forge-prefixed lowercase-hyphenated');
  const d = fm.data.description;
  if (typeof d !== 'string' || d.length < 40) err(where, 'description missing or too short');
  else { if (d.length > 170) warn(where, `description ${d.length} chars; keep agent descriptions <= 170 (always-loaded context)`); agentDescChars += d.length; if (/[<>]/.test(d)) err(where, 'description must not contain < or >'); }
  for (const key of ['tools', 'disallowedTools']) {
    if (fm.data[key] === undefined) continue;
    const list = Array.isArray(fm.data[key]) ? fm.data[key] : String(fm.data[key]).split(',').map((t) => t.trim());
    for (const t of list) if (!CLAUDE_TOOLS.has(t)) err(where, `${key}: unknown Claude Code tool "${t}"`);
    if (key === 'tools' && list.includes('Agent')) err(where, 'specialists must not spawn agents (remove Agent from tools)');
  }
  if (fm.data.tools === undefined && !String(fm.data.disallowedTools || '').includes('Agent')) err(where, 'agents inheriting all tools must disallow Agent');
  if (fm.data.model && !MODELS.has(fm.data.model)) err(where, `invalid model "${fm.data.model}"`);
  if (fm.data.color && !COLORS.has(fm.data.color)) err(where, `invalid color "${fm.data.color}"`);
  const sk = fm.data.skills;
  if (!Array.isArray(sk) || !sk.length) err(where, 'must preload at least one skill via skills:');
  else for (const s of sk) if (!skillSet.has(s)) err(where, `preloads unknown skill "${s}"`);
  if (/^## FORGE operating rules/m.test(fm.body)) err(where, 'do not inline the shared operating rules; build appends them');
  const lines = text.split('\n').length;
  if (lines > 90) warn(where, `${lines} lines; agent prompts should stay concise (<= ~70)`);
}
stats.agents = agents.length; stats.agentDescriptionChars = agentDescChars;
if (footer.length > 2500) warn('agents/_shared/operating-rules.md', 'footer is appended to every agent; keep it short');

// ---------------- cross references ----------------
const allMd = [...walkMd(skillsDir), ...walkMd(agentsDir)];
for (const f of allMd) {
  const text = read(f);
  for (const m of text.matchAll(/`(forge-[a-z0-9-]+)`/g)) {
    const n = m[1];
    if (!skillSet.has(n) && !agentSet.has(n) && !n.startsWith('forge-version')) err(rel(f), `references unknown skill/agent "${n}"`);
  }
}
const routing = read(path.join(skillsDir, 'forge', 'core', 'routing.md'));
for (const a of agents) if (!routing.includes(`\`${a}\``)) err('skills/forge/core/routing.md', `agent ${a} is not in the roster/routing`);

// ---------------- registry ----------------
const regFile = path.join(skillsDir, 'forge-project-exploration', 'scripts', 'technology-registry.json');
try {
  const reg = JSON.parse(read(regFile)); const ids = new Set();
  for (const t of reg.technologies) {
    if (ids.has(t.id)) err(rel(regFile), `duplicate id ${t.id}`); ids.add(t.id);
    if (!t.detect || !Object.keys(t.detect).length) err(rel(regFile), `${t.id}: no detection signals`);
    for (const s of t.skills || []) if (!skillSet.has(s)) err(rel(regFile), `${t.id}: unknown skill ${s}`);
    if (t.reference && !fs.existsSync(path.join(skillsDir, t.reference))) err(rel(regFile), `${t.id}: missing reference ${t.reference}`);
  }
  stats.technologies = reg.technologies.length;
} catch (e) { err(rel(regFile), `invalid JSON: ${e.message}`); }

// ---------------- manifests ----------------
for (const f of ['.claude-plugin/marketplace.json']) {
  try { const j = JSON.parse(read(path.join(ROOT, f))); if (!j.name || !j.owner?.name || !Array.isArray(j.plugins)) err(f, 'marketplace requires name, owner.name, plugins[]'); }
  catch (e) { err(f, e.message); }
}

// ---------------- eval cases (claude plugin eval format) ----------------
const evalsDir = path.join(ROOT, 'evals');
if (fs.existsSync(evalsDir)) {
  const fixtures = JSON.parse(read(path.join(evalsDir, 'fixtures.json')));
  const cases = fs.readdirSync(evalsDir).filter((n) => fs.statSync(path.join(evalsDir, n)).isDirectory());
  for (const c of cases) {
    const w = `evals/${c}`;
    if (!/^[a-z][a-z0-9-]*$/.test(c) || ['results', 'mocks', 'node_modules', 'files', 'true', 'false', 'null'].includes(c)) err(w, 'invalid case name');
    const prompt = fs.existsSync(path.join(evalsDir, c, 'prompt.md')) ? read(path.join(evalsDir, c, 'prompt.md')) : '';
    const settings = prompt.match(/^---\n([\s\S]*?)\n---\n/);
    if (!settings) err(w, 'prompt.md must start with a --- settings block');
    else for (const line of settings[1].split('\n')) { const k = line.split(':')[0]; if (!['tags', 'max_turns', 'timeout_seconds', 'allowed_tools'].includes(k)) err(w, `unknown prompt.md setting "${k}" (case would fail to load)`); }
    const yaml = fs.existsSync(path.join(evalsDir, c, 'case.yaml')) ? read(path.join(evalsDir, c, 'case.yaml')) : '';
    if (!/^schema_version: "1\.1"$/m.test(yaml)) err(w, 'case.yaml needs schema_version: "1.1" (quoted)');
    if (!new RegExp(`^name: ${c}$`, 'm').test(yaml)) err(w, 'case.yaml name must equal folder name');
    const graders = fs.existsSync(path.join(evalsDir, c, 'graders')) ? fs.readdirSync(path.join(evalsDir, c, 'graders')) : [];
    if (!graders.length) err(w, 'needs at least one grader');
    for (const g of graders) if (!/^---\ntype: llm\nfocus: trace\nweight: 1\n---\n/.test(read(path.join(evalsDir, c, 'graders', g)))) err(`${w}/graders/${g}`, 'grader header block missing or altered');
    if (/scaffold_script: place-files\.sh/.test(yaml) && !fs.existsSync(path.join(evalsDir, c, 'place-files.sh'))) err(w, 'place-files.sh missing');
    for (const spec of fixtures[c] || []) if (!fs.existsSync(path.join(ROOT, 'tests', 'fixtures', spec.split(':')[0]))) err(w, `unknown fixture ${spec}`);
    if (!fixtures[c]) err(w, 'no fixture mapping in evals/fixtures.json');
  }
  stats.evalCases = cases.length;
}

// ---------------- dist freshness + adapter constraints ----------------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-validate-'));
try {
  build(tmp);
  const distDir = path.join(ROOT, 'dist');
  if (!fs.existsSync(distDir)) err('dist', 'missing; run node scripts/build.mjs');
  else {
    const a = snapshot(tmp); const b = snapshot(distDir);
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    const stale = [...keys].filter((k) => a[k] !== b[k]);
    if (stale.length) err('dist', `out of date (${stale.length} file(s), e.g. ${stale.slice(0, 3).join(', ')}); run node scripts/build.mjs`);
  }
  // Antigravity constraints
  const ag = path.join(tmp, 'antigravity');
  for (const f of fs.readdirSync(path.join(ag, 'agents'))) {
    const fm = parseFrontmatter(read(path.join(ag, 'agents', f)));
    for (const k of Object.keys(fm.data)) if (!['name', 'description', 'model', 'skills'].includes(k)) err(`dist/antigravity/agents/${f}`, `unsupported key ${k}`);
    if (!['inherit', 'flash', 'pro'].includes(fm.data.model)) err(`dist/antigravity/agents/${f}`, 'model must be inherit|flash|pro');
  }
  const wf = read(path.join(ag, 'workflows', 'forge.md'));
  if (wf.length > 12000) err('dist/antigravity/workflows/forge.md', 'exceeds 12,000 character workflow limit');
  for (const p of ['claude-code', 'antigravity']) {
    const roles = fs.readdirSync(path.join(tmp, p, 'skills', 'forge', 'roles'));
    if (roles.length !== agents.length) err(`dist/${p}`, 'roles/ count does not match agents');
  }
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

for (const [f, content] of Object.entries(catalogs())) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p) || read(p) !== content) err(f, 'generated catalog out of date; run node scripts/build.mjs');
}

function snapshot(dir) {
  const out = {};
  (function rec(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) rec(p); else out[path.relative(dir, p).split(path.sep).join('/')] = fs.readFileSync(p).toString('base64'); } })(dir);
  return out;
}

// ---------------- report ----------------
const approxTokens = Math.round((descChars + agentDescChars) / 4);
const quiet = process.argv.includes('--quiet');
if (!quiet) {
  console.log(`FORGE validate: ${stats.skills} skills, ${stats.agents} agents, ${stats.technologies ?? '?'} registry technologies`);
  console.log(`Always-loaded listing cost: skills ${descChars} chars + agents ${agentDescChars} chars ≈ ${approxTokens} tokens`);
  for (const w of warnings) console.log(`  warn  ${w}`);
}
for (const e of errors) console.log(`  ERROR ${e}`);
console.log(errors.length ? `FAILED: ${errors.length} error(s), ${warnings.length} warning(s)` : `OK (${warnings.length} warning(s))`);
process.exit(errors.length ? 1 : 0);
