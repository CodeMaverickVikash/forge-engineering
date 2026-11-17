#!/usr/bin/env node
// FORGE skill inventory: what skills, agents, plugins and MCP servers are already installed (zero dependencies, Node >= 18).
// Usage: node skill-inventory.mjs [--project <dir>] [--home <dir>] [--json]
//   default output: compact Markdown (names only)  |  --json: full JSON (names, short descriptions, paths, licenses)
// Scans Claude Code (user + project), Claude plugins, Antigravity (user + project, incl. legacy dirs) and MCP configs.
// MCP configs are read for server NAMES only: env, args, headers and url values are never output.
// Env: CLAUDE_CONFIG_DIR, FORGE_ANTIGRAVITY_HOME (root overrides); FORGE_SKIP_CLI_PROBE=1 skips the skills CLI probe (reported unavailable).
// skills CLI probe: `skills --version` on PATH, then `npx --no-install skills --version` (never downloads); also reports Node >= 22.20.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UsageError, parseArgs, runMain, posix, isDir, readJson, roots, readSkillMeta, parseFrontmatter, readText, LOCK_FILE, oneLine, listLine, probeSkillsCli } from './lib.mjs';

const DISCOVERY_RE = /find-skills|skill-?(finder|discovery|search)/i;

function listSkills(dir, location, managedNames) {
  if (!isDir(dir)) return [];
  const out = [];
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (!(e.isDirectory() || (e.isSymbolicLink() && isDir(p)))) continue;
    const meta = readSkillMeta(p);
    if (!meta.exists) continue;
    const name = meta.name || e.name;
    out.push({
      name, description: oneLine(meta.description, 120), location, path: posix(p),
      forgeManaged: /^forge(-|$)/.test(name) || managedNames.has(name), installedByForge: managedNames.has(name), license: meta.license
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function listAgents(dir, location) {
  if (!isDir(dir)) return [];
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  return entries.filter((e) => e.isFile() && e.name.endsWith('.md')).map((e) => {
    const fm = parseFrontmatter(readText(path.join(dir, e.name), 256 * 1024) ?? '');
    const name = fm.data && typeof fm.data.name === 'string' && fm.data.name.trim() ? fm.data.name.trim() : e.name.slice(0, -3);
    return { name, description: oneLine(fm.data?.description, 120), location, path: posix(path.join(dir, e.name)) };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

// Names only: Object.keys of the mcpServers map; values (command, args, env, headers, url) are never copied.
const serverNames = (obj) => (obj && typeof obj === 'object' && !Array.isArray(obj) ? Object.keys(obj).sort() : []);
const normProj = (p) => { let s = String(p).replace(/\\/g, '/').replace(/\/+$/, ''); if (process.platform === 'win32') s = s.toLowerCase(); return s; };

function mcpInventory(r, env) {
  const out = [];
  const add = (source, file, names) => { if (names.length) out.push({ source, file: posix(file), servers: names }); };
  const projMcp = path.join(r.project, '.mcp.json');
  add('project .mcp.json', projMcp, serverNames(readJson(projMcp)?.mcpServers));
  const claudeJsons = [path.join(r.home, '.claude.json')];
  if (env.CLAUDE_CONFIG_DIR) claudeJsons.push(path.join(r.claudeUser, '.claude.json'));
  for (const f of [...new Set(claudeJsons)]) {
    const cj = readJson(f, 64 * 1024 * 1024);
    if (!cj) continue;
    add('claude user (~/.claude.json)', f, serverNames(cj.mcpServers));
    const want = normProj(r.project);
    for (const [k, v] of Object.entries(cj.projects || {})) if (normProj(k) === want) add('claude local for this project (~/.claude.json)', f, serverNames(v?.mcpServers));
  }
  const agUser = path.join(r.agUser, 'mcp_config.json');
  add('antigravity user', agUser, serverNames(readJson(agUser)?.mcpServers));
  const agProj = path.join(r.agProject, 'mcp_config.json');
  add('antigravity project', agProj, serverNames(readJson(agProj)?.mcpServers));
  return out;
}

function pluginNames(r) {
  const f = path.join(r.claudeUser, 'plugins', 'installed_plugins.json');
  const data = readJson(f, 16 * 1024 * 1024);
  if (!data) return [];
  const p = data.plugins ?? data;
  if (Array.isArray(p)) return p.map((x) => (typeof x === 'string' ? x : x?.name)).filter(Boolean).sort();
  return p && typeof p === 'object' ? Object.keys(p).filter((k) => k !== 'version').sort() : [];
}

function readLockFile(file) {
  const data = readJson(file);
  if (!data || !Array.isArray(data.skills)) return [];
  return data.skills.map((s) => ({
    name: s.name, source: s.source, skillPath: s.skillPath, ref: s.ref ?? null, commit: s.commit ?? null, license: s.license ?? null,
    target: s.target, scope: s.scope, path: s.path, installedAt: s.installedAt, lockFile: posix(file)
  }));
}

export function inventory({ home, project, env = process.env } = {}) {
  const r = roots({ home, project, env });
  const sameProjectAsUser = (a, b) => normProj(a) === normProj(b);
  const lockRoots = { 'claude-user': r.claudeUser, 'claude-project': r.claudeProject, 'antigravity-user': r.agUser, 'antigravity-project': r.agProject };
  const forgeManaged = [];
  const lockNames = {};
  for (const [loc, root] of Object.entries(lockRoots)) {
    if (loc.endsWith('-project') && sameProjectAsUser(root, lockRoots[loc.replace('-project', '-user')])) continue;
    const recs = readLockFile(path.join(root, LOCK_FILE));
    forgeManaged.push(...recs);
    lockNames[loc] = new Set(recs.map((x) => x.name));
  }
  const locations = [
    ['claude-user', path.join(r.claudeUser, 'skills'), path.join(r.claudeUser, 'agents'), 'claude-user'],
    ['claude-project', path.join(r.claudeProject, 'skills'), path.join(r.claudeProject, 'agents'), 'claude-project'],
    ['antigravity-user', path.join(r.agUser, 'skills'), path.join(r.agUser, 'agents'), 'antigravity-user'],
    ['antigravity-user-legacy', path.join(r.home, '.gemini', 'antigravity', 'skills'), null, null],
    ['antigravity-project', path.join(r.agProject, 'skills'), path.join(r.agProject, 'agents'), 'antigravity-project'],
    ['antigravity-project-legacy', path.join(r.project, '.agent', 'skills'), null, null]
  ];
  const skills = []; const agents = []; const scanned = []; const seenDirs = new Set();
  for (const [loc, skillDir, agentDir, lockLoc] of locations) {
    const key = normProj(skillDir);
    if (seenDirs.has(key)) continue; // e.g. --project equal to --home
    seenDirs.add(key);
    const s = listSkills(skillDir, loc, lockNames[lockLoc] || new Set());
    const a = agentDir ? listAgents(agentDir, loc) : [];
    skills.push(...s); agents.push(...a);
    scanned.push({ location: loc, skillsDir: posix(skillDir), exists: isDir(skillDir), skills: s.length, agents: a.length });
  }
  const byName = new Map();
  for (const s of skills) { if (!byName.has(s.name)) byName.set(s.name, []); byName.get(s.name).push(s.location); }
  const duplicates = [...byName].filter(([, locs]) => locs.length > 1).map(([name, locs]) => ({ name, locations: locs }));
  return {
    generatedAt: new Date().toISOString(),
    home: posix(r.home), project: posix(r.project),
    locations: scanned,
    skills, agents,
    plugins: pluginNames(r),
    mcpServers: mcpInventory(r, env),
    discoveryTools: { skills: skills.filter((s) => DISCOVERY_RE.test(s.name)).map((s) => ({ name: s.name, location: s.location })), skillsCli: probeSkillsCli(env) },
    duplicates,
    forgeManaged,
    note: 'names only: MCP env/args/headers/url values are never read into the output'
  };
}

export function toMarkdown(inv) {
  const L = [`# Skill inventory (project ${inv.project})`];
  const group = (items) => {
    const m = new Map();
    for (const x of items) { if (!m.has(x.location)) m.set(x.location, []); m.get(x.location).push(x.name); }
    return m;
  };
  const describe = (names) => {
    const forge = names.filter((n) => /^forge(-|$)/.test(n)); const other = names.filter((n) => !/^forge(-|$)/.test(n));
    return `${names.length}: ${[listLine(other, 20), forge.length ? `(+${forge.length} FORGE)` : ''].filter(Boolean).join(' ')}`;
  };
  L.push(`\n## Skills (${inv.skills.length})`);
  const sk = group(inv.skills);
  if (!sk.size) L.push('- none found');
  for (const loc of inv.locations) if (sk.has(loc.location)) L.push(`- ${loc.location} (${loc.skillsDir}): ${describe(sk.get(loc.location))}`);
  L.push(`\n## Agents (${inv.agents.length})`);
  const ag = group(inv.agents);
  if (!ag.size) L.push('- none found');
  for (const [loc, names] of ag) L.push(`- ${loc}: ${describe(names)}`);
  L.push(`\n## Claude plugins (${inv.plugins.length})${inv.plugins.length ? `: ${listLine(inv.plugins, 15)}` : ''}`);
  L.push(`\n## MCP servers (names only)`);
  if (!inv.mcpServers.length) L.push('- none found');
  for (const m of inv.mcpServers.slice(0, 8)) L.push(`- ${m.source}: ${listLine(m.servers, 15)}`);
  if (inv.mcpServers.length > 8) L.push(`- +${inv.mcpServers.length - 8} more sources`);
  L.push('\n## Discovery tools');
  const dt = inv.discoveryTools;
  L.push(`- skills: ${dt.skills.length ? dt.skills.map((s) => `${s.name} (${s.location})`).join(', ') : 'none'}`);
  const cli = dt.skillsCli;
  L.push(`- skills CLI: ${!cli.checked ? 'not probed' : cli.available ? `available via ${cli.via}${cli.version ? ` (${cli.version})` : ''}` : 'not available (running it via npx downloads it: needs the user\'s approval)'}; Node ${cli.node} ${cli.nodeSupportsSkillsCli ? 'meets' : 'is BELOW'} the CLI's >= 22.20`);
  L.push(`\n## Duplicates (${inv.duplicates.length})${inv.duplicates.length ? '' : ': none'}`);
  for (const d of inv.duplicates.slice(0, 8)) L.push(`- ${d.name}: ${d.locations.join(', ')}`);
  if (inv.duplicates.length > 8) L.push(`- +${inv.duplicates.length - 8} more`);
  L.push(`\n## Installed via FORGE (${inv.forgeManaged.length})${inv.forgeManaged.length ? '' : ': none'}`);
  for (const f of inv.forgeManaged.slice(0, 8)) L.push(`- ${f.name} (${f.target}/${f.scope}, ${f.license?.spdx ?? '?'}, ${f.commit ? f.commit.slice(0, 12) : 'local'})`);
  if (inv.forgeManaged.length > 8) L.push(`- +${inv.forgeManaged.length - 8} more`);
  return L.join('\n');
}

const USAGE = 'Usage: node skill-inventory.mjs [--project <dir>] [--home <dir>] [--json]';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runMain('skill-inventory', () => {
    const { flags, positional } = parseArgs(process.argv.slice(2), { '--project': 'string', '--home': 'string', '--json': 'bool' });
    if (flags.help) { console.log(USAGE); return 0; }
    if (positional.length) throw new UsageError(`unexpected argument ${positional[0]}\n${USAGE}`);
    if (flags.project && !isDir(flags.project)) throw new UsageError(`not a directory: ${flags.project}`);
    if (flags.home && !isDir(flags.home)) throw new UsageError(`not a directory: ${flags.home}`);
    const inv = inventory({ home: flags.home, project: flags.project });
    console.log(flags.json ? JSON.stringify(inv, null, 2) : toMarkdown(inv));
    return 0;
  });
}
