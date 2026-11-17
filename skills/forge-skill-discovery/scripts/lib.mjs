// Shared helpers for the forge-skill-discovery scripts (zero dependencies, Node >= 18).
// Self-contained on purpose: this skill is installed standalone, so nothing here imports from the FORGE repo.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ---------- errors / exit codes ----------
export class UsageError extends Error { constructor(m) { super(m); this.exitCode = 2; } }
export class PolicyRefusal extends Error { constructor(m) { super(m); this.exitCode = 1; } }

export async function runMain(name, fn) {
  try { const code = await fn(); process.exitCode = typeof code === 'number' ? code : 0; } catch (e) {
    const code = e && typeof e.exitCode === 'number' ? e.exitCode : 1;
    const kind = code === 2 ? 'usage error' : e instanceof PolicyRefusal ? 'REFUSED' : 'error';
    console.error(`${name}: ${kind}: ${e && e.message ? e.message : e}`);
    process.exitCode = code;
  }
}

// spec: { '--flag': 'bool' | 'string' }; returns { flags, positional }. Throws UsageError.
export function parseArgs(argv, spec) {
  const flags = {}; const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { flags.help = true; continue; }
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      const key = eq > 0 ? a.slice(0, eq) : a;
      const kind = spec[key];
      if (!kind) throw new UsageError(`unknown option ${key}`);
      const name = key.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      if (kind === 'bool') { if (eq > 0) throw new UsageError(`${key} takes no value`); flags[name] = true; continue; }
      let v;
      if (eq > 0) v = a.slice(eq + 1);
      else { if (i + 1 >= argv.length) throw new UsageError(`${key} needs a value`); v = argv[++i]; }
      flags[name] = v;
    } else positional.push(a);
  }
  return { flags, positional };
}

// ---------- filesystem ----------
export const posix = (p) => String(p).split(path.sep).join('/');
export const readText = (p, max = 1024 * 1024) => {
  try { const st = fs.statSync(p); if (!st.isFile() || st.size > max) return null; return fs.readFileSync(p, 'utf8'); } catch { return null; }
};
export const readJson = (p, max) => { const t = readText(p, max); if (t == null) return null; try { return JSON.parse(t.replace(/^﻿/, '')); } catch { return null; } };
export const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
export const exists = (p) => { try { fs.lstatSync(p); return true; } catch { return false; } };
export const isWithin = (child, parent) => {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
};

// ---------- agent roots (same env overrides as FORGE's installers) ----------
export function roots({ home = os.homedir(), project = process.cwd(), env = process.env } = {}) {
  return {
    home: path.resolve(home),
    project: path.resolve(project),
    claudeUser: env.CLAUDE_CONFIG_DIR ? path.resolve(env.CLAUDE_CONFIG_DIR) : path.join(path.resolve(home), '.claude'),
    claudeProject: path.join(path.resolve(project), '.claude'),
    agUser: env.FORGE_ANTIGRAVITY_HOME ? path.resolve(env.FORGE_ANTIGRAVITY_HOME) : path.join(path.resolve(home), '.gemini', 'config'),
    agProject: path.join(path.resolve(project), '.agents')
  };
}
export const LOCK_FILE = 'forge-skills.lock.json';
export const SKILL_NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const oneLine = (s, max = 120) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 3).trimEnd() + '...' : t;
};
export const listLine = (names, max = 20) => names.length > max ? `${names.slice(0, max).join(', ')} +${names.length - max} more` : names.join(', ');

