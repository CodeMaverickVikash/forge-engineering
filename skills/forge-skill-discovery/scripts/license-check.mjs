#!/usr/bin/env node
// FORGE license check: classifies the license of ONE skill (per-skill, not just per-repo) with zero dependencies (Node >= 18).
// Usage: node license-check.mjs <local-dir | https://github.com/<owner>/<repo>[/tree/<ref>/<path>]> [--path <subdir>] [--json]
//   local dir: LICENSE*/COPYING*/LICENCE* in the skill dir, else up to 3 parent dirs (level "repo"), plus SKILL.md `license:`
//   GitHub URL: public REST API (User-Agent forge-license-check; GITHUB_TOKEN used only if set); failures => "unverified"
// Exit codes: 0 = recommendable (oss-permissive / oss-copyleft), 1 = not recommendable (policy), 2 = usage error.
// Only reads text; never executes anything from the checked source.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UsageError, parseArgs, runMain, readText, posix, isDir, isWithin, readSkillMeta, parseFrontmatter } from './lib.mjs';

export const LICENSE_FILE_RE = /^(LICEN[CS]E|COPYING)([.-][\w.-]*)?$/i;
const PERMISSIVE = ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD', 'Unlicense', 'Zlib'];
const COPYLEFT = ['GPL-2.0', 'GPL-3.0', 'LGPL-2.1', 'LGPL-3.0', 'AGPL-3.0', 'MPL-2.0', 'EPL-2.0'];
const SOURCE_AVAILABLE_RE = /^(BUSL|BSL-1\.1|SSPL|Elastic|PolyForm|Commons-Clause|LicenseRef-Commons-Clause|LicenseRef-Source-Available|LicenseRef-BUSL)/i;
const PROPRIETARY_RE = /^(LicenseRef-Proprietary|Proprietary|UNLICENSED|LicenseRef-All-Rights-Reserved)$/i;
const RANK = { 'oss-permissive': 0, 'oss-copyleft': 1, unverified: 2, 'source-available': 3, proprietary: 4 };
export const RECOMMENDABLE = new Set(['oss-permissive', 'oss-copyleft']);

// ---------- classification ----------
// Returns an SPDX id (or LicenseRef-*) for a license text, or "NOASSERTION" when it is empty or not recognised.
export function classifyLicenseText(text) {
  const t = String(text ?? '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').replace(/\s+/g, ' ').trim().toLowerCase();
  if (!t) return 'NOASSERTION';
  const head = t.slice(0, 800);
  // Source-available markers first: Commons Clause is typically appended to an OSS text.
  if (/business source license/.test(head)) return 'BUSL-1.1';
  if (/server side public license/.test(head)) return 'SSPL-1.0';
  if (/elastic license 2\.0|elastic license/.test(head)) return 'Elastic-2.0';
  if (/"commons clause"|commons clause license condition/.test(t)) return 'LicenseRef-Commons-Clause';
  const pf = head.match(/polyform ([a-z-]+?) license/);
  if (pf) return `PolyForm-${pf[1].split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('-')}-1.0.0`;
  // OSS (title-based checks use the head so that cross-references inside GPL texts do not mislead).
  if (/gnu affero general public license/.test(head)) return 'AGPL-3.0';
  if (/gnu lesser general public license/.test(head) || /gnu library general public license/.test(head)) return /version 2(\.1)?\b/.test(head) && !/version 3/.test(head) ? 'LGPL-2.1' : 'LGPL-3.0';
  if (/gnu general public license/.test(head)) return /version 3/.test(head) ? 'GPL-3.0' : /version 2/.test(head) ? 'GPL-2.0' : 'GPL-3.0';
  if (/mozilla public license,? (version )?2\.0/.test(head)) return 'MPL-2.0';
  if (/eclipse public license - v 2\.0|eclipse public license v2\.0|eclipse public license version 2\.0/.test(head)) return 'EPL-2.0';
  if (/apache license,? version 2\.0/.test(head) || /licensed under the apache license, version 2\.0/.test(t)) return 'Apache-2.0';
  if (/this is free and unencumbered software released into the public domain/.test(t)) return 'Unlicense';
  if (/permission is hereby granted, free of charge, to any person obtaining a copy/.test(t)) return 'MIT';
  if (/permission to use, copy, modify, and\/?or distribute this software for any purpose with or without fee is hereby granted/.test(t)) {
    return /provided that the above copyright notice and this permission notice appear in all copies/.test(t) ? 'ISC' : '0BSD';
  }
  if (/redistribution and use in source and binary forms, with or without modification, are permitted provided that/.test(t)) {
    return /neither the name|endorse or promote products/.test(t) ? 'BSD-3-Clause' : 'BSD-2-Clause';
  }
  if (/this software is provided 'as-is', without any express or implied warranty/.test(t) && /permission is granted to anyone to use this software for any purpose/.test(t)) return 'Zlib';
  if (/source[- ]available/.test(head)) return 'LicenseRef-Source-Available';
  if (/all rights reserved|proprietary|confidential|governed by your agreement with/.test(t)) return 'LicenseRef-Proprietary';
  return 'NOASSERTION';
}

