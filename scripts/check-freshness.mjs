#!/usr/bin/env node
// FORGE knowledge freshness check. Zero dependencies.
//
//   node scripts/check-freshness.mjs                  offline: review dates of references + registry
//   node scripts/check-freshness.mjs --online         also query public package registries for every
//                                                     detector signal and version mention
//   node scripts/check-freshness.mjs --mark <path>... record that you reviewed these files today
//   node scripts/check-freshness.mjs --mark all       ... or all of them
//   options: --json, --max-age-days <n>
//
// Exit 1 when something needs attention: a stale or unregistered knowledge file, or (online) a signal
// whose package is gone, deprecated or abandoned, or a reference that names an older major version.
// Only public package names are sent, and only to the public registries listed in FETCHERS.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = path.join(ROOT, 'scripts', 'freshness.json');
const REGISTRY = 'skills/forge-project-exploration/scripts/technology-registry.json';
const DAY = 86400000;

export function knowledgeFiles(root = ROOT) {
  const out = [];
  for (const s of fs.readdirSync(path.join(root, 'skills'))) {
    const dir = path.join(root, 'skills', s, 'references');
    if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) out.push(`skills/${s}/references/${f}`);
  }
  if (fs.existsSync(path.join(root, REGISTRY))) out.push(REGISTRY);
  return out.sort();
}

/** Offline check: every knowledge file has a review date, and none is older than maxAgeDays. */
export function checkReviewDates(config, files, now = Date.now()) {
  const issues = [];
  for (const f of files) {
    const d = config.reviewed?.[f];
    if (!d) { issues.push({ level: 'error', kind: 'UNREGISTERED', file: f, detail: 'no review date in scripts/freshness.json (run --mark after reviewing)' }); continue; }
    const age = Math.floor((now - Date.parse(d)) / DAY);
    if (Number.isNaN(age)) issues.push({ level: 'error', kind: 'BAD_DATE', file: f, detail: `invalid date "${d}"` });
    else if (age > config.maxAgeDays) issues.push({ level: 'error', kind: 'STALE', file: f, detail: `last reviewed ${d} (${age} days ago; limit ${config.maxAgeDays})` });
  }
  for (const f of Object.keys(config.reviewed || {})) if (!files.includes(f)) issues.push({ level: 'warn', kind: 'ORPHAN', file: f, detail: 'listed in freshness.json but the file no longer exists' });
  return issues;
}

// ---------- online ----------

const UA = { 'User-Agent': 'forge-freshness-check', Accept: 'application/json' };
const goEscape = (m) => m.replace(/[A-Z]/g, (c) => `!${c.toLowerCase()}`);
const SKIP = { pub: new Set(['flutter']) }; // SDKs, not packages

