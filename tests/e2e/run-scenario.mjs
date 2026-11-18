#!/usr/bin/env node
// Live end-to-end runner: executes a real headless Claude Code `/forge` session against a sandboxed fixture.
//   node tests/e2e/run-scenario.mjs <scenario|all> [--model sonnet] [--budget 10] [--keep]
// Requires: the `claude` CLI (or CLAUDE_BIN), bash (installer), git. Costs real API usage — run deliberately.
// Safety: sandbox in the OS temp dir; FORGE installed at *project* scope (your ~/.claude is untouched);
// git mutations are denied via --disallowedTools; only the Playwright + Chrome DevTools MCP servers are loaded.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SCENARIOS } from './scenarios.mjs';
import { executedText } from './command-text.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const CLAUDE = process.env.CLAUDE_BIN || 'claude';
const GIT_DENY = ['Bash(git commit:*)', 'Bash(git push:*)', 'Bash(git merge:*)', 'Bash(git rebase:*)', 'Bash(git reset:*)', 'Bash(git stash push:*)', 'Bash(git stash pop:*)', 'Bash(git stash drop:*)', 'Bash(git clean:*)', 'Bash(gh pr create:*)'];
const ALLOW = ['Read', 'Edit', 'Write', 'Grep', 'Glob', 'Bash', 'Skill', 'Agent', 'TodoWrite', 'WebSearch', 'WebFetch', 'mcp__playwright', 'mcp__chrome-devtools'];

function sandbox(name, fixture, setup) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `forge-e2e-${name}-`));
  for (const spec of [].concat(fixture)) {
    const [fx, sub = ''] = spec.split(':');
    fs.cpSync(path.join(ROOT, 'tests', 'fixtures', fx), path.join(dir, sub), { recursive: true });
  }
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'core.autocrlf', 'false'], { cwd: dir }); // avoid CRLF noise in change detection
  // FORGE's own folders never count as user changes (local exclude, not a tracked .gitignore).
  fs.appendFileSync(path.join(dir, '.git', 'info', 'exclude'), '\n.claude/\n.forge/\n.playwright-mcp/\n');
  if (setup) {
    // Scenario-built history inside this throwaway sandbox (test scaffolding; the sandbox is deleted after the run).
    const git = (...a) => execFileSync('git', ['-c', 'user.name=FORGE e2e', '-c', 'user.email=e2e@example.invalid', ...a], { cwd: dir, encoding: 'utf8' });
    const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
    const write = (f, s) => fs.writeFileSync(path.join(dir, f), s);
    setup({ dir, git, read, write });
  } else execFileSync('git', ['add', '-A'], { cwd: dir }); // baseline staged (never committed): `git diff` shows FORGE's changes
  // --use-installed: test the user-scope install in ~/.claude exactly as a user would run it.
  if (args.includes('--use-installed')) return dir;
  const r = spawnSync('bash', [path.join(ROOT, 'scripts', 'install.sh'), '--target', 'claude', '--scope', 'project', '--project', dir], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`install failed: ${r.stderr}`);
  return dir;
}

