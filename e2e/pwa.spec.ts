/**
 * The hosted PWA (preview of dist/ only): the service worker installs, takes over, precaches
 * what the app needs and nothing it doesn't, and the app opens offline.
 */
import { expect, test } from '@playwright/test';
import { openRoute, watchErrors } from './support';

test('installs its service worker and opens offline', async ({ page, context }) => {
  const errors = watchErrors(page);
  await openRoute(page, 'today');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) for (const req of await (await caches.open(name)).keys()) urls.push(new URL(req.url).pathname);
    return urls;
  });
  expect(cached.some((u) => /\/assets\/index-[\w-]+\.js$/.test(u))).toBe(true);
  expect(cached.filter((u) => /\/splash\/|\/screenshots\/|nunito-latin-ext/.test(u))).toEqual([]);

  await context.setOffline(true);
  await page.reload();
  await openRoute(page, 'capsules');
  await context.setOffline(false);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('serves a manifest with maskable icons, shortcuts and screenshots that all exist', async ({ request }) => {
  const res = await request.get('./manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const m = (await res.json()) as {
    orientation?: string;
    icons: { src: string; purpose?: string; sizes: string }[];
    shortcuts: { url: string; icons: { src: string }[] }[];
    screenshots: { src: string; form_factor: string }[];
  };
  expect(m.orientation).toBeUndefined();
  expect(m.icons.filter((i) => i.purpose === 'maskable').map((i) => i.sizes)).toEqual(['192x192', '512x512']);
  expect(m.shortcuts.map((s) => s.url)).toEqual(['./#/today', './#/capsules']);
  expect(m.screenshots.map((s) => s.form_factor).sort()).toEqual(['narrow', 'wide']);
  const files = [...m.icons.map((i) => i.src), ...m.shortcuts.flatMap((s) => s.icons.map((i) => i.src)), ...m.screenshots.map((s) => s.src)];
  for (const f of files) expect((await request.get(`./${f}`)).ok(), f).toBe(true);
});
