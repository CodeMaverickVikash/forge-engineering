import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inventory, toMarkdown } from '../../skills/forge-skill-discovery/scripts/skill-inventory.mjs';
import { classifyLicenseText, categorize, checkLocal, checkGitHub, normalizeDeclared, parseGitHubUrl, findSkillPathOnGitHub } from '../../skills/forge-skill-discovery/scripts/license-check.mjs';
import { installSkill, toMarkdown as toInstallMarkdown } from '../../skills/forge-skill-discovery/scripts/install-skill.mjs';
import { parseFrontmatter, nodeSatisfies } from '../../skills/forge-skill-discovery/scripts/lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPTS = path.join(ROOT, 'skills', 'forge-skill-discovery', 'scripts');
const SECRET = 'sk-test-SUPERSECRET-0123456789';

// Clean env: no real config dirs leak in, no network, no CLI probe.
const ENV = { ...process.env, FORGE_SKIP_CLI_PROBE: '1' };
delete ENV.CLAUDE_CONFIG_DIR; delete ENV.FORGE_ANTIGRAVITY_HOME; delete ENV.GITHUB_TOKEN;

const MIT = 'MIT License\r\n\r\nCopyright (c) 2025 Someone\r\n\r\nPermission is hereby granted, free of charge, to any person obtaining a copy\r\nof this software and associated documentation files (the "Software"), to deal\r\nin the Software without restriction...\r\n';
const APACHE = '\n                                 Apache License\n                           Version 2.0, January 2004\n                        http://www.apache.org/licenses/\n\n   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION\n';
const GPL3 = '                    GNU GENERAL PUBLIC LICENSE\n                       Version 3, 29 June 2007\n\n Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>\n Everyone is permitted to copy and distribute verbatim copies\n';
const BUSL = 'License text copyright (c) 2020 MariaDB Corporation Ab, All Rights Reserved.\n"Business Source License" is a trademark of MariaDB Corporation Ab.\n\nParameters\n\nLicensor: Example\nLicensed Work: Example\n';

const tmpdir = (p) => fs.mkdtempSync(path.join(os.tmpdir(), `forge-sd-${p}-`));
const write = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
const skillMd = (name, desc = `The ${name} skill does a useful thing for tests and fixtures.`, extra = '') => `---\nname: ${name}\ndescription: ${desc}\n${extra}---\n\n# ${name}\n`;
const run = (script, args) => spawnSync(process.execPath, [path.join(SCRIPTS, script), ...args], { encoding: 'utf8', env: ENV });

function sandbox() {
  const base = tmpdir('sb');
  const home = path.join(base, 'home'); const project = path.join(base, 'project');
  fs.mkdirSync(home, { recursive: true }); fs.mkdirSync(project, { recursive: true });
  return { base, home, project, cleanup: () => fs.rmSync(base, { recursive: true, force: true }) };
}

// A source "repo" with a repo-level LICENSE and several skills.
function sourceRepo(repoLicense = MIT) {
  const dir = tmpdir('src');
  if (repoLicense) write(path.join(dir, 'LICENSE'), repoLicense);
  write(path.join(dir, 'skills', 'good-skill', 'SKILL.md'), skillMd('good-skill'));
  write(path.join(dir, 'skills', 'good-skill', 'references', 'notes.md'), '# notes\n');
  write(path.join(dir, 'skills', 'busl-skill', 'SKILL.md'), skillMd('busl-skill'));
  write(path.join(dir, 'skills', 'busl-skill', 'LICENSE'), BUSL);
  write(path.join(dir, 'skills', 'forge-evil', 'SKILL.md'), skillMd('forge-evil'));
  write(path.join(dir, 'skills', 'no-skill-md', 'README.md'), '# not a skill\n');
  write(path.join(dir, 'skills', 'bad-frontmatter', 'SKILL.md'), '# no frontmatter here\n');
  return dir;
}

