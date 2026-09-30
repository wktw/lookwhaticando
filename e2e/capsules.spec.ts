/**
 * Hand-offs that carry what they are for (WP-C7), by keyboard, on a phone and a desktop, light and
 * dark (the four screens projects):
 * - on the routed Capsules screen, a new pet's "Find {name} a plant" opens its Pet Card on the plant
 *   chooser with focus there, and Enter on a plant moves the pet in, once (integration-i6); with no
 *   habit yet, the card says how a plant comes and "Add a habit" opens the Habit Editor;
 * - new decor's "Find it a place" lands in the Shelf's edit mode with the thing focused in the tray;
 * - "Open Today" on a calendar day, from Habit Detail over Today and from Progress, leaves no dialog,
 *   selects the day and puts focus on the habit's ring, and Enter waters that day (domain-w2-d2);
 * - the Pet Card's "All treats (8)" opens the rest and the 8th of 8 treats can be fed (creative-cr-01).
 *
 * Each save is built here through the real reducers (the demo, then a real Special Order, which
 * leaves its reveal waiting as a reload mid-reveal would) and put in place before the app loads.
 */
import { expect, test, type Page } from '@playwright/test';
import { buildDemo } from '../src/state/demo';
import { COLLECTIBLES, getCollectible } from '../src/catalog/collectibles';
import { transact } from '../src/domain/tx';
import { mulberry32 } from '../src/domain/rng';
import { addDays, appDayKey, runtimeLocalTime } from '../src/domain/dates';
import * as gacha from '../src/domain/gacha';
import { encodeEnvelope } from '../src/state/persist';
import type { AppState } from '../src/state/types';
import { expectNoAxeViolations, openRoute, watchErrors } from './support';

const now = Date.now();
const today = appDayKey(now, 180, runtimeLocalTime);
const yesterday = addDays(today, -1);
const env = { now, today, local: runtimeLocalTime, rng: mulberry32(7) };
const demo = buildDemo({ today, now });

/** The demo after a real Special Order of the first thing of `category` it can order: its reveal waits. */
function ordered(category: 'pet' | 'decor', base: AppState = demo): { state: AppState; id: string } {
  const createdOn = gacha.profileCreatedOn(base, runtimeLocalTime);
  const def = COLLECTIBLES.find((c) => c.category === category && gacha.wishStatus(base, c.id, today, createdOn).ok)!;
  const rich: AppState = { ...base, wallet: { ...base.wallet, stars: base.wallet.stars + 50 } };
  const out = transact(rich, env, (tx) => ({ o: gacha.wish(tx, def.id) }));
  expect(out.o.ok, `ordering ${def.id}`).toBe(true);
  expect(out.state.pendingReveal?.itemId).toBe(def.id);
  return { state: out.state, id: def.id };
}

async function seed(page: Page, state: AppState): Promise<void> {
  const envelope = encodeEnvelope(state, 1, now, 'e2e');
  await page.addInitScript((raw) => {
    if (sessionStorage.getItem('ck-e2e-seeded')) return;
    localStorage.setItem('catkin:v1', raw);
    sessionStorage.setItem('ck-e2e-seeded', '1');
  }, envelope);
}

/** The save as the page last wrote it. */
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('catkin:v1') ?? 'null')?.state as AppState);

/** Waits for the order's reveal to reach its card, then presses Enter on the button named `name`. */
async function pressOnReveal(page: Page, name: string | RegExp): Promise<void> {
  const button = page.getByRole('button', { name });
  await expect(button).toBeVisible();
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Capsule reveal' })).toHaveCount(0);
}

