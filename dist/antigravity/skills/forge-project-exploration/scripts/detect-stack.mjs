#!/usr/bin/env node
// FORGE project detector: evidence-based stack fingerprinting with zero dependencies (Node >= 18).
// Usage: node detect-stack.mjs [--root <dir>] [--json] [--write] [--max-depth N]
//   default output: compact Markdown summary (low context)  |  --json: full JSON
//   --write: persist .forge/context.json (+ self-ignoring .forge/.gitignore) and report changes vs previous run
// Never reads secret values: .env* files are listed by name only; only *.example/*.sample/*.template env files are parsed for KEY names.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY = JSON.parse(fs.readFileSync(path.join(HERE, 'technology-registry.json'), 'utf8'));

const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.hg', '.svn', 'dist', 'build', 'out', '.next', '.nuxt', '.svelte-kit', '.turbo',
  '.cache', 'coverage', 'vendor', 'target', '.venv', 'venv', 'env', '__pycache__', '.mypy_cache', '.pytest_cache',
  '.ruff_cache', '.tox', '.gradle', '.idea', '.vscode', 'Pods', 'DerivedData', '.dart_tool', '.expo', 'bin', 'obj',
  '.forge', '.terraform', 'tmp', 'logs', '.parcel-cache', 'storybook-static', 'bower_components', '.yarn'
]);
const MANIFESTS = ['package.json', 'pyproject.toml', 'requirements.txt', 'Pipfile', 'setup.py', 'go.mod', 'composer.json',
  'pom.xml', 'build.gradle', 'build.gradle.kts', 'Cargo.toml', 'Gemfile', 'pubspec.yaml'];
