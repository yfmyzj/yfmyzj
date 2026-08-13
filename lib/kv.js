// 存储层：优先用 Upstash Redis（兼容 Vercel KV 的变量名），本地开发自动降级为 JSON 文件。
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
  _client = (e.url && e.token && Redis) ? new Redis({ url: e.url, token: e.token }) : false;
  return _client;
}
function useKV() { return client() !== false; }

async function kvGet(key) { const c = client(); return c ? await c.get(key) : null; }
async function kvSet(key, value) { const c = client(); if (c) await c.set(key, value); }
async function kvDel(key) { const c = client(); if (c) await c.del(key); }

// ---------- 本地 fallback（没有 KV 变量时） ----------
function localAll() { try { return JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8')); } catch (e) { return {}; } }
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
