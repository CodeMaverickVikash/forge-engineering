#!/usr/bin/env node
// Builds platform adapters from the shared FORGE sources (zero dependencies).
//   node scripts/build.mjs [--out <dir>]      (default: ./dist)
// Output:
//   dist/claude-code/  - a valid Claude Code plugin (skills/, agents/, .claude-plugin/plugin.json)
//   dist/antigravity/  - a valid Antigravity plugin (skills/, agents/, plugin.json) + workflows/forge.md (legacy IDE entry)
// Both include skills/forge/roles/*.md for Mode B (sequential role emulation) on hosts without custom subagents.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter, serializeFrontmatter } from './lib/frontmatter.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const VERSION = fs.readFileSync(path.join(ROOT, 'VERSION'), 'utf8').trim();

const META = {
  name: 'forge',
  description: 'FORGE: an autonomous software engineering organization behind one /forge command: explores, specifies, delegates to specialist agents, implements, verifies (incl. browser QA) and reports. Never commits.',
  license: 'MIT',
  keywords: ['engineering', 'multi-agent', 'orchestration', 'qa', 'code-review', 'playwright', 'devtools']
};

// Fields each host understands. Everything else is stripped by the adapter.
const ANTIGRAVITY_SKILL_FIELDS = ['name', 'description'];
const ANTIGRAVITY_AGENT_FIELDS = ['name', 'description', 'model', 'skills'];

function listSkills() {
  return fs.readdirSync(path.join(ROOT, 'skills'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
}
function listAgents() {
  return fs.readdirSync(path.join(ROOT, 'agents')).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)).sort();
}
function copyDir(src, dst, transform) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const s = path.join(src, e.name); const d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d, transform);
    else if (transform && e.name === 'SKILL.md') fs.writeFileSync(d, transform(fs.readFileSync(s, 'utf8')));
    else fs.copyFileSync(s, d);
  }
}
const write = (p, content) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content); };
const norm = (s) => s.replace(/\r\n/g, '\n');

function loadAgent(name) {
  const text = norm(fs.readFileSync(path.join(ROOT, 'agents', `${name}.md`), 'utf8'));
  const fm = parseFrontmatter(text);
  if (!fm.data) throw new Error(`agents/${name}.md: ${fm.error}`);
  return fm;
}
const FOOTER = () => norm(fs.readFileSync(path.join(ROOT, 'agents', '_shared', 'operating-rules.md'), 'utf8'));
const withFooter = (body) => `${body.trimEnd()}\n\n${FOOTER()}`;

function roleFile(fm) {
  // Mode B role file: platform-neutral, readable by any agent.
  const skills = Array.isArray(fm.data.skills) ? fm.data.skills : [];
  return `# Role: ${fm.data.name}\n\n> ${fm.data.description}\n>\n> Skills to load: ${skills.map((s) => `\`${s}\``).join(', ') || 'none'} (each at \`<FORGE_HOME>/../<skill>/SKILL.md\`).\n\n${withFooter(fm.body)}`;
}

// Enforced git guard (Claude Code only). The path token resolves natively in plugin installs; the installers
// replace it with the absolute install path for standalone installs.
export const GUARD_HOME_TOKEN = '${CLAUDE_PLUGIN_ROOT}/skills/forge';
const guardCommand = (scope) => `node "${GUARD_HOME_TOKEN}/scripts/git-guard.mjs" --scope ${scope}`;
const guardHooksYaml = (scope) => [
  'hooks:', '  PreToolUse:', '    - matcher: "Bash|PowerShell|Edit|Write|MultiEdit|NotebookEdit"', '      hooks:', '        - type: command',
  `          command: '${guardCommand(scope)}'`, '          timeout: 10'].join('\n');
const withGuard = (text, scope) => text.replace(/^(---\n[\s\S]*?\n)(---\n)/, (m, head, close) => `${head}${guardHooksYaml(scope)}\n${close}`);

