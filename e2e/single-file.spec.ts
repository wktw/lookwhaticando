/**
 * The single-file build (`npm run build:single`) opened straight from disk, as a double-click
 * would: it boots, shows the "Test copy" ribbon (DESIGN §11.1), renders every route, and asks
 * for nothing outside itself (no public/ folder travels with it).
 */
import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openRoute, ROUTES, watchErrors } from './support';

const FILE = resolve('dist-single/catkin.html');
const URL_ = pathToFileURL(FILE).href;

test.beforeAll(() => {
  // CI builds it first; locally, say how rather than fail on a missing file.
  if (!existsSync(FILE)) {
    if (process.env.CI) throw new Error(`${FILE} is missing: run npm run build:single first`);
    test.skip(true, 'dist-single/catkin.html is missing: run npm run build:single first');
  }
});

test('carries nothing it would lose when moved on its own', () => {
  const html = readFileSync(FILE, 'utf8');
  expect(html).not.toContain('apple-touch-startup-image');
  expect(html).not.toMatch(/<link[^>]+href="\.?\/?(icons|splash|assets)\//);
  expect(html).not.toMatch(/<script[^>]+src="/);
  expect(html).toMatch(/<link rel="apple-touch-icon" href="data:image\/png;base64,/);
  expect(existsSync(resolve('dist-single/icons'))).toBe(false);
  expect(existsSync(resolve('dist-single/splash'))).toBe(false);
});

test('opens from file://, says it is a test copy, and renders every route', async ({ page }) => {
  const errors = watchErrors(page);
  const outside: string[] = [];
  page.on('request', (r) => {
    if (!/^(data|blob|file):/.test(r.url())) outside.push(r.url());
  });
  await openRoute(page, 'today', URL_);
  const ribbon = page.locator('[data-test-copy]');
  await expect(ribbon).toHaveText('Test copy · saved only in this browser, for this file');
  await expect(ribbon).toHaveAttribute('role', 'note');
  // The shell makes room for it: the page's top inset includes the ribbon.
  const box = await ribbon.boundingBox();
  const h1 = await page.locator('main h1').boundingBox();
  expect(box && h1 && h1.y >= box.y + box.height).toBe(true);
  for (const route of ROUTES.slice(1)) await openRoute(page, route.id, URL_);
  expect(outside, `requests outside the file:\n${outside.join('\n')}`).toEqual([]);
  expect(errors, errors.join('\n')).toEqual([]);
});