// ---------------- inventory ----------------
test('inventory finds skills in all four locations, detects duplicates and reads MCP names without leaking values', () => {
  const sb = sandbox();
  try {
    write(path.join(sb.home, '.claude', 'skills', 'alpha', 'SKILL.md'), skillMd('alpha', 'Alpha skill for inventory tests; deliberately long description '.repeat(4), 'license: MIT\n'));
    write(path.join(sb.home, '.claude', 'skills', 'find-skills', 'SKILL.md'), skillMd('find-skills'));
    write(path.join(sb.home, '.claude', 'agents', 'helper.md'), '---\nname: helper\ndescription: Helper agent.\n---\nbody\n');
    write(path.join(sb.project, '.claude', 'skills', 'beta', 'SKILL.md'), skillMd('beta'));
    write(path.join(sb.home, '.gemini', 'config', 'skills', 'alpha', 'SKILL.md'), skillMd('alpha'));
    write(path.join(sb.project, '.agents', 'skills', 'gamma', 'SKILL.md'), skillMd('gamma'));
    write(path.join(sb.project, '.agents', 'skills', 'forge-core', 'SKILL.md'), skillMd('forge-core'));
    write(path.join(sb.project, '.agent', 'skills', 'legacy-one', 'SKILL.md'), skillMd('legacy-one'));
    write(path.join(sb.home, '.claude', 'plugins', 'installed_plugins.json'), JSON.stringify({ version: 2, plugins: { 'demo@market': [{ scope: 'user' }] } }));
    write(path.join(sb.project, '.mcp.json'), JSON.stringify({ mcpServers: { projsrv: { command: 'node', args: ['--token', SECRET], env: { API_KEY: SECRET } } } }));
    const projKey = sb.project.split(path.sep).join('/');
    write(path.join(sb.home, '.claude.json'), JSON.stringify({
      mcpServers: { usersrv: { type: 'http', url: `https://example.invalid/?key=${SECRET}`, headers: { Authorization: `Bearer ${SECRET}` } } },
      projects: { [projKey]: { mcpServers: { localsrv: { command: 'x', env: { TOKEN: SECRET } } } } }
    }));
    write(path.join(sb.home, '.gemini', 'config', 'mcp_config.json'), JSON.stringify({ mcpServers: { agsrv: { env: { K: SECRET } } } }));
    write(path.join(sb.project, '.agents', 'mcp_config.json'), JSON.stringify({ mcpServers: { agproj: { args: [SECRET] } } }));

    const inv = inventory({ home: sb.home, project: sb.project, env: ENV });
    const at = (loc) => inv.skills.filter((s) => s.location === loc).map((s) => s.name).sort();
    assert.deepEqual(at('claude-user'), ['alpha', 'find-skills']);
    assert.deepEqual(at('claude-project'), ['beta']);
    assert.deepEqual(at('antigravity-user'), ['alpha']);
    assert.deepEqual(at('antigravity-project'), ['forge-core', 'gamma']);
    assert.deepEqual(at('antigravity-project-legacy'), ['legacy-one']);
    const alpha = inv.skills.find((s) => s.name === 'alpha' && s.location === 'claude-user');
    assert.ok(alpha.description.length <= 120, 'description truncated');
    assert.equal(alpha.license, 'MIT');
    assert.equal(inv.skills.find((s) => s.name === 'forge-core').forgeManaged, true);
    assert.equal(alpha.forgeManaged, false);
    assert.deepEqual(inv.duplicates, [{ name: 'alpha', locations: ['claude-user', 'antigravity-user'] }]);
    assert.deepEqual(inv.agents.map((a) => a.name), ['helper']);
    assert.deepEqual(inv.plugins, ['demo@market']);
    assert.deepEqual(inv.mcpServers.flatMap((m) => m.servers).sort(), ['agproj', 'agsrv', 'localsrv', 'projsrv', 'usersrv']);
    assert.deepEqual(inv.discoveryTools.skills.map((s) => s.name), ['find-skills']);
    assert.equal(inv.discoveryTools.skillsCli.checked, false);

    const json = JSON.stringify(inv); const md = toMarkdown(inv);
    for (const out of [json, md]) assert.ok(!out.includes(SECRET) && !out.includes('SUPERSECRET'), 'secret value leaked');
    assert.ok(md.split('\n').length <= 60, 'markdown stays compact');

    // CLI: same guarantees, both output modes, exit 0.
    for (const args of [[], ['--json']]) {
      const r = run('skill-inventory.mjs', ['--home', sb.home, '--project', sb.project, ...args]);
      assert.equal(r.status, 0, r.stderr);
      assert.ok(!r.stdout.includes('SUPERSECRET'));
      assert.match(r.stdout, /usersrv/);
    }
    assert.equal(run('skill-inventory.mjs', ['--bogus']).status, 2);
  } finally { sb.cleanup(); }
});

