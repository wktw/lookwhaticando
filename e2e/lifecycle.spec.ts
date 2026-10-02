/**
 * WP-G1: actual WebKit and ordinary-motion Chromium, with a focused forced-colours subset.
 * Fixtures are made by real reducers and seeded once through page.evaluate; reloads read only
 * what the app wrote. Visibility events below are explicit harness events: headless engines keep
 * every page visible, so these do not claim physical iOS background/process-kill coverage.
 */
import { expect, test, type Page, type Route } from '@playwright/test';
import { createInitialState } from '../src/state/defaults';
import { encodeEnvelope } from '../src/state/persist';
import { transact } from '../src/domain/tx';
import { archiveHabit, completeOnboarding } from '../src/domain/habits';
import { mulberry32 } from '../src/domain/rng';
import { runtimeLocalTime } from '../src/domain/dates';
import type { AppState } from '../src/state/types';
import { expectNoAxeViolations, horizontalOverflow, openRoute } from './support';
import { productionOrigin } from './production-origin';

const NOW = Date.parse('2026-10-02T12:00:00Z');
const DAY = '2026-10-02';
function household(name = 'Sam'): AppState {
  const made = transact(createInitialState(NOW), { now: NOW, today: DAY, local: runtimeLocalTime, rng: mulberry32(71) }, (tx) => {
    completeOnboarding(tx, { name, templateIds: ['walk', 'water', 'read'] });
    return {};
  }).state;
  return { ...made, wallet: { ...made.wallet, coins: 200 }, settings: { ...made.settings, sound: false, reduceMotion: 'off' } };
}
async function seed(page: Page, state = household(), route = 'today', base = './') {
  await page.clock.setFixedTime(NOW);
  // Establish this origin without booting an unseeded app or interrupting its first worker/chunks.
  // A distinct URL makes the following app visit a real navigation, even for the Today route.
  const setupUrl = new URL('__matrix_seed__.html', new URL(base, test.info().project.use.baseURL)).href;
  const setup = (request: Route) => request.fulfill({ status: 200, contentType: 'text/html', headers: { 'Cache-Control': 'no-store' }, body: '<!doctype html><title>Matrix setup</title>' });
  await page.route(setupUrl, setup, { times: 1 });
  try {
    await page.goto(setupUrl);
    await page.evaluate((raw) => localStorage.setItem('catkin:v1', raw), encodeEnvelope(state, 1, NOW, 'browser-matrix', '1234567890abcdef1234567890abcdef'));
  } finally {
    await page.unroute(setupUrl, setup);
  }
  await page.goto(`${base}#/${route}`);
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

test('the matrix fixture starts one seeded app boot and later reloads retain app writes', async ({ page }) => {
  const boots: Array<string | null> = [];
  await page.exposeFunction('__recordMatrixBoot', (raw: string | null) => { boots.push(raw); });
  // Observe the durable bytes before app scripts run. This observer never writes storage.
  await page.addInitScript(() => {
    const raw = localStorage.getItem('catkin:v1');
    document.addEventListener('DOMContentLoaded', () => {
      if (document.querySelector('script[type="module"][src]')) {
        void (window as unknown as { __recordMatrixBoot: (raw: string | null) => Promise<void> }).__recordMatrixBoot(raw);
      }
    }, { once: true });
  });
  const initial = household('Seeded once');
  await seed(page, initial, 'you');
  await expect.poll(() => boots.length).toBeGreaterThan(0);
  expect(boots).toEqual([encodeEnvelope(initial, 1, NOW, 'browser-matrix', '1234567890abcdef1234567890abcdef')]);
  await expect(page.getByLabel('Your name')).toHaveValue('Seeded once');
  await page.getByLabel('Your name').fill('Kept after reload');
  await page.getByLabel('Your name').press('Enter');
  await expect.poll(async () => (await saved(page)).profile.name).toBe('Kept after reload');
  await page.reload();
  await expect(page.getByLabel('Your name')).toHaveValue('Kept after reload');
  await expect.poll(() => boots.length).toBe(2);
  expect(JSON.parse(boots[1]!).state.profile.name).toBe('Kept after reload');
  expect((await saved(page)).profile.name).toBe('Kept after reload');
});

test('the matrix fixture surfaces a refused seed write', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (this === localStorage && key === 'catkin:v1') throw new DOMException('Fixture seed write refused', 'SecurityError');
      return original.call(this, key, value);
    };
  });
  await expect(seed(page)).rejects.toThrow('Fixture seed write refused');
  expect(await page.evaluate(() => localStorage.getItem('catkin:v1'))).toBeNull();
});