/** Each fetcher returns { version, time?, deprecated?, abandoned? } or null when the package does not exist. */
export const FETCHERS = {
  npm: async (name, get) => { const j = await get(`https://registry.npmjs.org/${name.replace('/', '%2F')}/latest`); return j && { version: j.version, deprecated: j.deprecated || null }; },
  py: async (name, get) => {
    const j = await get(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`); if (!j) return null;
    const files = j.releases?.[j.info.version] || [];
    const inactive = (j.info.classifiers || []).some((c) => /Development Status :: 7 - Inactive/.test(c));
    return { version: j.info.version, time: files[0]?.upload_time_iso_8601 || files[0]?.upload_time, deprecated: inactive ? 'classifier: Development Status 7 - Inactive' : null };
  },
  composer: async (name, get) => {
    const j = await get(`https://repo.packagist.org/p2/${name}.json`); const v = j?.packages?.[name]?.[0]; if (!v) return null;
    return { version: v.version, time: v.time, abandoned: v.abandoned ? (typeof v.abandoned === 'string' ? `use ${v.abandoned}` : 'abandoned') : null };
  },
  gem: async (name, get) => { const j = await get(`https://rubygems.org/api/v1/gems/${name}.json`); return j && { version: j.version, time: j.version_created_at }; },
  cargo: async (name, get) => { const j = await get(`https://crates.io/api/v1/crates/${name}`); return j?.crate && { version: j.crate.max_stable_version || j.crate.max_version, time: j.crate.updated_at }; },
  pub: async (name, get) => { const j = await get(`https://pub.dev/api/packages/${name}`); return j?.latest && { version: j.latest.version, time: j.latest.published, deprecated: j.isDiscontinued ? 'discontinued' : null }; },
  go: async (name, get) => {
    const at = (m) => get(`https://proxy.golang.org/${goEscape(m)}/@latest`);
    const base = await at(name); if (!base) return null;
    // Go modules move to /vN paths for new majors (v2+). The detector's substring signal still matches them,
    // so report the newest major module rather than the stale v0/v1 path.
    // "vN.x.y+incompatible" means majors up to N predate modules, so /vN+1 is the first possible module path.
    const inc = /^v(\d+)\..*\+incompatible$/.exec(base.Version);
    const start = inc && Number(inc[1]) >= 2 ? Number(inc[1]) + 1 : 2;
    if (!(await at(`${name}/v${start}`).catch(() => null))) return { version: base.Version, time: base.Time };
    let lo = start, hi = start * 2;
    while (hi <= 256 && (await at(`${name}/v${hi}`).catch(() => null))) { lo = hi; hi *= 2; }
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (await at(`${name}/v${mid}`).catch(() => null)) lo = mid; else hi = mid; }
    const top = await at(`${name}/v${lo}`);
    return { version: top.Version, time: top.Time, module: `${name}/v${lo}` };
  },
};

async function defaultGet(url) {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) });
  if (r.status === 404 || r.status === 410) return null;
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

const major = (v) => { const m = /^v?(\d+)/.exec(String(v || '')); return m ? Number(m[1]) : null; };

/** Version mentions such as "Nuxt 4" or "Next.js 15" in a reference, for technologies that point to it. */
export function versionMentions(text, techName) {
  const re = new RegExp(`\\b${techName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+v?(\\d+)(?:\\.\\d+)*\\b`, 'g');
  return [...text.matchAll(re)].map((m) => Number(m[1]));
}

async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

