/** Servidor local opcional, usando únicamente módulos incluidos en Node.js. */
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/assets/logo-oratorio.png', ['assets/logo-oratorio.png', 'image/png']]
]);

export function createServer() {
  return http.createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'same-origin');
    response.setHeader('Cache-Control', 'no-cache');
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end('Método no permitido');
      return;
    }
    let entry;
    try { entry = publicFiles.get(new URL(request.url, 'http://localhost').pathname); } catch { /* Respond with 404. */ }
    if (!entry) { response.writeHead(404); response.end('Página no encontrada'); return; }
    const [file, contentType] = entry;
    try {
      const filePath = path.join(root, file);
      const info = await stat(filePath);
      response.writeHead(200, { 'Content-Type': contentType, 'Content-Length': info.size });
      if (request.method === 'HEAD') response.end();
      else {
        const stream = createReadStream(filePath);
        stream.on('error', () => response.destroy());
        stream.pipe(response);
      }
    } catch { response.writeHead(500); response.end('No se pudo cargar el archivo'); }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  const server = createServer();
  server.on('error', error => { console.error(`No se pudo iniciar el servidor: ${error.message}`); process.exitCode = 1; });
  server.listen(port, host, () => console.log(`Bingo Oratorio listo en http://${host}:${port}`));
}
