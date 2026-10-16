// Serves dist/ under SITE_BASE (default /lectopoint/) for the e2e test: node tests/serve.mjs [port]
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const DIST = resolve(fileURLToPath(new URL('../dist', import.meta.url)));
const BASE = process.env.SITE_BASE || '/lectopoint/';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };
export function serve(port = 0) {
  const srv = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (!path.startsWith(BASE)) { res.writeHead(404); return res.end(); }
    let f = join(DIST, path.slice(BASE.length));
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
    if (!f.startsWith(DIST) || !existsSync(f)) { res.writeHead(404, { 'content-type': TYPES['.html'] }); return res.end(readFileSync(join(DIST, '404.html'))); }
    res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' });
    res.end(readFileSync(f));
  });
  return new Promise((r) => srv.listen(port, '127.0.0.1', () => r(srv)));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) serve(+process.argv[2] || 4190).then((s) => console.log(`http://127.0.0.1:${s.address().port}${BASE}`));