test('inventory honours CLAUDE_CONFIG_DIR and reads forge lock records', () => {
  const sb = sandbox();
  try {
    const cfg = path.join(sb.base, 'cfg');
    write(path.join(cfg, 'skills', 'delta', 'SKILL.md'), skillMd('delta'));
    write(path.join(cfg, 'forge-skills.lock.json'), JSON.stringify({ version: 1, skills: [{ name: 'delta', source: 'x', license: { spdx: 'MIT' }, target: 'claude', scope: 'user', approval: 'yes' }] }));
    const inv = inventory({ home: sb.home, project: sb.project, env: { ...ENV, CLAUDE_CONFIG_DIR: cfg } });
    const delta = inv.skills.find((s) => s.name === 'delta');
    assert.equal(delta.location, 'claude-user');
    assert.equal(delta.forgeManaged, true);
    assert.equal(delta.installedByForge, true);
    assert.deepEqual(inv.forgeManaged.map((f) => f.name), ['delta']);
  } finally { sb.cleanup(); }
});

// ---------------- license classification ----------------
test('classifyLicenseText recognises common licenses (CRLF tolerant)', () => {
  assert.equal(classifyLicenseText(MIT), 'MIT');
  assert.equal(classifyLicenseText(APACHE), 'Apache-2.0');
  assert.equal(classifyLicenseText(GPL3), 'GPL-3.0');
  assert.equal(classifyLicenseText(BUSL), 'BUSL-1.1');
  assert.equal(classifyLicenseText('Server Side Public License\nVERSION 1'), 'SSPL-1.0');
  assert.equal(classifyLicenseText('This is free and unencumbered software released into the public domain.'), 'Unlicense');
  assert.equal(classifyLicenseText('Copyright 2024 Acme. All rights reserved.'), 'LicenseRef-Proprietary');
  assert.equal(classifyLicenseText(MIT + '\n"Commons Clause" License Condition v1.0\n'), 'LicenseRef-Commons-Clause');
  assert.equal(classifyLicenseText('Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met: ... Neither the name of'), 'BSD-3-Clause');
  assert.equal(classifyLicenseText(''), 'NOASSERTION');
  assert.equal(classifyLicenseText('some random words'), 'NOASSERTION');
});

test('categorize maps SPDX ids and expressions to policy categories', () => {
  assert.equal(categorize('MIT'), 'oss-permissive');
  assert.equal(categorize('Apache-2.0'), 'oss-permissive');
  assert.equal(categorize('GPL-3.0-only'), 'oss-copyleft');
  assert.equal(categorize('MPL-2.0'), 'oss-copyleft');
  assert.equal(categorize('BUSL-1.1'), 'source-available');
  assert.equal(categorize('SSPL-1.0'), 'source-available');
  assert.equal(categorize('LicenseRef-Proprietary'), 'proprietary');
  assert.equal(categorize('NOASSERTION'), 'unverified');
  assert.equal(categorize(null), 'unverified');
  assert.equal(categorize('CC-BY-NC-4.0'), 'unverified');
  assert.equal(categorize('MIT OR Apache-2.0'), 'oss-permissive');
  assert.equal(categorize('MIT AND BUSL-1.1'), 'source-available');
  assert.equal(normalizeDeclared('Proprietary. LICENSE.txt has complete terms'), 'LicenseRef-Proprietary');
  assert.equal(normalizeDeclared('Complete terms in LICENSE.txt'), 'NOASSERTION');
  assert.equal(normalizeDeclared('Apache 2.0'), 'Apache-2.0');
});