const MANIFEST_PATTERNS = [/\.csproj$/, /\.fsproj$/];
const LOCKFILES = {
  'pnpm-lock.yaml': 'pnpm', 'yarn.lock': 'yarn', 'package-lock.json': 'npm', 'bun.lockb': 'bun', 'bun.lock': 'bun',
  'poetry.lock': 'poetry', 'uv.lock': 'uv', 'Pipfile.lock': 'pipenv', 'pdm.lock': 'pdm', 'composer.lock': 'composer',
  'Gemfile.lock': 'bundler', 'Cargo.lock': 'cargo', 'go.sum': 'go', 'pubspec.lock': 'pub', 'gradle.lockfile': 'gradle'
};
const EXT_LANG = {
  '.ts': 'TypeScript', '.tsx': 'TypeScript', '.mts': 'TypeScript', '.cts': 'TypeScript', '.js': 'JavaScript', '.jsx': 'JavaScript',
  '.mjs': 'JavaScript', '.cjs': 'JavaScript', '.py': 'Python', '.go': 'Go', '.java': 'Java', '.kt': 'Kotlin', '.kts': 'Kotlin',
  '.scala': 'Scala', '.php': 'PHP', '.rb': 'Ruby', '.rs': 'Rust', '.cs': 'C#', '.fs': 'F#', '.swift': 'Swift', '.m': 'Objective-C',
  '.dart': 'Dart', '.c': 'C', '.h': 'C/C++', '.cpp': 'C++', '.cc': 'C++', '.hpp': 'C++', '.vue': 'Vue', '.svelte': 'Svelte',
  '.ex': 'Elixir', '.exs': 'Elixir', '.lua': 'Lua', '.sql': 'SQL', '.sh': 'Shell', '.ps1': 'PowerShell', '.r': 'R', '.jl': 'Julia',
  '.zig': 'Zig', '.clj': 'Clojure', '.erl': 'Erlang', '.hs': 'Haskell', '.ml': 'OCaml', '.html': 'HTML', '.css': 'CSS', '.scss': 'SCSS'
};
const CI_PATTERNS = [/^\.github\/workflows\/[^/]+\.ya?ml$/, /^\.gitlab-ci\.yml$/, /^Jenkinsfile$/, /^azure-pipelines\.ya?ml$/,
  /^\.circleci\/config\.yml$/, /^bitbucket-pipelines\.yml$/, /^\.buildkite\//, /^\.drone\.yml$/];
const DEPLOY_NAMES = /^(Dockerfile|.*\.Dockerfile|docker-compose.*\.ya?ml|compose\.ya?ml|vercel\.json|netlify\.toml|fly\.toml|railway\.(json|toml)|Procfile|app\.ya?ml|serverless\.(yml|ts)|cdk\.json|render\.yaml|Chart\.yaml|kustomization\.yaml|eas\.json|.*\.tf)$/;
const DOC_NAMES = /^(README|CONTRIBUTING|ARCHITECTURE|CHANGELOG|SECURITY|DEVELOPMENT|CLAUDE|AGENTS|GEMINI)(\.[a-z]+)?$/i;
const API_NAMES = /^(openapi|swagger)\.(ya?ml|json)$|\.(graphql|gql|proto)$/i;
const TEST_FILE = /(^test_.*\.py$|_test\.(py|go)$|\.(test|spec)\.[cm]?[jt]sx?$|Tests?\.(java|kt|cs|swift)$|_spec\.rb$|Test\.php$|_test\.dart$)/;
const MIGRATION_DIR = /(^|\/)(migrations|migrate|db\/migration|database\/migrations|alembic\/versions|prisma\/migrations|drizzle|supabase\/migrations)(\/|$)/;

function parseArgs(argv) {
  const a = { root: process.cwd(), json: false, write: false, maxDepth: 6, maxFiles: 60000 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--root') a.root = path.resolve(argv[++i]);
    else if (k === '--json') a.json = true;
    else if (k === '--write') a.write = true;
    else if (k === '--max-depth') a.maxDepth = Number(argv[++i]);
    else if (k === '--help' || k === '-h') a.help = true;
    else throw new Error(`Unknown argument: ${k}`);
  }
  return a;
}

const posix = (p) => p.split(path.sep).join('/');
const readText = (p, max = 512 * 1024) => {
  try { const st = fs.statSync(p); if (st.size > max) return ''; return fs.readFileSync(p, 'utf8'); } catch { return ''; }
};
const readJson = (p) => { try { return JSON.parse(readText(p)); } catch { return null; } };
const globToRe = (g) => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');

// ---------- walk ----------
function walk(root, maxDepth, maxFiles) {
  const files = []; const dirs = []; let truncated = false;
  const stack = [{ abs: root, rel: '', depth: 0 }];
  while (stack.length) {
    const { abs, rel, depth } = stack.pop();
    let entries; try { entries = fs.readdirSync(abs, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.isSymbolicLink()) continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (IGNORE_DIRS.has(e.name) || (e.name.startsWith('.') && !['.github', '.storybook', '.maestro', '.circleci', '.buildkite', '.vercel', '.husky', '.devcontainer'].includes(e.name))) continue;
        dirs.push(r);
        if (depth + 1 <= maxDepth) stack.push({ abs: path.join(abs, e.name), rel: r, depth: depth + 1 });
      } else if (e.isFile()) {
        if (files.length >= maxFiles) { truncated = true; continue; }
        files.push(r);
      }
    }
  }
  files.sort(); dirs.sort();
  return { files, dirs, truncated };
}

