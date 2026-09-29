/**
 * Playwright e2e (DESIGN §11 gates). `npm run e2e` runs against the Vite dev server;
 * `npm run e2e:preview` (and `npm run check`, after both builds) runs against `vite preview` of
 * dist/, the bundle that ships, with its service worker. See e2e/README.md.
 *
 * Projects:
 *  - phone-light / phone-dark / desktop-light / desktop-dark: every route renders with no errors
 *    and no axe violations (e2e/routes.spec.ts).
 *  - phone-320: nothing scrolls sideways at 320 px (e2e/layout.spec.ts).
 *  - single-file: dist-single/catkin.html opened from file:// (e2e/single-file.spec.ts).
 *  - pwa: the service worker takes over and the app opens offline (preview only, e2e/pwa.spec.ts).
 * All of them run Chromium with reduced motion, so nothing is mid-animation when axe reads it.
 */
import { defineConfig, devices, type Project } from '@playwright/test';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

// The container ships Chromium here; CI installs its own (see .github/workflows/ci.yml).
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync('/opt/pw-browsers')) process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers';

const CI = !!process.env.CI;
const TARGET = process.env.E2E_TARGET === 'preview' ? 'preview' : 'dev';
/** A port per checkout, so parallel worktrees never reuse each other's server. */
const PORT = 5200 + (createHash('sha1').update(process.cwd()).digest().readUInt16BE(0) % 600) + (TARGET === 'preview' ? 600 : 0);
const BASE_URL = `http://127.0.0.1:${PORT}/`;

const phone = { ...devices['iPhone 13'], browserName: 'chromium' as const, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 };
const desktop = { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } };
const routes = /routes\.spec\.ts$/;
const screens = /(you|onboarding|today|progress|shelf|capsules)\.spec\.ts$/;

const projects: Project[] = [
  { name: 'phone-light', testMatch: routes, use: { ...phone, colorScheme: 'light' } },
  { name: 'phone-dark', testMatch: routes, use: { ...phone, colorScheme: 'dark' } },
  { name: 'desktop-light', testMatch: routes, use: { ...desktop, colorScheme: 'light' } },
  { name: 'desktop-dark', testMatch: routes, use: { ...desktop, colorScheme: 'dark' } },
  { name: 'phone-320', testMatch: /layout\.spec\.ts$/, use: { ...phone, viewport: { width: 320, height: 640 } } },
  { name: 'single-file', testMatch: /single-file\.spec\.ts$/, use: { ...phone } },
  // The screens' own journeys (wave 2), phone and desktop, light and dark.
  { name: 'screens-phone-light', testMatch: screens, use: { ...phone, colorScheme: 'light' } },
  { name: 'screens-phone-dark', testMatch: screens, use: { ...phone, colorScheme: 'dark' } },
  { name: 'screens-desktop-light', testMatch: screens, use: { ...desktop, colorScheme: 'light' } },
  { name: 'screens-desktop-dark', testMatch: screens, use: { ...desktop, colorScheme: 'dark' } },
];
if (TARGET === 'preview') {
  projects.push({ name: 'pwa', testMatch: /pwa\.spec\.ts$/, use: { ...desktop, serviceWorkers: 'allow' } });
  // Screen tests that need the service worker, tagged @pwa (You's static calendar files).
  projects.push({ name: 'pwa-screens', testMatch: screens, grep: /@pwa/, use: { ...desktop, serviceWorkers: 'allow' } });
}

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  // The machine running this is often busy: generous timeouts, few workers, one retry on CI.
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  workers: CI ? 2 : 3,
  retries: CI ? 1 : 0,
  forbidOnly: CI,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    contextOptions: { reducedMotion: 'reduce' },
    // The route checks run without the service worker (pwa.spec.ts covers it), so no update or offline notes intrude.
    serviceWorkers: 'block',
    navigationTimeout: 60_000,
    actionTimeout: 20_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects,
  webServer: {
    command: TARGET === 'preview' ? `npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort` : `npx vite --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !CI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
