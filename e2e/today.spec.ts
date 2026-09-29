/**
 * Today and the Habit Editor, end to end (DESIGN §9.1, §5): the empty sill, planting a habit from an
 * idea, watering it with the note and Undo, the ⋯ menu, a past day from the week strip, the band's
 * collapse, the first card's height budget, reflow at 320 px, and axe, on a phone and a desktop, in
 * Paper and Lamplight.
 *
 * A demo household is seeded through the dev server's own modules (the real reducers, `buildDemo`),
 * so those checks run against `npm run e2e` (the dev server) and are skipped against a preview build.
 */
import { devices, expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations, horizontalOverflow, openRoute, watchErrors } from './support';

const PREVIEW = process.env.E2E_TARGET === 'preview';

/** A phone is an iPhone 13 on Chromium, with touch (the browser type is the project's). */
const { defaultBrowserType: _webkit, ...IPHONE } = devices['iPhone 13']; // eslint-disable-line @typescript-eslint/no-unused-vars
const PHONE = { ...IPHONE, viewport: { width: 390, height: 844 } };

const VIEWS = [
  { name: 'phone', use: PHONE, viewport: PHONE.viewport },
  { name: 'desktop', use: { viewport: { width: 1280, height: 800 } }, viewport: { width: 1280, height: 800 } },
] as const;

/** Presses a ring for `ms` with the mouse (a long press when `ms` passes the hold), then lets go. */
async function press(page: Page, ring: ReturnType<Page['getByRole']>, ms: number): Promise<void> {
  const b = (await ring.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

/** Seeds the demo household (about 120 days, seven habits, pets) as the real save, then reloads. */
async function seedDemo(page: Page, patch: Record<string, unknown> = {}): Promise<void> {
  await page.goto('./#/today');
  await page.evaluate(async (settings) => {
    // The dev server serves the app's own modules by path (typed loosely: this runs in the page).
    const load = (path: string): Promise<any> => import(/* @vite-ignore */ path); // eslint-disable-line @typescript-eslint/no-explicit-any
    const demo = await load('/src/state/demo.ts');
    const persist = await load('/src/state/persist.ts');
    const dates = await load('/src/domain/dates.ts');
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
      test.use({ ...v.use, colorScheme: scheme });

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

        // The band collapses to 64 px as the page scrolls, and comes back (the wheel over the list).
        const list = (await page.locator('article[data-habit]').first().boundingBox())!;
        await page.mouse.move(list.x + 20, list.y + 10);
        await page.mouse.wheel(0, 400);
        await expect(page.locator('[data-collapsed]')).toHaveCount(1);
        await page.evaluate(() => window.scrollTo(0, 0));
        await expect(page.locator('[data-collapsed]')).toHaveCount(0);
        expect(errors, errors.join('\n')).toEqual([]);
      });
    });
  }
}

test.describe('Today · phone with touch · the ring, the strip and the band', () => {
  test.use({ ...PHONE, colorScheme: 'light' });
  // The demo waters each habit at its block's hour up to now (the evening ones after 20:15), and these
  // checks need today's habits still to water (a full band that scrolls): they run at 7 am of today,
  // before the morning block, whenever the suite runs.
  test.beforeEach(async ({ page }) => {
    const early = new Date();
    early.setHours(7, 0, 0, 0);
    await page.clock.install({ time: early });
    await page.clock.resume();
  });

  test('a slow tap still waters, a long press opens the number pad, and ⋯ opens it too', async ({ page }) => {
    test.skip(PREVIEW, 'seeds through the dev server');
    const errors = watchErrors(page);
    await seedDemo(page);
    // Phone-free bedtime has no tiny version and no count: a 700 ms press is a tap.
    const phoneFree = page.getByRole('button', { name: 'Phone-free bedtime', exact: true });
    await expect(phoneFree).toHaveAttribute('aria-pressed', 'false');
    await press(page, phoneFree, 700);
    await expect(phoneFree).toHaveAttribute('aria-pressed', 'true');
    // Drink water counts: a long press opens its number pad.
    const water = page.locator('article[data-habit]', { has: page.getByRole('heading', { name: 'Drink water' }) }).locator('button[data-state]');
    await press(page, water, 800);
    const pad = page.getByRole('dialog', { name: 'Drink water' });
    await expect(pad).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(pad).toBeHidden();
    // …and so does ⋯ › How many… (DESIGN §11.2: a button for every long press).
    await page.getByRole('button', { name: 'More for Drink water' }).tap();
    await page.getByRole('menuitem', { name: /^How many/ }).tap();
    await expect(pad).toBeVisible();
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('picking a past day never moves the strip', async ({ page }) => {
    test.skip(PREVIEW, 'seeds through the dev server');
    await seedDemo(page);
    const strip = page.getByRole('radiogroup', { name: 'The last 7 days' });
    const before = (await strip.boundingBox())!;
    await strip.getByRole('radio').nth(3).tap();
    await expect(page.getByText(/^Logging for /)).toBeVisible();
    const after = (await strip.boundingBox())!;
    expect(after.y).toBe(before.y);
    expect(after.height).toBe(before.height);
  });

  test('a watering brings its pot into the band’s view before the pour', async ({ page }) => {
    test.skip(PREVIEW, 'seeds through the dev server');
    await seedDemo(page);
    const row = page.getByRole('group', { name: 'Today’s plants' });
    // Scroll the pots to the far end, so the first card's pot is out of view.
    await row.evaluate((el) => (el.scrollLeft = el.scrollWidth));
    const card = page.locator('article[data-habit]').first();
    const id = (await card.getAttribute('data-habit'))!;
    const pot = row.locator(`[data-habit="${id}"]`);
    const inView = () => pot.evaluate((p) => { const r = p.closest('[role="group"]')!.getBoundingClientRect(); const b = p.getBoundingClientRect(); const x = b.left + b.width / 2; return x >= r.left && x <= r.right; });
    expect(await inView()).toBe(false);
    await card.locator('button[data-state]').tap();
    await expect.poll(inView).toBe(true);
  });
});

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

test.describe('Today · speed (E2E_PERF=1)', () => {
  test.use({ ...PHONE, colorScheme: 'light' });
  test('switching to Today and a tap each take a frame or two', async ({ page }) => {
    test.skip(PREVIEW || !process.env.E2E_PERF, 'a timing check: run with E2E_PERF=1 on a quiet machine');
    await seedDemo(page);
    await page.evaluate(() => (location.hash = '#/you'));
    await page.waitForTimeout(1500);
    const switches: number[] = [];
    for (let i = 0; i < 4; i++) {
      switches.push(await page.evaluate(() => new Promise<number>((res) => { const t0 = performance.now(); location.hash = '#/today'; const c = () => (document.querySelector('article[data-habit]') ? requestAnimationFrame(() => res(performance.now() - t0)) : requestAnimationFrame(c)); c(); })));
      await page.waitForTimeout(800);
      await page.evaluate(() => (location.hash = '#/you'));
      await page.waitForTimeout(800);
    }
    await page.evaluate(() => (location.hash = '#/today'));
    await page.waitForTimeout(2000);
    const taps: number[] = [];
    const rings = page.locator('article[data-habit] button[data-state]');
    for (let i = 0; i < 3; i++) {
      taps.push(await rings.nth(i).evaluate((b: HTMLElement) => new Promise<number>((res) => { const t0 = performance.now(); b.click(); requestAnimationFrame(() => res(performance.now() - t0)); })));
      await page.waitForTimeout(1200);
    }
    const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]!;
    expect(median(switches.slice(1))).toBeLessThan(100);
    expect(median(taps)).toBeLessThan(32);
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
