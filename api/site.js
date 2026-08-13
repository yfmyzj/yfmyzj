const { getState, setState } = require('../lib/state');
const { verifyJWT } = require('../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'GET') {
    const s = await getState();
    res.statusCode = 200; res.end(JSON.stringify(s.site));
    return;
  }
  if (req.method === 'PUT') {
    if (!verifyJWT(req.headers['x-auth-token'])) { res.statusCode = 401; res.end(JSON.stringify({ error: '未授权' })); return; }
    let body = '';
    for await (const c of req) body += c;
    let site;
    try { site = JSON.parse(body); } catch (e) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Bad Request' })); return; }
    const s = await getState();
    s.site = site;
    await setState(s);
    res.statusCode = 200; res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.statusCode = 405; res.end(JSON.stringify({ error: 'Method Not Allowed' }));
};
