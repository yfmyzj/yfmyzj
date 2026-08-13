// 本地开发服务器：serve 静态文件 + 把 /api/* 转发到 api 下的处理函数。
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const root = __dirname;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const apiHandlers = {
  '/api/login': require('./api/login'),
  '/api/posts': require('./api/posts'),
  '/api/post': require('./api/post'),
  '/api/site': require('./api/site'),
  '/api/seed': require('./api/seed'),
};

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const pathname = u.pathname;
  if (apiHandlers[pathname]) {
    try { await apiHandlers[pathname](req, res); }
    catch (e) { res.statusCode = 500; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: String(e) })); }
    return;
  }
  let fp = path.join(root, pathname === '/' ? 'index.html' : pathname);
  if (!fp.startsWith(root)) { res.statusCode = 403; res.end('Forbidden'); return; }
  fs.readFile(fp, (err, data) => {
    if (err) { res.statusCode = 404; res.end('Not found'); return; }
    res.setHeader('Content-Type', mime[path.extname(fp)] || 'application/octet-stream');
    res.end(data);
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log('dev server on http://localhost:' + port));
