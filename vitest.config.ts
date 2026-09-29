import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  cacheDir: '.vite-cache',
  plugins: [preact()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  define: { __SINGLE_FILE__: 'false', __APP_VERSION__: '"test"' },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
  },
});
