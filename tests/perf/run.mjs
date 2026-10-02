#!/usr/bin/env node
/** Isolated production build + browser measurements; no thresholds beyond existing agreed gates. */
import { build } from 'vite';
import preact from '@preact/preset-vite';
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { cpus, platform, release, totalmem } from 'node:os';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const options = Object.fromEntries(process.argv.slice(2).map((argument) => {
  if (!/^--(?:out|years|samples|ui|snapshots|build-only)=/.test(argument)) throw new Error(`Unknown option: ${argument}`);
  const at = argument.indexOf('='); return [argument.slice(2, at), argument.slice(at + 1)];
}));
const years = (options.years ?? '5,10').split(',').map(Number);
const samples = Number(options.samples ?? 5);
if (!years.every((n) => n === 5 || n === 10) || !Number.isInteger(samples) || samples < 1 || samples > 20) throw new Error('Use --years=5,10 and --samples=1..20');
for (const key of ['ui', 'snapshots', 'build-only']) if (options[key] && !['true', 'false'].includes(options[key])) throw new Error(`--${key}=true|false`);
const out = resolve(root, options.out ?? 'test-results/journal-scale.json');
const output = resolve(root, '.vite-cache/scale-build');
const git = async (...args) => (await promisify(execFile)('git', args, { cwd: root, encoding: 'utf8' })).stdout.trim();
const sha = await git('rev-parse', 'HEAD');
const dirty = Boolean(await git('status', '--porcelain'));
await build({ configFile: false, root, base: '/', publicDir: false, cacheDir: resolve(root, '.vite-cache/scale'), plugins: [preact()], resolve: { alias: { '@': resolve(root, 'src') } }, define: { __SINGLE_FILE__: 'false', __APP_VERSION__: JSON.stringify('scale-measurement'), __BUILD_ID__: JSON.stringify(sha) }, build: { outDir: output, emptyOutDir: true, target: ['es2020', 'safari15'], rollupOptions: { input: resolve(root, 'tests/perf/index.html') } }, logLevel: 'warn' });
if (options['build-only'] === 'true') { console.log(`Built measurement entry at ${output}`); process.exit(0); }
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  try {
    const path = resolve(output, `.${decodeURIComponent(new URL(request.url, 'http://localhost').pathname)}`);
    const fromOutput = relative(output, path);
    if (!fromOutput || fromOutput.startsWith('..') || isAbsolute(fromOutput)) { response.writeHead(403).end(); return; }
    const content = await readFile(path);
    response.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(content);
  } catch { response.writeHead(404).end(); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser;
const report = { schema: 2, sha, dirty, measuredAt: new Date().toISOString(), environment: { os: `${platform()} ${release()}`, node: process.version, cpu: cpus()[0]?.model, logicalCpus: cpus().length, memoryBytes: totalmem(), chromium: null, viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: true, timezone: 'UTC', cpuThrottling: 'none', build: 'production-compiled isolated component/function harness' }, budget: { desktop: 'observational; no new threshold agreed', phone: 'physical-device budgets and validation remain parked with WP-E4; a narrow desktop viewport is not a phone measurement' }, scenarios: [] };
const errors = [];
try {
  browser = await chromium.launch();
  report.environment.chromium = browser.version();
  for (const n of years) {
    // A fresh origin context isolates localStorage, IndexedDB, signal caches and all prior samples.
    const context = await browser.newContext({ viewport: report.environment.viewport, deviceScaleFactor: 1, reducedMotion: 'reduce', timezoneId: 'UTC' });
    try {
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(String(error)));
      await page.goto(`http://127.0.0.1:${server.address().port}/tests/perf/index.html`);
      await page.waitForFunction(() => !!window.journalScale);
      const fixture = await page.evaluate((n) => window.journalScale.prepare(n), n);
      const scenario = { fixture, samples };
      report.scenarios.push(scenario);
      const state = scenario.state = await page.evaluate((samples) => window.journalScale.measureState(samples), samples);
      scenario.maintenanceAndImport = await page.evaluate((samples) => window.journalScale.measureMaintenanceAndPastedImport(samples), samples);
      scenario.ui = options.ui === 'false' ? { skipped: true } : await page.evaluate(() => window.journalScale.measureUI());
      scenario.snapshots = options.snapshots === 'false' ? { skipped: true } : await page.evaluate((samples) => window.journalScale.measureSnapshots(samples), samples);
      console.log(`${n} years: ${fixture.count} notes, ${fixture.encodedCharacters} encoded characters; commits ${[...new Set(state.tap.map((sample) => sample.outcome))].join(', ')}`);
    } finally { await context.close(); }
  }
  if (errors.length) throw new Error(errors.join('\n'));
} catch (error) {
  report.error = String(error);
  throw error;
} finally {
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Measurements saved to ${out}`);
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
  await rm(output, { recursive: true, force: true });
}
