import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { adminRequest } from '../api/admin.mjs';
import { portfolioRequest } from '../api/portfolio.mjs';
import { mediaRequest } from '../api/media.mjs';
import { authRequest } from '../server/auth.mjs';
import { nodeHandler } from '../server/http.mjs';
const admin = nodeHandler(adminRequest);
const portfolio = nodeHandler(portfolioRequest);
const media = nodeHandler(mediaRequest, 3145728);
const auth = nodeHandler(authRequest, 16384);

const root = fileURLToPath(new URL('../concept/rack/', import.meta.url));
const port = Number(process.env.PORT || 3000);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.txt': 'text/plain' };
const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/auth' || url.pathname.startsWith('/api/auth/')) return auth(req, res);
  const api = { '/api/admin': admin, '/api/portfolio': portfolio, '/api/media': media }[url.pathname];
  if (api) return api(req, res);
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
  try {
    const file = path.resolve(root, `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`);
    if (!file.startsWith(root) || !(await stat(file)).isFile()) throw new Error('Missing file');
    const frameAllowed = ['admin.html', 'project.html'].includes(path.relative(root, file));
    res.writeHead(200, { 'Content-Type': `${types[path.extname(file)] || 'application/octet-stream'}${['.html', '.css', '.js', '.json', '.txt'].includes(path.extname(file)) ? '; charset=utf-8' : ''}`, 'Cache-Control': 'no-store', 'X-Frame-Options': frameAllowed ? 'SAMEORIGIN' : 'DENY', 'Content-Security-Policy': frameAllowed ? "frame-ancestors 'self'" : "frame-ancestors 'none'" });
    res.end(req.method === 'HEAD' ? undefined : await readFile(file));
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Rack portfolio: http://localhost:${port}. Admin: http://localhost:${port}/admin.html`));
