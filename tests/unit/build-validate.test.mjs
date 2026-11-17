import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from '../../scripts/build.mjs';
import { parseFrontmatter } from '../../scripts/lib/frontmatter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const agents = fs.readdirSync(path.join(ROOT, 'agents')).filter((f) => f.endsWith('.md'));
const skills = fs.readdirSync(path.join(ROOT, 'skills'));

test('repository validator passes', () => {
  const out = execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'validate.mjs'), '--quiet'], { encoding: 'utf8' });
  assert.match(out, /^OK/m);
});

test('build produces both adapters with every skill, agent and role', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-build-'));
  try {
    build(tmp);
    for (const p of ['claude-code', 'antigravity']) {
      assert.deepEqual(fs.readdirSync(path.join(tmp, p, 'skills')).sort(), [...skills].sort(), `${p} skills`);
      assert.equal(fs.readdirSync(path.join(tmp, p, 'agents')).length, agents.length, `${p} agents`);
      assert.equal(fs.readdirSync(path.join(tmp, p, 'skills', 'forge', 'roles')).length, agents.length, `${p} roles`);
    }
    assert.ok(JSON.parse(fs.readFileSync(path.join(tmp, 'claude-code', '.claude-plugin', 'plugin.json'), 'utf8')).name === 'forge');
    assert.ok(JSON.parse(fs.readFileSync(path.join(tmp, 'antigravity', 'plugin.json'), 'utf8')).name === 'forge');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('Claude agents keep tool restrictions and receive the shared operating rules', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-build-'));
  try {
    build(tmp);
    for (const f of agents) {
      const text = fs.readFileSync(path.join(tmp, 'claude-code', 'agents', f), 'utf8');
      const fm = parseFrontmatter(text);
      assert.ok(fm.data.tools || fm.data.disallowedTools, `${f}: tool policy present`);
      assert.match(text, /## FORGE operating rules/, `${f}: footer appended`);
      assert.match(text, /Never\*\* `git commit`/, `${f}: git ban present`);
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('Antigravity adapter strips Claude-only fields and hides specialist slash commands', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-build-'));
  try {
    build(tmp);
    for (const f of agents) {
      const fm = parseFrontmatter(fs.readFileSync(path.join(tmp, 'antigravity', 'agents', f), 'utf8'));
      assert.deepEqual(Object.keys(fm.data).sort(), ['description', 'model', 'name', 'skills'], f);
      assert.equal(fm.data.model, 'inherit');
    }
    for (const s of skills) {
      const fm = parseFrontmatter(fs.readFileSync(path.join(tmp, 'antigravity', 'skills', s, 'SKILL.md'), 'utf8'));
      assert.equal(fm.data.name, s);
      assert.ok(!('user-invocable' in fm.data) && !('argument-hint' in fm.data), `${s}: claude-only keys stripped`);
      assert.equal(fm.data['disable-slash-command'], s === 'forge' ? undefined : true, `${s}: slash visibility`);
    }
    const wf = fs.readFileSync(path.join(tmp, 'antigravity', 'workflows', 'forge.md'), 'utf8');
    assert.ok(wf.length < 12000);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('build is deterministic', () => {
  const a = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-a-')); const b = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-b-'));
  try {
    build(a); build(b);
    const list = (d) => fs.readdirSync(d, { recursive: true }).map(String).sort();
    assert.deepEqual(list(a), list(b));
    for (const f of list(a)) { const pa = path.join(a, f); if (fs.statSync(pa).isFile()) assert.ok(fs.readFileSync(pa).equals(fs.readFileSync(path.join(b, f))), f); }
  } finally { fs.rmSync(a, { recursive: true, force: true }); fs.rmSync(b, { recursive: true, force: true }); }
});

test('routing covers every required scenario type', () => {
  const routing = fs.readFileSync(path.join(ROOT, 'skills', 'forge', 'core', 'routing.md'), 'utf8');
  for (const scenario of ['Bug fix (S)', 'New feature', 'UI/UX improvement', 'Database change', 'Security review', 'Project analysis', 'Performance', 'Production readiness']) {
    assert.ok(routing.includes(scenario), `routing row for ${scenario}`);
  }
});
