/**
 * WP-G1: actual WebKit and ordinary-motion Chromium, with a focused forced-colours subset.
 * Fixtures are made by real reducers and seeded once through page.evaluate; reloads read only
 * what the app wrote. Visibility events below are explicit harness events: headless engines keep
 * every page visible, so these do not claim physical iOS background/process-kill coverage.
 */
import { expect, test, type Page } from '@playwright/test';
import { createInitialState } from '../src/state/defaults';
import { encodeEnvelope } from '../src/state/persist';
import { transact } from '../src/domain/tx';
import { completeOnboarding } from '../src/domain/habits';
import { mulberry32 } from '../src/domain/rng';
import { runtimeLocalTime } from '../src/domain/dates';
import type { AppState } from '../src/state/types';
import { expectNoAxeViolations, horizontalOverflow, openRoute } from './support';

const NOW = Date.parse('2026-10-02T12:00:00Z');
const DAY = '2026-10-02';
function household(name = 'Sam'): AppState {
  const made = transact(createInitialState(NOW), { now: NOW, today: DAY, local: runtimeLocalTime, rng: mulberry32(71) }, (tx) => {
    completeOnboarding(tx, { name, templateIds: ['walk', 'water', 'read'] });
    return {};
  }).state;
  return { ...made, wallet: { ...made.wallet, coins: 200 }, settings: { ...made.settings, sound: false, reduceMotion: 'off' } };
}
async function seed(page: Page, state = household(), route = 'today') {
  await page.clock.setFixedTime(NOW);
  await page.goto('./');
  await page.evaluate((raw) => localStorage.setItem('catkin:v1', raw), encodeEnvelope(state, 1, NOW, 'browser-matrix', 'matrix-household'));
  await page.goto(`./#/${route}`);
  await page.reload();
  await expect(page.locator('main h1')).toBeVisible();
}
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('catkin:v1')!).state as AppState);
const data = (page: Page) => page.locator('section').filter({ has: page.getByRole('heading', { name: 'Your data', exact: true }) }).first();
const walk = (page: Page) => page.getByRole('article', { name: 'Walk', exact: true }).getByRole('button', { name: 'Walk', exact: true });
async function countPad(page: Page) {
  await page.getByRole('button', { name: 'More for Drink water' }).click();
  await page.getByRole('menuitem', { name: /^How many/ }).click();
  const pad = page.getByRole('dialog', { name: 'Drink water', exact: true });
  await expect(pad).toBeVisible();
  return pad;
}
async function visibility(page: Page, hidden: boolean) {
  await page.evaluate((value) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => value });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value ? 'hidden' : 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}
async function keyActivate(page: Page, control: ReturnType<Page['getByRole']>) {
  await control.focus();
  await expect(control).toBeFocused();
  await page.keyboard.press('Enter');
}

test('an offline watering survives a real reload', async ({ page, context }) => {
  test.skip(process.env.E2E_TARGET !== 'preview', 'offline launch needs the built service worker');
  await seed(page);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await walk(page).click();
  await expect(walk(page)).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(walk(page)).toHaveAttribute('aria-pressed', 'true');
  await context.setOffline(false);
});