const baseId = (id) => String(id).trim().replace(/\+$/, '').replace(/-(only|or-later)$/i, '');

// Maps an SPDX id or expression to a policy category.
export function categorize(spdx) {
  if (spdx == null) return 'unverified';
  const s = String(spdx).trim().replace(/^\((.*)\)$/, '$1');
  if (!s || /^(NOASSERTION|NONE|OTHER)$/i.test(s)) return 'unverified';
  if (/\s+OR\s+/i.test(s)) return pickBest(s.split(/\s+OR\s+/i).map(categorize));
  if (/\s+AND\s+/i.test(s)) return pickWorst(s.split(/\s+AND\s+/i).map(categorize));
  const id = baseId(s.split(/\s+WITH\s+/i)[0]);
  if (PERMISSIVE.some((p) => p.toLowerCase() === id.toLowerCase())) return 'oss-permissive';
  if (COPYLEFT.some((p) => p.toLowerCase() === id.toLowerCase())) return 'oss-copyleft';
  if (SOURCE_AVAILABLE_RE.test(id)) return 'source-available';
  if (PROPRIETARY_RE.test(id)) return 'proprietary';
  return 'unverified';
}
const pickBest = (cats) => cats.reduce((a, b) => (RANK[b] < RANK[a] ? b : a));
const pickWorst = (cats) => cats.reduce((a, b) => (RANK[b] > RANK[a] ? b : a));

// Normalises a free-form frontmatter `license:` value (e.g. "MIT", "Apache 2.0", "Proprietary. LICENSE.txt has complete terms").
export function normalizeDeclared(value) {
  if (value == null) return 'NOASSERTION';
  const v = String(value).trim();
  if (!v) return 'NOASSERTION';
  if (categorize(v) !== 'unverified') {
    const canon = [...PERMISSIVE, ...COPYLEFT].find((p) => p.toLowerCase() === baseId(v).toLowerCase());
    return canon ? (v.toLowerCase() === canon.toLowerCase() ? canon : v) : v;
  }
  const l = v.toLowerCase();
  if (/proprietary|all rights reserved/.test(l)) return 'LicenseRef-Proprietary';
  if (/business source/.test(l)) return 'BUSL-1.1';
  if (/source[- ]available/.test(l)) return 'LicenseRef-Source-Available';
  if (/^mit( license)?$/.test(l)) return 'MIT';
  if (/^apache( license)?[ ,-]*(v(ersion)?\s*)?2(\.0)?$/.test(l)) return 'Apache-2.0';
  if (/^(gnu )?a?gpl ?v?3/.test(l)) return l.startsWith('agpl') ? 'AGPL-3.0' : 'GPL-3.0';
  if (/^(gnu )?gpl ?v?2/.test(l)) return 'GPL-2.0';
  if (/^bsd[- ]3/.test(l)) return 'BSD-3-Clause';
  if (/^bsd[- ]2/.test(l)) return 'BSD-2-Clause';
  if (/^(the )?unlicense$/.test(l)) return 'Unlicense';
  return 'NOASSERTION';
}