test('an offline watering survives a real origin outage and reload', async ({ page }) => {
  test.skip(process.env.E2E_TARGET !== 'preview', 'offline launch needs the built service worker');
  // Playwright WebKit's offline emulator blocks before the service worker (#42775).
  // A closed private origin is a genuine outage and leaves other parallel tests untouched.
  const origin = await productionOrigin();
  try {
    await seed(page, household(), 'today', origin.url);
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await origin.close();
    expect(origin.listening).toBe(false);
    await expect(fetch(origin.url)).rejects.toThrow();
    await walk(page).click();
    await expect(walk(page)).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(walk(page)).toHaveAttribute('aria-pressed', 'true');
  } finally { await origin.close(); }
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

test('a real waiting update stays held while storage refuses a change', async ({ page }) => {
  test.skip(process.env.E2E_TARGET !== 'preview', 'the update controls belong to the built PWA');
  await seed(page, household(), 'you');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const active = await page.evaluate(() => navigator.serviceWorker.controller!.scriptURL);
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
  // A different URL of the actual production worker installs a genuine waiting version,
  // without replacing the worker API or changing the release build's files.
  await page.evaluate(() => navigator.serviceWorker.register('./sw.js?matrix=update', { scope: './' }).then(() => undefined));
  await expect.poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting)).toBe(true);
  await expect(page.getByText('A new version is ready', { exact: true }).first()).toBeVisible();
  await visibility(page, true);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => navigator.serviceWorker.controller!.scriptURL)).toBe(active);
  expect(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting)).toBe(true);
  await visibility(page, false);
  await page.getByRole('button', { name: 'Reload app', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reload anyway', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { matrixPage: string }).matrixPage)).toBe('same document');
  await expect(page.getByLabel('Your name')).toHaveValue('Unsaved name');
  expect((await saved(page)).profile.name).toBe('Sam');
});

test('a cold page offers a waiting update without interrupting input', async ({ page, context }) => {
  test.skip(process.env.E2E_TARGET !== 'preview', 'the update controls belong to the built PWA');
  await seed(page, household(), 'you');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.evaluate(() => navigator.serviceWorker.register('./sw.js?matrix=cold', { scope: './' }).then(() => undefined));
  await expect.poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting)).toBe(true);
  // Keep the original controlled page open so browser activation cannot erase the waiting case.
  const fresh = await context.newPage();
  await fresh.goto('./#/you');
  await expect(fresh.locator('main h1')).toHaveText('You');
  await expect(fresh.getByText('A new version is ready', { exact: true }).first()).toBeVisible();
  expect(await fresh.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting)).toBe(true);
  await fresh.close();
});

