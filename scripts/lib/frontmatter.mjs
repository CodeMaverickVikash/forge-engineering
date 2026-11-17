// Minimal YAML-frontmatter reader/writer for FORGE sources (zero dependencies).
// Supports the subset FORGE uses: `key: scalar` and `key:` followed by `  - item` lists.

export function parseFrontmatter(text) {
  const src = text.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  if (!src.startsWith('---\n')) return { data: null, body: src, error: 'frontmatter must start with --- on line 1' };
  const end = src.indexOf('\n---', 4);
  if (end < 0) return { data: null, body: src, error: 'unterminated frontmatter' };
  const raw = src.slice(4, end);
  const body = src.slice(end + 4).replace(/^\n/, '');
  const data = {}; const order = []; let listKey = null;
  for (const [i, line] of raw.split('\n').entries()) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && listKey) { data[listKey].push(unquote(item[1].trim())); continue; }
    const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!kv) return { data: null, body, error: `cannot parse frontmatter line ${i + 2}: ${line}` };
    const [, k, v] = kv;
    order.push(k);
    if (v === '') { data[k] = []; listKey = k; } else { data[k] = unquote(v.trim()); listKey = null; }
  }
  return { data, order, body, raw };
}

function unquote(v) {
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
}

const needsQuote = (s) => /^[\s>|&*!%@`'"{[\]#?-]|: | #|^(true|false|null|yes|no)$/i.test(s) || /[:#]\s*$/.test(s);

export function serializeFrontmatter(data, order = Object.keys(data)) {
  const lines = ['---'];
  for (const k of order) {
    const v = data[k];
    if (v === undefined) continue;
    if (Array.isArray(v)) { lines.push(`${k}:`); for (const x of v) lines.push(`  - ${x}`); }
    else if (typeof v === 'boolean') lines.push(`${k}: ${v}`);
    else lines.push(`${k}: ${needsQuote(String(v)) ? JSON.stringify(String(v)) : v}`);
  }
  lines.push('---');
  return lines.join('\n') + '\n';
}
