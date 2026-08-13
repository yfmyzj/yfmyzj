// 存储层：优先用 Upstash Redis（兼容 Vercel KV 的变量名），本地开发自动降级为 JSON 文件。
// 关键：所有读写都包 try/catch，任何存储异常都不抛出，避免 Vercel 函数直接 500。
const fs = require('fs');
const path = require('path');

const LOCAL_FILE = path.join(__dirname, '..', 'data', 'state.json');

// 惰性加载官方 SDK（本地没有依赖包时不影响 fallback 模式）
let Redis = null;
try { Redis = require('@upstash/redis').Redis; } catch (e) { Redis = null; }

function kvEnv() {
  return {
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
  };
}

let _client = null;
function client() {
  if (_client !== null) return _client;
  const e = kvEnv();
  try {
    _client = (e.url && e.token && Redis) ? new Redis({ url: e.url, token: e.token }) : false;
  } catch (err) {
    _client = false; // Redis 初始化失败也降级，不抛出
  }
  return _client;
}
function useKV() { return client() !== false; }

async function kvGet(key) {
  const c = client();
  if (!c) return null;
  try { return await c.get(key); } catch (err) { return null; }
}
async function kvSet(key, value) {
  const c = client();
  if (!c) return;
  try { await c.set(key, value); } catch (err) { /* 忽略写入失败 */ }
}
async function kvDel(key) {
  const c = client();
  if (!c) return;
  try { await c.del(key); } catch (err) { /* 忽略删除失败 */ }
}

// ---------- 本地 fallback（没有 KV 变量时） ----------
// 注意：Vercel 函数目录只读，写入可能失败，必须静默忽略。
function localAll() {
  try { return JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8')); } catch (e) { return {}; }
}
function localGet(key) { const m = localAll(); return m[key] ?? null; }
function localSet(key, val) {
  try {
    const m = localAll(); m[key] = val;
    fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
    fs.writeFileSync(LOCAL_FILE, JSON.stringify(m, null, 2));
  } catch (e) { /* 只读环境忽略 */ }
}
function localDel(key) {
  try {
    const m = localAll(); delete m[key];
    fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
    fs.writeFileSync(LOCAL_FILE, JSON.stringify(m, null, 2));
  } catch (e) { /* 只读环境忽略 */ }
}

module.exports = {
  useKV,
  async get(key) { return useKV() ? await kvGet(key) : localGet(key); },
  async set(key, val) { if (useKV()) await kvSet(key, val); else localSet(key, val); },
  async del(key) { if (useKV()) await kvDel(key); else localDel(key); },
};
