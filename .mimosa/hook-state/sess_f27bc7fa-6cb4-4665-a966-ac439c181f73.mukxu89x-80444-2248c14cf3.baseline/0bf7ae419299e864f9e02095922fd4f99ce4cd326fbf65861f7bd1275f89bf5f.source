// 本地静态服务器：node tools/server.js [port]
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.glb': 'model/gltf-binary',
  '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.map': 'application/json',
};
const port = +(process.argv[2] || 5189);
http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); res.end(); return; }
  if (p === '/') p = '/index.html';
  // 白名单校验：仅允许根目录内文件，杜绝 ../ 路径穿越
  const target = path.resolve(ROOT, '.' + path.posix.normalize('/' + p));
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(target, (err, data) => {
    if (err) { res.writeHead(404); res.end('404'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, () => {
  console.log('serving http://localhost:' + port + '/');
});
