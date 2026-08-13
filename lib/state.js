// 状态层：首次访问自动用 js/content.js 里的 SITE/POSTS 作为初始内容。
// 存储按 key 拆分（站点、文章索引、每篇文章各自独立），避免 KV 单值体积上限（约 512KB）。
const fs = require('fs');
const path = require('path');
const store = require('./kv');

const SITE_KEY = 'blog:site';
const IDS_KEY = 'blog:ids';
const postKey = (id) => 'blog:post:' + id;

function defaultState() {
  try {
    const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'content.js'), 'utf8');
    const mod = { exports: {} };
    new Function('module', 'exports', code + '\nmodule.exports = { SITE, POSTS };')(mod, mod.exports);
    return { site: mod.exports.SITE, posts: mod.exports.POSTS };
  } catch (e) {
    return {
      site: { name: '一分没有真君', handle: 'yfmyzj', tagline: '', avatar: '', bio: '', socials: [], sections: [] },
      posts: [],
    };
  }
}

async function getState() {
  const site = await store.get(SITE_KEY);
  const ids = (await store.get(IDS_KEY)) || [];
  if (site && Array.isArray(ids) && ids.length) {
    const posts = [];
    for (const id of ids) {
      const p = await store.get(postKey(id));
      if (p) posts.push(p);
    }
    return { site, posts };
  }
  // 首次：用 content.js 作为初始内容写入存储（KV 或本地）
  const d = defaultState();
  await setSite(d.site);
  await store.set(IDS_KEY, d.posts.map((p) => p.id));
  for (const p of d.posts) await store.set(postKey(p.id), p);
  return d;
}

// 兼容旧 API：传入完整 {site, posts} 整体写回（拆成多个 key）
async function setState(s) {
  await setSite(s.site);
  await store.set(IDS_KEY, s.posts.map((p) => p.id));
  for (const p of s.posts) await store.set(postKey(p.id), p);
  return s;
}

async function setSite(site) { await store.set(SITE_KEY, site); return site; }

module.exports = { getState, setState, setSite, defaultState, SITE_KEY, IDS_KEY, postKey };