test('license-check (local): repo license, skill-level override, none => unverified, frontmatter', () => {
  const src = sourceRepo(APACHE);
  const bare = tmpdir('bare');
  try {
    const good = checkLocal(path.join(src, 'skills', 'good-skill'));
    assert.equal(good.spdx, 'Apache-2.0'); assert.equal(good.level, 'repo'); assert.equal(good.recommendable, true);
    const busl = checkLocal(path.join(src, 'skills', 'busl-skill'));
    assert.equal(busl.spdx, 'BUSL-1.1'); assert.equal(busl.level, 'skill'); assert.equal(busl.category, 'source-available'); assert.equal(busl.recommendable, false);
    const viaPath = checkLocal(src, { path: 'skills/good-skill' });
    assert.equal(viaPath.spdx, 'Apache-2.0');
    write(path.join(bare, 'lonely', 'SKILL.md'), skillMd('lonely'));
    const none = checkLocal(path.join(bare, 'lonely'), { stopAt: bare });
    assert.equal(none.category, 'unverified'); assert.equal(none.recommendable, false);
    write(path.join(bare, 'declared', 'SKILL.md'), skillMd('declared', undefined, 'license: Proprietary. LICENSE.txt has complete terms\n'));
    const declared = checkLocal(path.join(bare, 'declared'), { stopAt: bare });
    assert.equal(declared.category, 'proprietary');
    // GPL at the repo level is copyleft and recommendable.
    const gplRepo = tmpdir('gpl'); write(path.join(gplRepo, 'COPYING'), GPL3); write(path.join(gplRepo, 's', 'SKILL.md'), skillMd('s-one'));
    const gpl = checkLocal(path.join(gplRepo, 's'));
    assert.equal(gpl.spdx, 'GPL-3.0'); assert.equal(gpl.category, 'oss-copyleft'); assert.equal(gpl.recommendable, true);
    fs.rmSync(gplRepo, { recursive: true, force: true });

    const ok = run('license-check.mjs', [path.join(src, 'skills', 'good-skill'), '--json']);
    assert.equal(ok.status, 0, ok.stderr); assert.equal(JSON.parse(ok.stdout).spdx, 'Apache-2.0');
    const refused = run('license-check.mjs', [src, '--path', 'skills/busl-skill']);
    assert.equal(refused.status, 1); assert.match(refused.stdout, /source-available/);
    assert.equal(run('license-check.mjs', []).status, 2);
  } finally { fs.rmSync(src, { recursive: true, force: true }); fs.rmSync(bare, { recursive: true, force: true }); }
});

test('license-check (GitHub) uses the API via an injected fetch: skill LICENSE beats repo license, failures are unverified', async () => {
  assert.deepEqual(parseGitHubUrl('https://github.com/acme/skills/tree/main/skills/pdf'), { owner: 'acme', repo: 'skills', ref: 'main', path: 'skills/pdf' });
  const b64 = (s) => Buffer.from(s).toString('base64');
  const routes = {
    '/repos/acme/skills': { archived: true, pushed_at: '2020-01-01T00:00:00Z', stargazers_count: 42, license: { spdx_id: 'Apache-2.0' }, default_branch: 'main', private: false },
    '/repos/acme/skills/license?ref=main': { path: 'LICENSE', license: { spdx_id: 'Apache-2.0' } },
    '/repos/acme/skills/contents/skills/pdf?ref=main': [{ type: 'file', name: 'SKILL.md', path: 'skills/pdf/SKILL.md' }, { type: 'file', name: 'LICENSE.txt', path: 'skills/pdf/LICENSE.txt' }],
    '/repos/acme/skills/contents/skills/pdf/SKILL.md?ref=main': { content: b64(skillMd('pdf', undefined, 'license: Proprietary. LICENSE.txt has complete terms\n')) },
    '/repos/acme/skills/git/trees/main?recursive=1': { tree: [{ type: 'blob', path: 'skills/pdf/SKILL.md' }, { type: 'blob', path: 'README.md' }] },
    '/repos/acme/skills/contents/skills/pdf/LICENSE.txt?ref=main': { content: b64('(c) 2025 Acme. All rights reserved. Use is governed by your agreement with Acme.') }
  };
  const seen = [];
  const fakeFetch = async (url, init) => {
    seen.push(init.headers['User-Agent']);
    const body = routes[url.replace('https://api.github.com', '')];
    return { ok: Boolean(body), status: body ? 200 : 404, headers: new Map(), json: async () => body };
  };
  const r = await checkGitHub('https://github.com/acme/skills/tree/main/skills/pdf', { fetchImpl: fakeFetch, env: {}, now: Date.parse('2026-11-01') });
  assert.equal(r.category, 'proprietary'); assert.equal(r.level, 'skill'); assert.equal(r.recommendable, false);
  assert.equal(r.maintenance.archived, true); assert.equal(r.maintenance.stars, 42); assert.match(r.maintenance.warning, /archived/);
  assert.equal(r.skill.name, 'pdf');
  assert.equal(await findSkillPathOnGitHub('https://github.com/acme/skills', 'pdf', { fetchImpl: fakeFetch, env: {} }), 'skills/pdf');
  assert.equal(await findSkillPathOnGitHub('https://github.com/acme/skills', 'nope', { fetchImpl: fakeFetch, env: {} }), null);
  assert.ok(seen.every((ua) => ua === 'forge-license-check'));
  const repoOnly = await checkGitHub('https://github.com/acme/skills/tree/main', { fetchImpl: fakeFetch, env: {} });
  assert.equal(repoOnly.spdx, 'Apache-2.0'); assert.equal(repoOnly.level, 'repo'); assert.equal(repoOnly.recommendable, true);
  const offline = await checkGitHub('https://github.com/acme/skills', { fetchImpl: async () => { throw new Error('offline'); }, env: {} });
  assert.equal(offline.category, 'unverified'); assert.equal(offline.recommendable, false);
  const limited = await checkGitHub('https://github.com/acme/skills', { fetchImpl: async () => ({ ok: false, status: 403, headers: new Map([['x-ratelimit-remaining', '0']]) }), env: {} });
  assert.equal(limited.category, 'unverified'); assert.match(limited.evidence.join(' '), /rate limit/);
});

