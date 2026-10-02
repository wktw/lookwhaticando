import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import type { Plugin } from 'vite';

type Package = { name: string; version: string; dependencies?: Record<string, string> };
const readPackage = (file: string) => JSON.parse(readFileSync(file, 'utf8')) as Package;

/** Packages may export their entry but hide package.json (notably Preact Signals). */
function packageFile(name: string, require_: NodeRequire): string {
  try { return require_.resolve(`${name}/package.json`); } catch { /* Find the entry's package instead. */ }
  let dir = dirname(require_.resolve(name));
  while (true) {
    const file = join(dir, 'package.json');
    if (existsSync(file) && readPackage(file).name === name) return file;
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`Cannot locate licence package ${name}`);
    dir = parent;
  }
}

/**
 * Full upstream notices, regenerated from the installed dependency graph on every build.
 * Fonts and generated service-worker roots are build dependencies that ship in the browser.
 * The Workbox roots match precaching and CacheFirst + expiration in vite.config.ts.
 */
export function licenseNotices(root: string): string {
  const appFile = resolve(root, 'package.json');
  const require_ = createRequire(appFile);
  const roots = [...Object.keys(readPackage(appFile).dependencies ?? {}), '@fontsource/castoro', '@fontsource-variable/nunito',
    'workbox-window', 'workbox-precaching', 'workbox-routing', 'workbox-strategies', 'workbox-cacheable-response', 'workbox-expiration'];
  const notices = new Map<string, string>();
  const visit = (name: string, from: NodeRequire, dependencies = true) => {
    const file = packageFile(name, from);
    const pkg = readPackage(file);
    const id = `${pkg.name}@${pkg.version}`;
    if (notices.has(id)) return;
    const dir = dirname(file);
    const licence = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'license.md'].map((n) => join(dir, n)).find(existsSync);
    if (!licence) throw new Error(`Missing full licence for ${id}`);
    notices.set(id, `${id}\n${'='.repeat(id.length)}\n${readFileSync(licence, 'utf8').trim()}\n`);
    const local = createRequire(file);
    if (dependencies) for (const dependency of Object.keys(pkg.dependencies ?? {})) visit(dependency, local);
  };
  for (const name of roots) visit(name, require_);
  // Vite emits module-preload helpers into the app. Its installed LICENSE also includes its
  // bundled notices; its build-only dependency graph is not part of our runtime graph.
  visit('vite', require_, false);
  return [...notices.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, text]) => text).join('\n');
}

const escapeText = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Separate and precached for the PWA; also embedded as inert text in the portable file. */
export function noticesPlugin(root: string, single: boolean): Plugin {
  const notices = licenseNotices(root);
  return {
    name: 'third-party-notices',
    generateBundle() { this.emitFile({ type: 'asset', fileName: 'licenses.txt', source: notices }); },
    transformIndexHtml: {
      order: 'pre',
      handler: () => single ? [{ tag: 'template', attrs: { id: 'third-party-notices' }, children: escapeText(notices), injectTo: 'body' as const }] : [],
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (new URL(req.url ?? '/', 'http://localhost').pathname !== `${server.config.base}licenses.txt`) return next();
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(notices);
      });
    },
  };
}
