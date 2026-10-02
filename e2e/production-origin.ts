/** A private production origin with real outage controls, independent of other projects. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain', '.ics': 'text/calendar' };
export async function productionOrigin(unavailable: (path: string) => boolean = () => false) {
  const root = resolve('dist');
  const server = createServer(async (request, response) => {
    try {
      const path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
      if (unavailable(path)) { response.writeHead(503, { 'Cache-Control': 'no-store' }).end('Temporarily unavailable'); return; }
      const file = resolve(root, `.${path === '/' ? '/index.html' : path}`);
      if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
      const body = await readFile(file);
      // Navigation must come from the service worker, never the browser's ordinary HTTP cache.
      response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(body);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('The offline test origin did not bind TCP');
  return {
    url: `http://127.0.0.1:${address.port}/`,
    get listening() { return server.listening; },
    close: () => new Promise<void>((resolve, reject) => {
      if (!server.listening) { resolve(); return; }
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    }),
  };
}