// ---------------- install ----------------
const base = (sb, src, extra = {}) => ({ source: src, skillPath: 'skills/good-skill', target: 'both', scope: 'user', home: sb.home, project: sb.project, approval: 'Yes, install good-skill.', ...extra });
const refusal = (fn, re) => assert.throws(fn, (e) => e.exitCode === 1 && re.test(e.message));

test('install succeeds for both targets and writes lock records', () => {
  const sb = sandbox(); const src = sourceRepo(MIT);
  try {
    const res = installSkill(base(sb, src), ENV);
    assert.equal(res.name, 'good-skill'); assert.equal(res.license.spdx, 'MIT'); assert.equal(res.commit, null);
    const claudeDir = path.join(sb.home, '.claude', 'skills', 'good-skill');
    const agDir = path.join(sb.home, '.gemini', 'config', 'skills', 'good-skill');
    for (const d of [claudeDir, agDir]) {
      assert.ok(fs.existsSync(path.join(d, 'SKILL.md')));
      assert.ok(fs.existsSync(path.join(d, 'references', 'notes.md')));
    }
    for (const lockFile of [path.join(sb.home, '.claude', 'forge-skills.lock.json'), path.join(sb.home, '.gemini', 'config', 'forge-skills.lock.json')]) {
      const lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
      assert.equal(lock.version, 1); assert.equal(lock.skills.length, 1);
      const rec = lock.skills[0];
      for (const k of ['name', 'description', 'source', 'skillPath', 'ref', 'commit', 'license', 'target', 'scope', 'path', 'installedAt', 'approval']) assert.ok(k in rec, `lock record has ${k}`);
      assert.equal(rec.approval, 'Yes, install good-skill.'); assert.equal(rec.license.category, 'oss-permissive');
    }
    // Inventory sees it as installed by FORGE.
    const inv = inventory({ home: sb.home, project: sb.project, env: ENV });
    assert.equal(inv.forgeManaged.length, 2);
    assert.ok(inv.skills.filter((s) => s.name === 'good-skill').every((s) => s.installedByForge));
    // Project scope via the CLI.
    const r = run('install-skill.mjs', ['--source', src, '--skill-path', 'skills/good-skill', '--target', 'claude', '--scope', 'project', '--project', sb.project, '--home', sb.home, '--approval', 'ok go', '--json']);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(sb.project, '.claude', 'skills', 'good-skill', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(sb.project, '.claude', 'forge-skills.lock.json')));
  } finally { sb.cleanup(); fs.rmSync(src, { recursive: true, force: true }); }
});

