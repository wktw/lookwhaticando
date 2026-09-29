#!/usr/bin/env node
/**
 * The web app manifest's extra images, rendered from the real app and art with Playwright:
 *   npm run manifest-assets
 *  - public/icons/icon-maskable-192.png       the maskable app icon at 192 px (the 512 comes from npm run icons)
 *  - public/icons/shortcut-<tab>-96.png       home-screen shortcut icons (the tab glyphs, active, on paper)
 *  - public/screenshots/narrow-1170x2532.png  Chrome's install sheet, phone (390×844 @3)
 *  - public/screenshots/wide-2560x1600.png    Chrome's install sheet, computer (1280×800 @2)
 * vite.config.ts (MANIFEST) lists them; e2e/pwa.spec.ts checks every listed file is served.
 * Screenshots show the app as it is, with a fresh save and the window light at a fixed hour:
 * re-run this whenever the screens they show change (they are not precached).
 *
 * Options: --only=icons|screenshots
 */
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { mkdirSync, statSync } from 'node:fs';

const opt = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const SHORTCUTS = [
  { tab: 'today', icon: 'tab-today' },
  { tab: 'capsules', icon: 'tab-capsules' },
];
const SCREENSHOTS = [
  { file: 'public/screenshots/narrow-1170x2532.png', route: 'capsules', w: 390, h: 844, dpr: 3 },
  { file: 'public/screenshots/wide-2560x1600.png', route: 'shelf', w: 1280, h: 800, dpr: 2 },
];
/** A late-afternoon light, so the screenshots don't depend on when they were taken. */
const FIXED_TIME = new Date('2026-05-14T16:30:00').getTime();

const server = await createServer({ server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch();

async function open(ctx, path) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.clock.install({ time: FIXED_TIME });
  await page.clock.resume();
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  if (errors.length) throw new Error(`${path}:\n${errors.join('\n')}`);
  return page;
}

const report = (file) => console.log(`  ${file} (${(statSync(file).size / 1024).toFixed(0)} KB)`);

try {
  if (!opt.only || opt.only === 'icons') {
    mkdirSync('public/icons', { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: 320, height: 320 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    {
      const page = await open(ctx, '/scripts/stage/manifest.html?maskable=192');
      await page.locator('#stage-art').screenshot({ path: 'public/icons/icon-maskable-192.png' });
      report('public/icons/icon-maskable-192.png');
      await page.close();
    }
    for (const s of SHORTCUTS) {
      const file = `public/icons/shortcut-${s.tab}-96.png`;
      const page = await open(ctx, `/scripts/stage/manifest.html?shortcut=${s.icon}&size=96`);
      await page.locator('#stage-art').screenshot({ path: file });
      report(file);
      await page.close();
    }
    await ctx.close();
  }
  if (!opt.only || opt.only === 'screenshots') {
    mkdirSync('public/screenshots', { recursive: true });
    for (const s of SCREENSHOTS) {
      const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: s.dpr, colorScheme: 'light', reducedMotion: 'reduce' });
      const page = await open(ctx, `/#/${s.route}`);
      await page.locator('main h1').waitFor();
      await page.waitForTimeout(1200);
      await page.screenshot({ path: s.file });
      report(s.file);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  await server.close();
}
