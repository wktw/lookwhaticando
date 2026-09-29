#!/usr/bin/env node
/**
 * Screenshot helper for visual review.
 *   node scripts/shoot.mjs <path> <out.png> [--w=390] [--h=844] [--full] [--dark] [--wait=600] [--scale=2]
 * Examples:
 *   node scripts/shoot.mjs "/gallery.html?only=pets" .shots/pets.png --w=1200 --full
 *   node scripts/shoot.mjs "/#/today" .shots/today.png
 * Starts a Vite dev server on a free port, captures, and exits.
 */
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const [, , path = '/', out = '.shots/shot.png', ...rest] = process.argv;
const opt = Object.fromEntries(
  rest.map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const w = Number(opt.w ?? 390);
const h = Number(opt.h ?? 844);
const scale = Number(opt.scale ?? 2);
const wait = Number(opt.wait ?? 700);

const server = await createServer({ server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const addr = server.httpServer.address();
const base = `http://127.0.0.1:${addr.port}`;
const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: scale,
    colorScheme: opt.dark ? 'dark' : 'light',
    reducedMotion: opt.motion ? 'no-preference' : 'reduce',
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  if (opt.seed) {
    await page.addInitScript((seed) => localStorage.setItem('mochi-meadow:v1', seed), String(opt.seed));
  }
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(wait);
  mkdirSync(dirname(out), { recursive: true });
  await page.screenshot({ path: out, fullPage: !!opt.full });
  if (errors.length) console.error('PAGE ERRORS:\n' + errors.join('\n'));
  console.log(`saved ${out}`);
} finally {
  await browser.close();
  await server.close();
}
