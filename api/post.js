const { getState, setState } = require('../lib/state');
const { verifyJWT } = require('../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const id = Number(new URL(req.url, 'http://localhost').searchParams.get('id'));
  if (!verifyJWT(req.headers['x-auth-token'])) { res.statusCode = 401; res.end(JSON.stringify({ error: '未授权' })); return; }
  const s = await getState();
  if (req.method === 'PUT') {
    let body = '';
    for await (const c of req) body += c;
    let p;
    try { p = JSON.parse(body); } catch (e) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Bad Request' })); return; }
    s.posts = s.posts.map((x) => (x.id === id ? { ...x, ...p, id: x.id } : x));
    await setState(s);
    res.statusCode = 200; res.end(JSON.stringify({ ok: true }));
    return;
  }
  if (req.method === 'DELETE') {
    s.posts = s.posts.filter((x) => x.id !== id);
    await setState(s);
    res.statusCode = 200; res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.statusCode = 405; res.end(JSON.stringify({ error: 'Method Not Allowed' }));
};
