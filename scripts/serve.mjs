#!/usr/bin/env node
// Zero-dependency static server for local development and previewing the
// production build. Serves the folder under a sub-path to mimic GitHub Pages:
//
//   node scripts/serve.mjs              -> public/ at http://localhost:5173/sales-reporter-pwa/
//   node scripts/serve.mjs dist 4173    -> dist/   at http://localhost:4173/sales-reporter-pwa/
//
// localhost counts as a secure context, so the service worker and install
// prompt work here exactly as they do on https.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(ROOT, process.argv[2] || 'public');
const port = Number(process.argv[3] || process.env.PORT || 5173);
const BASE = (process.env.BASE_PATH || '/sales-reporter-pwa/').replace(/\/?$/, '/');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/' || url.pathname === BASE.slice(0, -1)) {
    res.writeHead(302, { Location: BASE }); res.end(); return;
  }
  if (!url.pathname.startsWith(BASE)) { res.writeHead(404); res.end('Not found'); return; }
  let p = decodeURIComponent(url.pathname.slice(BASE.length)) || 'index.html';
  p = normalize(p).replace(/^(\.\.[/\\])+/, '');
  let file = join(dir, p);
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      ...(file.endsWith('service-worker.js') ? { 'Service-Worker-Allowed': BASE } : {}),
    });
    res.end(body);
  } catch {
    // mimic GitHub Pages: unknown paths get 404.html with a 404 status
    try { res.writeHead(404, { 'Content-Type': TYPES['.html'] }); res.end(await readFile(join(dir, '404.html'))); }
    catch { res.writeHead(404); res.end('Not found'); }
  }
}).listen(port, () => console.log(`Serving ${dir}\n  → http://localhost:${port}${BASE}`));