function buildClaude(out, skills, agents) {
  const dir = path.join(out, 'claude-code');
  for (const s of skills) copyDir(path.join(ROOT, 'skills', s), path.join(dir, 'skills', s), s === 'forge' ? (t) => withGuard(norm(t), 'skill') : undefined);
  write(path.join(dir, 'hooks', 'hooks.json'), JSON.stringify({
    description: 'FORGE git guard: blocks commit, push, merge, rebase, history rewrites and PR creation by FORGE agents and during /forge turns. Other sessions are unaffected.',
    hooks: { PreToolUse: [{ matcher: 'Bash|PowerShell|Edit|Write|MultiEdit|NotebookEdit', hooks: [{ type: 'command', command: guardCommand('plugin'), timeout: 10 }] }] }
  }, null, 2) + '\n');
  for (const a of agents) {
    const fm = loadAgent(a);
    write(path.join(dir, 'agents', `${a}.md`), withGuard(serializeFrontmatter(fm.data, fm.order) + '\n', 'agent') + withFooter(fm.body));
    write(path.join(dir, 'skills', 'forge', 'roles', `${a}.md`), roleFile(fm));
  }
  write(path.join(dir, 'skills', 'forge', 'VERSION'), `${VERSION}\n`);
  buildEvals(path.join(dir, 'evals'));
  write(path.join(dir, '.claude-plugin', 'plugin.json'), JSON.stringify({
    name: META.name, version: VERSION, description: META.description,
    author: { name: 'FORGE contributors' }, license: META.license, keywords: META.keywords
  }, null, 2) + '\n');
  write(path.join(dir, 'README.md'), `# FORGE for Claude Code (generated)\n\nGenerated by \`node scripts/build.mjs\` from the repository sources. Do not edit.\n\n- Recommended install (bare \`/forge\`): run \`scripts/install.sh --target claude\` (or \`install.ps1\`) from the repository root.\n- Plugin install (namespaced \`/forge:forge\`): add the repository as a marketplace, then \`/plugin install forge@forge-engineering\`.\n`);
}

// Eval cases for `claude plugin eval` (with-plugin vs no-plugin baseline). Sources live in ./evals/;
// each case gets its fixture project copied into files/ so the case folder is self-contained.
function buildEvals(dst) {
  const src = path.join(ROOT, 'evals');
  if (!fs.existsSync(src)) return;
  const fixtures = JSON.parse(fs.readFileSync(path.join(src, 'fixtures.json'), 'utf8'));
  for (const name of fs.readdirSync(src).filter((n) => fs.statSync(path.join(src, n)).isDirectory()).sort()) {
    copyDir(path.join(src, name), path.join(dst, name));
    for (const spec of fixtures[name] || []) {
      const [fx, sub = ''] = spec.split(':');
      copyDir(path.join(ROOT, 'tests', 'fixtures', fx), path.join(dst, name, 'files', sub));
    }
  }
}

function buildAntigravity(out, skills, agents) {
  const dir = path.join(out, 'antigravity');
  const skillTransform = (text) => {
    const fm = parseFrontmatter(norm(text));
    const data = {};
    for (const k of ANTIGRAVITY_SKILL_FIELDS) if (fm.data[k] !== undefined) data[k] = fm.data[k];
    // Keep /forge as the only slash entry point: hide specialist skills from the slash menu (Antigravity CLI field).
    if (fm.data.name !== 'forge') data['disable-slash-command'] = true;
    return serializeFrontmatter(data) + '\n' + fm.body;
  };
  for (const s of skills) copyDir(path.join(ROOT, 'skills', s), path.join(dir, 'skills', s), skillTransform);
  for (const a of agents) {
    const fm = loadAgent(a);
    const data = {};
    for (const k of ANTIGRAVITY_AGENT_FIELDS) if (fm.data[k] !== undefined) data[k] = fm.data[k];
    data.model = 'inherit'; // Antigravity accepts inherit | flash | pro; tool names differ from Claude Code, so `tools` is omitted (inherit).
    write(path.join(dir, 'agents', `${a}.md`), serializeFrontmatter(data, ANTIGRAVITY_AGENT_FIELDS) + '\n' + withFooter(fm.body));
    write(path.join(dir, 'skills', 'forge', 'roles', `${a}.md`), roleFile(fm));
  }
  write(path.join(dir, 'skills', 'forge', 'VERSION'), `${VERSION}\n`);
  write(path.join(dir, 'plugin.json'), JSON.stringify({ name: META.name, version: VERSION, description: META.description }, null, 2) + '\n');
  write(path.join(dir, 'workflows', 'forge.md'), [
    '---',
    'name: forge',
    'description: Run FORGE, the autonomous software engineering organization, on the request typed after /forge.',
    '---',
    '',
    '# /forge (legacy workflow entry point)',
    '',
    'This workflow only exists for Antigravity surfaces where skills are not slash-invocable. Where a `forge` skill is available, it takes precedence over this file.',
    '',
    '1. Treat everything the user typed after `/forge` as the FORGE request. If they typed nothing, the request is "Analyze the project and suggest improvements."',
    '2. Load the `forge` skill by reading its SKILL.md. Look for it first at `.agents/skills/forge/SKILL.md` in the workspace, then at `~/.gemini/config/skills/forge/SKILL.md`.',
    '3. Follow that skill exactly, through to the final answer and the saved FORGE Execution Report. Never commit, push or open pull requests.',
    ''
  ].join('\n'));
}

