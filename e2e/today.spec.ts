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

test('a sheet whose chunk can’t load says so; back online, Try again opens what was asked for (WP-C4)', async ({ page }) => {
  // The Habit Editor's chunk is aborted the way an offline fetch fails.
  const chunk = '**/*HabitEditorHost*';
  await page.route(chunk, (r) => r.abort('internetdisconnected'));
  await openRoute(page, 'today');
  await page.getByRole('button', { name: 'Add a habit' }).first().click();
  const error = page.getByRole('alertdialog');
  await expect(error).toBeVisible();
  await expect(error).toContainText('This didn’t open');
  await expect(error.getByRole('button', { name: 'Try again' })).toBeFocused();

  // Offline, Try again does not reload (that could land on the browser's own offline page): the
  // error sheet comes back, busy no more, in the same page.
  let loads = 0;
  page.on('load', () => loads++);
  await page.evaluate(() => ((window as unknown as { samePage: boolean }).samePage = true));
  await page.context().setOffline(true);
  await error.getByRole('button', { name: 'Try again' }).click();
  await page.waitForTimeout(600);
  await expect(error).toBeVisible();
  await expect(error.getByRole('button', { name: 'Try again' })).not.toHaveAttribute('aria-busy', 'true');
  expect(loads).toBe(0);
  expect(await page.evaluate(() => (window as unknown as { samePage?: boolean }).samePage)).toBe(true);

  // Back online, Chromium still keeps the failed chunk for the life of the page, so Try again
  // reloads (online, nothing unsaved), and the shell asks for the same sheet again once it is back.
  await page.context().setOffline(false);
  await page.unroute(chunk);
  await error.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('dialog', { name: 'A new habit' })).toBeVisible();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test('a sheet slow to load the first time says so after a moment, then opens (WP-C4 follow-up, P-ui-23)', async ({ page }) => {
  // The Habit Editor's chunk takes a few seconds, as a first fetch on a slow connection can.
  const chunk = '**/*HabitEditorHost*';
  await page.route(chunk, async (r) => {
    await new Promise((done) => setTimeout(done, 2500));
    await r.continue().catch(() => undefined);
  });
  await openRoute(page, 'today');
  await page.getByRole('button', { name: 'Add a habit' }).first().click();
  const slow = page.getByRole('alertdialog');
  await expect(slow).toContainText('One moment');
  await expect(slow.getByRole('button', { name: 'Close' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'A new habit' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test('the sheet that didn’t open fits the screen and gives focus back (WP-C4, the shell’s own small sheet)', async ({ page }, info) => {
  await page.route('**/*HabitEditorHost*', (r) => r.abort('internetdisconnected'));
  await openRoute(page, 'today');
  const add = page.getByRole('button', { name: 'Add a habit' }).first();
  await add.click();
  const error = page.getByRole('alertdialog', { name: 'This didn’t open' });
  await expect(error).toBeVisible();
  await expect(error.getByRole('heading', { level: 2, name: 'This didn’t open' })).toBeVisible();
  await expect(page.locator('[data-state="open"]', { has: error })).toHaveCount(1);
  await page.waitForTimeout(500); // past its slide in

  const box = (await error.boundingBox())!;
  const vp = page.viewportSize()!;
  if (vp.width < 900) {
    // A phone: a paper sheet at the foot of the screen, edge to edge.
    expect(Math.abs(box.y + box.height - vp.height)).toBeLessThanOrEqual(2);
    expect(box.x).toBeLessThanOrEqual(1);
    expect(box.width).toBeGreaterThanOrEqual(vp.width - 2);
  } else {
    // A wide screen: a small dialog in the middle.
    expect(Math.abs(box.x + box.width / 2 - vp.width / 2)).toBeLessThanOrEqual(2);
    expect(Math.abs(box.y + box.height / 2 - vp.height / 2)).toBeLessThanOrEqual(2);
    expect(box.width).toBeLessThanOrEqual(420);
  }
  for (const name of ['Try again', 'Close']) expect((await error.getByRole('button', { name }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect((await horizontalOverflow(page)).scrollWidth).toBeLessThanOrEqual(vp.width);
  await expectNoAxeViolations(page, info);

  await error.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(add).toBeFocused();
});

test.describe('Today · quiet rewards', () => {
  test('hides the wallet and the coins', async ({ page }) => {
    test.skip(PREVIEW, 'seeds through the dev server');
    await seedDemo(page, { quietRewards: true });
    await expect(page.locator('main [data-wallet-target]')).toHaveCount(0);
    await expect(page.getByText(/\+\d+ coins?/)).toHaveCount(0);
  });
});

test('the count pad keeps Undo and Add a note reachable by keyboard through nested sheets (WP-C3)', async ({ page }, info) => {
  await page.clock.setFixedTime(new Date('2026-10-02T12:00:00Z'));
  await openRoute(page, 'today');
  await page.getByRole('button', { name: 'Add a habit' }).first().click();
  const editor = page.getByRole('dialog', { name: 'A new habit' });
  await editor.getByRole('radio', { name: 'Drink water', exact: true }).click();
  await editor.getByRole('button', { name: 'Plant it', exact: true }).click();
  await expect(editor).toBeHidden();

  await page.getByRole('button', { name: 'More for Drink water' }).focus();
  await page.keyboard.press('Enter');
  const howMany = page.getByRole('menuitem', { name: /^How many/ });
  await howMany.focus();
  await page.keyboard.press('Enter');
  const pad = page.getByRole('dialog', { name: 'Drink water', exact: true });
  await expect(pad).toBeVisible();
  await expect(pad.getByRole('button', { name: '+1', exact: true })).toBeFocused();
  for (let i = 0; i < 8; i++) await page.keyboard.press('Enter');
  const undo = pad.getByRole('button', { name: 'Undo', exact: true });
  await expect(undo).toBeVisible();
  expect(await undo.evaluate((el) => !!el.closest('[data-notes-slot]'))).toBe(true);

  const tabTo = async (name: string, scope = pad, fromNote = false) => {
    const button = fromNote ? scope.locator('[data-toast-id]').getByRole('button', { name, exact: true }) : scope.getByRole('button', { name, exact: true, disabled: false });
    for (let i = 0; i < 24; i++) {
      if (await button.evaluate((el) => el === document.activeElement)) return;
      await page.keyboard.press('Tab');
      const focus = await scope.evaluate((el) => ({ inside: el.contains(document.activeElement), active: document.activeElement?.outerHTML }));
      expect(focus.inside, `Tab toward ${name}: ${focus.active?.slice(0, 300)}`).toBe(true);
    }
    await expect(button).toBeFocused();
  };
  await tabTo('Undo');
  await page.keyboard.press('Enter');
  await expect(pad.getByText('7 of 8 glasses', { exact: true })).toBeVisible();
  // The transient Add a note opens a child too, then returns focus inside the pad.
  await tabTo('+1');
  await page.keyboard.press('Enter');
  await tabTo('Add a note', pad, true);
  await page.keyboard.press('Enter');
  const quickNote = page.getByRole('dialog', { name: 'A note for Drink water · Friday, October 2, 2026', exact: true });
  await expect(quickNote.getByRole('textbox')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(quickNote).toBeHidden();
  expect(await pad.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  // The stable row is available after the transient action has gone.
  await tabTo('Add a note');
  await page.keyboard.press('Enter');
  const note = page.getByRole('dialog', { name: 'A note for Drink water · Friday, October 2, 2026', exact: true });
  await expect(note.getByRole('textbox')).toBeFocused();
  await page.keyboard.type('A glass with lunch.');
  await page.keyboard.press('Escape');
  const ask = page.getByRole('alertdialog', { name: 'Leave without saving?' });
  await expect(ask.getByRole('button', { name: 'Keep editing' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(note.getByRole('textbox')).toBeFocused();
  await tabTo('Save note', note);
  await page.keyboard.press('Enter');
  await expect(note).toBeHidden();
  expect(await pad.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await expectNoAxeViolations(page, info);
  const overflow = await horizontalOverflow(page);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  await page.keyboard.press('Escape');
  await expect(pad).toBeHidden();
});


test('exiting modal notes do not become implicit scroll-container Tab stops', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-02T12:00:00Z') });
  await openRoute(page, 'today');
  await page.getByRole('button', { name: 'Add a habit' }).first().click();
  const editor = page.getByRole('dialog', { name: 'A new habit' });
  await editor.getByRole('radio', { name: 'Drink water', exact: true }).click();
  // Pause before the notice is created. Setup and native keyboard round trips cannot consume
  // either its reading lifetime or its 220ms exit deadline on a busy browser worker.
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
  await editor.getByRole('button', { name: 'Plant it', exact: true }).click();
  await page.clock.runFor(500);
  await expect(editor).toBeHidden();
  await page.getByRole('button', { name: 'More for Drink water' }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('menuitem', { name: /^How many/ }).focus();
  await page.keyboard.press('Enter');
  await page.clock.runFor(500);
  const pad = page.getByRole('dialog', { name: 'Drink water', exact: true });
  await expect(pad.getByRole('button', { name: '+1', exact: true })).toBeFocused();
  // A real short viewport makes this lane scroll using the shipped styles.
  await page.setViewportSize({ width: 390, height: 320 });
  await page.clock.runFor(100);
  const slot = pad.locator('[data-notes-slot]');
  const notice = slot.locator('[data-toast-id]').filter({ hasText: 'It roots with the first watering.' });
  await expect(notice).toHaveAttribute('tabindex', '0');
  await notice.focus();
  await expect(notice).toBeFocused();
  await pad.getByRole('button', { name: 'Close', exact: true }).focus();
  // An actual pointer dismissal starts the same exit used by expiry, while its timer is paused.
  await notice.click({ position: { x: 20, y: 10 } });
  await expect(notice).toHaveAttribute('data-toast-leaving', '');
  // Establish the keyboard starting point after the pointer dismissal.
  await pad.getByRole('button', { name: 'Close', exact: true }).focus();
  await expect(pad.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  expect(await slot.evaluate((lane) => ({ overflow: lane.scrollHeight > lane.clientHeight && lane.clientHeight > 0, tabbableChildren: lane.querySelectorAll('button:not([disabled]), [tabindex="0"]').length }))).toEqual({ overflow: true, tabbableChildren: 0 });
  await page.keyboard.press('Tab');
  const afterTab = await pad.evaluate((panel) => ({ inside: panel.contains(document.activeElement), slotFocused: document.activeElement?.hasAttribute('data-notes-slot') }));
  expect(afterTab).toEqual({ inside: true, slotFocused: false });
  await expect(pad.getByRole('button', { name: 'Increase How many for Drink water' })).toBeFocused();
  // Advance the actual removal callback, not only the visual fade.
  await page.clock.runFor(220);
  await expect(notice).toHaveCount(0);
  expect(await pad.evaluate((panel) => panel.contains(document.activeElement))).toBe(true);
  await expect(pad.getByRole('button', { name: 'Increase How many for Drink water' })).toBeFocused();
});
