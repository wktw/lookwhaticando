import { defineConfig, type Plugin, type PluginOption } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA, type ManifestOptions } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

/**
 * Two build targets from one codebase:
 *  - default: installable PWA (service worker, manifest, icons) → dist/
 *  - `--mode single`: one self-contained HTML file (no SW, no public/ folder) → dist-single/
 *    that runs by double-clicking it on any PC, and still works once it is moved on its own.
 */

/** The fonts the first screen paints with: every H1 is Castoro roman, every control is Nunito. */
export const PRELOAD_FONTS: readonly RegExp[] = [/\/castoro-latin-400-normal-[\w-]+\.woff2$/, /\/nunito-latin-wght-normal-[\w-]+\.woff2$/];

/** index.html markers around the iOS launch screens (written by scripts/generate-icons.mjs). */
export const STARTUP_START = '<!--startup-images-->';
export const STARTUP_END = '<!--/startup-images-->';

/**
 * The web app manifest. Chrome's richer install sheet reads `screenshots`; a long press on the
 * home-screen icon offers `shortcuts`. There is no `orientation`: tablets and desktops use the
 * sidebar layout in landscape. The app icons (both maskable sizes too) come from
 * scripts/generate-icons.mjs; the shortcut icons and the screenshots from scripts/manifest-assets.mjs.
 */
export const MANIFEST: Partial<ManifestOptions> = {
  id: './',
  name: 'catkin',
  short_name: 'catkin',
  description: 'Look after the little things. Your habits grow the plants. The plants become a home.',
  start_url: './',
  scope: './',
  display: 'standalone',
  background_color: '#FAF6EF',
  theme_color: '#FAF6EF',
  categories: ['lifestyle', 'productivity', 'health'],
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  shortcuts: [
    {
      name: 'Today',
      short_name: 'Today',
      description: 'Water today’s plants',
      url: './#/today',
      icons: [{ src: 'icons/shortcut-today-96.png', sizes: '96x96', type: 'image/png' }],
    },
    {
      name: 'Capsules',
      short_name: 'Capsules',
      description: 'Turn the handle on a capsule cabinet',
      url: './#/capsules',
      icons: [{ src: 'icons/shortcut-capsules-96.png', sizes: '96x96', type: 'image/png' }],
    },
  ],
  screenshots: [
    { src: 'screenshots/narrow-1170x2532.png', sizes: '1170x2532', type: 'image/png', form_factor: 'narrow', label: 'The Cats capsule cabinet, on a phone' },
    { src: 'screenshots/wide-2560x1600.png', sizes: '2560x1600', type: 'image/png', form_factor: 'wide', label: 'The Shelf: the windowsill, two pets and the places to buy' },
  ],
};

/**
 * What the service worker precaches on its first install: only what the app needs offline.
 * iOS fetches launch screens outside the service worker, only the install sheet shows the
 * screenshots, and Latin Extended Nunito loads only when a name needs it (it is then cached at
 * runtime). public/ is not listed in `includeAssets`, which would bypass these ignores, and the
 * plugin's own manifest and manifest-icon entries are left off, since the glob already has them.
 */
export const PRECACHE_GLOB: readonly string[] = ['**/*.{js,css,html,woff2,png,svg,ics}'];
export const PRECACHE_IGNORE: readonly string[] = ['splash/**', 'screenshots/**', 'assets/nunito-latin-ext-*.woff2'];

/** The two big generated art tables get chunks of their own, so they cache apart from the code. */
export function manualChunks(id: string): string | undefined {
  const path = id.split('\\').join('/');
  if (path.endsWith('/src/art/scene/decor/shade.gen.ts')) return 'art-shade';
  if (path.endsWith('/src/art/pets/crescents/data.ts')) return 'pet-crescents';
  return undefined;
}

/** PWA build: preload the two first-paint fonts, so the H1 doesn't paint in a fallback and then swap. */
export function preloadFonts(): Plugin {
  return {
    name: 'catkin:preload-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const files = Object.keys(ctx.bundle ?? {});
        return PRELOAD_FONTS.map((re) => {
          const file = files.find((f) => re.test(`/${f}`));
          if (!file) throw new Error(`catkin:preload-fonts: no bundled font matches ${re}`);
          return {
            tag: 'link',
            attrs: { rel: 'preload', href: `./${file}`, as: 'font', type: 'font/woff2', crossorigin: '' },
            injectTo: 'head' as const,
          };
        });
      },
    },
  };
}

/** Remove what's between two markers, markers included. Without both markers the input is returned as is. */
export function stripBetween(html: string, start: string, end: string): string {
  const at = html.indexOf(start);
  const endAt = at < 0 ? -1 : html.indexOf(end, at);
  if (at < 0 || endAt < 0) return html;
  return html.slice(0, at).replace(/[ \t]*$/, '') + html.slice(endAt + end.length).replace(/^\r?\n/, '');
}

/**
 * Single-file build: the file travels alone, so nothing may point next to it. The iOS launch
 * screens go (a file:// page is never a home-screen app) and the apple-touch-icon is inlined.
 */
export function singleFileHtml(publicDir: string): Plugin {
  return {
    name: 'catkin:single-file-html',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const out = stripBetween(html, STARTUP_START, STARTUP_END);
        return out.replace(/(<link rel="apple-touch-icon" href=")(?:\.\/)?(icons\/[\w.-]+\.png)(")/, (_m, open: string, file: string, close: string) => {
          const png = readFileSync(new URL(file, publicDir));
          return `${open}data:image/png;base64,${png.toString('base64')}${close}`;
        });
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  const plugins: PluginOption[] = [preact()];

  if (single) {
    plugins.push(singleFileHtml(new URL('./public/', import.meta.url).href), viteSingleFile({ removeViteModuleLoader: true }));
  } else {
    plugins.push(
      preloadFonts(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        manifest: MANIFEST,
        includeManifestIcons: false,
        workbox: {
          globPatterns: [...PRECACHE_GLOB],
          globIgnores: [...PRECACHE_IGNORE],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/\/cal\/[^/]+\.ics$/],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: /\/assets\/nunito-latin-ext-[\w-]+\.woff2$/,
              handler: 'CacheFirst',
              options: { cacheName: 'catkin-fonts', expiration: { maxEntries: 4 } },
            },
          ],
        },
      }),
    );
  }

  return {
    base: './',
    // Project-local cache so parallel worktrees sharing node_modules never collide.
    cacheDir: '.vite-cache',
    // public/ (icons, launch screens, screenshots) is for the hosted app; the lone file carries nothing beside it.
    publicDir: single ? false : 'public',
    plugins,
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    define: {
      __SINGLE_FILE__: JSON.stringify(single),
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.0.0'),
    },
    build: {
      outDir: single ? 'dist-single' : 'dist',
      target: ['es2020', 'safari15'],
      assetsInlineLimit: single ? 100_000_000 : 4096,
      cssCodeSplit: !single,
      rollupOptions: single ? {} : { output: { manualChunks } },
    },
    server: { port: 5173 },
  };
});
