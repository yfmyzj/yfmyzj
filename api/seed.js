// 重置为 js/content.js 的初始内容（需登录）。
const { setState, defaultState } = require('../lib/state');
const { verifyJWT } = require('../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ error: 'Method Not Allowed' })); return; }
  if (!verifyJWT(req.headers['x-auth-token'])) { res.statusCode = 401; res.end(JSON.stringify({ error: '未授权' })); return; }
  await setState(defaultState());
  res.statusCode = 200; res.end(JSON.stringify({ ok: true }));
};