// ---------- resolution (shared by local and GitHub) ----------
// skillFiles: [{ file, spdx }] in the skill dir; declared: frontmatter license or null; upper: { file, spdx } found above the skill dir.
export function resolveLicense({ skillFiles = [], declared = null, upper = null, evidence = [] }) {
  const ev = [...evidence];
  for (const f of skillFiles) ev.push(`skill file ${f.file}: ${f.spdx}`);
  const decl = declared ? normalizeDeclared(declared) : null;
  if (declared) ev.push(`SKILL.md license: "${String(declared).slice(0, 80)}" => ${decl}`);
  if (upper) ev.push(`repo file ${upper.file}: ${upper.spdx}`);
  let spdx = 'NOASSERTION'; let level = null;
  const recognised = skillFiles.filter((f) => f.spdx !== 'NOASSERTION');
  if (skillFiles.length) {
    level = 'skill';
    if (recognised.length) {
      const cats = recognised.map((f) => categorize(f.spdx));
      const allOss = cats.every((c) => RECOMMENDABLE.has(c));
      const ids = [...new Set(recognised.map((f) => f.spdx))];
      spdx = allOss ? ids.join(' OR ') : recognised[cats.indexOf(pickWorst(cats))].spdx;
      if (ids.length > 1) ev.push(allOss ? 'multiple OSS license files: treated as alternatives' : 'mixed license files: most restrictive applies');
    } else ev.push('skill-level license file not recognised: repo license does not apply to this skill');
    if (decl && decl !== 'NOASSERTION' && RANK[categorize(decl)] > RANK[categorize(spdx)]) { ev.push('SKILL.md declares a more restrictive license: it applies'); spdx = decl; }
  } else if (decl && decl !== 'NOASSERTION') {
    if (upper && upper.spdx !== 'NOASSERTION') {
      if (RANK[categorize(upper.spdx)] > RANK[categorize(decl)]) { spdx = upper.spdx; level = 'repo'; ev.push('repo license is more restrictive than the SKILL.md declaration: it applies'); }
      else { spdx = decl; level = 'skill'; }
    } else if (!RECOMMENDABLE.has(categorize(decl))) { spdx = decl; level = 'skill'; }
    else ev.push('SKILL.md declares an OSS license but no license text was found: unverified');
  } else if (upper) { spdx = upper.spdx; level = 'repo'; }
  else ev.push('no LICENSE/COPYING/LICENCE file found');
  const category = categorize(spdx);
  return { spdx, category, recommendable: RECOMMENDABLE.has(category), level, evidence: ev };
}

const licenseFilesIn = (dir) => {
  try { return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && LICENSE_FILE_RE.test(e.name)).map((e) => e.name).sort(); } catch { return []; }
};

// Local directory check. opts.path: subdir of dir holding the skill; opts.stopAt: never look above this dir.
export function checkLocal(dir, opts = {}) {
  const root = path.resolve(dir);
  const skillDir = opts.path ? path.resolve(root, opts.path) : root;
  if (!isDir(skillDir)) throw new UsageError(`not a directory: ${skillDir}`);
  const stopAt = opts.stopAt ? path.resolve(opts.stopAt) : (opts.path ? root : null);
  if (stopAt && !isWithin(skillDir, stopAt)) throw new UsageError(`skill path escapes the source root: ${opts.path}`);
  const classifyFile = (d, f) => ({ file: posix(path.relative(skillDir, path.join(d, f))) || f, spdx: classifyLicenseText(readText(path.join(d, f), 256 * 1024) ?? '') });
  const skillFiles = licenseFilesIn(skillDir).map((f) => classifyFile(skillDir, f));
  let upper = null;
  if (!skillFiles.length) {
    let cur = skillDir;
    for (let i = 0; i < (opts.maxUp ?? 3); i++) {
      const parent = path.dirname(cur);
      if (parent === cur || (stopAt && !isWithin(parent, stopAt))) break;
      cur = parent;
      const found = licenseFilesIn(cur).map((f) => classifyFile(cur, f));
      if (found.length) { upper = found.find((f) => f.spdx !== 'NOASSERTION') || found[0]; break; }
    }
  }
  const meta = readSkillMeta(skillDir);
  const res = resolveLicense({ skillFiles, declared: meta.license, upper });
  return { source: posix(skillDir), ...res, maintenance: null };
}

// ---------- GitHub ----------
export function parseGitHubUrl(url) {
  const m = String(url).trim().match(/^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/(?:tree|blob)\/([^/]+)(?:\/(.*?))?)?\/?$/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2], ref: m[3] ? decodeURIComponent(m[3]) : null, path: m[4] ? decodeURIComponent(m[4]).replace(/\/SKILL\.md$/i, '') : null };
}

