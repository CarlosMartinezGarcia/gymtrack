// Sirve dist/ para probar el build: node scripts/serve.mjs  ->  http://localhost:4173
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const dir = join(new URL('..', import.meta.url).pathname, 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.map': 'application/json' };
const port = Number(process.env.PORT ?? 4173);

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(dir, path);
  try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); } catch { file = join(dir, 'index.html'); }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': file.endsWith('sw.js') || file.endsWith('.html') ? 'no-cache' : 'public, max-age=31536000, immutable' });
    res.end(body);
  } catch { res.writeHead(404); res.end('No encontrado'); }
}).listen(port, () => console.log(`dist/ en http://localhost:${port}`));