// ---------- manifest parsing ----------
function collectDeps(unitAbs, unitFiles) {
  const deps = { npm: new Map(), composer: new Map(), text: { py: '', maven: '', go: '', gem: '', cargo: '', pub: '', nuget: '' } };
  const has = (f) => unitFiles.has(f);
  if (has('package.json')) {
    const pj = readJson(path.join(unitAbs, 'package.json')) || {};
    for (const k of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) for (const [n, v] of Object.entries(pj[k] || {})) deps.npm.set(n, String(v));
  }
  if (has('composer.json')) {
    const cj = readJson(path.join(unitAbs, 'composer.json')) || {};
    for (const k of ['require', 'require-dev']) for (const [n, v] of Object.entries(cj[k] || {})) deps.composer.set(n.toLowerCase(), String(v));
  }
  const py = ['pyproject.toml', 'Pipfile', 'setup.py', 'setup.cfg', ...[...unitFiles].filter((f) => /^requirements[^/]*\.(txt|in)$/.test(f))];
  for (const f of py) if (has(f)) deps.text.py += '\n' + readText(path.join(unitAbs, f)).toLowerCase();
  for (const f of ['pom.xml', 'build.gradle', 'build.gradle.kts', 'settings.gradle', 'settings.gradle.kts', 'gradle/libs.versions.toml']) if (has(f)) deps.text.maven += '\n' + readText(path.join(unitAbs, f)).toLowerCase();
  if (has('go.mod')) deps.text.go = readText(path.join(unitAbs, 'go.mod'));
  if (has('Gemfile')) deps.text.gem = readText(path.join(unitAbs, 'Gemfile'));
  if (has('Cargo.toml')) deps.text.cargo = readText(path.join(unitAbs, 'Cargo.toml'));
  if (has('pubspec.yaml')) deps.text.pub = readText(path.join(unitAbs, 'pubspec.yaml'));
  for (const f of unitFiles) if (/\.(csproj|fsproj)$/.test(f) && !f.includes('/')) deps.text.nuget += '\n' + readText(path.join(unitAbs, f));
  return deps;
}

