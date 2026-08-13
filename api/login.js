const { checkLogin, issueToken } = require('../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: 'Method Not Allowed' })); return; }
  let body = '';
  for await (const c of req) body += c;
  let u;
  try { u = JSON.parse(body); } catch (e) { res.statusCode = 400; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: 'Bad Request' })); return; }
  if (checkLogin(u.user, u.pass)) {
    res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ token: issueToken() }));
  } else {
    res.statusCode = 401; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: '用户名或密码错误' }));
  }
};
