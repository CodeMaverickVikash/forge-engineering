// FORGE end-to-end scenarios. Each runs a real headless `/forge` session (see run-scenario.mjs).
// `expect.agentsAll`: every listed agent must be invoked. `expect.agentsAny`: at least one of each inner list.
// `check(ctx)`: post-condition on the sandbox; returns a list of failure strings.
import fs from 'node:fs';
import path from 'node:path';

const read = (dir, f) => { try { return fs.readFileSync(path.join(dir, f), 'utf8'); } catch { return ''; } };

export const SCENARIOS = {
  'bug-fix': {
    fixture: 'web-tasks',
    prompt: '/forge The task board shows the wrong number of remaining tasks. Fix it.',
    // S-size: the orchestrator may fix directly; browser QA is mandatory. A routine UI fix needs no code
    // review (no auth, payment or schema files), so launching one is wasted cost.
    expect: { agentsAll: ['forge-browser-qa'], agentsNone: ['forge-code-reviewer'], browser: true, sourceChanges: true },
    check: ({ dir }) => {
      // The fix may live in app.js or in an extracted helper module; check all front-end JS.
      const pub = path.join(dir, 'public');
      const js = fs.readdirSync(pub).filter((f) => f.endsWith('.js')).map((f) => read(pub, f)).join('\n');
      const fixed = /filter\(\s*\(?\s*(\w+)\s*\)?\s*=>\s*!\s*\1\.done\s*\)/.test(js) || /\.done\s*===?\s*false/.test(js);
      const stillBuggy = /const open = tasks\.filter\(\(t\) => t\.done\)\.length/.test(read(dir, 'public/app.js'));
      return fixed && !stillBuggy ? [] : ['remaining counter still counts completed tasks'];
    }
  },
  'branch-review': {
    fixture: 'web-tasks',
    // History built in the throwaway sandbox: main = the app; feature/edit-title = one commit adding a rename
    // endpoint with seeded defects; plus an uncommitted local edit that the review must report but never touch.
    // Seeded defects: an unknown id throws (unhandled rejection crashes the server), invalid JSON (body = null)
    // throws, and the title is not validated (blank or non-string accepted).
    setup: ({ git, read, write }) => {
      git('checkout', '-q', '-b', 'main');
      git('add', '-A'); git('commit', '-qm', 'Task board');
      git('checkout', '-q', '-b', 'feature/edit-title');
      write('server.mjs', read('server.mjs')
        .replace("    remove(id) {", "    rename(id, title) { const t = tasks.find((x) => x.id === id); t.title = title; return t; },\n    remove(id) {")
        .replace("    if (m && req.method === 'DELETE')", "    if (m && req.method === 'PATCH' && !m[2]) { const body = await readBody(req); return json(res, 200, store.rename(Number(m[1]), body.title)); }\n    if (m && req.method === 'DELETE')"));
      git('add', '-A'); git('commit', '-qm', 'Add PATCH /api/tasks/:id to rename a task');
      write('public/app.js', read('public/app.js') + "\nconsole.log('debug: tasks rendered');\n");
    },
    prompt: '/forge Review my current branch',
    expect: {
      reportHeading: /^#\s*FORGE\s*[—–-]+\s*Engineering Review Report/m,
      unchanged: true,
      agentsAll: ['forge-code-reviewer'],
      reportMentions: [
        ...['Review Information', 'Executive Summary', 'Critical Findings', 'Bug Findings', 'Security Review', 'Architecture & Code Quality', 'UI/UX & Browser QA', 'Testing & Verification', 'Required Fixes', 'Suggested Bug-Fix Tickets', 'Suggested Feature & Improvement Tickets', 'Recommended Next Actions', 'Final Verdict']
          .map((h, i) => new RegExp(`###\\s*${i + 1}\\.\\s*${h.replace('&', '(&|and)')}`)),
        /feature\/edit-title/, /\bmain\b/, /PATCH/, /BR-001/,
        /unknown id|not found|404|undefined|TypeError|crash/i,  // the unhandled unknown-id path
        /app\.js/,                                              // the uncommitted local change is reported
        /CHANGES REQUIRED/,
      ],
    },
    check: ({ dir }) => (fs.existsSync(path.join(dir, '.forge', 'review.lock')) ? ['review lock left behind (review-target.mjs --unlock not run)'] : []),
  },
  'code-question': {
    fixture: 'web-tasks',
    prompt: '/forge How is the "tasks remaining" number on the board calculated?',
    // Q size: answer directly with file:line evidence, no agents, no edits, no full report.
    expect: { answerOnly: true, sourceChanges: false, reportMentions: [/app\.js/, /filter|done/] }
  },
  'security-review': {
    fixture: 'web-tasks',
    prompt: '/forge Do a security review of this app. Report findings only — do not change any code.',
    expect: { agentsAll: ['forge-security-engineer'], sourceChanges: false, reportMentions: [/innerHTML|XSS|cross-site/i] }
  },
  'ui-improvement': {
    fixture: 'web-tasks',
    prompt: '/forge Improve the task board UI: clear loading, empty and error states, and better accessibility.',
    expect: { agentsAny: [['forge-frontend-engineer'], ['forge-ux-designer', 'forge-accessibility-specialist'], ['forge-browser-qa']], browser: true, sourceChanges: true }
  },
  'new-feature': {
    fixture: 'web-tasks',
    prompt: '/forge Let users edit the title of an existing task.',
    // What matters is that the feature ships with tests, not which role wrote them.
    expect: { agentsAny: [['forge-backend-engineer', 'forge-frontend-engineer'], ['forge-browser-qa']], agentsNone: ['forge-code-reviewer'], browser: true, sourceChanges: true },
    check: ({ dir }) => {
      const fails = [];
      if (!/PATCH|PUT/.test(read(dir, 'server.mjs'))) fails.push('no update endpoint added to server.mjs');
      const tests = fs.readdirSync(path.join(dir, 'test')).map((f) => read(path.join(dir, 'test'), f)).join('\n');
      if (!/PATCH|PUT|rename|edit/i.test(tests)) fails.push('no automated test covers the new update endpoint');
      return fails;
    }
  },
  'database-change': {
    fixture: 'spring-boot-app',
    prompt: '/forge Add a status column to the orders table (values: PENDING, PAID, CANCELLED; default PENDING).',
    expect: { agentsAny: [['forge-database-engineer'], ['forge-code-reviewer']], sourceChanges: true, reportMentions: [/UNAVAILABLE|NOT RUN|not available|could not (be )?run/i] },
    check: ({ dir }) => {
      const migDir = path.join(dir, 'src/main/resources/db/migration');
      const migs = fs.existsSync(migDir) ? fs.readdirSync(migDir) : [];
      const fails = [];
      if (!migs.some((m) => /^V\d+__/.test(m) && m !== 'V1__init.sql')) fails.push('no new Flyway migration');
      if (read(dir, 'src/main/resources/db/migration/V1__init.sql') !== 'CREATE TABLE orders (id BIGSERIAL PRIMARY KEY);\n') fails.push('existing migration V1 was modified');
      return fails;
    }
  },
  'skill-discovery': {
    // Headless run: nobody can approve, so FORGE must propose (free/OSS, license-verified) and install NOTHING.
    fixture: 'web-tasks',
    prompt: '/forge Find free and open-source skills that would help with this project.',
    expect: { agentsAny: [['forge-skill-scout']], sourceChanges: false, reportMentions: [/licen[cs]e/i, /approv/i] },
    check: ({ dir }) => {
      const fails = [];
      const skillsDir = path.join(dir, '.claude', 'skills');
      const extra = fs.existsSync(skillsDir) ? fs.readdirSync(skillsDir).filter((n) => !n.startsWith('forge')) : [];
      if (extra.length) fails.push(`installed without approval: ${extra.join(', ')}`);
      for (const lock of [path.join(dir, '.claude', 'forge-skills.lock.json'), path.join(dir, '.agents', 'forge-skills.lock.json')]) if (fs.existsSync(lock)) fails.push(`lock file written without approval: ${lock}`);
      return fails;
    }
  },
  'architecture-analysis': {
    fixture: ['nextjs-app:apps/web', 'python-fastapi:services/orders', 'go-service:services/inventory'],
    prompt: '/forge Analyze the project and suggest improvements.',
    expect: { agentsAny: [['forge-architect', 'forge-project-explorer'], ['forge-security-engineer', 'forge-performance-engineer']], sourceChanges: false }
  }
};
