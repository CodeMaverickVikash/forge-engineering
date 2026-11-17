import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, createStore } from '../server.mjs';

async function withServer(fn) {
  const server = createServer(createStore());
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await fn(base); } finally { server.close(); }
}

test('lists seeded tasks', () => withServer(async (base) => {
  const res = await fetch(`${base}/api/tasks`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).length, 3);
}));

test('creates a task', () => withServer(async (base) => {
  const res = await fetch(`${base}/api/tasks`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'New' }) });
  assert.equal(res.status, 201);
  assert.equal((await res.json()).title, 'New');
}));

test('rejects missing title', () => withServer(async (base) => {
  const res = await fetch(`${base}/api/tasks`, { method: 'POST', body: '{}' });
  assert.equal(res.status, 400);
}));