test('keyboard-only import confirmation, reload and durable Undo', async ({ page }) => {
  await seed(page, household('Before'), 'you');
  await keyActivate(page, data(page).getByRole('button', { name: 'Import a backup' }));
  const sheet = page.getByRole('dialog', { name: 'Import a backup' });
  const paste = sheet.getByLabel('Or paste a backup here');
  await paste.focus();
  await page.keyboard.insertText(encodeEnvelope(household('After'), 1, NOW, 'matrix-import'));
  const confirm = sheet.getByRole('button', { name: 'Import', exact: true });
  await expect(confirm).toBeEnabled();
  // Tab from the paste field to the actual confirmation, then Enter: no pointer activation.
  for (let i = 0; i < 10 && !(await confirm.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab');
  await expect(confirm).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Your name')).toHaveValue('After');
  await page.reload();
  await expect(page.getByLabel('Your name')).toHaveValue('After');
  await keyActivate(page, data(page).getByRole('button', { name: 'Undo import', exact: true }));
  await expect(page.getByLabel('Your name')).toHaveValue('Before');
  await page.reload();
  await expect(page.getByLabel('Your name')).toHaveValue('Before');
});

test('a reload offer cannot discard a write that storage refused', async ({ page }) => {
  test.skip(process.env.E2E_TARGET !== 'preview', 'the update controls belong to the built PWA');
  await seed(page, household(), 'you');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (this === localStorage && key.startsWith('catkin:')) throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
    (window as unknown as { matrixPage: string }).matrixPage = 'same document';
  });
  await page.getByLabel('Your name').fill('Unsaved name');
  await page.getByLabel('Your name').press('Enter');
  await page.getByRole('button', { name: 'Reload app', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reload anyway', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { matrixPage: string }).matrixPage)).toBe('same document');
  await expect(page.getByLabel('Your name')).toHaveValue('Unsaved name');
  expect((await saved(page)).profile.name).toBe('Sam');
});

test('@colors a keyboard watering and toast Undo leave the soil dry after animation', async ({ page }, info) => {
  await seed(page);
  const id = (await saved(page)).habits.find((h) => h.name === 'Walk')!.id;
  const soil = page.getByRole('group', { name: 'Today’s plants', exact: true }).locator(`[data-habit="${id}"] .plant-soil`);
  const dry = await soil.getAttribute('fill');
  await keyActivate(page, walk(page));
  await expect(walk(page)).toHaveAttribute('aria-pressed', 'true');
  const undo = page.getByRole('region', { name: 'Notes' }).getByRole('button', { name: 'Undo', exact: true }).first();
  await keyActivate(page, undo);
  await expect(walk(page)).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(1200); // beyond the complete pour, to catch stale animation callbacks
  await expect(soil).toHaveAttribute('fill', dry!);
  await expectNoAxeViolations(page, info);
});

test('@colors the count pad keeps keyboard actions through a 61-second background event', async ({ page }, info) => {
  await seed(page);
  const pad = await countPad(page);
  await keyActivate(page, pad.getByRole('button', { name: '+1', exact: true }));
  await visibility(page, true);
  await page.clock.setFixedTime(NOW + 61_000);
  await visibility(page, false);
  await expect(pad).toBeVisible();
  const addNote = pad.getByRole('button', { name: 'Add a note', exact: true });
  await keyActivate(page, addNote);
  const note = page.getByRole('dialog').filter({ has: page.getByRole('textbox') });
  await expect(note).toBeVisible();
  await expectNoAxeViolations(page, info);
  await page.keyboard.press('Escape');
  await expect(pad).toBeVisible();
  await page.keyboard.press('Escape');
  await page.reload();
  const id = (await saved(page)).habits.find((h) => h.name === 'Drink water')!.id;
  expect((await saved(page)).logs[id]?.[DAY]).toMatchObject({ kind: 'log', count: 1 });
});

test('a sheet drag cancelled by the browser keeps the sheet usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  const pad = await countPad(page);
  const handle = pad.locator('[data-sheet-handle]').first();
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 70, { steps: 5 });
  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true })));
  await page.mouse.up();
  await expect(pad).toBeVisible();
  await keyActivate(page, pad.getByRole('button', { name: '+1', exact: true }));
  await page.keyboard.press('Escape');
  await expect(pad).toBeHidden();
});

