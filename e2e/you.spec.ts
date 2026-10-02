/**
 * You (DESIGN §9.5) on a phone and a desktop, light and dark: one h1 and every section, axe clean
 * (and with a sheet open), no sideways scroll at 320 px, and the main journeys: a setting saved
 * across a reload, arranging habits by keyboard, a watering time, a backup copied and imported
 * again with Undo import (also after a reload), the demo and its pill, Start over's two confirmations, and seven taps to
 * Diagnostics.
 */
import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations, horizontalOverflow, watchErrors } from './support';

/** Onboarding the way a person does it, planting three habits and skipping the rest. */
async function onboard(page: Page) {
  await page.goto('./#/today');
  // The phone projects are an iPhone's Safari tab: the install gate comes first.
  const stay = page.getByRole('button', { name: 'Keep it in this tab' });
  const name = page.getByLabel('Your name');
  await expect(stay.or(name)).toBeVisible();
  if (await stay.isVisible()) await stay.click();
  await name.fill('Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  for (const name of ['Drink water', 'Walk', 'Read']) await page.getByRole('button', { name, exact: true }).click();
  await page.getByRole('button', { name: 'Plant these' }).click();
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.getByRole('button', { name: 'Not yet, I’ll earn it' }).first().click();
  await expect(page.locator('main')).toHaveAttribute('aria-label', 'Today');
}

async function openYou(page: Page) {
  await onboard(page);
  await page.evaluate(() => (location.hash = '#/you'));
  await expect(page.locator('main h1')).toHaveText('You');
}

const section = (page: Page, name: string) => page.locator('section').filter({ has: page.getByRole('heading', { level: 2, name, exact: true }) }).first();

test('About Credits opens complete readable licences', async ({ page }, info) => {
  await openYou(page);
  await section(page, 'About').getByRole('button', { name: 'Credits' }).click();
  await page.getByRole('dialog', { name: 'Credits', exact: true }).getByRole('button', { name: 'Licences' }).click();
  const licences = page.getByRole('dialog', { name: 'Licences', exact: true });
  await expect(licences).toContainText('SIL OPEN FONT LICENSE Version 1.1');
  await expect(licences).toContainText('@preact/signals-core@');
  await expect(licences).toContainText('workbox-precaching@');
  const text = await licences.locator('pre').textContent();
  const { readFileSync } = await import('node:fs');
  for (const name of ['@fontsource/castoro', '@fontsource-variable/nunito', 'preact', '@preact/signals', 'workbox-window']) expect(text).toContain(readFileSync(`node_modules/${name}/LICENSE`, 'utf8').trim());
  if (process.env.E2E_TARGET === 'preview') expect(text).toBe(readFileSync('dist/licenses.txt', 'utf8'));
  await licences.locator('pre').focus();
  await page.keyboard.press('PageDown');
  await expect.poll(() => licences.locator('pre').evaluate((el) => el.parentElement!.scrollTop)).toBeGreaterThan(0);
  await expectNoAxeViolations(page, info);
  await licences.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Credits', exact: true })).toBeVisible();
});

test('@pwa licence notices remain available offline', async ({ page, context }, info) => {
  test.skip(info.project.use.serviceWorkers !== 'allow', 'needs the installed service worker');
  await openYou(page);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await section(page, 'About').getByRole('button', { name: 'Credits' }).click();
  await page.getByRole('button', { name: 'Licences', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Licences', exact: true })).toContainText('SIL OPEN FONT LICENSE Version 1.1');
  await context.setOffline(false);
});

test('You renders every section cleanly and passes axe', async ({ page }, info) => {
  const errors = watchErrors(page);
  await openYou(page);
  await expect(page.locator('main h1')).toHaveCount(1);
  for (const name of ['Habits', 'Your days', 'Look and sound', 'Today and capsules', 'Accessibility', 'Watering time', 'Your data', 'On your Home Screen', 'About']) {
    await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeAttached();
  }
  const dark = info.project.use.colorScheme === 'dark';
  await expect(page.locator('html')).toHaveAttribute('data-theme', dark ? 'night' : 'light');
  await page.waitForLoadState('networkidle');
  await expectNoAxeViolations(page, info);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('You reflows at 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await openYou(page);
  await page.getByRole('button', { name: 'Arrange' }).click();
  const o = await horizontalOverflow(page);
  expect(o.scrollWidth, `the page scrolls sideways at ${o.clientWidth} px:\n${o.culprits.join('\n')}`).toBeLessThanOrEqual(o.clientWidth);
});

test('a setting is saved at once and survives a reload', async ({ page }) => {
  await openYou(page);
  await page.getByRole('radio', { name: 'Lamplight' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  await page.getByRole('switch', { name: /Quiet rewards/ }).check();
  await page.reload();
  await expect(page.locator('main h1')).toHaveText('You');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  await expect(page.getByRole('switch', { name: /Quiet rewards/ })).toBeChecked();
});

test('habits are arranged by keyboard, and the order holds', async ({ page }) => {
  await openYou(page);
  const habits = section(page, 'Habits');
  await habits.getByRole('button', { name: 'Arrange' }).click();
  const grip = page.getByRole('button', { name: 'Move Drink water', exact: true });
  await grip.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('button', { name: 'Move Drink water', exact: true })).toBeFocused();
  await habits.getByRole('button', { name: 'Done' }).click();
  await expect(habits.getByRole('button', { name: /^Edit / })).toHaveText([/Walk/, /Read/, /Drink water/]);
  await page.reload();
  await expect(section(page, 'Habits').getByRole('button', { name: /^Edit / })).toHaveText([/Walk/, /Read/, /Drink water/]);
});

test('habits are arranged by dragging the grip', async ({ page }) => {
  test.skip(test.info().project.name.includes('dark'), 'once per size');
  await openYou(page);
  await section(page, 'Habits').getByRole('button', { name: 'Arrange' }).click();
  const grip = page.getByRole('button', { name: 'Move Read', exact: true });
  const target = page.getByRole('button', { name: 'Move Drink water', exact: true });
  const a = (await grip.boundingBox())!;
  const b = (await target.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2 + ((b.y - a.y - 10) * i) / 8);
  await page.mouse.up();
  await section(page, 'Habits').getByRole('button', { name: 'Done' }).click();
  await expect(section(page, 'Habits').getByRole('button', { name: /^Edit / }).first()).toHaveText(/Read/);
});

// Dragged down, the row itself is the one the list re-inserts mid-drag, and Chromium drops its
// pointer capture when it does: that must not read as a cancelled drag (WP-C2 review).
test('a habit dragged down lands where it is let go, and the order holds', async ({ page }) => {
  test.skip(test.info().project.name.includes('dark'), 'once per size');
  await openYou(page);
  const habits = section(page, 'Habits');
  await habits.getByRole('button', { name: 'Arrange' }).click();
  const grips = page.locator('[data-move="grip"]');
  const a = (await grips.nth(0).boundingBox())!;
  const b = (await grips.nth(2).boundingBox())!;
  const x = a.x + a.width / 2;
  const y0 = a.y + a.height / 2;
  const y1 = b.y + b.height / 2 + 10;
  await page.mouse.move(x, y0);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(x, y0 + ((y1 - y0) * i) / 12);
  expect(await grips.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))).toEqual(['Move Walk', 'Move Read', 'Move Drink water']);
  await page.mouse.up();
  await habits.getByRole('button', { name: 'Done' }).click();
  await expect(habits.getByRole('button', { name: /^Edit / })).toHaveText([/Walk/, /Read/, /Drink water/]);
  await page.reload();
  await expect(section(page, 'Habits').getByRole('button', { name: /^Edit / })).toHaveText([/Walk/, /Read/, /Drink water/]);
});

test('a watering time offers its calendar file', async ({ page }) => {
  await openYou(page);
  await page.getByLabel('Morning', { exact: true }).selectOption('07:30');
  const name = 'Add to calendar, Morning 7:30 am';
  if (/iPhone/.test(await page.evaluate(() => navigator.userAgent))) {
    // An iPhone: a real link to the static file, which Calendar takes even from the installed app.
    await expect(page.getByRole('link', { name })).toHaveAttribute('href', 'cal/morning-0730.ics');
  } else {
    const add = page.getByRole('button', { name });
    const download = page.waitForEvent('download');
    await add.click();
    expect((await download).suggestedFilename()).toBe('little-by-little-watering-time-morning.ics');
  }
  // The static files for installed iPhone apps are served too.
  const res = await page.request.get('./cal/morning-0730.ics');
  expect(res.ok()).toBe(true);
  expect(await res.text()).toContain('SUMMARY:Watering time');
});

test('a backup is copied, and imported again with Undo import', async ({ page, context }, info) => {
  test.skip(info.project.name.includes('dark'), 'once per size');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openYou(page);
  const data = section(page, 'Your data');
  await data.getByRole('button', { name: 'Copy backup' }).click();
  await expect(page.getByText('Copied. Paste it somewhere safe, like a note to yourself.').first()).toBeVisible();
  const payload = await page.evaluate(() => navigator.clipboard.readText());
  expect(payload.startsWith('CK1:')).toBe(true);

  await page.getByLabel('Your name').fill('Someone else');
  await page.getByLabel('Your name').press('Enter');
  await data.getByRole('button', { name: 'Import a backup' }).click();
  const sheet = page.getByRole('dialog', { name: 'Import a backup' });
  await sheet.getByLabel('Or paste a backup here').fill(payload);
  // Wait for the real modal-owned announcement as well as the visible preview.
  await expect(sheet.locator('[aria-live="polite"]')).toContainText('This backup has 3 habits, 0 waterings and 0 pets.');
  const preview = sheet.getByRole('strong');
  await expect(preview).toContainText('This backup has 3 habits, 0 waterings and 0 pets.');
  await expect(preview).toBeVisible();
  await expectNoAxeViolations(page, info);
  await sheet.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.getByLabel('Your name')).toHaveValue('Sam');
  await page.getByRole('button', { name: 'Undo import' }).first().click();
  await expect(page.getByLabel('Your name')).toHaveValue('Someone else');
});

test('an import can still be undone after a reload: its copy is kept in IndexedDB (WP-A3)', async ({ page, context }, info) => {
  test.skip(info.project.name.includes('dark'), 'once per size');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openYou(page);
  const data = section(page, 'Your data');
  await data.getByRole('button', { name: 'Copy backup' }).click();
  await expect(page.getByText('Copied. Paste it somewhere safe, like a note to yourself.').first()).toBeVisible();
  const payload = await page.evaluate(() => navigator.clipboard.readText());

  await page.getByLabel('Your name').fill('Someone else');
  await page.getByLabel('Your name').press('Enter');
  await data.getByRole('button', { name: 'Import a backup' }).click();
  const sheet = page.getByRole('dialog', { name: 'Import a backup' });
  await sheet.getByLabel('Or paste a backup here').fill(payload);
  await sheet.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.getByText('Imported. You can undo this for 24 hours.').first()).toBeVisible();
  await expect(page.getByLabel('Your name')).toHaveValue('Sam');

  await page.reload();
  await expect(page.locator('main h1')).toHaveText('You');
  await expect(page.getByLabel('Your name')).toHaveValue('Sam');
  await section(page, 'Your data').getByRole('button', { name: 'Undo import' }).click();
  await expect(page.getByText('Back to how things were before the import.').first()).toBeVisible();
  await expect(page.getByLabel('Your name')).toHaveValue('Someone else');
  await page.reload();
  await expect(page.getByLabel('Your name')).toHaveValue('Someone else');
  await expect(section(page, 'Your data').getByRole('button', { name: 'Undo import' })).toHaveCount(0);
});

test('the demo opens with its pill, and leaving it brings her own plants back', async ({ page }) => {
  await openYou(page);
  await section(page, 'Your data').getByRole('button', { name: /^Try the demo/ }).click();
  const pill = page.locator('[data-demo-pill]');
  await expect(pill).toBeVisible();
  await expect(page.locator('main')).toHaveAttribute('aria-label', 'Today');
  await pill.getByRole('button', { name: 'Leave the demo' }).click();
  await expect(pill).toHaveCount(0);
  await page.evaluate(() => (location.hash = '#/you'));
  await expect(page.getByLabel('Your name')).toHaveValue('Sam');
});

test('Start over asks twice, then onboarding starts again', async ({ page }) => {
  await openYou(page);
  await section(page, 'Your data').getByRole('button', { name: 'Start over' }).click();
  await page.getByRole('alertdialog').filter({ hasText: 'The habits, plants and pets here go.' }).getByRole('button', { name: 'Start over' }).click();
  const again = page.getByRole('alertdialog').filter({ hasText: 'Start over now?' });
  await expect(again).toBeVisible();
  // The last "Start over" arms itself a moment after it appears.
  await page.waitForTimeout(800);
  await again.getByRole('button', { name: 'Start over' }).click();
  await expect(page.locator('main h1')).toHaveText('New place. Which plants came with you?');
});

test('a quick double tap on Start over keeps everything', async ({ page }) => {
  await openYou(page);
  await section(page, 'Your data').getByRole('button', { name: 'Start over' }).click();
  const first = page.getByRole('alertdialog').filter({ hasText: 'The habits, plants and pets here go.' }).getByRole('button', { name: 'Start over' });
  await expect(first).toBeVisible();
  await page.waitForTimeout(400);
  const box = (await first.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.click(x, y);
  await page.waitForTimeout(120);
  await page.mouse.click(x, y);
  await page.waitForTimeout(600);
  await expect(page.locator('main h1')).toHaveText('You');
  await expect(page.getByLabel('Your name')).toHaveValue('Sam');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test('seven taps on the version open Diagnostics', async ({ page }, info) => {
  await openYou(page);
  const version = page.getByRole('button', { name: /^Version / });
  for (let i = 0; i < 7; i++) await version.click();
  await expect(page).toHaveURL(/#\/you\/diagnostics$/);
  await expect(page.locator('main h1')).toHaveText('Diagnostics');
  await expect(page.getByRole('button', { name: 'Copy report' })).toBeVisible();
  await expectNoAxeViolations(page, info);
  await page.getByRole('button', { name: 'You', exact: true }).first().click();
  await expect(page.locator('main h1')).toHaveText('You');
});

test('a second window shows every setting disabled until "Use here"', async ({ page, context }) => {
  await openYou(page);
  const other = await context.newPage();
  await other.goto('./#/you');
  await expect(other.locator('[data-banner="other-window"]')).toBeVisible();
  await expect(other.getByLabel('Your name')).toBeDisabled();
  await expect(other.getByRole('switch', { name: /^Compact Today/ })).toBeDisabled();
  await expect(other.getByRole('button', { name: 'Arrange' })).toHaveCount(0);
  await expect(other.getByRole('button', { name: 'Save a backup' })).toBeEnabled();
  await other.locator('[data-banner="other-window"]').getByRole('button', { name: 'Use here' }).click();
  await expect(other.getByLabel('Your name')).toBeEnabled();
  await other.close();
});

/**
 * The installed app's "Add to calendar" (iPhone) links a static file in cal/. Under the service
 * worker that link is a navigation, so it must reach the file, not the app shell, and work offline.
 * Runs only where a service worker runs (the preview's pwa-screens project).
 */
test('@pwa a watering-time file is a calendar under the service worker, online and offline', async ({ page, context }, info) => {
  test.skip(info.project.use.serviceWorkers !== 'allow', 'needs the service worker (E2E_TARGET=preview, pwa project)');
  await openYou(page);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const calendarAt = async () => {
    const download = page.waitForEvent('download', { timeout: 15_000 }).catch(() => null);
    await page.goto('./cal/morning-0800.ics').catch(() => undefined);
    const d = await download;
    if (!d) return `not a download: ${await page.title()}`;
    const { readFile } = await import('node:fs/promises');
    return (await readFile((await d.path())!, 'utf8')).slice(0, 15);
  };
  expect(await calendarAt()).toBe('BEGIN:VCALENDAR');
  await page.goto('./#/you');
  await context.setOffline(true);
  expect(await calendarAt()).toBe('BEGIN:VCALENDAR');
  await context.setOffline(false);
});