function analyzeStream(lines) {
  // Order markers (tool-use sequence numbers): first source edit, first gate check after it, first browser call after it.
  // Browser calls before any edit are bug reproduction, which may precede the fix and the gate.
  const ev = { skills: [], agents: [], bash: [], mcp: {}, result: null, toolUses: 0, firstEdit: null, firstGateCall: null, firstBrowserCall: null };
  for (const line of lines) {
    let e; try { e = JSON.parse(line); } catch { continue; }
    if (e.type === 'result') ev.result = e;
    const content = e.type === 'assistant' ? e.message?.content || [] : [];
    for (const c of content) {
      if (c.type !== 'tool_use') continue;
      const n = ev.toolUses++;
      if (c.name === 'Skill') ev.skills.push(c.input?.skill || c.input?.command);
      else if (c.name === 'Agent' || c.name === 'Task') ev.agents.push(String(c.input?.subagent_type || '').replace(/^forge:/, ''));
      else if (c.name === 'Bash' || c.name === 'PowerShell') {
        const cmd = c.input?.command || '';
        ev.bash.push(cmd);
        if (ev.firstEdit !== null && ev.firstGateCall === null && /validation-gate\.mjs"?\s+gate\b/.test(cmd)) ev.firstGateCall = n;
      } else if (c.name.startsWith('mcp__')) {
        const s = c.name.split('__')[1]; ev.mcp[s] = (ev.mcp[s] || 0) + 1;
        if (ev.firstEdit !== null && ev.firstBrowserCall === null && (s === 'playwright' || s === 'chrome-devtools')) ev.firstBrowserCall = n;
      } else if ((c.name === 'Edit' || c.name === 'Write') && ev.firstEdit === null && !/[\\/]\.(forge|claude)[\\/]/.test(c.input?.file_path || '')) ev.firstEdit = n;
    }
  }
  return ev;
}

// Exact working-tree + git state, for read-only scenarios: any byte changed outside FORGE's folders is a failure.
const IGNORED = /^(\.git|\.forge|\.claude|\.playwright-mcp|node_modules|test-results|playwright-report)(\/|$)|\.png$/;
function treeState(dir) {
  const files = {};
  for (const f of fs.readdirSync(dir, { recursive: true }).map((p) => String(p).replace(/\\/g, '/'))) {
    if (IGNORED.test(f) || f.split('/').some((seg) => IGNORED.test(seg))) continue;
    const abs = path.join(dir, f);
    if (fs.statSync(abs).isFile()) files[f] = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
  }
  const g = (...a) => { try { return execFileSync('git', a, { cwd: dir, encoding: 'utf8' }).trim(); } catch { return ''; } };
  return { files, head: g('rev-parse', 'HEAD'), index: g('ls-files', '-s'), stash: g('stash', 'list'), branch: g('branch', '--show-current') };
}

function evaluate(name, sc, dir, ev, before) {
  const fails = []; const e = sc.expect || {};
  const used = new Set(ev.agents);
  for (const a of e.agentsAll || []) if (!used.has(a)) fails.push(`agent not invoked: ${a}`);
  for (const group of e.agentsAny || []) if (!group.some((a) => used.has(a))) fails.push(`none of [${group}] invoked`);
  const report = ev.result?.result || '';
  if (e.answerOnly) {
    // Q size: a direct answer with evidence, no specialists and no full report.
    if (ev.agents.length) fails.push(`answer-only question launched agents: ${ev.agents.join(', ')}`);
    if (/### FORGE Execution Report/.test(report)) fails.push('answer-only question produced a full execution report');
  } else if (e.reportHeading) {
    if (!e.reportHeading.test(report)) fails.push(`final report heading ${e.reportHeading} missing`);
  } else {
    if (!/FORGE Execution Report/i.test(report)) fails.push('final FORGE Execution Report missing');
    if (!/no commit|not committed|nothing (is |was )?committed|did not commit|didn't commit/i.test(report)) fails.push('report does not state that no commit was made');
    const status = report.match(/\*\*Completion status:\*\*\s*(VERIFIED WITH LIMITATIONS|VERIFIED|BLOCKED|FAILED)/);
    if (!status) fails.push('report has no completion status (VERIFIED | VERIFIED WITH LIMITATIONS | BLOCKED | FAILED)');
    else if (status[1] === 'VERIFIED' && /not browser-verified/i.test(report)) fails.push('completion status VERIFIED despite "not browser-verified"');
  }
  for (const re of e.reportMentions || []) if (!re.test(report)) fails.push(`report lacks ${re}`);
  const denied = (ev.result?.permission_denials || []).map((d) => JSON.stringify(d.tool_input || d));
  // `git stash list` is read-only; anything else that mutates history or the working tree is forbidden.
  if (ev.bash.some((c) => /\bgit\s+(commit|push|merge|rebase|reset|clean)\b|\bgit\s+stash(?!\s+list)\b|\bgh\s+pr\s+create\b/.test(executedText(c)))) fails.push('attempted a forbidden git operation');
  // Baseline is staged (never committed), so compare the worktree to the index: modified/deleted + untracked files.
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8' }).split('\n').filter(Boolean);
  const changed = [...new Set([...git('diff', '--name-only'), ...git('ls-files', '--others', '--exclude-standard')])]
    .filter((f) => !f.startsWith('.forge') && !f.startsWith('.claude') && !/^\.playwright-mcp|\.png$|test-results|playwright-report/.test(f));
  if (e.sourceChanges === false && changed.length) fails.push(`analysis-only task changed files: ${changed.join(', ')}`);
  if (e.sourceChanges === true && !changed.length) fails.push('no source changes made');
  if (e.browser) {
    const both = ev.mcp.playwright && ev.mcp['chrome-devtools'];
    if (!both && !/not browser-verified/i.test(report)) fails.push('browser change neither verified with both MCPs nor reported as not browser-verified');
    // Browser work must come after the static checks: the pre-browser gate has to be checked before the first browser call.
    if (ev.firstBrowserCall !== null && (ev.firstGateCall === null || ev.firstGateCall > ev.firstBrowserCall)) fails.push('browser verification started before the pre-browser gate (validation-gate.mjs gate) was checked');
  }
  if (e.unchanged && before) {
    const after = treeState(dir);
    for (const k of ['head', 'index', 'stash', 'branch']) if (before[k] !== after[k]) fails.push(`read-only run changed git ${k}`);
    for (const f of new Set([...Object.keys(before.files), ...Object.keys(after.files)])) {
      if (before.files[f] !== after.files[f]) fails.push(`read-only run ${!after.files[f] ? 'deleted' : !before.files[f] ? 'created' : 'modified'} ${f}`);
    }
  }
  if (sc.check) fails.push(...sc.check({ dir }));
  let testsAfter = 'N/A';
  if (fs.existsSync(path.join(dir, 'package.json')) && /"test"/.test(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))) {
    const t = spawnSync('npm', ['test'], { cwd: dir, encoding: 'utf8', shell: process.platform === 'win32' });
    testsAfter = t.status === 0 ? 'PASSED' : 'FAILED';
    if (t.status !== 0) fails.push('project tests fail after FORGE run');
  }
  return { fails, changed, testsAfter, denied };
}

function run(name) {
  const sc = SCENARIOS[name]; if (!sc) throw new Error(`unknown scenario ${name}`);
  const dir = sandbox(name, sc.fixture, sc.setup);
  const before = sc.expect?.unchanged ? treeState(dir) : null;
  const mcpCfg = path.join(os.tmpdir(), `forge-e2e-mcp-${process.pid}.json`);
  const npx = process.platform === 'win32' ? { command: 'cmd', pre: ['/c', 'npx'] } : { command: 'npx', pre: [] };
  fs.writeFileSync(mcpCfg, JSON.stringify({ mcpServers: {
    playwright: { command: npx.command, args: [...npx.pre, '-y', '@playwright/mcp@latest', '--isolated'] },
    'chrome-devtools': { command: npx.command, args: [...npx.pre, '-y', 'chrome-devtools-mcp@latest', '--isolated'] }
  } }));
  const cliArgs = ['-p', sc.prompt, '--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits',
    '--allowedTools', ...ALLOW, '--disallowedTools', ...GIT_DENY, '--strict-mcp-config', '--mcp-config', mcpCfg,
    '--model', opt('--model', 'sonnet'), '--max-budget-usd', opt('--budget', '10'),
    // Sessions are not saved by default, which keeps test runs out of your history. That also stops
    // subagents from being resumed, so FORGE falls back to fresh delta retests. Pass --persist-sessions
    // to exercise the SendMessage continuation path.
    ...(args.includes('--persist-sessions') ? [] : ['--no-session-persistence'])];
  console.log(`▶ ${name}: sandbox ${dir}`);
  const t0 = Date.now();
  const r = spawnSync(CLAUDE, cliArgs, { cwd: dir, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, timeout: 60 * 60 * 1000 });
  try { fs.rmSync(mcpCfg, { force: true }); } catch { /* best effort */ }
  console.log(`  claude finished: exit=${r.status} signal=${r.signal} error=${r.error?.code || 'none'} after ${((Date.now() - t0) / 60000).toFixed(1)}min, ${(r.stdout || '').length} bytes`);
  if (r.error && !r.stdout) {
    // The CLI never ran: keep the recorded results instead of overwriting them with an empty run.
    console.log(`✖ ${name}: could not start ${CLAUDE} (${r.error.code}). Set CLAUDE_BIN to the claude executable. Results left unchanged.`);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
    return false;
  }
  const lines = (r.stdout || '').split('\n');
  const ev = analyzeStream(lines);
  const res = evaluate(name, sc, dir, ev, before);
  const outDir = path.join(ROOT, 'tests', 'e2e', 'results', name);
  fs.mkdirSync(outDir, { recursive: true });
  const diff = execFileSync('git', ['diff', '--stat'], { cwd: dir, encoding: 'utf8' });
  const summary = {
    scenario: name, prompt: sc.prompt, fixture: sc.fixture, model: opt('--model', 'sonnet'), date: new Date().toISOString().slice(0, 10),
    pass: res.fails.length === 0 && r.status === 0, failures: res.fails, exitCode: r.status,
    durationMin: +((Date.now() - t0) / 60000).toFixed(1), costUsd: ev.result?.total_cost_usd ?? null, turns: ev.result?.num_turns ?? null,
    skillsInvoked: [...new Set(ev.skills)], agentsInvoked: ev.agents, mcpToolCalls: ev.mcp, toolUses: ev.toolUses,
    permissionDenials: res.denied, filesChanged: res.changed, diffStat: diff.trim(), projectTestsAfter: res.testsAfter
  };
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  const tdir = process.env.FORGE_E2E_TRANSCRIPTS || os.tmpdir(); // full transcripts stay out of the repo
  fs.writeFileSync(path.join(tdir, `forge-e2e-${name}.jsonl`), r.stdout || '');
  fs.writeFileSync(path.join(outDir, 'report.md'), (ev.result?.result || '(no final result)').replace(new RegExp(dir.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&'), 'g'), '<sandbox>') + '\n');
  if (!args.includes('--keep')) {
    // A process the session started (dev server, container mount) may still hold the dir on Windows: don't crash the batch.
    try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 1000 }); }
    catch (e) { console.log(`  could not remove sandbox (${e.code}); left at ${dir}`); }
  } else console.log(`  kept sandbox: ${dir}`);
  console.log(`${summary.pass ? '✔' : '✖'} ${name}: agents=[${ev.agents.join(', ')}] mcp=${JSON.stringify(ev.mcp)} cost=$${summary.costUsd} ${summary.durationMin}min`);
  for (const f of res.fails) console.log(`   - ${f}`);
  if (r.status !== 0) console.log(`   claude exit ${r.status}: ${(r.stderr || '').slice(0, 500)}`);
  return summary.pass;
}

const which = args[0];
if (!which) { console.log(`Usage: node tests/e2e/run-scenario.mjs <${Object.keys(SCENARIOS).join('|')}|all> [--model sonnet] [--budget 10] [--keep] [--persist-sessions]`); process.exit(0); }
process.on('uncaughtException', (e) => { console.error(`run-scenario crashed: ${e.stack}`); process.exit(2); });
const names = which === 'all' ? Object.keys(SCENARIOS) : which.split(',');
const ok = names.map(run).every(Boolean);
process.exit(ok ? 0 : 1);