class Unverified extends Error {}

async function ghGet(apiPath, { fetchImpl, env }) {
  const headers = { 'User-Agent': 'forge-license-check', Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  let res;
  try { res = await fetchImpl(`https://api.github.com${apiPath}`, { headers, signal: AbortSignal.timeout(15000) }); }
  catch (e) { throw new Unverified(`network error: ${e && e.message ? e.message : e}`); }
  const remaining = res.headers && typeof res.headers.get === 'function' ? res.headers.get('x-ratelimit-remaining') : null;
  if (res.status === 429 || (res.status === 403 && remaining === '0')) throw new Unverified('GitHub API rate limit reached (set GITHUB_TOKEN or retry later)');
  if (res.status === 404) return null;
  if (!res.ok) throw new Unverified(`GitHub API ${apiPath} returned HTTP ${res.status}`);
  try { return await res.json(); } catch { throw new Unverified(`GitHub API ${apiPath} returned invalid JSON`); }
}
const b64 = (s) => Buffer.from(String(s || ''), 'base64').toString('utf8');
const encPath = (p) => p.split('/').filter(Boolean).map(encodeURIComponent).join('/');

export async function checkGitHub(url, opts = {}) {
  const gh = parseGitHubUrl(url);
  if (!gh) throw new UsageError(`not a GitHub repository URL: ${url}`);
  const ctx = { fetchImpl: opts.fetchImpl || globalThis.fetch, env: opts.env || process.env };
  const sub = (opts.path ?? gh.path ?? '').replace(/^\/+|\/+$/g, '');
  const refQ = gh.ref ? `?ref=${encodeURIComponent(gh.ref)}` : '';
  const base = `/repos/${encodeURIComponent(gh.owner)}/${encodeURIComponent(gh.repo)}`;
  const source = `https://github.com/${gh.owner}/${gh.repo}${gh.ref || sub ? `/tree/${gh.ref || 'HEAD'}${sub ? '/' + sub : ''}` : ''}`;
  let maintenance = null;
  try {
    const meta = await ghGet(base, ctx);
    if (!meta) return { source, spdx: 'NOASSERTION', category: 'unverified', recommendable: false, level: null, evidence: ['repository not found or not public'], maintenance };
    maintenance = maintenanceOf(meta, opts.now);
    const evidence = [`repo license (GitHub): ${meta.license?.spdx_id ?? 'none'}`];
    if (meta.private) return { source, spdx: 'NOASSERTION', category: 'unverified', recommendable: false, level: null, evidence: [...evidence, 'repository is private: source is not public'], maintenance };
    let upper = null;
    const lic = await ghGet(`${base}/license${refQ}`, ctx);
    if (lic) {
      let spdx = lic.license?.spdx_id || 'NOASSERTION';
      if (spdx === 'NOASSERTION' && lic.content) spdx = classifyLicenseText(b64(lic.content));
      upper = { file: lic.path || 'LICENSE', spdx };
    }
    const skillFiles = []; let declared = null; let skill = null;
    if (sub) {
      const dirs = [sub]; let p = sub;
      for (let i = 0; i < 3 && p.includes('/'); i++) { p = p.slice(0, p.lastIndexOf('/')); dirs.push(p); }
      for (const [i, d] of dirs.entries()) {
        const list = await ghGet(`${base}/contents/${encPath(d)}${refQ}`, ctx);
        if (i === 0 && !Array.isArray(list)) return { source, spdx: 'NOASSERTION', category: 'unverified', recommendable: false, level: null, evidence: [...evidence, `path not found: ${sub}`], maintenance };
        if (!Array.isArray(list)) continue;
        if (i === 0) {
          const sk = list.find((f) => f.type === 'file' && /^SKILL\.md$/i.test(f.name));
          if (sk) { const f = await ghGet(`${base}/contents/${encPath(sk.path)}${refQ}`, ctx); const fm = parseFrontmatter(b64(f?.content)); if (fm.data && typeof fm.data.license === 'string') declared = fm.data.license; if (fm.data) skill = { name: typeof fm.data.name === 'string' ? fm.data.name.trim() : '', description: typeof fm.data.description === 'string' ? fm.data.description.trim() : '' }; }
        }
        const files = list.filter((f) => f.type === 'file' && LICENSE_FILE_RE.test(f.name));
        if (!files.length) continue;
        const classified = [];
        for (const f of files) { const c = await ghGet(`${base}/contents/${encPath(f.path)}${refQ}`, ctx); classified.push({ file: f.path, spdx: classifyLicenseText(b64(c?.content)) }); }
        if (i === 0) skillFiles.push(...classified); else upper = classified.find((f) => f.spdx !== 'NOASSERTION') || classified[0];
        break;
      }
    }
    return { source, ...resolveLicense({ skillFiles, declared, upper, evidence }), maintenance, ...(sub ? { skill } : {}) };
  } catch (e) {
    if (!(e instanceof Unverified)) throw e;
    return { source, spdx: 'NOASSERTION', category: 'unverified', recommendable: false, level: null, evidence: [e.message], maintenance };
  }
}

// Finds the repo path of a skill by name (the unique <...>/<name>/SKILL.md in the tree) via the git trees API.
// Returns the unique path, or null when not found / ambiguous / offline.
export async function findSkillPathOnGitHub(url, name, opts = {}) {
  const gh = parseGitHubUrl(url);
  if (!gh) return null;
  const ctx = { fetchImpl: opts.fetchImpl || globalThis.fetch, env: opts.env || process.env };
  const base = `/repos/${encodeURIComponent(gh.owner)}/${encodeURIComponent(gh.repo)}`;
  try {
    let ref = opts.ref || gh.ref;
    if (!ref) { const meta = await ghGet(base, ctx); ref = meta?.default_branch; }
    if (!ref) return null;
    const tree = await ghGet(`${base}/git/trees/${encodeURIComponent(ref)}?recursive=1`, ctx);
    const hits = (tree?.tree || []).filter((e) => e.type === 'blob' && (e.path === `${name}/SKILL.md` || e.path.endsWith(`/${name}/SKILL.md`)));
    return hits.length === 1 ? hits[0].path.slice(0, -'/SKILL.md'.length) : null;
  } catch (e) { if (e instanceof Unverified) return null; throw e; }
}

export function maintenanceOf(meta, now = Date.now()) {
  const lastPush = meta.pushed_at || null;
  const warnings = [];
  if (meta.archived) warnings.push('repository is archived');
  if (lastPush) {
    const months = Math.floor((now - Date.parse(lastPush)) / (30.44 * 24 * 3600 * 1000));
    if (months > 18) warnings.push(`last push ${months} months ago`);
  }
  return { archived: Boolean(meta.archived), lastPush, stars: meta.stargazers_count ?? null, warning: warnings.length ? warnings.join('; ') : null };
}

export async function licenseCheck(source, opts = {}) {
  if (/^https?:\/\//i.test(source)) return checkGitHub(source, opts);
  return checkLocal(source, opts);
}

export function toMarkdown(r) {
  const L = [`License check: ${r.source}`];
  L.push(`- license: ${r.spdx} | category: ${r.category} | level: ${r.level ?? 'none'} | recommendable: ${r.recommendable ? 'yes' : 'NO'}`);
  for (const e of r.evidence.slice(0, 8)) L.push(`  - ${e}`);
  if (r.maintenance) {
    const m = r.maintenance;
    L.push(`- maintenance: archived ${m.archived ? 'yes' : 'no'}, last push ${m.lastPush ?? 'unknown'}, stars ${m.stars ?? '?'}${m.warning ? ` | WARNING: ${m.warning}` : ''}`);
  }
  if (!r.recommendable) L.push('- policy: not installable (only oss-permissive and oss-copyleft are recommendable)');
  return L.join('\n');
}

const USAGE = 'Usage: node license-check.mjs <local-dir | https://github.com/<owner>/<repo>[/tree/<ref>/<path>]> [--path <subdir>] [--json]';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runMain('license-check', async () => {
    const { flags, positional } = parseArgs(process.argv.slice(2), { '--path': 'string', '--json': 'bool' });
    if (flags.help) { console.log(USAGE); return 0; }
    if (positional.length !== 1) throw new UsageError(`expected exactly one source\n${USAGE}`);
    const r = await licenseCheck(positional[0], { path: flags.path });
    console.log(flags.json ? JSON.stringify(r, null, 2) : toMarkdown(r));
    return r.recommendable ? 0 : 1;
  });
}
