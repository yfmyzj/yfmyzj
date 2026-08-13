const { getState, setState } = require('../lib/state');
const { verifyJWT } = require('../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'GET') {
    const s = await getState();
    res.statusCode = 200; res.end(JSON.stringify(s.posts));
    return;
  }
  if (req.method === 'POST') {
    if (!verifyJWT(req.headers['x-auth-token'])) { res.statusCode = 401; res.end(JSON.stringify({ error: '未授权' })); return; }
    let body = '';
    for await (const c of req) body += c;
    let p;
    try { p = JSON.parse(body); } catch (e) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Bad Request' })); return; }
    const s = await getState();
    p.id = Date.now();
    s.posts.unshift(p);
    await setState(s);
    res.statusCode = 201; res.end(JSON.stringify(p));
    return;
  }
  res.statusCode = 405; res.end(JSON.stringify({ error: 'Method Not Allowed' }));
};
