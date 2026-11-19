#!/usr/bin/env node
// FORGE platform contract: what FORGE needs from a host, and how one host provides it. Zero dependencies.
//
//   node platform.mjs [--json]      print this install's host profile (<FORGE_HOME>/platform.json)
//
// The core speaks in capabilities (delegate to a subagent, ask the user, run on the strong model tier). Each
// adapter ships a profile, adapters/<host>/platform.json, that maps every capability to the host's native
// form or marks it unsupported or unverified with a fallback. The build validates the profile, copies it to
// <FORGE_HOME>/platform.json and renders core/platform.md for the orchestrator. Scripts read it at run time,
// and fall back to neutral wording when it is missing, so a broken install degrades instead of failing.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const STATUSES = ['supported', 'unsupported', 'unverified'];

/** Every capability the core relies on, with what it means. A profile must declare each one. */
export const CAPABILITIES = {
  entryCommand: 'How the user starts FORGE with a plain-language request',
  requestArguments: 'How the text after the command reaches the orchestrator',
  skillDir: 'How the orchestrator finds FORGE_HOME (its own skill folder)',
  subagents: 'Delegating to a named forge-* specialist with its own context (Mode A)',
  parallelSubagents: 'Several specialists of one wave running at the same time',
  foregroundWait: 'Waiting for a specialist or a long command inside the same turn',
  continueSubagent: 'Sending a follow-up to a specialist that already ran (delta retests)',
  perCallModel: 'Choosing the model tier for one delegation (model escalation)',
  toolRestriction: 'Enforced per-agent tool allow-lists (read-only roles)',
  gitGuardHook: 'A hook that blocks commit, push, merge and PR commands before they run',
  preApprovedScripts: "Running FORGE's own scripts and reading its files without a permission prompt",
  userQuestion: 'Asking the user a question and waiting for the answer (approvals, clarifications)',
  deferredTools: 'Loading MCP tools that are listed only by name',
  browserTools: 'Real-browser automation and DevTools inspection',
  backgroundCommands: 'Running a long command in the background',
};

const NEUTRAL_MODELS = { standard: 'standard tier', strong: 'strong tier' };

/** Contract check for a profile. Returns a list of problems (empty when valid). */
export function validateProfile(p) {
  const out = [];
  if (!p || typeof p !== 'object') return ['profile is not an object'];
  for (const k of ['platform', 'displayName', 'verification']) if (typeof p[k] !== 'string' || !p[k]) out.push(`missing ${k}`);
  if (p.verification && !['live', 'docs-only'].includes(p.verification)) out.push('verification must be live or docs-only');
  if (!p.models || typeof p.models.standard !== 'string' || typeof p.models.strong !== 'string') out.push('models.standard and models.strong are required');
  if (!p.frontmatter || !p.frontmatter.skill || !p.frontmatter.agent) out.push('frontmatter.skill and frontmatter.agent are required ("all" or a field list)');
  for (const k of ['requiredConfig', 'limitations']) if (!Array.isArray(p[k])) out.push(`${k} must be a list`);
  const caps = p.capabilities || {};
  for (const k of Object.keys(CAPABILITIES)) {
    const c = caps[k];
    if (!c) { out.push(`capability ${k} is not declared`); continue; }
    if (!STATUSES.includes(c.status)) out.push(`capability ${k}: status must be one of ${STATUSES.join(', ')}`);
    if (c.status === 'supported' && !c.native) out.push(`capability ${k}: a supported capability names its native form`);
    if (c.status !== 'supported' && !c.fallback) out.push(`capability ${k}: an ${c.status} capability needs a fallback`);
  }
  for (const k of Object.keys(caps)) if (!CAPABILITIES[k]) out.push(`capability ${k} is not part of the contract`);
  return out;
}

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * The installed host profile (<FORGE_HOME>/platform.json), or null when it is missing or invalid. Callers treat
 * null as "unknown host": neutral wording, and every optional capability as unverified.
 */
export function loadPlatform(file = process.env.FORGE_PLATFORM_FILE || path.join(here, '..', 'platform.json')) {
  try {
    const p = JSON.parse(fs.readFileSync(file, 'utf8'));
    return validateProfile(p).length ? null : p;
  } catch { return null; }
}

export const capability = (p, k) => p?.capabilities?.[k] ?? { status: 'unverified', fallback: 'not declared by this host: try it once and report the result' };
export const supports = (p, k) => capability(p, k).status === 'supported';

/**
 * How to launch the given roles on the strong tier on this host. Where the host can't choose a model per
 * delegation, the escalation can't happen, and the report must say so rather than claim it.
 */
export function strongTier(p, roles) {
  const who = roles.join(', ');
  if (!p) return `Launch ${who} on the strong model tier (core/platform.md names it).`;
  if (!supports(p, 'perCallModel')) return `Launch ${who}; this host can't pick a model per delegation (${p.displayName}), so record the escalation as unavailable in the report.`;
  return `Launch ${who} with model ${p.models.strong}`;
}
export const modelName = (p, tier) => (p ? p.models[tier] : NEUTRAL_MODELS[tier]);

/** core/platform.md: the orchestrator's one-page view of its host. */
export function renderPlatformDoc(p) {
  const row = (k) => {
    const c = p.capabilities[k];
    const how = c.status === 'supported' ? c.native : `${c.native ? `${c.native}. ` : ''}Fallback: ${c.fallback}`;
    return `| ${k} | ${c.status} | ${String(how).replace(/\|/g, '\\|')} |`;
  };
  return [
    `# Host profile: ${p.displayName}`,
    '',
    `> Generated by \`scripts/build.mjs\` from \`adapters/${p.platform}/platform.json\`. Do not edit.`,
    `> Verification: **${p.verification}**${p.verification === 'docs-only' ? ' (checked against the documentation, never run live by FORGE)' : ''}.`,
    '',
    'The rest of FORGE names capabilities, not tools. This page maps each one to this host. Use the native form for a `supported` capability.',
    'For an `unsupported` one, use the fallback. Try an `unverified` one once, and if it fails, use the fallback and say so in the report. Never claim a capability this page doesn\'t list as supported.',
    '',
    `**Models:** standard tier = \`${p.models.standard}\`, strong tier = \`${p.models.strong}\`.`,
    '',
    '| Capability | Status | On this host |',
    '|---|---|---|',
    ...Object.keys(CAPABILITIES).map(row),
    '',
    '**Required configuration:**',
    ...p.requiredConfig.map((x) => `- ${x}`),
    '',
    '**Limitations:**',
    ...p.limitations.map((x) => `- ${x}`),
    '',
  ].join('\n');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) { console.log('usage: platform.mjs [--json]  print this install\'s host profile'); process.exit(0); }
  const p = loadPlatform();
  if (!p) { console.error('UNAVAILABLE: no valid platform.json next to this skill (source checkout or broken install); FORGE uses neutral wording.'); process.exit(2); }
  console.log(process.argv.includes('--json') ? JSON.stringify(p, null, 2) : renderPlatformDoc(p));
}