test('@colors capsule keyboard turn survives leaving its route with one paid result', async ({ page }) => {
  await seed(page, household(), 'capsules');
  const before = await saved(page);
  await keyActivate(page, page.getByRole('button', { name: /^Put .* in/ }).last());
  const crank = page.getByRole('slider', { name: 'Turn the handle' });
  await expect(crank).toHaveAttribute('aria-disabled', 'false');
  await keyActivate(page, crank);
  await expect.poll(async () => (await saved(page)).lifetime.pulls).toBe(before.lifetime.pulls + 1);
  const result = (await saved(page)).pendingReveal;
  expect(result).toBeTruthy();
  await page.evaluate(() => { location.hash = '#/today'; });
  await expect(page.locator('main')).toHaveAttribute('aria-label', 'Today');
  await page.reload();
  await page.evaluate(() => { location.hash = '#/capsules'; });
  await expect(page.getByRole('dialog', { name: 'Capsule reveal' })).toBeVisible();
  expect((await saved(page)).lifetime.pulls).toBe(before.lifetime.pulls + 1);
  expect((await saved(page)).pendingReveal?.itemId).toBe(result!.itemId);
});

test('Credits and full Licences are reachable by keyboard and axe-clean', async ({ page }, info) => {
  await seed(page, household(), 'you');
  await keyActivate(page, page.getByRole('button', { name: 'Credits', exact: true }));
  await keyActivate(page, page.getByRole('button', { name: 'Licences', exact: true }));
  const licences = page.getByRole('dialog', { name: 'Licences', exact: true });
  await expect(licences).toContainText('SIL OPEN FONT LICENSE Version 1.1');
  await expect(licences).toContainText('workbox-precaching@');
  await licences.locator('pre').focus();
  await page.keyboard.press('PageDown');
  await expect.poll(() => licences.locator('pre').evaluate((el) => el.parentElement!.scrollTop)).toBeGreaterThan(0);
  await expectNoAxeViolations(page, info);
});

test('a delayed first onboarding chunk keeps a main heading until it arrives', async ({ page }) => {
  let release = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route(/(?:\/assets\/Onboarding-[^/]+\.js|\/src\/features\/onboarding\/Onboarding\.tsx)(?:\?|$)/, async (route) => { await held; await route.continue(); });
  await page.goto('./#/today', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main h1')).toBeVisible();
  release();
  const stay = page.getByRole('button', { name: 'Keep it in this tab' });
  if (await stay.isVisible()) await stay.click();
  await expect(page.locator('main h1')).toHaveText('New place. Which plants came with you?');
});

test('@layout desktop main stays 720px with a forced scrollbar column', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await seed(page);
  await expect.poll(() => page.locator('main').evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThanOrEqual(719);
  expect(await page.locator('main').evaluate((el) => el.getBoundingClientRect().width)).toBeLessThanOrEqual(721);
  await page.addStyleTag({ content: 'html { overflow-y: scroll !important; scrollbar-gutter: stable !important; } body { min-height: 200vh !important; }' });
  expect(await page.locator('main').evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThanOrEqual(719);
  expect(await page.locator('main').evaluate((el) => el.getBoundingClientRect().width)).toBeLessThanOrEqual(721);
});

for (const viewport of [{ width: 320, height: 640 }, { width: 844, height: 390 }]) {
  test(`@colors @layout ${viewport.width}×${viewport.height} Today, pad and capsule controls remain operable`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await seed(page);
    await keyActivate(page, walk(page));
    await expect(walk(page)).toHaveAttribute('aria-pressed', 'true');
    const pad = await countPad(page);
    await keyActivate(page, pad.getByRole('button', { name: '+1', exact: true }));
    await expectNoAxeViolations(page, info);
    await page.keyboard.press('Escape');
    await openRoute(page, 'capsules');
    const insert = page.getByRole('button', { name: /^Put .* in/ }).last();
    await expect(insert).toBeVisible();
    await keyActivate(page, insert);
    const crank = page.getByRole('slider', { name: 'Turn the handle' });
    await expect(crank).toHaveAttribute('aria-disabled', 'false');
    await crank.focus();
    await page.keyboard.press('ArrowRight');
    await expect(crank).not.toHaveAttribute('aria-valuenow', '0');
    const overflow = await horizontalOverflow(page);
    expect(overflow.scrollWidth, overflow.culprits.join('\n')).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });
}
