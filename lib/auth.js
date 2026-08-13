// 鉴权：用内置 crypto 自签 JWT，密码来自环境变量（默认 yfmyzjnb666）。
const crypto = require('crypto');

const ADMIN_USER = 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'yfmyzjnb666';
const AUTH_SECRET = process.env.AUTH_SECRET || 'yfmyzj-dev-secret-change-me';

function b64url(obj) { return Buffer.from(JSON.stringify(obj)).toString('base64url'); }

function signJWT(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const data = b64url(header) + '.' + b64url(payload);
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  return data + '.' + sig;
}
function verifyJWT(token) {
  if (!token) return null;
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  const data = parts[0] + '.' + parts[1];
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  if (sig !== parts[2]) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (e) { return null; }
}
function checkLogin(user, pass) {
  return user === ADMIN_USER && pass === ADMIN_PASS;
}
function issueToken() {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 天
  return signJWT({ sub: 'admin', exp });
}

module.exports = { verifyJWT, checkLogin, issueToken, ADMIN_USER };