test('install refuses: no approval, BUSL, unlicensed, overwrite, forge* name, missing/invalid SKILL.md', () => {
  const sb = sandbox(); const src = sourceRepo(MIT); const noLic = sourceRepo(null);
  try {
    refusal(() => installSkill(base(sb, src, { approval: undefined }), ENV), /approval/);
    refusal(() => installSkill(base(sb, src, { approval: '   ' }), ENV), /approval/);
    refusal(() => installSkill(base(sb, src, { skillPath: 'skills/busl-skill' }), ENV), /source-available/);
    // stopAt is not set for local sources, so keep the unlicensed repo isolated: its parent is the OS temp dir.
    refusal(() => installSkill(base(sb, noLic), ENV), /unverified/);
    refusal(() => installSkill(base(sb, src, { skillPath: 'skills/forge-evil' }), ENV), /reserved/);
    refusal(() => installSkill(base(sb, src, { skillPath: 'skills/no-skill-md' }), ENV), /no SKILL\.md/);
    refusal(() => installSkill(base(sb, src, { skillPath: 'skills/bad-frontmatter' }), ENV), /frontmatter/);
    installSkill(base(sb, src, { target: 'claude' }), ENV);
    const before = fs.readFileSync(path.join(sb.home, '.claude', 'forge-skills.lock.json'), 'utf8');
    refusal(() => installSkill(base(sb, src), ENV), /already exists/);
    assert.equal(fs.readFileSync(path.join(sb.home, '.claude', 'forge-skills.lock.json'), 'utf8'), before, 'lock untouched after refusal');
    assert.ok(!fs.existsSync(path.join(sb.home, '.gemini', 'config', 'skills', 'good-skill')), 'no partial install for the other target');
    // CLI exit codes: refusal 1, usage 2.
    const noApproval = run('install-skill.mjs', ['--source', src, '--skill-path', 'skills/good-skill', '--target', 'antigravity', '--scope', 'user', '--home', sb.home]);
    assert.equal(noApproval.status, 1); assert.match(noApproval.stderr, /REFUSED.*approval/);
    assert.equal(run('install-skill.mjs', ['--source', src, '--skill-path', 'skills/good-skill', '--target', 'nowhere', '--scope', 'user', '--approval', 'yes']).status, 2);
    assert.equal(run('install-skill.mjs', ['--source', 'not-a-dir-or-url', '--skill-path', '.', '--target', 'claude', '--scope', 'user', '--approval', 'yes']).status, 2);
  } finally { sb.cleanup(); fs.rmSync(src, { recursive: true, force: true }); fs.rmSync(noLic, { recursive: true, force: true }); }
});

test('install --dry-run writes nothing', () => {
  const sb = sandbox(); const src = sourceRepo(MIT);
  try {
    const res = installSkill(base(sb, src, { dryRun: true }), ENV);
    assert.equal(res.dryRun, true); assert.equal(res.installed.length, 2); assert.ok(res.files >= 2);
    assert.deepEqual(fs.readdirSync(sb.home), []);
    assert.deepEqual(fs.readdirSync(sb.project), []);
  } finally { sb.cleanup(); fs.rmSync(src, { recursive: true, force: true }); }
});

// ---------------- install --via skills-cli (no network, no real CLI) ----------------
const okLicense = (name = 'pdf-tools', extra = {}) => async (repoUrl, { skillPath }) => ({
  source: repoUrl, spdx: 'MIT', category: 'oss-permissive', recommendable: true, level: 'skill', evidence: ['stub'], maintenance: null,
  skillPath: skillPath.includes('/') ? skillPath : `skills/${skillPath}`, skill: { name, description: 'PDF tools skill for tests.' }, ...extra
});
const cliBase = (sb, extra = {}) => ({ via: 'skills-cli', source: 'acme/skills', skillPath: 'pdf-tools', target: 'both', scope: 'user', home: sb.home, project: sb.project, approval: 'yes install pdf-tools', ...extra });
const available = () => ({ checked: true, available: true, via: 'npx-cache', version: '1.9.0', node: '24.0.0', nodeSupportsSkillsCli: true });

