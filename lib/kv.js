// 存储层：优先用 Vercel KV（REST），本地开发自动降级为 JSON 文件（按 key 存成 map）。
const fs = require('fs');
const path = require('path');

const LOCAL_FILE = path.join(__dirname, '..', 'data', 'state.json');

function kvEnv() {
  return { url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN };
}
function useKV() {
  const e = kvEnv();
  return !!e.url && !!e.token;
}

async function kvGet(key) {
  const e = kvEnv();
  const res = await fetch(e.url + '/' + key, { headers: { Authorization: `Bearer ${e.token}` } });
  if (res.status === 404) return null;
  const j = await res.json().catch(() => ({}));
  return j && 'result' in j ? j.result : j;
}
async function kvSet(key, value) {
  const e = kvEnv();
  await fetch(e.url + '/' + key, {
    method: 'POST',
    headers: { Authorization: `Bearer ${e.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
}
async function kvDel(key) {
  const e = kvEnv();
  await fetch(e.url + '/' + key, { method: 'DELETE', headers: { Authorization: `Bearer ${e.token}` } });
}

function localAll() {
  try { return JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8')); } catch (e) { return {}; }
}
function localGet(key) { const m = localAll(); return m[key] ?? null; }
function localSet(key, val) {
  const m = localAll(); m[key] = val;
  fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(m, null, 2));
}
function localDel(key) {
  const m = localAll(); delete m[key];
  fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(m, null, 2));
}

module.exports = {
  useKV,
  async get(key) { return useKV() ? await kvGet(key) : localGet(key); },
  async set(key, val) { if (useKV()) await kvSet(key, val); else localSet(key, val); },
  async del(key) { if (useKV()) await kvDel(key); else localDel(key); },
};