function wordIn(text, word) {
  if (!text) return false;
  const w = word.toLowerCase().replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[\\s"'\\[(,:=/<>])${w}([\\s"'\\]),:=<>~!;@\\[/]|$)`, 'im').test(text);
}
function pkgMatch(map, pattern) {
  if (pattern.endsWith('*')) { const p = pattern.slice(0, -1); for (const k of map.keys()) if (k.startsWith(p)) return k; return null; }
  return map.has(pattern) ? pattern : null;
}

function detectTechnologies(unitFilesList, unitDirs, deps) {
  const found = [];
  const basenames = unitFilesList.map((f) => [f, f.split('/').pop()]);
  for (const t of REGISTRY.technologies) {
    const d = t.detect || {}; const evidence = [];
    for (const p of d.npm || []) { const k = pkgMatch(deps.npm, p); if (k) evidence.push(`npm:${k}@${deps.npm.get(k)}`); }
    for (const p of d.composer || []) { const k = pkgMatch(deps.composer, p); if (k) evidence.push(`composer:${k}@${deps.composer.get(k)}`); }
    // Maven/Gradle artifact ids and Go module paths are matched as substrings (e.g. "spring-boot" in "spring-boot-starter-web").
    for (const kind of ['maven', 'go']) for (const w of d[kind] || []) if (deps.text[kind].toLowerCase().includes(w.toLowerCase())) evidence.push(`${kind}:${w}`);
    for (const kind of ['py', 'gem', 'cargo', 'pub', 'nuget']) for (const w of d[kind] || []) if (wordIn(deps.text[kind], w)) evidence.push(`${kind}:${w}`);
    const depEvidence = evidence.length > 0;
    for (const g of d.files || []) {
      const re = globToRe(g);
      const hit = g.includes('/') ? unitFilesList.find((f) => re.test(f)) : basenames.find(([, b]) => re.test(b))?.[0];
      if (hit) { evidence.push(`file:${hit}`); }
    }
    for (const dir of d.dirs || []) if (unitDirs.has(dir)) evidence.push(`dir:${dir}`);
    if (!evidence.length) continue;
    if (d.requireAny && !depEvidence) continue; // file-only evidence insufficient (e.g. app.json without expo dep)
    found.push({ id: t.id, name: t.name, category: t.category, evidence: evidence.slice(0, 3), skills: t.skills || [], reference: t.reference || null });
  }
  // Drop generic-runtime noise when a more specific framework is present.
  const ids = new Set(found.map((f) => f.id));
  return found.filter((f) => !(f.id === 'react' && ids.has('nextjs')) && !(f.id === 'react' && ids.has('react-native') && !ids.has('react-dom')));
}

// ---------- commands ----------
function scriptCategory(name) {
  const n = name.toLowerCase();
  if (/(^|:)e2e|playwright|cypress/.test(n)) return 'e2e';
  if (/^test|:test|^spec/.test(n)) return 'test';
  if (/typecheck|type-check|tsc|types$/.test(n)) return 'typecheck';
  if (/^lint|:lint/.test(n)) return 'lint';
  if (/^format|prettier|^fmt/.test(n)) return 'format';
  if (/^build|:build/.test(n)) return 'build';
  if (/^dev$|^start$|^serve|^dev:|^web$|^ios$|^android$/.test(n)) return 'dev';
  if (/migrat|db:|seed|prisma/.test(n)) return 'database';
  return null;
}

function detectCommands(unitAbs, unitFiles, techIds, pm) {
  const cmds = []; const add = (category, command, source) => cmds.push({ category, command, source });
  const run = (s) => (pm === 'npm' ? `npm run ${s}` : pm === 'bun' ? `bun run ${s}` : `${pm} ${s}`);
  if (unitFiles.has('package.json')) {
    const pj = readJson(path.join(unitAbs, 'package.json')) || {};
    for (const s of Object.keys(pj.scripts || {})) { const c = scriptCategory(s); if (c) add(c, run(s), `package.json#scripts.${s}`); }
    const has = (c) => cmds.some((x) => x.category === c);
    if (!has('typecheck') && techIds.has('typescript') && unitFiles.has('tsconfig.json')) add('typecheck', pm === 'pnpm' ? 'pnpm exec tsc --noEmit' : 'npx tsc --noEmit', 'inferred: tsconfig.json + typescript dependency');
  }
  if (unitFiles.has('composer.json')) {
    const cj = readJson(path.join(unitAbs, 'composer.json')) || {};
    for (const s of Object.keys(cj.scripts || {})) { const c = scriptCategory(s); if (c) add(c, `composer run ${s}`, `composer.json#scripts.${s}`); }
  }
  if (unitFiles.has('Makefile')) {
    const mk = readText(path.join(unitAbs, 'Makefile'));
    for (const m of mk.matchAll(/^([A-Za-z0-9][\w.-]*):(?!=)/gm)) { const c = scriptCategory(m[1]); if (c) add(c, `make ${m[1]}`, `Makefile#${m[1]}`); }
  }
  const has = (c) => cmds.some((x) => x.category === c);
  const pyRun = unitFiles.has('poetry.lock') ? 'poetry run ' : unitFiles.has('uv.lock') ? 'uv run ' : unitFiles.has('Pipfile.lock') ? 'pipenv run ' : '';
  if (techIds.has('pytest') && !has('test')) add('test', `${pyRun}pytest`, 'inferred: pytest detected');
  if (techIds.has('ruff') && !has('lint')) add('lint', `${pyRun}ruff check .`, 'inferred: ruff detected');
  if (techIds.has('mypy') && !has('typecheck')) add('typecheck', `${pyRun}mypy .`, 'inferred: mypy detected');
  if (techIds.has('django') && unitFiles.has('manage.py') && !has('test') ) add('test', `${pyRun}python manage.py test`, 'inferred: Django manage.py');
  if (techIds.has('go')) {
    if (!has('test')) add('test', 'go test ./...', 'inferred: go.mod (Go toolchain built-in)');
    add('lint', 'go vet ./...', 'inferred: go.mod (Go toolchain built-in)');
    if (!has('build')) add('build', 'go build ./...', 'inferred: go.mod');
    if (techIds.has('golangci')) add('lint', 'golangci-lint run', 'inferred: .golangci config');
  }
  const mvnw = unitFiles.has('mvnw') ? './mvnw' : 'mvn'; const gradlew = unitFiles.has('gradlew') ? './gradlew' : 'gradle';
  if (unitFiles.has('pom.xml')) { if (!has('test')) add('test', `${mvnw} test`, `inferred: pom.xml${unitFiles.has('mvnw') ? ' + mvnw' : ''}`); if (!has('build')) add('build', `${mvnw} -DskipTests package`, 'inferred: pom.xml'); }
  else if (unitFiles.has('build.gradle') || unitFiles.has('build.gradle.kts')) { if (!has('test')) add('test', `${gradlew} test`, 'inferred: Gradle build'); if (!has('build')) add('build', `${gradlew} build -x test`, 'inferred: Gradle build'); }
  if (techIds.has('laravel') && unitFiles.has('artisan') && !has('test')) add('test', 'php artisan test', 'inferred: Laravel artisan');
  else if (techIds.has('phpunit') && !has('test')) add('test', 'vendor/bin/phpunit', 'inferred: phpunit config');
  if (techIds.has('phpstan') && !has('lint')) add('lint', 'vendor/bin/phpstan analyse', 'inferred: phpstan dependency');
  if (techIds.has('pint') && !has('format')) add('format', 'vendor/bin/pint --test', 'inferred: laravel/pint dependency');
  if (techIds.has('rust')) { if (!has('test')) add('test', 'cargo test', 'inferred: Cargo.toml'); add('lint', 'cargo clippy -- -D warnings', 'inferred: Cargo.toml (needs clippy component)'); if (!has('build')) add('build', 'cargo build', 'inferred: Cargo.toml'); }
  if (techIds.has('dotnet')) { if (!has('test')) add('test', 'dotnet test', 'inferred: .csproj/.sln'); if (!has('build')) add('build', 'dotnet build', 'inferred: .csproj/.sln'); }
  if (techIds.has('flutter')) { if (!has('test')) add('test', 'flutter test', 'inferred: pubspec flutter'); add('lint', 'flutter analyze', 'inferred: pubspec flutter'); }
  if (techIds.has('rails')) { if (!has('test')) add('test', techIds.has('rspec') ? 'bundle exec rspec' : 'bin/rails test', 'inferred: Rails'); }
  if (techIds.has('rubocop') && !has('lint')) add('lint', 'bundle exec rubocop', 'inferred: rubocop gem');
  if (techIds.has('expo') && !has('dev')) add('dev', 'npx expo start', 'inferred: expo dependency');
  return cmds;
}

// ---------- main analysis ----------
export function analyze(root, opts = {}) {
  const { files, dirs, truncated } = walk(root, opts.maxDepth ?? 6, opts.maxFiles ?? 60000);
  const dirSet = new Set(dirs);
  // Units: directories containing a primary manifest (monorepo aware).
  const unitRoots = new Set();
  for (const f of files) {
    const base = f.split('/').pop(); const dir = f.includes('/') ? f.slice(0, f.lastIndexOf('/')) : '';
    if (MANIFESTS.includes(base) || MANIFEST_PATTERNS.some((re) => re.test(base))) {
      if (dir.split('/').length > 4) continue;
      if (/(^|\/)(examples?|fixtures?|samples?|test-data|testdata|templates?|__fixtures__)(\/|$)/.test(dir) && dir !== '') continue;
      unitRoots.add(dir);
    }
  }
  if (!unitRoots.size) unitRoots.add('');
  const sortedUnits = [...unitRoots].sort((a, b) => a.length - b.length || a.localeCompare(b));
  // Assign each file to its deepest unit.
  const inUnit = (p, u) => u === '' || p === u || p.startsWith(u + '/');
  const owner = (p) => { let best = null; for (const u of sortedUnits) if (inUnit(p, u) && (best === null || u.length > best.length)) best = u; return best; };
  const unitFiles = new Map(sortedUnits.map((u) => [u, []]));
  for (const f of files) { const u = owner(f); if (u !== null) unitFiles.get(u).push(u ? f.slice(u.length + 1) : f); }
  const units = [];
  // Workspace members rarely carry their own lockfile: they use the manager declared at the root or
  // the nearest ancestor (pnpm-lock.yaml, packageManager, pnpm-workspace.yaml). Units are sorted
  // shortest first, so an ancestor is always resolved before its members.
  const pmOf = new Map();
  const inheritedPm = (u) => {
    let best = null;
    for (const [a, pm] of pmOf) if (a !== u && inUnit(u, a) && (best === null || a.length > best.length)) best = a;
    if (best !== null) return pmOf.get(best);
    return files.includes('pnpm-workspace.yaml') ? 'pnpm' : null;
  };
  for (const u of sortedUnits) {
    const rel = unitFiles.get(u) || []; const relSet = new Set(rel);
    const uAbs = path.join(root, u);
    const uDirs = new Set(dirs.filter((d) => d !== u && owner(d) === u).map((d) => (u ? d.slice(u.length + 1) : d)));
    const deps = collectDeps(uAbs, relSet);
    const technologies = detectTechnologies(rel, uDirs, deps);
    const techIds = new Set(technologies.map((t) => t.id));
    const lock = Object.entries(LOCKFILES).filter(([f]) => relSet.has(f)).map(([, pm]) => pm);
    let pm = lock.find((p) => ['pnpm', 'yarn', 'bun', 'npm'].includes(p)) || null;
    if (relSet.has('package.json')) { const pj = readJson(path.join(uAbs, 'package.json')) || {}; if (typeof pj.packageManager === 'string') pm = pj.packageManager.split('@')[0]; }
    if (!pm && relSet.has('package.json')) pm = inheritedPm(u) || 'npm';
    if (pm && ['pnpm', 'yarn', 'bun', 'npm'].includes(pm)) pmOf.set(u, pm);
    const manifests = rel.filter((f) => !f.includes('/') && (MANIFESTS.includes(f) || MANIFEST_PATTERNS.some((re) => re.test(f))));
    units.push({ path: u || '.', manifests, packageManagers: [...new Set([pm, ...lock].filter(Boolean))], technologies, commands: detectCommands(uAbs, relSet, techIds, pm || 'npm') });
  }
  // Languages by extension.
  const langCount = {};
  for (const f of files) { const ext = path.extname(f).toLowerCase(); const l = EXT_LANG[ext]; if (l) langCount[l] = (langCount[l] || 0) + 1; }
  const languages = Object.entries(langCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, files]) => ({ name, files }));
  const testFiles = files.filter((f) => TEST_FILE.test(f.split('/').pop()) || /(^|\/)(tests?|__tests__|spec|e2e)\//.test(f));
  const envFiles = files.filter((f) => /(^|\/)\.env(\.|$)|(^|\/)[^/]*\.env$/.test(f));
  const envExampleKeys = [];
  for (const f of envFiles.filter((f) => /\.(example|sample|template|dist)$/.test(f))) {
    for (const m of readText(path.join(root, f)).matchAll(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/gm)) envExampleKeys.push(m[1]);
  }
  const pick = (re, limit = 25) => files.filter((f) => re.test(f)).slice(0, limit);
  const workspaces = [];
  const rootPj = readJson(path.join(root, 'package.json'));
  if (rootPj?.workspaces) workspaces.push('npm/yarn workspaces');
  for (const [f, label] of [['pnpm-workspace.yaml', 'pnpm workspace'], ['turbo.json', 'Turborepo'], ['nx.json', 'Nx'], ['lerna.json', 'Lerna'], ['go.work', 'Go workspace']]) if (files.includes(f)) workspaces.push(label);
  return {
    generatedAt: new Date().toISOString(),
    root: posix(root),
    git: gitInfo(root),
    scan: { files: files.length, truncated, maxDepth: opts.maxDepth ?? 6 },
    monorepo: { isMonorepo: units.length > 1 || workspaces.length > 0, tools: workspaces },
    languages,
    units,
    docs: files.filter((f) => DOC_NAMES.test(f.split('/').pop()) && f.split('/').length <= 3).slice(0, 20).concat(dirSet.has('docs') ? ['docs/'] : []),
    adrs: pick(/(^|\/)(adr|adrs|decisions)\/[^/]+\.md$/i, 10),
    ci: files.filter((f) => CI_PATTERNS.some((re) => re.test(f))),
    deploy: files.filter((f) => DEPLOY_NAMES.test(f.split('/').pop())).slice(0, 25),
    apiContracts: pick(API_NAMES),
    database: { migrationDirs: [...new Set(files.filter((f) => MIGRATION_DIR.test(f)).map((f) => f.match(/^(.*?(?:migrations|migrate|db\/migration|versions|drizzle))\//)?.[1]).filter(Boolean))].slice(0, 10), schemaFiles: pick(/(schema\.prisma|schema\.sql|structure\.sql|schema\.rb|\.entity\.ts|models\.py)$/, 15) },
    tests: { fileCount: testFiles.length, sample: testFiles.slice(0, 8), dirs: [...new Set(testFiles.map((f) => f.split('/').slice(0, -1).join('/')).filter(Boolean))].slice(0, 10) },
    env: { files: envFiles, exampleKeys: [...new Set(envExampleKeys)].slice(0, 60), note: 'names only; secret values are never read' },
    fingerprint: fingerprint(root, files)
  };
}

function gitInfo(root) {
  const g = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).trim();
  try {
    if (g('rev-parse', '--is-inside-work-tree') !== 'true') return { isRepo: false };
    let branch = null; try { branch = g('rev-parse', '--abbrev-ref', 'HEAD'); } catch { branch = g('symbolic-ref', '--short', 'HEAD'); }
    const status = g('status', '--porcelain').split('\n').filter(Boolean);
    let head = null; try { head = g('rev-parse', '--short', 'HEAD'); } catch { /* no commits yet */ }
    return { isRepo: true, branch, head, uncommittedFiles: status.length, uncommittedSample: status.slice(0, 15) };
  } catch { return { isRepo: false }; }
}

function fingerprint(root, files) {
  const h = crypto.createHash('sha1');
  for (const f of files) {
    const b = f.split('/').pop();
    if (MANIFESTS.includes(b) || MANIFEST_PATTERNS.some((re) => re.test(b)) || LOCKFILES[b]) {
      try { const st = fs.statSync(path.join(root, f)); h.update(`${f}:${st.size}:${Math.floor(st.mtimeMs)}\n`); } catch { /* ignore */ }
    }
  }
  return h.digest('hex').slice(0, 16);
}

function diffContexts(prev, next) {
  if (!prev) return { firstRun: true };
  const techs = (c) => new Set((c.units || []).flatMap((u) => u.technologies.map((t) => `${u.path}:${t.id}`)));
  const a = techs(prev); const b = techs(next);
  return {
    firstRun: false,
    manifestsChanged: prev.fingerprint !== next.fingerprint,
    addedTechnologies: [...b].filter((x) => !a.has(x)),
    removedTechnologies: [...a].filter((x) => !b.has(x)),
    previousRun: prev.generatedAt
  };
}

export function toMarkdown(ctx) {
  const L = [];
  L.push(`# Project context (${ctx.root})`);
  const g = ctx.git;
  L.push(g.isRepo ? `- Git: branch \`${g.branch}\`${g.head ? ` @ ${g.head}` : ' (no commits)'}, ${g.uncommittedFiles} uncommitted file(s)` : '- Git: not a repository');
  L.push(`- Scanned ${ctx.scan.files} files${ctx.scan.truncated ? ' (TRUNCATED, narrow with --root)' : ''}; languages: ${ctx.languages.map((l) => `${l.name} (${l.files})`).join(', ') || 'none detected'}`);
  if (ctx.monorepo.isMonorepo) L.push(`- Monorepo: ${ctx.units.length} units${ctx.monorepo.tools.length ? ` via ${ctx.monorepo.tools.join(', ')}` : ''}`);
  for (const u of ctx.units) {
    L.push(`\n## Unit \`${u.path}\` (${u.manifests.join(', ') || 'no manifest'})${u.packageManagers.length ? ` | pm: ${u.packageManagers.join(', ')}` : ''}`);
    const byCat = {};
    for (const t of u.technologies) (byCat[t.category] ||= []).push(`${t.name}${t.evidence[0]?.includes('@') ? ` ${t.evidence[0].split('@').pop()}` : ''}`);
    for (const [c, names] of Object.entries(byCat)) L.push(`- ${c}: ${names.join(', ')}`);
    if (u.commands.length) {
      L.push('- commands:');
      for (const c of u.commands) L.push(`  - ${c.category}: \`${c.command}\` (${c.source})`);
    } else L.push('- commands: none discovered');
    const refs = [...new Set(u.technologies.map((t) => t.reference).filter(Boolean))];
    if (refs.length) L.push(`- references: ${refs.join(', ')}`);
  }
  L.push('\n## Cross-cutting');
  const line = (k, v) => L.push(`- ${k}: ${v && v.length ? v.join(', ') : 'none found'}`);
  line('docs', ctx.docs); line('ADRs', ctx.adrs); line('CI', ctx.ci); line('deploy', ctx.deploy); line('API contracts', ctx.apiContracts);
  line('migrations', ctx.database.migrationDirs); line('schema files', ctx.database.schemaFiles);
  L.push(`- tests: ${ctx.tests.fileCount} test file(s)${ctx.tests.dirs.length ? ` in ${ctx.tests.dirs.join(', ')}` : ''}`);
  L.push(`- env files (names only): ${ctx.env.files.join(', ') || 'none'}${ctx.env.exampleKeys.length ? `; example keys: ${ctx.env.exampleKeys.join(', ')}` : ''}`);
  if (ctx.changes && !ctx.changes.firstRun) {
    const c = ctx.changes;
    L.push(`- since last run (${c.previousRun}): manifests ${c.manifestsChanged ? 'CHANGED' : 'unchanged'}${c.addedTechnologies.length ? `; added ${c.addedTechnologies.join(', ')}` : ''}${c.removedTechnologies.length ? `; removed ${c.removedTechnologies.join(', ')}` : ''}`);
  }
  return L.join('\n');
}

function persist(root, ctx) {
  const dir = path.join(root, '.forge');
  fs.mkdirSync(dir, { recursive: true });
  const gi = path.join(dir, '.gitignore');
  if (!fs.existsSync(gi)) fs.writeFileSync(gi, '# FORGE workspace: ignored by default (delete this file to commit FORGE knowledge)\n*\n');
  const file = path.join(dir, 'context.json');
  let prev = null; try { prev = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* first run */ }
  ctx.changes = diffContexts(prev, ctx);
  fs.writeFileSync(file, JSON.stringify(ctx, null, 2));
  return file;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) { console.log('Usage: node detect-stack.mjs [--root <dir>] [--json] [--write] [--max-depth N]'); process.exit(0); }
    if (!fs.existsSync(args.root) || !fs.statSync(args.root).isDirectory()) throw new Error(`Not a directory: ${args.root}`);
    const ctx = analyze(args.root, args);
    let written = null;
    if (args.write) written = persist(args.root, ctx);
    console.log(args.json ? JSON.stringify(ctx, null, 2) : toMarkdown(ctx) + (written ? `\n\n(saved ${posix(path.relative(args.root, written))})` : ''));
  } catch (e) { console.error(`detect-stack: ${e.message}`); process.exit(2); }
}