test.describe('a shell recovery chunk that cannot load', () => {
  test.use({ serviceWorkers: 'block' }); // The server fault must reach the network instead of its precache.
  test('Daily copies has a visible retry, and a fresh fetch keeps the requested sheet', async ({ page }) => {
    test.skip(process.env.E2E_TARGET !== 'preview', 'the chunk fault uses the built production origin');
    let blocked = true;
    const origin = await productionOrigin((path) => blocked && /\/assets\/recovery-[^/]+\.js$/.test(path));
    try {
      await seed(page, household(), 'today', origin.url);
      await page.evaluate(() => {
        localStorage.setItem('catkin:v1', '{damaged save');
        localStorage.removeItem('catkin:v1:backup'); // Reach damaged boot, rather than valid-backup recovery.
      });
      await page.reload();
      await page.locator('[data-banner="corrupt"]').getByRole('button', { name: 'Daily copies', exact: true }).click();
      const error = page.getByRole('alertdialog', { name: 'This didn’t open', exact: true });
      await expect(error).toBeVisible();
      blocked = false;
      await error.getByRole('button', { name: 'Try again', exact: true }).click();
      const recovered = page.getByRole('dialog', { name: 'Daily copies', exact: true });
      await expect(recovered).toBeVisible();
      // These styles belong to the lazily delivered You module, not just the shell's modal CSS.
      const helper = recovered.locator('[class*="_helper_"]').first();
      await expect(helper).toHaveCSS('font-size', '14px');
      await expect(recovered).toHaveCSS('display', 'flex');
      await expect(page.locator('link[rel="modulepreload"]')).toHaveCount(0);
      await page.keyboard.press('Escape');
      await expect(recovered).toBeHidden();
    } finally { await origin.close(); }
  });
});

test.describe('plain modal notes', () => {
  test.use({ serviceWorkers: 'block' });
  test('@colors a plain modal note has keyboard access to its scrolling text', async ({ page }, info) => {
    await page.setViewportSize({ width: 320, height: 640 });
    const current = household();
    const id = current.habits.find((h) => h.name === 'Walk')!.id;
    const archived = transact(current, { now: NOW, today: DAY, local: runtimeLocalTime, rng: mulberry32(71) }, (tx) => {
      archiveHabit(tx, id);
      return {};
    }).state;
    await seed(page, archived, 'progress');
    await keyActivate(page, page.getByRole('button', { name: 'Walk, on the balcony shelf', exact: true }));
    const detail = page.getByRole('dialog', { name: 'Walk', exact: true });
    await keyActivate(page, detail.getByRole('button', { name: 'Bring it back to the sill', exact: true }));
    const plain = detail.locator('[data-toast-id]').filter({ hasText: 'Walk is back on the sill.' });
    await expect(plain).toBeVisible();
    await expect(plain.getByRole('button')).toHaveCount(0);
    const lane = detail.locator('[data-notes-slot]');
    const geometry = await lane.evaluate((el) => ({ height: el.clientHeight, content: el.scrollHeight }));
    expect(geometry.height).toBeGreaterThan(0);
    expect(geometry.content).toBeGreaterThan(geometry.height + 1);
    await detail.getByRole('button', { name: 'Close', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(plain).toBeFocused({ timeout: 2000 });
    // Real browser keys scroll the owning lane; the modal body keeps its position.
    const body = detail.locator('[data-notes-slot] + div');
    const before = await body.evaluate((el) => el.scrollTop);
    for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowUp');
    await expect.poll(() => lane.evaluate((el) => el.scrollTop)).toBe(0);
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => lane.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    expect(await body.evaluate((el) => el.scrollTop)).toBe(before);
    await expectNoAxeViolations(page, info);
    await page.waitForTimeout(4200); // focusing the text pauses its ordinary four-second lifetime
    await expect(plain).toBeFocused({ timeout: 2000 });
    await expect(plain).toBeVisible();
    expect((await saved(page)).habits.find((h) => h.id === id)?.archivedOn).toBeUndefined();
  });
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
  await expect(stay.or(page.getByLabel('Your name'))).toBeVisible();
  if (await stay.isVisible()) await stay.click();
  await expect(page.locator('main h1')).toHaveText('New place. Which plants came with you?');
});

test('@layout desktop content stays 720px with a forced scrollbar column', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await seed(page);
  const width = () => page.locator('main').evaluate((el) => { const style = getComputedStyle(el); return el.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight); });
  await expect.poll(width).toBeGreaterThanOrEqual(719);
  expect(await width()).toBeLessThanOrEqual(721);
  await page.addStyleTag({ content: 'html { overflow-y: scroll !important; scrollbar-gutter: stable !important; } ::-webkit-scrollbar { width: 17px; } body { min-height: 200vh !important; }' });
  expect(await width()).toBeGreaterThanOrEqual(719);
  expect(await width()).toBeLessThanOrEqual(721);
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
