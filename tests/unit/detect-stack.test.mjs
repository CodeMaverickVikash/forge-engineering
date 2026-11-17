import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { analyze, toMarkdown } from '../../skills/forge-project-exploration/scripts/detect-stack.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FIX = path.join(ROOT, 'tests', 'fixtures');
const SCRIPT = path.join(ROOT, 'skills', 'forge-project-exploration', 'scripts', 'detect-stack.mjs');
const ids = (unit) => new Set(unit.technologies.map((t) => t.id));
const cmd = (unit, category) => unit.commands.filter((c) => c.category === category).map((c) => c.command);

const EXPECT = {
  'nextjs-app': { tech: ['typescript', 'nextjs', 'tailwind', 'prisma', 'nextauth', 'stripe', 'vitest', 'playwright', 'eslint', 'github-actions'], pm: 'pnpm', test: 'pnpm test', typecheck: 'npx tsc --noEmit', ref: 'forge-frontend-engineering/references/react-nextjs.md' },
  'python-fastapi': { tech: ['python', 'fastapi', 'sqlalchemy', 'alembic', 'postgres', 'pytest', 'ruff', 'docker'], pm: 'uv', test: 'uv run pytest', ref: 'forge-backend-engineering/references/python.md' },
  'expo-app': { tech: ['expo', 'react-native', 'typescript', 'clerk', 'jest', 'testing-library'], pm: 'npm', test: 'npm run test', ref: 'forge-mobile-engineering/references/react-native-expo.md' },
  'spring-boot-app': { tech: ['java', 'spring-boot', 'jpa', 'flyway', 'postgres', 'spring-security', 'junit'], test: './mvnw test', ref: 'forge-backend-engineering/references/java-spring.md' },
  'go-service': { tech: ['go', 'chi', 'postgres', 'go-testing', 'golangci'], test: 'make test', ref: 'forge-backend-engineering/references/go.md' },
  'laravel-app': { tech: ['php', 'laravel', 'laravel-sanctum', 'stripe', 'phpunit', 'pint', 'phpstan', 'eloquent'], pm: 'composer', test: 'composer run test', ref: 'forge-backend-engineering/references/php-laravel.md' },
  'web-tasks': { tech: ['node'], pm: 'npm', test: 'npm run test' }
};

for (const [fixture, exp] of Object.entries(EXPECT)) {
  test(`detects ${fixture}`, () => {
    const ctx = analyze(path.join(FIX, fixture));
    assert.equal(ctx.units.length, 1, 'single-unit fixture');
    const u = ctx.units[0]; const found = ids(u);
    for (const t of exp.tech) assert.ok(found.has(t), `expected ${t} in ${[...found].join(',')}`);
    if (exp.pm) assert.ok(u.packageManagers.includes(exp.pm), `pm ${exp.pm} in ${u.packageManagers}`);
    assert.ok(cmd(u, 'test').includes(exp.test), `test command ${exp.test} in ${cmd(u, 'test')}`);
    if (exp.typecheck) assert.ok(cmd(u, 'typecheck').includes(exp.typecheck));
    if (exp.ref) {
      assert.ok(u.technologies.some((t) => t.reference === exp.ref), `reference ${exp.ref}`);
      assert.ok(fs.existsSync(path.join(ROOT, 'skills', exp.ref)), `reference file exists: ${exp.ref}`);
    }
    for (const c of u.commands) assert.ok(c.source, 'every command has a source');
  });
}

test('no false positives across stacks', () => {
  const py = ids(analyze(path.join(FIX, 'python-fastapi')).units[0]);
  for (const bad of ['nextjs', 'react', 'laravel', 'spring-boot', 'expo', 'go']) assert.ok(!py.has(bad), `python fixture must not detect ${bad}`);
  const go = ids(analyze(path.join(FIX, 'go-service')).units[0]);
  for (const bad of ['node', 'python', 'java']) assert.ok(!go.has(bad), `go fixture must not detect ${bad}`);
  const web = ids(analyze(path.join(FIX, 'web-tasks')).units[0]);
  assert.ok(!web.has('expo'), 'app.json-less, dependency-less node app is not expo');
});

test('never reads secret values; lists env names only', () => {
  const ctx = analyze(path.join(FIX, 'nextjs-app'));
  const out = JSON.stringify(ctx) + toMarkdown(ctx);
  assert.ok(!out.includes('sk_test_DO_NOT_READ'), 'secret value leaked');
  assert.ok(ctx.env.files.includes('.env.local'));
  assert.deepEqual(ctx.env.exampleKeys.sort(), ['DATABASE_URL', 'NEXTAUTH_SECRET', 'STRIPE_SECRET_KEY']);
});

test('monorepo: detects multiple units with their own stacks', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-mono-'));
  try {
    fs.cpSync(path.join(FIX, 'nextjs-app'), path.join(tmp, 'apps', 'web'), { recursive: true });
    fs.cpSync(path.join(FIX, 'go-service'), path.join(tmp, 'services', 'inventory'), { recursive: true });
    fs.cpSync(path.join(FIX, 'python-fastapi'), path.join(tmp, 'services', 'orders'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: 'mono', private: true, workspaces: ['apps/*'] }));
    fs.writeFileSync(path.join(tmp, 'turbo.json'), '{}');
    const ctx = analyze(tmp);
    const byPath = Object.fromEntries(ctx.units.map((u) => [u.path, u]));
    assert.ok(ctx.monorepo.isMonorepo);
    assert.ok(ctx.monorepo.tools.includes('Turborepo'));
    assert.ok(ids(byPath['apps/web']).has('nextjs'));
    assert.ok(ids(byPath['services/inventory']).has('chi'));
    assert.ok(ids(byPath['services/orders']).has('fastapi'));
    assert.ok(!ids(byPath['.']).has('nextjs'), 'root unit must not absorb sub-unit technologies');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('--write persists a self-ignoring .forge/ and reports changes between runs', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-write-'));
  try {
    fs.cpSync(path.join(FIX, 'web-tasks'), tmp, { recursive: true });
    execFileSync(process.execPath, [SCRIPT, '--root', tmp, '--write'], { encoding: 'utf8' });
    assert.equal(fs.readFileSync(path.join(tmp, '.forge', '.gitignore'), 'utf8').trim().split('\n').pop(), '*');
    const first = JSON.parse(fs.readFileSync(path.join(tmp, '.forge', 'context.json'), 'utf8'));
    assert.equal(first.changes.firstRun, true);
    // Add a dependency → second run must report the new technology.
    const pj = JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'), 'utf8'));
    pj.dependencies = { express: '^4.21.0' };
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify(pj));
    const md = execFileSync(process.execPath, [SCRIPT, '--root', tmp, '--write'], { encoding: 'utf8' });
    const second = JSON.parse(fs.readFileSync(path.join(tmp, '.forge', 'context.json'), 'utf8'));
    assert.equal(second.changes.manifestsChanged, true);
    assert.ok(second.changes.addedTechnologies.includes('.:express'));
    assert.match(md, /since last run/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('markdown summary stays compact (low context)', () => {
  for (const f of Object.keys(EXPECT)) {
    const md = toMarkdown(analyze(path.join(FIX, f)));
    assert.ok(md.split('\n').length < 60, `${f} summary has ${md.split('\n').length} lines`);
  }
});

test('CLI rejects bad input with exit code 2', () => {
  assert.throws(() => execFileSync(process.execPath, [SCRIPT, '--root', path.join(FIX, 'does-not-exist')], { stdio: 'pipe' }), (e) => e.status === 2);
});
