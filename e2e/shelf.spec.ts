/**
 * The Shelf's main journeys (DESIGN §9.4), on a phone and a desktop, light and dark, with a real
 * household (the demo save, driven through the real reducers): the scene's pets are buttons whose name
 * tag opens the Pet Card; the Pet Card's gestures and pantry; the Field Guide; decor edit mode; opening
 * a place with coins. Each stop is checked with axe and for console errors.
 */
import { expect, test, type Page } from '@playwright/test';
import { buildDemo } from '../src/state/demo';
import { getCollectible } from '../src/catalog/collectibles';
import { encodeEnvelope, SAVE_KEY } from '../src/state/persist';
import type { AppState } from '../src/state/types';
import { expectNoAxeViolations, horizontalOverflow, openRoute, watchErrors } from './support';

const pad = (n: number) => String(n).padStart(2, '0');
/** The app day at `ms` (the day starts at 03:00). */
const dayKey = (ms: number) => {
  const d = new Date(ms - 3 * 3_600_000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const now = Date.now();
const today = dayKey(now);
const demo = buildDemo({ today, now });

/**
 * Loads a save before the app boots, then opens the Shelf. The page's clock starts at `now` and runs
 * on from there, so the app boots on the save's day even when the 03:00 day start passes between this
 * file loading and the test running (it did once, in a gate at 03:00 UTC: the basket's empty treat was
 * restocked on boot and its Bake row never came).
 */
async function openShelf(page: Page, state: AppState = demo, clockNow = now): Promise<void> {
  await page.clock.install({ time: clockNow });
  await page.clock.resume();
  const save = encodeEnvelope(state, 1, clockNow, 'e2e');
  await page.addInitScript(([k, v]) => localStorage.setItem(k!, v!), [SAVE_KEY, save]);
  await openRoute(page, 'shelf');
  await page.waitForLoadState('networkidle');
}

const petOut = Object.values(demo.pets).find((p) => p.inMeadow)!;
const locked = (['pond', 'grass', 'bookshelf', 'balcony', 'quilt'] as const).find((p) => !demo.shelf.places.includes(p))!;

const SIZES = [
  { name: 'phone', viewport: { width: 390, height: 844 } },
  { name: 'desktop', viewport: { width: 1280, height: 800 } },
] as const;

for (const size of SIZES) {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(`${size.name} ${scheme}`, () => {
      test.use({ viewport: size.viewport, colorScheme: scheme });

      test('the Shelf shows the household, and passes axe', async ({ page }, info) => {
        const errors = watchErrors(page);
        await openShelf(page);
        await expect(page.locator('main h1')).toHaveText('Shelf');
        await expect(page.locator('main h1')).toHaveCount(1);
        await expect(page.getByRole('group', { name: /^The Shelf/ })).toBeVisible();
        await expect(page.locator('[data-pet-tile]')).toHaveCount(Object.keys(demo.pets).length);
        await expect(page.locator('[data-caption]')).not.toBeEmpty();
        await expectNoAxeViolations(page, info);
        const o = await horizontalOverflow(page);
        expect(o.scrollWidth, o.culprits.join('\n')).toBeLessThanOrEqual(o.clientWidth);
        expect(errors, errors.join('\n')).toEqual([]);
      });

      test('a pet in the scene: a tap shows the name tag, which opens the Pet Card', async ({ page }, info) => {
        const errors = watchErrors(page);
        await openShelf(page);
        const actor = page.locator(`[data-pet="${petOut.id}"] button`).first();
        await actor.scrollIntoViewIfNeeded();
        await actor.focus();
        await page.keyboard.press('Enter');
        const tag = page.getByRole('button', { name: `${petOut.name}’s card` });
        await expect(tag).toBeVisible();
        await tag.click();
        const card = page.getByRole('dialog', { name: petOut.name });
        await expect(card).toBeVisible();
        await card.getByRole('button', { name: 'Say hello' }).click();
        await expect(card.locator('p[class*="caption"]')).toContainText(petOut.name);
        const feed = card.locator('button[aria-label^="Feed "]:not([disabled])').first();
        await feed.scrollIntoViewIfNeeded();
        await feed.click();
        await expectNoAxeViolations(page, info);
        await page.keyboard.press('Escape');
        await expect(card).toBeHidden();
        expect(errors, errors.join('\n')).toEqual([]);
      });

      test('the Field Guide: species pages, "not yet", a Secret is a "?"', async ({ page }, info) => {
        const errors = watchErrors(page);
        await openShelf(page);
        await page.getByRole('button', { name: /^Cats, / }).click();
        const guide = page.getByRole('dialog', { name: 'Field Guide' });
        await expect(guide.getByRole('tab', { name: /^Cats/ })).toHaveAttribute('aria-selected', 'true');
        await expect(guide.getByRole('tabpanel')).toContainText('not yet');
        await page.keyboard.press('ArrowRight');
        await expect(guide.getByRole('tab', { name: /^Cows/ })).toHaveAttribute('aria-selected', 'true');
        await expectNoAxeViolations(page, info);
        expect(errors, errors.join('\n')).toEqual([]);
      });
    });
  }
}

test.describe('phone journeys', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('decor edit mode adds, flips and puts away, then Done', async ({ page }, info) => {
    const errors = watchErrors(page);
    const roomy: AppState = { ...demo, shelf: { ...demo.shelf, decor: demo.shelf.decor.filter((x) => x.place !== 'sill') }, collection: { ...demo.collection, 'decor-matchbox-bed': { count: 5, firstAt: now } } };
    await openShelf(page, roomy);
    await page.getByRole('button', { name: 'Decorate' }).click();
    const tray = page.locator('section[aria-labelledby="shelf-decorate"]');
    await expect(tray).toBeVisible();
    const before = await page.locator('[data-edit]').count();
    await tray.locator('ul button').first().click();
    await expect(page.locator('[data-edit]')).toHaveCount(before + 1);
    await tray.getByRole('button', { name: 'Flip' }).click();
    await expectNoAxeViolations(page, info);
    await tray.getByRole('button', { name: 'Put away' }).click();
    await expect(page.locator('[data-edit]')).toHaveCount(before);
    await tray.getByRole('button', { name: 'Done' }).click();
    await expect(page.locator('[data-edit]')).toHaveCount(0);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('the Field Guide holds the things too: Treats, with rarity in words, and the card counts everything', async ({ page }, info) => {
    const errors = watchErrors(page);
    await openShelf(page);
    await expect(page.locator('#shelf-guide-count')).toHaveText(/^\d+ of \d+$/);
    await page.getByRole('button', { name: /^Treats, / }).click();
    const guide = page.getByRole('dialog', { name: 'Field Guide' });
    await expect(guide.getByRole('tab', { name: /^Treats/ })).toHaveAttribute('aria-selected', 'true');
    await expect(guide.getByRole('tab', { name: /^Wardrobe/ })).toBeVisible();
    await expect(guide.getByRole('tabpanel').getByRole('heading', { name: 'Treats' })).toBeVisible();
    await expectNoAxeViolations(page, info);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('the basket offers a bake only for a treat that ran out, never for the rest', async ({ page }, info) => {
    const errors = watchErrors(page);
    // Restocked today: before the demo's first morning check-in (about 07:40) its pantry still says
    // yesterday, and the app's morning restock would refill the empty treat on boot.
    const pantry = Object.fromEntries(Object.keys(demo.pantry).map((k) => [k, { ...demo.pantry[k]!, servings: 5, restockedOn: today }]));
    const low = Object.keys(pantry).find((k) => getCollectible(k)?.category === 'treat' && getCollectible(k)?.source !== 'harvest' && (demo.collection[k]?.count ?? 0) > 0)!;
    pantry[low] = { ...pantry[low]!, servings: 0 };
    await openShelf(page, { ...demo, pantry, wallet: { ...demo.wallet, coins: 100 } });
    await page.getByRole('button', { name: 'Basket', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: 'Basket and pantry' });
    await expect(sheet.getByRole('button', { name: /^Bake a tray/ })).toHaveCount(1);
    await expectNoAxeViolations(page, info);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('opening a place asks first, spends the coins and shows the place', async ({ page }) => {
    const errors = watchErrors(page);
    await openShelf(page, { ...demo, wallet: { ...demo.wallet, coins: 5000 } });
    await page.locator(`[data-open-place="${locked}"]`).click();
    const ask = page.getByRole('alertdialog');
    await expect(ask).toBeVisible();
    await ask.getByRole('button', { name: /^Open for/ }).click();
    await expect(page.locator(`[data-place-card="${locked}"][data-owned]`)).toBeVisible();
    await expect(page.locator(`[data-place="${locked}"]`)).toHaveCount(1);
    await expect(page.getByText(/is open/).first()).toBeVisible();
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('with no pets yet, it points to the first capsule; reflows at 320 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    const errors = watchErrors(page);
    await openShelf(page, { ...demo, pets: {}, habits: demo.habits.map((h) => ({ ...h, companionId: undefined })) });
    await expect(page.getByText('The sill is ready for someone.')).toBeVisible();
    // Nothing to arrange and no one to feed: no Decorate, no Basket.
    await expect(page.getByRole('button', { name: 'Basket', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Go to Capsules' }).click();
    await expect(page).toHaveURL(/#\/capsules$/);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('the busy household reflows at 320 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await openShelf(page);
    const o = await horizontalOverflow(page);
    expect(o.scrollWidth, o.culprits.join('\n')).toBeLessThanOrEqual(o.clientWidth);
  });
});

/**
 * A note or a found thing on the sill never covers a pet. The pets' places follow the clock, so the axe check above
 * caught these only at some hours; these are the moments it did, pinned (local time) so they run every time: the
 * Sunday Note over Fern, napping on the hot-water bottle by the coin jar; a found thing over a pet by its pot.
 */
test.describe('nothing on the sill covers a pet', () => {
  const MOMENTS = [
    [2026, 9, 30, 13, 32],
    [2026, 10, 4, 11, 32],
    [2026, 12, 1, 10, 32],
  ] as const;
  for (const size of SIZES)
    for (const [y, mo, day, h, mi] of MOMENTS) {
      test(`${size.name}, ${y}-${pad(mo)}-${pad(day)} ${pad(h)}:${pad(mi)}`, async ({ page }, info) => {
        const at = new Date(y, mo - 1, day, h, mi).getTime();
        await page.setViewportSize(size.viewport);
        await page.clock.setFixedTime(at);
        const save = encodeEnvelope(buildDemo({ today: dayKey(at), now: at }), 1, at, 'e2e');
        await page.addInitScript(([k, v]) => localStorage.setItem(k!, v!), [SAVE_KEY, save]);
        await openRoute(page, 'shelf');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('[data-sill="note"], [data-sill="found"]').first()).toBeVisible();
        await expectNoAxeViolations(page, info);
      });
    }
});


test.describe('an overlapping scene name tag', () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test('the selected pet’s name tag receives the pointer above a neighbouring pet', async ({ page }) => {
    // Exact clock from the failed full run: 2026-10-02T06:02:52.761Z. At this hour the
    // corgi stands across the first pet’s name tag in this real household.
    const at = 1790920972761;
    const household = buildDemo({ today: '2026-10-02', now: at });
    const pet = Object.values(household.pets).find((p) => p.inMeadow)!;
    await openShelf(page, household, at);
    const actor = page.locator(`[data-pet="${pet.id}"] button`).first();
    await actor.scrollIntoViewIfNeeded();
    await actor.focus();
    await page.keyboard.press('Enter');
    const tag = page.getByRole('button', { name: `${pet.name}’s card`, exact: true });
    await expect(tag).toBeVisible();
    await tag.click();
    await expect(page.getByRole('dialog', { name: pet.name, exact: true })).toBeVisible();
  });
});