// Generated catalogs (docs/agents.md, docs/skills.md) so documentation can never drift from sources.
export function catalogs() {
  const skills = listSkills(); const agents = listAgents();
  const routing = norm(fs.readFileSync(path.join(ROOT, 'skills', 'forge', 'core', 'routing.md'), 'utf8'));
  const division = (a) => routing.match(new RegExp(`^\\| (\\w+) \\| \`${a}\` \\|`, 'm'))?.[1] || '—';
  const toolsOf = (d) => d.tools ? (String(d.tools).includes('Edit') ? 'implementer' : 'read-only') : 'inherits all (minus Agent)';
  const purpose = (d) => d.description.replace(/^FORGE [^.]+\.\s*/, '').replace(/\|/g, '\\|');
  const modelName = (m) => (!m || m === 'inherit' ? 'main model' : m.charAt(0).toUpperCase() + m.slice(1));
  const A = ['# Agents (generated)', '', '> Generated by `node scripts/build.mjs` from `agents/*.md`. Do not edit by hand.', '',
    `FORGE ships ${agents.length} specialist agents. The orchestrator (\`/forge\`) selects the smallest team for each task. See \`skills/forge/core/routing.md\`.`, '',
    '"main model" means the model selected in your Claude Code session (`model: inherit`). Antigravity builds always use `inherit`.', '',
    '| Division | Agent | Access | Model | Max turns | Preloaded skills | Purpose |', '|---|---|---|---|---|---|---|'];
  for (const a of agents) { const d = loadAgent(a).data; A.push(`| ${division(a)} | \`${a}\` | ${toolsOf(d)} | ${modelName(d.model)} | ${d.maxTurns ?? '—'} | ${(d.skills || []).map((s) => `\`${s}\``).join(', ')} | ${purpose(d)} |`); }
  const S = ['# Skills (generated)', '', '> Generated by `node scripts/build.mjs` from `skills/*/SKILL.md`. Do not edit by hand.', '',
    `FORGE ships ${skills.length} skills. Only \`forge\` is user-invocable; the specialists are loaded by agents (preloaded) or on demand.`, '',
    '| Skill | Supporting files | Description |', '|---|---|---|'];
  for (const s of skills) {
    const d = parseFrontmatter(norm(fs.readFileSync(path.join(ROOT, 'skills', s, 'SKILL.md'), 'utf8'))).data;
    const extra = fs.readdirSync(path.join(ROOT, 'skills', s), { recursive: true }).map(String).filter((f) => f !== 'SKILL.md' && path.extname(f)).length;
    S.push(`| \`${s}\` | ${extra} | ${d.description.replace(/\|/g, '\\|')} |`);
  }
  const out = { 'docs/agents.md': A.join('\n') + '\n', 'docs/skills.md': S.join('\n') + '\n' };

  // README "Models per task" block, regenerated between markers so it always matches agents/*.md.
  const START = '<!-- forge:models:start (generated by scripts/build.mjs; edit agents/*.md instead) -->';
  const END = '<!-- forge:models:end -->';
  const readmePath = path.join(ROOT, 'README.md');
  const readme = norm(fs.readFileSync(readmePath, 'utf8'));
  const i = readme.indexOf(START); const j = readme.indexOf(END);
  if (i >= 0 && j > i) {
    const byModel = new Map();
    for (const a of agents) {
      const d = loadAgent(a).data; const m = d.model && d.model !== 'inherit' ? d.model : 'inherit';
      if (!byModel.has(m)) byModel.set(m, []);
      byModel.get(m).push({ a, d });
    }
    const order = ['inherit', ...[...byModel.keys()].filter((m) => m !== 'inherit').sort()];
    const B = [START, '## Models per task', '',
      'FORGE runs each specialist on the model that fits its job. **Your main model** is the model selected in your Claude Code session (`model: inherit`). The `/forge` orchestrator itself always runs on your main model.', ''];
    for (const m of order.filter((k) => byModel.has(k))) {
      const rows = byModel.get(m).sort((x, y) => (y.d.maxTurns ?? 0) - (x.d.maxTurns ?? 0) || x.a.localeCompare(y.a));
      B.push(m === 'inherit'
        ? `### On your main model (${rows.length} agents): design, security, data, payments and the final review, where a mistake is costly and hard to catch later`
        : `### Always on ${modelName(m)} (${rows.length} agents): planning, documentation, UI, tests, config and browser checks, where tests, the browser or the reviewer catch mistakes`, '',
      '| Agent | What it does | Max turns |', '|---|---|---|');
      for (const { a, d } of rows) B.push(`| \`${a}\` | ${purpose(d)} | ${d.maxTurns ?? '—'} |`);
      B.push('');
    }
    B.push('### Which models a task uses', '',
      '| Task | Agents and models |', '|---|---|',
      '| Question about the code ("how does X work?") | No agents. The orchestrator answers directly on your main model, with `file:line` evidence |',
      '| Bug fix (size S) | Browser QA on Sonnet. Code reviewer only when you ask for a review or auth, payment or schema files changed (on Opus) |',
      '| New feature (size M/L) | Backend, database, integration or AI engineers on your main model, and the code reviewer under the same rule as bug fixes. Frontend, mobile, test and DevOps engineers and browser QA on Sonnet, plus product manager, QA lead or UX designer on Sonnet when the task needs them |',
      '| Analysis or audit | Architect and security engineer on your main model. Project explorer or QA lead on Sonnet when the codebase needs them |', '',
      'Notes:',
      '- **Max turns** is a cap that stops a runaway agent. It is set well above what real runs need, and an agent that hits it is reported as partial, never as done.',
      '- **Escalation to Opus:** testing and QA start on Sonnet. The orchestrator runs the code review on Opus when auth, payment or database schema files changed (for auth and payment, also the security engineer and test automation engineer), and moves root-cause analysis to Opus when a check fails in two cycles or the failure spans services, concurrency or architecture. Pass or fail always comes from real test and tool output, never from a model\'s plan or review. Rules: [core/delegation.md](skills/forge/core/delegation.md#model-escalation).',
      '- **Antigravity:** all agents use `inherit`, because Antigravity accepts only `inherit`, `flash` or `pro`. The Sonnet split and Opus escalation apply to Claude Code only; elsewhere the report records the escalation as unavailable.',
      '- **To change a model**, edit the `model:` line in `agents/<name>.md` (`inherit`, `sonnet`, `opus`, `haiku`, `fable` or a full model ID). Then run `node scripts/build.mjs` and reinstall with `scripts/install.sh --target claude` (or `install.ps1`). This table regenerates itself.',
      '- The full agent catalog, with access level and preloaded skills, is in [docs/agents.md](docs/agents.md).',
      END);
    out['README.md'] = readme.slice(0, i) + B.join('\n') + readme.slice(j + END.length);
  }
  return out;
}

export function build(out = path.join(ROOT, 'dist'), { docs = out === path.join(ROOT, 'dist') } = {}) {
  fs.rmSync(out, { recursive: true, force: true });
  const skills = listSkills(); const agents = listAgents();
  buildClaude(out, skills, agents);
  buildAntigravity(out, skills, agents);
  if (docs) for (const [f, c] of Object.entries(catalogs())) write(path.join(ROOT, f), c);
  return { out, skills: skills.length, agents: agents.length };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const i = process.argv.indexOf('--out');
  const r = build(i > 0 ? path.resolve(process.argv[i + 1]) : undefined);
  console.log(`FORGE ${VERSION}: built ${r.skills} skills and ${r.agents} agents into ${path.relative(process.cwd(), r.out) || r.out} (claude-code, antigravity)`);
}
