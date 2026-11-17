import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const agentCount = fs.readdirSync(path.join(ROOT, 'dist', 'claude-code', 'agents')).length;
const skillCount = fs.readdirSync(path.join(ROOT, 'dist', 'claude-code', 'skills')).length;

const hasBash = spawnSync('bash', ['--version']).status === 0;
const psExe = process.platform === 'win32' ? 'powershell.exe' : 'pwsh';
const hasPs = spawnSync(psExe, ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.Major']).status === 0;

// Run an installer with HOME redirected to a sandbox so the real user config is never touched.
function runner(kind, home) {
  const env = { ...process.env, HOME: home, USERPROFILE: home };
  delete env.CLAUDE_CONFIG_DIR; delete env.FORGE_ANTIGRAVITY_HOME;
  return (args) => {
    const r = kind === 'bash'
      ? spawnSync('bash', [path.join(ROOT, 'scripts', 'install.sh'), ...args], { env, encoding: 'utf8' })
      : spawnSync(psExe, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'scripts', 'install.ps1'), ...args], { env, encoding: 'utf8' });
    return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
  };
}
const flags = (kind, o) => kind === 'bash'
  ? [...(o.target ? ['--target', o.target] : []), ...(o.scope ? ['--scope', o.scope] : []), ...(o.project ? ['--project', o.project] : []), ...(o.force ? ['--force'] : []), ...(o.uninstall ? ['--uninstall'] : []), ...(o.dry ? ['--dry-run'] : [])]
  : [...(o.target ? ['-Target', o.target] : []), ...(o.scope ? ['-Scope', o.scope] : []), ...(o.project ? ['-Project', o.project] : []), ...(o.force ? ['-Force'] : []), ...(o.uninstall ? ['-Uninstall'] : []), ...(o.dry ? ['-DryRun'] : [])];

for (const kind of ['bash', 'powershell']) {
  const available = kind === 'bash' ? hasBash : hasPs;
  test(`${kind} installer: user scope install, idempotent upgrade, conflict safety, clean uninstall`, { skip: !available && `${kind} not available` }, () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), `forge-home-${kind}-`));
    try {
      const run = runner(kind, home);
      const claude = path.join(home, '.claude'); const ag = path.join(home, '.gemini', 'config');
      // Pre-existing unrelated user content must survive everything.
      fs.mkdirSync(path.join(claude, 'skills', 'my-own-skill'), { recursive: true });
      fs.writeFileSync(path.join(claude, 'skills', 'my-own-skill', 'SKILL.md'), 'mine');
      fs.mkdirSync(path.join(home, '.gemini'), { recursive: true });

      // Dry run changes nothing.
      let r = run(flags(kind, { target: 'all', dry: true }));
      assert.equal(r.code, 0, r.out);
      assert.ok(!fs.existsSync(path.join(claude, 'skills', 'forge')), 'dry-run must not write');

      r = run(flags(kind, { target: 'all' }));
      assert.equal(r.code, 0, r.out);
      assert.ok(fs.existsSync(path.join(claude, 'skills', 'forge', 'SKILL.md')));
      assert.equal(fs.readdirSync(path.join(claude, 'agents')).filter((f) => f.startsWith('forge-')).length, agentCount);
      assert.ok(fs.existsSync(path.join(claude, 'skills', 'forge-project-exploration', 'scripts', 'detect-stack.mjs')));
      assert.ok(fs.existsSync(path.join(ag, 'skills', 'forge', 'SKILL.md')));
      assert.ok(fs.existsSync(path.join(ag, 'agents', 'forge-architect.md')));
      assert.ok(fs.existsSync(path.join(ag, 'global_workflows', 'forge.md')));
      const manifest = fs.readFileSync(path.join(claude, 'skills', 'forge', '.forge-install-manifest'), 'utf8');
      assert.equal(manifest.trim().split(/\r?\n/).filter((l) => !l.startsWith('#')).length, skillCount + agentCount);

      // Re-install (upgrade) is idempotent; a stale FORGE file from an older version gets cleaned up.
      fs.appendFileSync(path.join(claude, 'skills', 'forge', '.forge-install-manifest'), 'agents/forge-obsolete.md\n');
      fs.writeFileSync(path.join(claude, 'agents', 'forge-obsolete.md'), 'old');
      r = run(flags(kind, { target: 'claude' }));
      assert.equal(r.code, 0, r.out);
      assert.ok(!fs.existsSync(path.join(claude, 'agents', 'forge-obsolete.md')), 'stale file removed on upgrade');

      // Conflict: a user-owned file at a FORGE path blocks install unless --force.
      const proj = fs.mkdtempSync(path.join(os.tmpdir(), `forge-proj-${kind}-`));
      fs.mkdirSync(path.join(proj, '.claude', 'agents'), { recursive: true });
      fs.writeFileSync(path.join(proj, '.claude', 'agents', 'forge-architect.md'), 'user-written');
      r = run(flags(kind, { target: 'claude', scope: 'project', project: proj }));
      assert.notEqual(r.code, 0, 'must refuse to overwrite');
      assert.equal(fs.readFileSync(path.join(proj, '.claude', 'agents', 'forge-architect.md'), 'utf8'), 'user-written');
      r = run(flags(kind, { target: 'claude', scope: 'project', project: proj, force: true }));
      assert.equal(r.code, 0, r.out);
      assert.ok(fs.existsSync(path.join(proj, '.claude', 'skills', 'forge', 'SKILL.md')));
      r = run(flags(kind, { target: 'antigravity', scope: 'project', project: proj }));
      assert.equal(r.code, 0, r.out);
      assert.ok(fs.existsSync(path.join(proj, '.agents', 'skills', 'forge', 'SKILL.md')));
      assert.ok(fs.existsSync(path.join(proj, '.agents', 'workflows', 'forge.md')));

      // Uninstall removes only FORGE files.
      r = run(flags(kind, { target: 'all', uninstall: true }));
      assert.equal(r.code, 0, r.out);
      assert.ok(!fs.existsSync(path.join(claude, 'skills', 'forge')));
      assert.equal(fs.readdirSync(path.join(claude, 'agents')).filter((f) => f.startsWith('forge-')).length, 0);
      assert.ok(!fs.existsSync(path.join(ag, 'skills', 'forge')));
      assert.equal(fs.readFileSync(path.join(claude, 'skills', 'my-own-skill', 'SKILL.md'), 'utf8'), 'mine', 'user skill preserved');
      fs.rmSync(proj, { recursive: true, force: true });
    } finally { fs.rmSync(home, { recursive: true, force: true }); }
  });
}
