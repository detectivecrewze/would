import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 5179);
function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

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
  const shareMatch = route.match(/^\/share\/([a-z0-9][a-z0-9-]{2,63})$/);
  if (shareMatch) {
    const id = shareMatch[1];
    try {
      const result = await fetch('http://127.0.0.1:8787/api/public/gifts/' + encodeURIComponent(id));
      const payload = await result.json();
      if (!result.ok || !payload.project) throw new Error('Gift is unavailable');
      const project = payload.project;
      const recipient = String(project.recipient || '').trim();
      const english = project.locale === 'en';
      const title = recipient ? (english ? `A little surprise for ${recipient} — Crush Note` : `Ada kejutan kecil untuk ${recipient} — Crush Note`) : (english ? 'A little surprise for you — Crush Note' : 'Ada kejutan kecil untukmu — Crush Note');
      const description = english ? 'Someone made a little story just for you. Open it when you are ready to discover the surprise.' : 'Ada cerita kecil yang disiapkan khusus untukmu. Buka saat kamu siap menemukan kejutan di dalamnya.';
      const image = project.puzzle?.photo || 'http://127.0.0.1:' + port + '/assets/our-moment.jpg';
      const giftUrl = 'http://127.0.0.1:' + port + '/share/' + encodeURIComponent(id);
      const redirectUrl = '/?gift=' + encodeURIComponent(id);
      const html = `<!doctype html><html lang="${english ? 'en' : 'id'}"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta property="og:type" content="website"><meta property="og:site_name" content="Crush Note"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(giftUrl)}"><meta property="og:image" content="${escapeHtml(image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${escapeHtml(image)}"><script>location.replace(${JSON.stringify(redirectUrl)})</script></head><body><a href="${escapeHtml(redirectUrl)}">Buka gift</a></body></html>`;
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(html);
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }).end('Gift belum ditemukan atau belum dipublikasikan.');
    }
    return;
  }
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