test.describe('the routed Capsules screen hands a reveal on (WP-C7)', () => {
  test('"Find {name} a plant" opens the Pet Card on the chooser, focused; Enter on a plant moves the pet in, once', async ({ page }, info) => {
    const errors = watchErrors(page);
    // The demo's pets keep every plant company: one plant is free, so a choice is a plain move-in.
    const free = demo.habits.find((h) => h.archivedOn === undefined)!;
    const { state, id } = ordered('pet', { ...demo, habits: demo.habits.map((h) => (h.id === free.id ? { ...h, companionId: undefined } : h)) });
    await seed(page, state);
    await openRoute(page, 'capsules');
    const name = (await saved(page)).pets[id]!.name;
    await pressOnReveal(page, `Find ${name} a plant`);
    await expect(page).toHaveURL(/#\/capsules$/);
    const card = page.getByRole('dialog', { name });
    await expect(card).toBeVisible();
    const chooser = card.getByRole('list', { name: `Find ${name} a plant` });
    await expect(chooser.getByRole('button').first()).toBeFocused();
    await page.waitForTimeout(400);
    await expectNoAxeViolations(page, info);
    // A plant no one keeps company yet: Tab along the chips to it, then Enter.
    const chips = chooser.getByRole('button');
    const n = await chips.count();
    let pick = -1;
    for (let i = 0; i < n; i++) if (!(await chips.nth(i).innerText()).includes('keeps it company')) {
      pick = i;
      break;
    }
    expect(pick).toBeGreaterThanOrEqual(0);
    for (let i = 0; i < pick; i++) await page.keyboard.press('Tab');
    const plant = (await chips.nth(pick).innerText()).trim();
    await expect(chips.nth(pick)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(card.getByRole('heading', { name: `Keeps ${plant} company` })).toBeVisible();
    await expect.poll(async () => (await saved(page)).habits.filter((h) => h.companionId === id).map((h) => h.name)).toEqual([plant]);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('with no habit yet, the Pet Card says how a plant comes, and "Add a habit" (focused) opens the Habit Editor', async ({ page }) => {
    const errors = watchErrors(page);
    const bare: AppState = { ...demo, habits: demo.habits.map((h) => ({ ...h, companionId: undefined, archivedOn: h.archivedOn ?? addDays(today, -1) })) };
    const { state, id } = ordered('pet', bare);
    await seed(page, state);
    await openRoute(page, 'capsules');
    const name = (await saved(page)).pets[id]!.name;
    await pressOnReveal(page, `Find ${name} a plant`);
    const card = page.getByRole('dialog', { name });
    await expect(card.getByText(`${name} keeps a plant company. Plants grow from habits, starting as a cutting in a glass of water.`)).toBeVisible();
    const add = card.getByRole('button', { name: 'Add a habit' });
    await expect(add).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'A new habit' })).toBeVisible();
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('"Find it a place" lands in the Shelf’s edit mode with the thing focused in the tray; Enter puts it out', async ({ page }) => {
    const errors = watchErrors(page);
    const { state, id } = ordered('decor');
    await seed(page, state);
    await openRoute(page, 'capsules');
    await pressOnReveal(page, 'Find it a place');
    await expect(page).toHaveURL(/#\/shelf$/);
    await expect(page.locator('main h1')).toHaveText('Shelf');
    const tray = page.locator('section[aria-labelledby="shelf-decorate"]');
    await expect(tray).toBeVisible();
    const tile = tray.locator(`button[data-item="${id}"]`);
    await expect(tile).toBeFocused();
    const before = (await saved(page)).shelf.decor.filter((d) => d.itemId === id).length;
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await saved(page)).shelf.decor.filter((d) => d.itemId === id).length).toBe(before + 1);
    expect(getCollectible(id)?.category).toBe('decor');
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

/** The demo with "Take vitamins" not watered yesterday. */
function vitaminsOpen(): { state: AppState; habitId: string } {
  const habitId = demo.habits.find((h) => h.name === 'Take vitamins')!.id;
  const { [yesterday]: _gone, ...rest } = demo.logs[habitId] ?? {};
  return { state: { ...demo, logs: { ...demo.logs, [habitId]: rest } }, habitId };
}

/** In `scope`'s calendar, shows yesterday's month and picks yesterday. */
async function pickYesterday(page: Page, scope: ReturnType<Page['locator']>): Promise<void> {
  if (yesterday.slice(0, 7) !== today.slice(0, 7)) await scope.getByRole('button', { name: 'Previous month' }).click();
  await scope.locator(`button[data-date="${yesterday}"]`).click();
}

/** After "Open Today": Today, no dialog, yesterday selected, focus on the habit's ring; Enter waters yesterday. */
async function landsOnYesterday(page: Page, habitId: string): Promise<void> {
  await expect(page).toHaveURL(/#\/today$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText(/^Logging for /)).toBeVisible();
  const ring = page.locator(`article[data-habit="${habitId}"] button[data-state]`);
  await expect(ring).toBeFocused();
  const todayLog = (await saved(page)).logs[habitId]?.[today];
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await saved(page)).logs[habitId]?.[yesterday]).toMatchObject({ kind: 'log', count: 1 });
  expect((await saved(page)).logs[habitId]?.[today]).toEqual(todayLog);
}

test.describe('"Open Today" on a calendar day (WP-C7)', () => {
  test('from Habit Detail over Today', async ({ page }) => {
    const errors = watchErrors(page);
    const { state, habitId } = vitaminsOpen();
    await seed(page, state);
    await openRoute(page, 'today');
    // Its block may be folded by now (an earlier block, all watered): open it first.
    const folded = page.locator('button[aria-expanded="false"]', { hasText: 'Take vitamins' });
    if (await folded.count()) await folded.first().click();
    await page.locator(`article[data-habit="${habitId}"] h3`).click();
    const sheet = page.getByRole('dialog', { name: 'Take vitamins' });
    await expect(sheet).toBeVisible();
    await pickYesterday(page, sheet);
    const link = sheet.getByRole('link', { name: 'Open Today' });
    await link.focus();
    await page.keyboard.press('Enter');
    await landsOnYesterday(page, habitId);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('from Progress’s calendar', async ({ page }) => {
    const errors = watchErrors(page);
    const { state, habitId } = vitaminsOpen();
    await seed(page, state);
    await openRoute(page, 'progress');
    const cal = page.locator('[data-section="calendar"]');
    await page.getByRole('radiogroup', { name: 'Show habit' }).getByRole('radio', { name: 'Take vitamins', exact: true }).click();
    await pickYesterday(page, cal);
    const link = cal.getByRole('link', { name: 'Open Today' });
    await link.focus();
    await page.keyboard.press('Enter');
    await landsOnYesterday(page, habitId);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('the Pet Card feeds every treat (WP-C7)', () => {
  test('"All treats (8)" opens the rest with focus on the first, and the 8th of 8 is fed', async ({ page }, info) => {
    const errors = watchErrors(page);
    const pet = Object.values(demo.pets).find((p) => p.inMeadow)!;
    const eight = COLLECTIBLES.filter((c) => c.category === 'treat' && c.source !== 'harvest')
      .slice(0, 8)
      .sort((a, b) => a.name.localeCompare(b.name));
    const collection = Object.fromEntries(Object.entries(demo.collection).filter(([id]) => getCollectible(id)?.category !== 'treat'));
    for (const t of eight) collection[t.id] = { count: 1, firstAt: 0 };
    const state: AppState = {
      ...demo,
      pets: { ...demo.pets, [pet.id]: { ...pet, favoriteKnown: false, daily: { ...pet.daily, treats: 0 } } },
      collection,
      pantry: Object.fromEntries(eight.map((t) => [t.id, { servings: 3, restockedOn: today }])),
    };
    await seed(page, state);
    await openRoute(page, 'shelf');
    await page.locator(`[data-pet-tile="${pet.id}"]`).click();
    const card = page.getByRole('dialog', { name: pet.name });
    await expect(card).toBeVisible();
    const all = card.getByRole('button', { name: 'All treats (8)' });
    await all.focus();
    await expect(all).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Enter');
    await expect(all).toHaveAttribute('aria-expanded', 'true');
    const feeds = card.locator('button[aria-label^="Feed "]');
    await expect(feeds).toHaveCount(8);
    await expect(feeds.nth(6)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(feeds.nth(7)).toBeFocused();
    await expect(feeds.nth(7)).toHaveAttribute('aria-label', `Feed ${eight[7]!.name}, 3 servings`);
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await saved(page)).pantry[eight[7]!.id]?.servings).toBe(2);
    await expect(feeds.nth(7)).toHaveAttribute('aria-label', `Feed ${eight[7]!.name}, 2 servings`);
    await expectNoAxeViolations(page, info);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
