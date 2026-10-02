/**
 * Progress (DESIGN §9.2): the screen on a lived-in save and on a first day, on a phone and a
 * desktop, light and dark. The main journeys: read the hero, open a plant's Habit Detail, filter
 * the calendar and read a day, open a Sunday Note and a Herbarium page from the memory shelf, and
 * look at a pin. Every state passes axe (WCAG 2.2 AA + best practice) with no console errors, and
 * nothing scrolls sideways at 320 px.
 *
 * The save is the shipped demo (src/state/demo.ts), built here and put in place before the app
 * loads, so every number on the page came through the real reducers.
 */
import { expect, test, type Page } from '@playwright/test';
import { buildDemo } from '../src/state/demo';
import { createInitialState } from '../src/state/defaults';
import { completeOnboarding } from '../src/domain/habits';
import { transact } from '../src/domain/tx';
import { mulberry32 } from '../src/domain/rng';
import { appDayKey, runtimeLocalTime } from '../src/domain/dates';
import { encodeEnvelope } from '../src/state/persist';
import type { AppState } from '../src/state/types';
import { expectNoAxeViolations, horizontalOverflow, openRoute, watchErrors } from './support';
import { Game } from '../tests/unit/domain/game';

const now = Date.now();
const today = appDayKey(now, 180, runtimeLocalTime);
const DEMO = encodeEnvelope(buildDemo({ today, now }), 1, now, 'e2e');
const FIRST_DAY = (() => {
  const s0: AppState = createInitialState(now);
  const out = transact(s0, { now, today, local: runtimeLocalTime, rng: mulberry32(1) }, (tx) => ({ ids: completeOnboarding(tx, { name: 'Sam', templateIds: ['walk', 'read', 'water'] }) }));
  return encodeEnvelope(out.state, 1, now, 'e2e');
})();

async function seed(page: Page, envelope: string): Promise<void> {
  await page.addInitScript((raw) => {
    if (sessionStorage.getItem('ck-e2e-seeded')) return;
    localStorage.setItem('catkin:v1', raw);
    sessionStorage.setItem('ck-e2e-seeded', '1');
  }, envelope);
}

