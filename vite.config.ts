import { defineConfig, type PluginOption } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath, URL } from 'node:url';

/**
 * Two build targets from one codebase:
 *  - default: installable PWA (service worker, manifest, icons) → dist/
 *  - `--mode single`: one self-contained HTML file (no SW) → dist-single/
 *    that runs by double-clicking it on any PC.
 */
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  const plugins: PluginOption[] = [preact()];

  if (single) {
    plugins.push(viteSingleFile({ removeViteModuleLoader: true }));
  } else {
    plugins.push(
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['icons/*.png', 'icons/*.svg', 'splash/*.png'],
        manifest: {
          id: './',
          name: 'catkin',
          short_name: 'catkin',
          description: 'Look after the little things. Your habits grow the plants. The plants become a home.',
          start_url: './',
          scope: './',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#FAF6EF',
          theme_color: '#FAF6EF',
          categories: ['lifestyle', 'productivity', 'health'],
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
          globIgnores: ['splash/**'],
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
        },
      }),
    );
  }

  return {
    base: './',
    // Project-local cache so parallel worktrees sharing node_modules never collide.
    cacheDir: '.vite-cache',
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
    },
    server: { port: 5173 },
  };
});
