import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkReviewDates, versionMentions, checkOnline, FETCHERS } from '../../scripts/check-freshness.mjs';

const DAY = 86400000;
const NOW = Date.parse('2026-11-18T00:00:00Z');

test('review dates: missing is an error, old is stale, removed files are orphans', () => {
  const files = ['a.md', 'b.md', 'c.md'];
  const config = { maxAgeDays: 180, reviewed: { 'a.md': '2026-11-01', 'b.md': '2026-01-01', 'gone.md': '2026-11-01' } };
  const kinds = checkReviewDates(config, files, NOW).map((i) => `${i.kind}:${i.file}`).sort();
  assert.deepEqual(kinds, ['ORPHAN:gone.md', 'STALE:b.md', 'UNREGISTERED:c.md']);
});

test('version mentions are found per technology name', () => {
  const text = 'In Express 4, handlers... Express 5 forwards rejections. Next.js 15 and Next.js v16.1 differ.';
  assert.deepEqual(versionMentions(text, 'Express'), [4, 5]);
  assert.deepEqual(versionMentions(text, 'Next.js'), [15, 16]);
  assert.deepEqual(versionMentions('Nuxt 4 uses app/', 'Nuxt'), [4]);
});

function fakeRepo(registry, refs) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-fresh-'));
  const rp = path.join(root, 'skills', 'forge-project-exploration', 'scripts');
  fs.mkdirSync(rp, { recursive: true });
  fs.writeFileSync(path.join(rp, 'technology-registry.json'), JSON.stringify({ technologies: registry }));
  for (const [f, t] of Object.entries(refs)) { fs.mkdirSync(path.dirname(path.join(root, 'skills', f)), { recursive: true }); fs.writeFileSync(path.join(root, 'skills', f), t); }
  return root;
}

test('online: not found, deprecated, legacy, outdated mention and inactivity are classified', async () => {
  const root = fakeRepo([
    { id: 'express', name: 'Express', detect: { npm: ['express'] }, reference: 'x/references/node.md' },
    { id: 'clerk', name: 'Clerk', detect: { npm: ['@clerk/react', '@clerk/clerk-react'] } },
    { id: 'ghost', name: 'Ghost', detect: { npm: ['no-such-pkg'], py: ['oldlib'] } },
    { id: 'sb', name: 'Storybook', detect: { npm: ['@storybook/*'] } },
  ], { 'x/references/node.md': 'Express 4 only.' });
  const data = {
    'https://registry.npmjs.org/express/latest': { version: '5.1.0' },
    'https://registry.npmjs.org/@clerk%2Freact/latest': { version: '6.0.0' },
    'https://registry.npmjs.org/@clerk%2Fclerk-react/latest': { version: '5.9.0', deprecated: 'use @clerk/react' },
    'https://pypi.org/pypi/oldlib/json': { info: { version: '1.0', classifiers: [] }, releases: { '1.0': [{ upload_time_iso_8601: new Date(NOW - 1000 * DAY).toISOString() }] } },
  };
  const get = async (url) => (url in data ? data[url] : null);
  const run = (legacySignals) => checkOnline({ root, config: { inactiveAfterDays: 730, legacySignals }, get, now: NOW });
  const r = await run([]);
  const got = r.issues.map((i) => `${i.level}:${i.kind}:${i.file}`).sort();
  assert.deepEqual(got, [
    'error:DEPRECATED:npm:@clerk/clerk-react',
    'error:NOT_FOUND:npm:no-such-pkg',
    'error:OUTDATED_MENTION:skills/x/references/node.md',
    'warn:INACTIVE:py:oldlib',
  ]);
  assert.equal(r.total, 5, 'wildcard signals are skipped');
  const r2 = await run(['npm:@clerk/clerk-react']);
  assert.ok(r2.issues.some((i) => i.level === 'info' && i.kind === 'LEGACY' && i.file === 'npm:@clerk/clerk-react'));
  fs.writeFileSync(path.join(root, 'skills', 'x/references/node.md'), 'Express 4 and Express 5 differ.');
  assert.ok(!(await run([])).issues.some((i) => i.kind === 'OUTDATED_MENTION'), 'covering the latest major is enough');
});

test('go: follows major-version module paths past +incompatible releases', async () => {
  const mods = {
    'github.com/labstack/echo': { Version: 'v3.3.10+incompatible', Time: '2019-01-01T00:00:00Z' },
    'github.com/labstack/echo/v4': { Version: 'v4.13.0', Time: '2026-10-01T00:00:00Z' },
    'github.com/stripe/stripe-go': { Version: 'v70.15.0+incompatible', Time: '2020-01-01T00:00:00Z' },
    ...Object.fromEntries(Array.from({ length: 12 }, (_, k) => [`github.com/stripe/stripe-go/v${71 + k}`, { Version: `v${71 + k}.0.0`, Time: '2026-11-01T00:00:00Z' }])),
    'github.com/gorilla/websocket': { Version: 'v1.5.3', Time: '2024-06-14T00:00:00Z' },
  };
  const get = async (url) => mods[decodeURIComponent(url.replace('https://proxy.golang.org/', '').replace('/@latest', ''))] ?? null;
  assert.equal((await FETCHERS.go('github.com/labstack/echo', get)).module, 'github.com/labstack/echo/v4');
  assert.equal((await FETCHERS.go('github.com/stripe/stripe-go', get)).version, 'v82.0.0');
  assert.equal((await FETCHERS.go('github.com/gorilla/websocket', get)).version, 'v1.5.3');
  assert.equal(await FETCHERS.go('example.com/missing', get), null);
});
