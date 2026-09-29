#!/usr/bin/env node
/**
 * App icons + iOS launch screens, rendered from the REAL art (PetArt Mochi) with Playwright.
 *   npm run icons
 * Starts a Vite dev server, screenshots the stages in src/dev/sections-fxui.tsx
 * (fxui-appicon / fxui-splash), writes PNGs into public/, and rewrites the
 * <link rel="apple-touch-startup-image"> block in index.html between the startup-images markers.
 * public/icons/favicon.svg is hand-authored and not generated.
 */
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const ICONS = [
  { file: 'public/icons/apple-touch-icon.png', size: 180, shape: 'square' }, // iOS masks it itself
  { file: 'public/icons/icon-192.png', size: 192, shape: 'squircle' },
  { file: 'public/icons/icon-512.png', size: 512, shape: 'squircle' },
  { file: 'public/icons/icon-maskable-512.png', size: 512, shape: 'maskable' }, // art inside the 80% safe zone
];

/** Portrait iPhone screens: CSS width × height @ pixel ratio (→ PNG pixels). */
const DEVICES = [
  { w: 440, h: 956, dpr: 3, name: '16 Pro Max / 17 Pro Max' }, // 1320×2868
  { w: 430, h: 932, dpr: 3, name: '14–16 Pro Max & Plus' }, // 1290×2796
  { w: 420, h: 912, dpr: 3, name: 'Air' }, // 1260×2736
  { w: 402, h: 874, dpr: 3, name: '16 Pro / 17 / 17 Pro' }, // 1206×2622
  { w: 393, h: 852, dpr: 3, name: '14 Pro / 15 / 15 Pro / 16' }, // 1179×2556
  { w: 428, h: 926, dpr: 3, name: '12–13 Pro Max / 14 Plus' }, // 1284×2778
  { w: 390, h: 844, dpr: 3, name: '12–14 / 16e' }, // 1170×2532
  { w: 375, h: 812, dpr: 3, name: 'X / XS / 11 Pro / 12–13 mini' }, // 1125×2436
  { w: 414, h: 896, dpr: 3, name: 'XS Max / 11 Pro Max' }, // 1242×2688
  { w: 414, h: 896, dpr: 2, name: 'XR / 11' }, // 828×1792
  { w: 375, h: 667, dpr: 2, name: 'SE / 8' }, // 750×1334
];
const THEMES = ['light', 'night'];

const START = '<!--startup-images-->';
const END = '<!--/startup-images-->';

const server = await createServer({ server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch();

/** Hide the gallery chrome and page background so only the stage is captured. */
const BARE = '.gal > h1, .gal-section > h2 { display: none !important } html, body, .gal { background: transparent !important; padding: 0 !important; margin: 0 !important }';

async function open(ctx, path) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: BARE });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  if (errors.length) throw new Error(`${path}: ${errors.join('\n')}`);
  return page;
}

try {
  mkdirSync('public/icons', { recursive: true });
  mkdirSync('public/splash', { recursive: true });

  const iconCtx = await browser.newContext({ viewport: { width: 640, height: 640 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  for (const icon of ICONS) {
    const page = await open(iconCtx, `/gallery.html?only=fxui-appicon&stage=${icon.shape}&size=${icon.size}`);
    await page.locator('#mm-icon-stage').screenshot({ path: icon.file, omitBackground: icon.shape === 'squircle' });
    await page.close();
    console.log(`  ${icon.file} (${icon.size}×${icon.size}, ${icon.shape})`);
  }

  const links = [];
  for (const d of DEVICES) {
    for (const theme of THEMES) {
      const file = `splash/iphone-${d.w * d.dpr}x${d.h * d.dpr}-${theme}.png`;
      const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, reducedMotion: 'reduce' });
      const page = await open(ctx, `/gallery.html?only=fxui-splash&splash=${theme}&w=${d.w}&h=${d.h}`);
      await page.screenshot({ path: `public/${file}` });
      await ctx.close();
      const media = `(device-width: ${d.w}px) and (device-height: ${d.h}px) and (-webkit-device-pixel-ratio: ${d.dpr}) and (orientation: portrait) and (prefers-color-scheme: ${theme === 'night' ? 'dark' : 'light'})`;
      links.push(`    <link rel="apple-touch-startup-image" media="${media}" href="./${file}" />`);
      console.log(`  public/${file} (iPhone ${d.name})`);
    }
  }

  const html = readFileSync('index.html', 'utf8');
  const start = html.indexOf(START);
  if (start < 0) throw new Error(`index.html is missing the ${START} marker`);
  const endAt = html.indexOf(END);
  const tail = endAt >= 0 ? html.slice(endAt + END.length) : html.slice(start + START.length);
  writeFileSync('index.html', `${html.slice(0, start)}${START}\n${links.join('\n')}\n    ${END}${tail}`);
  console.log(`  index.html: ${links.length} startup images`);
} finally {
  await browser.close();
  await server.close();
}
