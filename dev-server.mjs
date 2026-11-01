import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 5179);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
};

createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  const route = url.pathname === '/' ? '/index.html' : url.pathname;
  const isStudio = route === '/studio' || route === '/studio/';
  const isAdmin = route === '/admin' || route === '/admin/';
  const pathname = decodeURIComponent(isStudio ? '/studio.html' : isAdmin ? '/admin.html' : route);
  const path = resolve(root, '.' + pathname);
  if (!path.startsWith(root)) {
    response.writeHead(403).end();
    return;
  }
  try {
    const data = await readFile(path);
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' }).end(data);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log('Crush Note preview: http://127.0.0.1:' + port + '/'));
