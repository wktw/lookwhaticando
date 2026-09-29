#!/usr/bin/env node
/**
 * App icons + iOS launch screens, rendered from the REAL art (PetArt Mochi) with Playwright.
 *   npm run icons
 * Starts a Vite dev server, screenshots the stages in src/dev/sections-fxui.tsx
 * (fxui-appicon / fxui-splash), writes PNGs into public/, and rewrites the
 * <link rel="apple-touch-startup-image"> block in index.html between the startup-images markers.
 * public/icons/favicon.svg is hand-authored and not generated; it is also inlined into
 * index.html (between the favicon markers) so the single-file build carries it.
 *
 * Launch screens are flat pastel discs, so they're stored as 256-color palette PNGs
 * (about a fifth of the size of the screenshots Playwright takes).
 */
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { crc32, deflateSync, inflateSync } from 'node:zlib';

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
const FAVICON_START = '<!--favicon-->';
const FAVICON_END = '<!--/favicon-->';

/* ---------------- Palette PNGs (no dependencies: zlib + a median cut) ---------------- */

/** Decode an 8-bit, non-interlaced RGB/RGBA PNG (what Playwright writes) to RGB pixels. */
function decodePng(buf) {
  let pos = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[12] !== 0 || (data[9] !== 2 && data[9] !== 6)) throw new Error('unsupported PNG');
      channels = data[9] === 6 ? 4 : 3;
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rgb = new Uint8Array(width * height * 3);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = new Uint8Array(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? cur[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      const p = a + b - c;
      const pa = Math.abs(p - a);
      const pb = Math.abs(p - b);
      const pc = Math.abs(p - c);
      const predictor = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter];
      cur[i] = (line[i] + predictor) & 255;
    }
    for (let x = 0; x < width; x++) rgb.set(cur.subarray(x * channels, x * channels + 3), (y * width + x) * 3);
    prev = cur;
  }
  return { width, height, rgb };
}

/**
 * Up to 256 colors: every large flat area keeps its exact color (so the launch screen matches
 * the app's background pixel for pixel), and a median cut shares the rest among the edges.
 */
function buildPalette(rgb) {
  const counts = new Map();
  for (let i = 0; i < rgb.length; i += 3) {
    const c = (rgb[i] << 16) | (rgb[i + 1] << 8) | rgb[i + 2];
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const colors = [...counts].sort((a, b) => b[1] - a[1]);
  const flat = colors.filter(([, n]) => n >= (rgb.length / 3) * 0.001).slice(0, 96);
  const palette = flat.map(([c]) => c);
  let boxes = [colors.slice(flat.length)];
  const channel = (c, k) => (c >> (16 - 8 * k)) & 255;
  while (palette.length + boxes.length < 256) {
    let widest = null;
    for (const box of boxes) {
      if (box.length < 2) continue;
      for (let k = 0; k < 3; k++) {
        let lo = 255;
        let hi = 0;
        for (const [c] of box) {
          lo = Math.min(lo, channel(c, k));
          hi = Math.max(hi, channel(c, k));
        }
        if (!widest || hi - lo > widest.range) widest = { box, k, range: hi - lo };
      }
    }
    if (!widest || widest.range === 0) break;
    const { box, k } = widest;
    box.sort((a, b) => channel(a[0], k) - channel(b[0], k));
    const total = box.reduce((n, [, w]) => n + w, 0);
    let acc = 0;
    let cut = 1;
    while (cut < box.length - 1 && (acc += box[cut - 1][1]) < total / 2) cut++;
    boxes = boxes.filter((b) => b !== box).concat([box.slice(0, cut), box.slice(cut)]);
  }
  for (const box of boxes) {
    if (!box.length) continue;
    const sum = [0, 0, 0];
    let n = 0;
    for (const [c, w] of box) {
      for (let k = 0; k < 3; k++) sum[k] += channel(c, k) * w;
      n += w;
    }
    palette.push((Math.round(sum[0] / n) << 16) | (Math.round(sum[1] / n) << 8) | Math.round(sum[2] / n));
  }
  return palette;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
  return Buffer.concat([head, data, crc]);
}

/** Re-encode an RGB(A) screenshot as a palette PNG. */
function toPalettePng(png) {
  const { width, height, rgb } = decodePng(png);
  const palette = buildPalette(rgb);
  const nearest = new Map(palette.map((c, i) => [c, i]));
  const indexOf = (c) => {
    let best = nearest.get(c);
    if (best !== undefined) return best;
    let bestD = Infinity;
    palette.forEach((p, i) => {
      const d = ((p >> 16) - (c >> 16)) ** 2 + (((p >> 8) & 255) - ((c >> 8) & 255)) ** 2 + ((p & 255) - (c & 255)) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    nearest.set(c, best);
    return best;
  };
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      raw[y * (width + 1) + 1 + x] = indexOf((rgb[i] << 16) | (rgb[i + 1] << 8) | rgb[i + 2]);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 3, 0, 0, 0], 8);
  const plte = Buffer.from(palette.flatMap((c) => [c >> 16, (c >> 8) & 255, c & 255]));
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('PLTE', plte), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** Replace what's between two markers in index.html (the markers stay). */
function injectBetween(html, start, end, content) {
  const at = html.indexOf(start);
  if (at < 0) throw new Error(`index.html is missing the ${start} marker`);
  const endAt = html.indexOf(end, at);
  const tail = endAt >= 0 ? html.slice(endAt + end.length) : html.slice(at + start.length);
  return `${html.slice(0, at)}${start}\n${content}\n    ${end}${tail}`;
}

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
      writeFileSync(`public/${file}`, toPalettePng(await page.screenshot()));
      await ctx.close();
      const media = `(device-width: ${d.w}px) and (device-height: ${d.h}px) and (-webkit-device-pixel-ratio: ${d.dpr}) and (orientation: portrait) and (prefers-color-scheme: ${theme === 'night' ? 'dark' : 'light'})`;
      links.push(`    <link rel="apple-touch-startup-image" media="${media}" href="./${file}" />`);
      console.log(`  public/${file} (iPhone ${d.name})`);
    }
  }

  // The favicon rides inline (a data: URI), so a lone single-file build still has it.
  const favicon = `data:image/svg+xml,${encodeURIComponent(readFileSync('public/icons/favicon.svg', 'utf8').trim())}`;
  let html = readFileSync('index.html', 'utf8');
  html = injectBetween(html, START, END, links.join('\n'));
  html = injectBetween(html, FAVICON_START, FAVICON_END, `    <link rel="icon" type="image/svg+xml" href="${favicon}" />`);
  writeFileSync('index.html', html);
  console.log(`  index.html: favicon + ${links.length} startup images`);
} finally {
  await browser.close();
  await server.close();
}