test('skills-cli dry-run builds the exact non-interactive command and writes nothing', async () => {
  const sb = sandbox();
  try {
    const res = await installSkill(cliBase(sb, { ref: 'v1.2.0', dryRun: true }), ENV, { probe: available, licenseCheck: okLicense() });
    assert.equal(res.via, 'skills-cli'); assert.equal(res.dryRun, true);
    assert.match(res.command, /^DISABLE_TELEMETRY=1 /);
    assert.match(res.command, / npx --no-install skills add acme\/skills@v1\.2\.0 --skill pdf-tools -a claude-code antigravity -g -y --copy$/);
    assert.ok(!/--all\b/.test(res.command));
    assert.equal(res.installed.length, 2);
    assert.equal(res.installed[0].record.installer, 'skills-cli'); assert.equal(res.installed[0].record.cliVersion, '1.9.0');
    assert.deepEqual(fs.readdirSync(sb.home), []); assert.deepEqual(fs.readdirSync(sb.project), []);
    assert.match(toInstallMarkdown(res), /would run[\s\S]*--skill pdf-tools/);
    // Unavailable CLI + explicit CLI approval: pinned npx download, project scope (no -g), Claude only.
    const res2 = await installSkill(cliBase(sb, { target: 'claude', scope: 'project', dryRun: true, cliVersion: '1.9.0', cliApproval: 'yes, use skills 1.9.0', source: 'https://github.com/acme/skills' }), ENV, { licenseCheck: okLicense() });
    assert.match(res2.command, / npx --yes skills@1\.9\.0 add acme\/skills --skill pdf-tools -a claude-code -y --copy$/);
    assert.equal(res2.installed[0].record.cliApproval, 'yes, use skills 1.9.0');
    assert.equal(res2.cwd, sb.project.split(path.sep).join('/'));
  } finally { sb.cleanup(); }
});

test('skills-cli refuses: CLI unavailable without --cli-approval, non-GitHub source, bad license, existing target', async () => {
  const sb = sandbox();
  try {
    // FORGE_SKIP_CLI_PROBE=1 (in ENV) forces "unavailable".
    await assert.rejects(installSkill(cliBase(sb, { dryRun: true, cliVersion: '1.9.0' }), ENV, { licenseCheck: okLicense() }), (e) => e.exitCode === 1 && /cli-approval/.test(e.message));
    await assert.rejects(installSkill(cliBase(sb, { dryRun: true, cliApproval: 'ok' }), ENV, { licenseCheck: okLicense() }), (e) => e.exitCode === 1 && /cli-version/.test(e.message));
    await assert.rejects(installSkill(cliBase(sb, { source: 'https://gitlab.com/acme/skills' }), ENV, { probe: available, licenseCheck: okLicense() }), (e) => e.exitCode === 1 && /GitHub/.test(e.message));
    await assert.rejects(installSkill(cliBase(sb), ENV, { probe: available, licenseCheck: okLicense('pdf-tools', { spdx: 'BUSL-1.1', category: 'source-available', recommendable: false }) }), (e) => e.exitCode === 1 && /source-available/.test(e.message));
    await assert.rejects(installSkill(cliBase(sb), ENV, { probe: available, licenseCheck: okLicense('forge-pdf') }), (e) => e.exitCode === 1 && /reserved/.test(e.message));
    await assert.rejects(installSkill(cliBase(sb), ENV, { probe: () => ({ ...available(), nodeSupportsSkillsCli: false, node: '20.0.0' }), licenseCheck: okLicense() }), (e) => e.exitCode === 1 && /22\.20/.test(e.message));
    write(path.join(sb.home, '.claude', 'skills', 'pdf-tools', 'SKILL.md'), skillMd('pdf-tools'));
    let ran = false;
    await assert.rejects(installSkill(cliBase(sb), ENV, { probe: available, licenseCheck: okLicense(), runCli: () => { ran = true; return { status: 0 }; } }), (e) => e.exitCode === 1 && /already exists/.test(e.message));
    assert.equal(ran, false, 'CLI never runs when a target exists');
    // CLI process: refusal exit 1 before any network use; usage errors exit 2.
    const r = run('install-skill.mjs', ['--via', 'skills-cli', '--source', 'acme/skills', '--skill-path', 'pdf-tools', '--target', 'claude', '--scope', 'user', '--home', sb.home, '--approval', 'yes', '--dry-run']);
    assert.equal(r.status, 1); assert.match(r.stderr, /REFUSED.*not available/);
    const nonGh = run('install-skill.mjs', ['--via', 'skills-cli', '--source', 'https://gitlab.com/a/b', '--skill-path', 'x', '--target', 'claude', '--scope', 'user', '--home', sb.home, '--approval', 'yes']);
    assert.equal(nonGh.status, 1); assert.match(nonGh.stderr, /GitHub/);
    assert.equal(run('install-skill.mjs', ['--via', 'npm', '--source', 'a/b', '--skill-path', 'x', '--target', 'claude', '--scope', 'user', '--approval', 'yes']).status, 2);
  } finally { sb.cleanup(); }
});

