/**
 * Today and the Habit Editor, end to end (DESIGN §9.1, §5): the empty sill, planting a habit from an
 * idea, watering it with the note and Undo, the ⋯ menu, a past day from the week strip, the band's
 * collapse, the first card's height budget, reflow at 320 px, and axe, on a phone and a desktop, in
 * Paper and Lamplight.
 *
 * A demo household is seeded through the dev server's own modules (the real reducers, `buildDemo`),
 * so those checks run against `npm run e2e` (the dev server) and are skipped against a preview build.
 */
import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations, horizontalOverflow, openRoute, watchErrors } from './support';

const PREVIEW = process.env.E2E_TARGET === 'preview';

const VIEWS = [
  { name: 'phone', viewport: { width: 390, height: 844 } },
  { name: 'desktop', viewport: { width: 1280, height: 800 } },
] as const;

/** Seeds the demo household (about 120 days, seven habits, pets) as the real save, then reloads. */
async function seedDemo(page: Page, patch: Record<string, unknown> = {}): Promise<void> {
  await page.goto('./#/today');
  await page.evaluate(async (settings) => {
    const demo = await import(/* @vite-ignore */ '/src/state/demo.ts');
    const persist = await import(/* @vite-ignore */ '/src/state/persist.ts');
    const dates = await import(/* @vite-ignore */ '/src/domain/dates.ts');
    const now = Date.now();
    const today = dates.appDayKey(now, 180, dates.runtimeLocalTime);
    const s = demo.buildDemo({ today, now, name: 'Sam' });
    const state = { ...s, settings: { ...s.settings, ...settings } };
    localStorage.setItem('catkin:v1', persist.encodeEnvelope(state, 1, now, 'e2e'));
  }, patch);
  await page.reload();
  await expect(page.locator('main h1')).toBeVisible();
}

for (const v of VIEWS) {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(`Today · ${v.name} · ${scheme}`, () => {
      test.use({ viewport: v.viewport, colorScheme: scheme });

      test('an empty sill, a habit planted from an idea, watered and un-watered', async ({ page }, info) => {
        const errors = watchErrors(page);
        await openRoute(page, 'today');
        await expect(page.getByText('An empty sill.')).toBeVisible();
        await expectNoAxeViolations(page, info);

        await page.getByRole('button', { name: 'Add a habit' }).first().click();
        const editor = page.getByRole('dialog', { name: 'A new habit' });
        await expect(editor).toBeVisible();
        await editor.getByRole('radio', { name: 'Walk', exact: true }).click();
        await expect(editor.getByLabel('Name')).toHaveValue('Walk');
        await expectNoAxeViolations(page, info);
        await page.getByRole('button', { name: 'Plant it' }).click();
        await expect(editor).toBeHidden();

        const ring = page.getByRole('button', { name: 'Walk', exact: true });
        await expect(ring).toHaveAttribute('aria-pressed', 'false');
        await ring.click();
        await expect(ring).toHaveAttribute('aria-pressed', 'true');
        await expect(page.getByText('Walk, watered.').first()).toBeVisible();
        await page.getByRole('button', { name: 'Undo' }).first().click();
        await expect(ring).toHaveAttribute('aria-pressed', 'false');
        await expect(page.getByText(/Walk, not watered after all\./).first()).toBeVisible();
        expect(errors, errors.join('\n')).toEqual([]);
      });

      test('a busy household: the band, the list, the menu, a past day, and axe', async ({ page }, info) => {
        test.skip(PREVIEW, 'seeds through the dev server');
        const errors = watchErrors(page);
        await seedDemo(page);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('main h1')).toHaveText(/Sam\./);
        await expect(page.getByRole('radiogroup', { name: 'The last 7 days' }).getByRole('radio')).toHaveCount(7);
        await expectNoAxeViolations(page, info);

        // DESIGN §9.1: the first card's top is at most 260 px below the safe area.
        const top = await page.locator('article[data-habit]').first().evaluate((el) => el.getBoundingClientRect().top);
        expect(top).toBeLessThanOrEqual(v.name === 'desktop' ? 260 + 16 : 260);

        // The ⋯ menu.
        const more = page.getByRole('button', { name: /^More for / }).first();
        await more.click();
        await expect(page.getByRole('menu')).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Details' })).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('menu')).toBeHidden();
        await expect(more).toBeFocused();

        // A past day by keyboard: the banner, and back.
        await page.getByRole('radio', { checked: true }).focus();
        await page.keyboard.press('ArrowLeft');
        await expect(page.getByText(/^Logging for /)).toBeVisible();
        await expectNoAxeViolations(page, info);
        await page.getByRole('button', { name: 'Back to today' }).click();
        await expect(page.getByText(/^Logging for /)).toBeHidden();

        // The band collapses to 64 px as the page scrolls, and comes back.
        await page.mouse.wheel(0, 400);
        await expect(page.locator('[data-collapsed]')).toHaveCount(1);
        await page.evaluate(() => window.scrollTo(0, 0));
        await expect(page.locator('[data-collapsed]')).toHaveCount(0);
        expect(errors, errors.join('\n')).toEqual([]);
      });
    });
  }
}

test.describe('Today · phone · 320 px', () => {
  test.use({ viewport: { width: 320, height: 640 } });
  test('reflows without scrolling sideways, busy or empty', async ({ page }) => {
    const errors = watchErrors(page);
    await openRoute(page, 'today');
    let o = await horizontalOverflow(page);
    expect(o.scrollWidth, o.culprits.join('\n')).toBeLessThanOrEqual(o.clientWidth);
    if (!PREVIEW) {
      await seedDemo(page, { compactToday: true });
      await page.waitForLoadState('networkidle');
      o = await horizontalOverflow(page);
      expect(o.scrollWidth, o.culprits.join('\n')).toBeLessThanOrEqual(o.clientWidth);
    }
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('Today · quiet rewards', () => {
  test('hides the wallet and the coins', async ({ page }) => {
    test.skip(PREVIEW, 'seeds through the dev server');
    await seedDemo(page, { quietRewards: true });
    await expect(page.locator('main [data-wallet-target]')).toHaveCount(0);
    await expect(page.getByText(/\+\d+ coins?/)).toHaveCount(0);
  });
});