test('a sparse routine chooses a colour deliberately with keyboard and keeps it after reload', async ({ page }, info) => {
  const g = new Game({ start: '2024-01-01' });
  const id = g.addHabit({ name: 'Monthly tidy', plant: 'snakeplant', schedule: { kind: 'monthly', times: 1, every: 1 } });
  for (let i = 0; i < 24; i++) { g.goTo(`${2024 + Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, '0')}-01`, 7); g.checkIn(id); }
  await seed(page, encodeEnvelope(g.state, 1, g.now, 'e2e'));
  await openRoute(page, 'progress');
  await page.getByRole('button', { name: /^Monthly tidy, / }).click();
  const detail = page.getByRole('dialog', { name: 'Monthly tidy', exact: true });
  await expect(detail).toContainText('There aren’t enough clear watering times');
  await expect(detail).not.toContainText('fills in after');
  await detail.getByRole('button', { name: 'Choose a colour', exact: true }).click();
  const chooser = page.getByRole('dialog', { name: 'Choose a colour', exact: true });
  await expect(chooser.getByRole('button', { name: 'Keep this colour' })).toBeDisabled();
  await expect(chooser.getByRole('radio', { name: 'Dawn', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(chooser.getByRole('radio', { name: 'Twilight', exact: true })).toBeFocused();
  const artFits = await chooser.getByRole('radio').evaluateAll((radios) => radios.every((radio) => {
    const bounds = radio.getBoundingClientRect();
    const art = radio.querySelector('svg')!.getBoundingClientRect();
    return art.left >= bounds.left && art.right <= bounds.right && art.top >= bounds.top && art.bottom <= bounds.bottom;
  }));
  expect(artFits).toBe(true);
  await expectNoAxeViolations(page, info);
  const overflow = await horizontalOverflow(page);
  expect(overflow.scrollWidth - overflow.clientWidth).toBeLessThanOrEqual(1);
  await page.screenshot({ path: info.outputPath('colour-choice.png') });
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(chooser).toBeHidden();
  await expect(detail.getByRole('radio', { name: 'Twilight · chosen', exact: true })).toBeFocused();
  await expect(detail).toContainText('Twilight: a colour you chose.');
  await expectNoAxeViolations(page, info);
  await page.screenshot({ path: info.outputPath('colour-kept.png') });
  await page.keyboard.press('Escape');
  await page.reload();
  await page.getByRole('button', { name: /^Monthly tidy, / }).click();
  await expect(page.getByRole('dialog', { name: 'Monthly tidy', exact: true })).toContainText('Twilight: a colour you chose.');
});

// A cold dev server compiles the screen, the sheets and the art on first request: warm them once,
// so the first test on a busy machine isn't timing Vite.
test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await seed(page, DEMO);
  await page.goto('./#/progress', { timeout: 120_000 });
  await page.waitForSelector('[data-section="memory"]', { timeout: 120_000 });
  await page.getByRole('button', { name: /^Read, / }).click();
  await page.waitForSelector('[data-habit-detail]', { timeout: 120_000 });
  await page.close();
});

const viewports = [
  { name: 'phone', viewport: { width: 390, height: 844 } },
  { name: 'desktop', viewport: { width: 1280, height: 800 } },
] as const;
const schemes = ['light', 'dark'] as const;

for (const vp of viewports) {
  for (const scheme of schemes) {
    test.describe(`${vp.name} · ${scheme}`, () => {
      test.use({ viewport: vp.viewport, colorScheme: scheme });

      test('a lived-in Progress renders every section cleanly and passes axe', async ({ page }, info) => {
        const errors = watchErrors(page);
        await seed(page, DEMO);
        await openRoute(page, 'progress');
        await expect(page.locator('main h1')).toHaveText('Progress');
        await expect(page.locator('main h1')).toHaveCount(1);
        await expect(page.locator('[data-hero]')).toContainText(/You showed up \d+ of the last 30 days/);
        await expect(page.locator('[data-section="memory"]')).toBeVisible();
        for (const id of ['months', 'plants', 'calendar', 'year', 'records', 'insights', 'pins', 'memory']) await expect(page.locator(`[data-section="${id}"]`)).toHaveCount(1);
        await page.waitForLoadState('networkidle');
        await expectNoAxeViolations(page, info);
        expect(errors, errors.join('\n')).toEqual([]);
      });

      test('a plant opens Habit Detail, which passes axe and closes with Escape', async ({ page }, info) => {
        const errors = watchErrors(page);
        await seed(page, DEMO);
        await openRoute(page, 'progress');
        const plant = page.getByRole('button', { name: /^Read, / });
        await plant.click();
        const sheet = page.getByRole('dialog', { name: 'Read' });
        await expect(sheet).toBeVisible();
        await expect(sheet.locator('[data-habit-detail] h2')).toHaveText('Read');
        await expect(sheet).toContainText(/more waterings? to [A-Z][a-z]+\.|Evergreen\. Small visitors/);
        await expect(sheet.locator('[data-detail="journal"]')).toBeVisible();
        await page.waitForTimeout(400);
        await expectNoAxeViolations(page, info);
        await page.keyboard.press('Escape');
        await expect(sheet).toBeHidden();
        await expect(plant).toBeFocused();
        expect(errors, errors.join('\n')).toEqual([]);
      });
    });
  }
}

test.describe('journeys', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('filter the calendar by a habit and read a day', async ({ page }) => {
    const errors = watchErrors(page);
    await seed(page, DEMO);
    await openRoute(page, 'progress');
    const filter = page.getByRole('radiogroup', { name: 'Show habit' });
    await expect(filter.getByRole('radio', { name: 'All habits' })).toHaveAttribute('aria-checked', 'true');
    await filter.getByRole('radio', { name: 'Read', exact: true }).click();
    await expect(filter.getByRole('radio', { name: 'Read', exact: true })).toHaveAttribute('aria-checked', 'true');
    const cal = page.locator('[data-section="calendar"]');
    const day = cal.locator('button[data-date]:not([disabled])').first();
    await day.click();
    await expect(day).toHaveAttribute('aria-pressed', 'true');
    await expect(cal.locator('section h4')).toBeVisible();
    // keyboard: arrows move the one tab stop
    await day.focus();
    await page.keyboard.press('ArrowRight');
    await expect(cal.locator('button[data-date][tabindex="0"]')).toBeFocused();
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('open a Sunday Note and a Herbarium page from the memory shelf', async ({ page }, info) => {
    const errors = watchErrors(page);
    await seed(page, DEMO);
    await openRoute(page, 'progress');
    await page.locator('button[data-ritual="sundayNote"]').first().click();
    const note = page.getByRole('dialog', { name: 'Sunday Note' });
    await expect(note).toBeVisible();
    await expect(note).toContainText(/Week of [A-Z][a-z]{2} \d+\./);
    await expect(note).not.toContainText('%');
    await page.waitForTimeout(400);
    await expectNoAxeViolations(page, info);
    await page.keyboard.press('Escape');
    await expect(note).toBeHidden();
    await page.locator('button[data-ritual="herbarium"]').first().click();
    const pageSheet = page.getByRole('dialog', { name: /, pressed\.$/ });
    await expect(pageSheet).toBeVisible();
    await expect(pageSheet).toContainText(/ · \d+/);
    await expect(pageSheet).not.toContainText('%');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a pin says how it is earned', async ({ page }) => {
    await seed(page, DEMO);
    await openRoute(page, 'progress');
    await page.locator('[data-pin="first-checkin"]').click();
    const sheet = page.getByRole('dialog', { name: 'First watering' });
    await expect(sheet).toContainText('Water a habit for the first time.');
  });

  test('a first day: calm, no zeros, no streak', async ({ page }, info) => {
    const errors = watchErrors(page);
    await seed(page, FIRST_DAY);
    await openRoute(page, 'progress');
    await expect(page.locator('[data-section="plants"]')).toBeVisible();
    const text = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    expect(text).not.toMatch(/\b0 (of|days|waterings)\b|streak|missed/i);
    // The empty line is said once, and the "not yet" pins are four and a button, not a wall.
    await expect(page.locator('[data-section="memory"]')).toBeVisible();
    const full = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    expect(full.match(/This fills in as you water\./g) ?? []).toHaveLength(1);
    await expect(page.locator('[data-pin][data-earned="false"]')).toHaveCount(4);
    await expect(page.locator('[data-more-pins]')).toHaveText(/^\d+ more pins$/);
    await page.waitForLoadState('networkidle');
    await expectNoAxeViolations(page, info);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('nothing scrolls sideways at 320 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await seed(page, DEMO);
    await openRoute(page, 'progress');
    await expect(page.locator('[data-section="memory"]')).toBeVisible();
    const o = await horizontalOverflow(page);
    expect(o.scrollWidth, o.culprits.join('\n')).toBeLessThanOrEqual(o.clientWidth);
  });
});

test('a screen whose chunk can’t load says so; back online, Try again brings it (WP-C4 follow-up, P-ui-22)', async ({ page }) => {
  // The Progress screen's chunk is aborted the way an offline fetch fails (its idle preload fails too).
  const chunk = '**/*ProgressScreen*';
  await page.route(chunk, (r) => r.abort('internetdisconnected'));
  await openRoute(page, 'today');
  await page.evaluate(() => (location.hash = '#/progress'));
  await expect(page.getByRole('heading', { name: 'This page didn’t load' })).toBeVisible();
  const retry = page.getByRole('button', { name: 'Try again' });

  // Offline, Try again does not reload (that could land on the browser's own offline page): the
  // error comes back in the same page.
  let loads = 0;
  page.on('load', () => loads++);
  await page.evaluate(() => ((window as unknown as { samePage: boolean }).samePage = true));
  await page.context().setOffline(true);
  await retry.click();
  await page.waitForTimeout(600);
  await expect(retry).toBeVisible();
  expect(loads).toBe(0);
  expect(await page.evaluate(() => (window as unknown as { samePage?: boolean }).samePage)).toBe(true);

  // Back online, Chromium still keeps the failed chunk for the life of the page, so Try again
  // reloads (online, nothing unsaved), and the tab in the URL comes back with its screen.
  await page.context().setOffline(false);
  await page.unroute(chunk);
  await retry.click();
  await expect(page.locator('main h1')).toHaveText('Progress');
  await expect(page).toHaveURL(/#\/progress$/);
  await expect(page.getByRole('heading', { name: 'This page didn’t load' })).toHaveCount(0);
});