// ---------- lenient YAML frontmatter ----------
// Handles what third-party SKILL.md files use in practice: scalars, quoted strings, block scalars (| >),
// "- item" and [a, b] lists, and one level of nested keys (e.g. metadata:). Never evaluates anything.
export function parseFrontmatter(text) {
  const src = String(text ?? '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  if (!/^---[ \t]*\n/.test(src)) return { data: null, errors: ['frontmatter must start with --- on line 1'] };
  const start = src.indexOf('\n') + 1;
  const m = /(^|\n)---[ \t]*(\n|$)/.exec(src.slice(start));
  if (!m) return { data: null, errors: ['unterminated frontmatter'] };
  const raw = src.slice(start, start + m.index);
  const body = src.slice(start + m.index + m[0].length);
  const lines = raw.split('\n'); const data = {}; const errors = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || /^\s*#/.test(line)) continue;
    if (/^\s/.test(line)) { errors.push(`unexpected indented line ${i + 2}`); continue; }
    const kv = line.match(/^([A-Za-z_][\w.-]*)\s*:(?:\s+(.*))?\s*$/);
    if (!kv) { errors.push(`cannot parse line ${i + 2}`); continue; }
    const key = kv[1]; const v = (kv[2] ?? '').trim();
    const block = [];
    while (i + 1 < lines.length && (!lines[i + 1].trim() || /^\s/.test(lines[i + 1]))) block.push(lines[++i]);
    while (block.length && !block[block.length - 1].trim()) block.pop();
    if (/^[|>][+-]?\d*$/.test(v)) data[key] = blockScalar(v[0], block);
    else if (v === '' || v.startsWith('#')) {
      const filled = block.filter((l) => l.trim() && !/^\s*#/.test(l));
      if (!filled.length) data[key] = '';
      else if (filled.every((l) => /^\s*-(\s|$)/.test(l))) data[key] = filled.map((l) => scalar(l.replace(/^\s*-\s*/, '')));
      else {
        const obj = {};
        for (const l of filled) { const sub = l.match(/^\s+([\w.-]+)\s*:\s*(.*)$/); if (sub) obj[sub[1]] = scalar(sub[2]); }
        data[key] = obj;
      }
    } else data[key] = scalar(block.length ? [v, ...block.map((l) => l.trim()).filter(Boolean)].join(' ') : v);
  }
  return { data, errors, body };
}

function blockScalar(kind, block) {
  const filled = block.filter((l) => l.trim());
  const indent = Math.min(...filled.map((l) => l.match(/^\s*/)[0].length), Infinity);
  const ls = block.map((l) => l.slice(Number.isFinite(indent) ? indent : 0));
  if (kind === '|') return ls.join('\n');
  return ls.reduce((acc, l) => (l.trim() ? (acc && !acc.endsWith('\n') ? `${acc} ${l.trim()}` : acc + l.trim()) : acc + '\n'), '');
}

function scalar(v) {
  let s = String(v).trim();
  if (s.startsWith('"')) { try { return JSON.parse(s.replace(/\s+#.*$/, '')); } catch { return s.replace(/^"|"$/g, ''); } }
  if (s.startsWith("'")) return s.replace(/\s+#.*$/, '').replace(/^'|'$/g, '').replace(/''/g, "'");
  s = s.replace(/\s+#.*$/, '');
  if (s.startsWith('[') && s.endsWith(']')) return s.slice(1, -1).split(',').map((x) => scalar(x)).filter((x) => x !== '');
  if (s === 'true') return true;
  if (s === 'false') return false;
  return s;
}

// Reads <dir>/SKILL.md and returns { name, description, license, valid, errors } (never executes content).
export function readSkillMeta(dir) {
  const text = readText(path.join(dir, 'SKILL.md'), 512 * 1024);
  if (text == null) return { exists: false, valid: false, errors: ['no SKILL.md'] };
  const fm = parseFrontmatter(text);
  const d = fm.data || {};
  const name = typeof d.name === 'string' ? d.name.trim() : '';
  const description = typeof d.description === 'string' ? d.description.trim() : '';
  const license = typeof d.license === 'string' && d.license.trim() ? d.license.trim() : null;
  const errors = [...(fm.errors || [])];
  if (!fm.data) errors.unshift('invalid frontmatter');
  if (!name) errors.push('frontmatter "name" missing');
  if (!description) errors.push('frontmatter "description" missing');
  return { exists: true, valid: Boolean(fm.data && name && description), name, description, license, errors };
}
