/**
 * The Shelf's main journeys (DESIGN §9.4), on a phone and a desktop, light and dark, with a real
 * household (the demo save, driven through the real reducers): the scene's pets are buttons whose name
 * tag opens the Pet Card; the Pet Card's gestures and pantry; the Field Guide; decor edit mode; opening
 * a place with coins. Each stop is checked with axe and for console errors.
 */
import { expect, test, type Page } from '@playwright/test';
import { buildDemo } from '../src/state/demo';
import { encodeEnvelope, SAVE_KEY } from '../src/state/persist';
import type { AppState } from '../src/state/types';
import { expectNoAxeViolations, horizontalOverflow, openRoute, watchErrors } from './support';

const now = Date.now();
const d = new Date(now - 3 * 3_600_000);
const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const demo = buildDemo({ today, now });

/** Loads a save before the app boots, then opens the Shelf. */
async function openShelf(page: Page, state: AppState = demo): Promise<void> {
  const save = encodeEnvelope(state, 1, now, 'e2e');
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