test('skills-cli run: args array without shell, telemetry off, validates the installed skill, then records the lock', async () => {
  const sb = sandbox();
  try {
    const calls = [];
    const fakeCli = (cmd, args, { cwd, env }) => {
      calls.push({ cmd, args, cwd, env });
      write(path.join(sb.project, '.agents', 'skills', 'pdf-tools', 'SKILL.md'), skillMd('pdf-tools'));
      return { status: 0, stdout: 'done', stderr: '' };
    };
    const res = await installSkill(cliBase(sb, { target: 'antigravity', scope: 'project', ref: 'a'.repeat(40) }), ENV, { probe: available, licenseCheck: okLicense(), runCli: fakeCli });
    assert.equal(calls.length, 1);
    const { args, cwd, env } = calls[0];
    assert.equal(env.DISABLE_TELEMETRY, '1'); assert.equal(cwd, path.resolve(sb.project));
    const i = args.indexOf('add');
    assert.deepEqual(args.slice(i - 2), ['--no-install', 'skills', 'add', `acme/skills@${'a'.repeat(40)}`, '--skill', 'pdf-tools', '-a', 'antigravity', '-y', '--copy']);
    assert.equal(res.commit, 'a'.repeat(40));
    const lock = JSON.parse(fs.readFileSync(path.join(sb.project, '.agents', 'forge-skills.lock.json'), 'utf8'));
    assert.equal(lock.skills[0].installer, 'skills-cli'); assert.equal(lock.skills[0].cliVersion, '1.9.0'); assert.ok(!('cliApproval' in lock.skills[0]));
    // A CLI run that does not produce the skill fails and records nothing.
    await assert.rejects(installSkill(cliBase(sb, { target: 'claude', scope: 'project', skillPath: 'other' }), ENV, { probe: available, licenseCheck: okLicense('other-skill'), runCli: () => ({ status: 0 }) }), /missing/);
    assert.ok(!fs.existsSync(path.join(sb.project, '.claude', 'forge-skills.lock.json')));
    await assert.rejects(installSkill(cliBase(sb, { target: 'claude', scope: 'project', skillPath: 'other' }), ENV, { probe: available, licenseCheck: okLicense('other-skill'), runCli: () => ({ status: 1, stderr: 'boom' }) }), /exit 1.*boom/);
  } finally { sb.cleanup(); }
});

test('inventory reports the skills CLI probe shape and Node support', () => {
  const sb = sandbox();
  try {
    const cli = inventory({ home: sb.home, project: sb.project, env: ENV }).discoveryTools.skillsCli;
    assert.equal(cli.available, false); assert.equal(cli.via, null); assert.equal(cli.node, process.versions.node);
    assert.equal(typeof cli.nodeSupportsSkillsCli, 'boolean');
    assert.equal(nodeSatisfies('22.20.0'), true); assert.equal(nodeSatisfies('22.19.9'), false); assert.equal(nodeSatisfies('v24.1.0'), true); assert.equal(nodeSatisfies('18.20.0'), false);
  } finally { sb.cleanup(); }
});

test('lenient frontmatter parser handles block scalars, lists, nested keys and CRLF', () => {
  const fm = parseFrontmatter('---\r\nname: x-skill\r\ndescription: >\r\n  folded line one\r\n  line two\r\nallowed-tools:\r\n  - Read\r\n  - Grep\r\nmetadata:\r\n  version: "1.2"\r\nlicense: MIT # spdx\r\n---\r\nbody');
  assert.equal(fm.data.name, 'x-skill');
  assert.equal(fm.data.description, 'folded line one line two');
  assert.deepEqual(fm.data['allowed-tools'], ['Read', 'Grep']);
  assert.deepEqual(fm.data.metadata, { version: '1.2' });
  assert.equal(fm.data.license, 'MIT');
});