export async function checkOnline({ root = ROOT, config, get = defaultGet, now = Date.now() } = {}) {
  const reg = JSON.parse(fs.readFileSync(path.join(root, REGISTRY), 'utf8'));
  const signals = [];
  for (const t of reg.technologies) for (const [eco, names] of Object.entries(t.detect || {})) {
    if (!FETCHERS[eco]) continue;
    for (const name of names) {
      if (name.endsWith('*') || SKIP[eco]?.has(name)) continue;
      if (!signals.some((s) => s.eco === eco && s.name === name)) signals.push({ eco, name, techs: [] });
      signals.find((s) => s.eco === eco && s.name === name).techs.push(t);
    }
  }
  const results = await pool(signals, 8, async (s) => {
    try { return { ...s, info: await FETCHERS[s.eco](s.name, get) }; } catch (e) { return { ...s, error: e.message }; }
  });
  const issues = []; let checked = 0;
  for (const r of results) {
    const id = `${r.eco}:${r.name}`; const techs = r.techs.map((t) => t.id).join(', ');
    if (r.error) { issues.push({ level: 'warn', kind: 'UNREACHABLE', file: id, detail: `${r.error} (used by ${techs})` }); continue; }
    checked++;
    if (!r.info) { issues.push({ level: 'error', kind: 'NOT_FOUND', file: id, detail: `no such package; the detector signal for ${techs} may be renamed or removed` }); continue; }
    // A deprecated package can still be a valid signal: older projects use it. Listing it in legacySignals
    // (after adding its successor to the same technology) acknowledges that it is kept on purpose.
    const legacy = (config.legacySignals || []).includes(id);
    for (const [kind, why] of [['DEPRECATED', r.info.deprecated], ['ABANDONED', r.info.abandoned]]) {
      if (why) issues.push(legacy ? { level: 'info', kind: 'LEGACY', file: id, detail: `${kind.toLowerCase()}, kept for older projects (used by ${techs})` }
        : { level: 'error', kind, file: id, detail: `${why} (used by ${techs}). Add the successor to the registry; keep this one only as a legacy signal in freshness.json` });
    }
    if (legacy && !r.info.deprecated && !r.info.abandoned) issues.push({ level: 'warn', kind: 'LEGACY_UNNEEDED', file: id, detail: 'listed in legacySignals but no longer deprecated' });
    const age = r.info.time ? Math.floor((now - Date.parse(r.info.time)) / DAY) : null;
    if (age !== null && age > (config.inactiveAfterDays ?? 730)) issues.push({ level: 'warn', kind: 'INACTIVE', file: id, detail: `latest ${r.info.version} released ${age} days ago (used by ${techs})` });
    // Version drift: does this technology's reference name an older major than the latest release?
    for (const t of r.techs) {
      if (!t.reference || t.detect[r.eco]?.[0] !== r.name) continue; // compare against the primary signal only
      const ref = path.join(root, 'skills', t.reference);
      if (!fs.existsSync(ref)) continue;
      const latest = major(r.info.version);
      // Mentioning an older major is fine (references often contrast versions); not covering the latest is not.
      const mentions = versionMentions(fs.readFileSync(ref, 'utf8'), t.name);
      if (latest !== null && mentions.length && Math.max(...mentions) < latest) {
        issues.push({ level: 'error', kind: 'OUTDATED_MENTION', file: `skills/${t.reference}`, detail: `mentions ${t.name} ${[...new Set(mentions)].join('/')} but not ${latest}; latest ${r.name} is ${r.info.version}` });
      }
    }
  }
  return { issues, checked, total: signals.length };
}

// ---------- CLI ----------

function printIssues(issues) {
  for (const i of issues) console.log(`${i.level === 'error' ? '✖' : i.level === 'info' ? '·' : '!'} ${i.kind.padEnd(16)} ${i.file}: ${i.detail}`);
}

async function main() {
  const args = process.argv.slice(2);
  const config = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  const files = knowledgeFiles();
  const mi = args.indexOf('--mark');
  if (mi >= 0) {
    const targets = args.slice(mi + 1).filter((a) => !a.startsWith('--'));
    const list = targets.includes('all') ? files : targets.map((t) => t.replace(/\\/g, '/'));
    const today = new Date().toISOString().slice(0, 10);
    for (const f of list) { if (!files.includes(f)) { console.error(`not a knowledge file: ${f}`); process.exit(2); } config.reviewed[f] = today; }
    config.reviewed = Object.fromEntries(Object.entries(config.reviewed).sort(([a], [b]) => a.localeCompare(b)));
    fs.writeFileSync(CONFIG, JSON.stringify(config, null, 2) + '\n');
    console.log(`marked ${list.length} file(s) as reviewed on ${today}`);
    return;
  }
  const ai = args.indexOf('--max-age-days'); if (ai >= 0) config.maxAgeDays = Number(args[ai + 1]);
  const issues = checkReviewDates(config, files);
  let online = null;
  if (args.includes('--online')) { online = await checkOnline({ config }); issues.push(...online.issues); }
  const errors = issues.filter((i) => i.level === 'error').length;
  if (args.includes('--json')) console.log(JSON.stringify({ files: files.length, online: online && { checked: online.checked, total: online.total }, errors, issues }, null, 2));
  else {
    console.log(`FORGE freshness: ${files.length} knowledge files (review limit ${config.maxAgeDays} days)` + (online ? `; ${online.checked}/${online.total} package signals checked online` : '; run with --online to check package registries'));
    printIssues(issues);
    console.log(errors ? `${errors} item(s) need attention.` : 'Fresh.');
  }
  process.exit(errors ? 1 : 0);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((e) => { console.error(`check-freshness: ${e.message}`); process.exit(2); });
