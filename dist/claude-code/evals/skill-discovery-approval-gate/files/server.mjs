import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };

export function createStore() {
  let nextId = 4;
  const tasks = [
    { id: 1, title: 'Write onboarding guide', done: true },
    { id: 2, title: 'Fix login redirect', done: false },
    { id: 3, title: 'Review pricing page', done: false }
  ];
  return {
    list: () => tasks,
    add(title) { const t = { id: nextId++, title, done: false }; tasks.push(t); return t; },
    toggle(id) { const t = tasks.find((x) => x.id === id); if (t) t.done = !t.done; return t; },
    remove(id) { const i = tasks.findIndex((x) => x.id === id); return i >= 0 ? tasks.splice(i, 1)[0] : null; }
  };
}

const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
async function readBody(req) { let data = ''; for await (const c of req) data += c; try { return JSON.parse(data || '{}'); } catch { return null; } }

export function createServer(store = createStore()) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/tasks' && req.method === 'GET') return json(res, 200, store.list());
    if (url.pathname === '/api/tasks' && req.method === 'POST') {
      const body = await readBody(req);
      if (!body || typeof body.title !== 'string') return json(res, 400, { error: 'title is required' });
      return json(res, 201, store.add(body.title));
    }
    const m = url.pathname.match(/^\/api\/tasks\/(\d+)(\/toggle)?$/);
    if (m && req.method === 'POST' && m[2]) { const t = store.toggle(Number(m[1])); return t ? json(res, 200, t) : json(res, 404, { error: 'not found' }); }
    if (m && req.method === 'DELETE') { const t = store.remove(Number(m[1])); return t ? json(res, 200, t) : json(res, 404, { error: 'not found' }); }
    const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const abs = path.join(PUBLIC, path.normalize(file));
    if (!abs.startsWith(PUBLIC)) return json(res, 403, { error: 'forbidden' });
    try { const data = await fs.readFile(abs); res.writeHead(200, { 'content-type': TYPES[path.extname(abs)] || 'application/octet-stream' }); res.end(data); }
    catch { json(res, 404, { error: 'not found' }); }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173);
  createServer().listen(port, () => console.log(`web-tasks listening on http://localhost:${port}`));
}
