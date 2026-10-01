/**
 * Two windows on one save (WP-A2: audit FS3, data-d5). Two pages in one browser context share
 * localStorage and Web Locks, like two tabs: the second opens read-only, takes the save with
 * "Use here" and starts over; the first follows the deletion instead of keeping the old save on
 * screen, says so calmly, and never writes the old habits back.
 *
 * Chromium only for now: WebKit is not installed in this container, so the WebKit half of this
 * journey is left to WP-G1's real-browser matrix.
 */
import { expect, test, type Page } from '@playwright/test';
import { watchErrors } from './support';

const STARTED_OVER = 'catkin was started over in another window, so it starts fresh here too. The daily copies stay on this device.';
const ONBOARDING_H1 = 'New place. Which plants came with you?';

/** Onboarding the way a person does it, planting three habits and skipping the rest. */
async function onboard(page: Page) {
  await page.goto('./#/today');
  const stay = page.getByRole('button', { name: 'Keep it in this tab' });
  const name = page.getByLabel('Your name');
  await expect(stay.or(name)).toBeVisible();
  if (await stay.isVisible()) await stay.click();
  await name.fill('Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  for (const habit of ['Drink water', 'Walk', 'Read']) await page.getByRole('button', { name: habit, exact: true }).click();
  await page.getByRole('button', { name: 'Plant these' }).click();
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.getByRole('button', { name: 'Not yet, I’ll earn it' }).first().click();
  await expect(page.locator('main')).toHaveAttribute('aria-label', 'Today');
}

const savedHabits = (page: Page) =>
  page.evaluate(() => {
    const raw = localStorage.getItem('catkin:v1');
    return raw ? (JSON.parse(raw) as { state: { habits: { name: string }[] } }).state.habits.map((h) => h.name) : [];
  });

test('starting over in one window starts the other one fresh, with a calm note', async ({ context }) => {
  const a = await context.newPage();
  const errorsA = watchErrors(a);
  await onboard(a);
  expect(await savedHabits(a)).toContain('Walk');

  // The second window opens read-only on the same save.
  const b = await context.newPage();
  const errorsB = watchErrors(b);
  await b.goto('./#/today');
  const bannerB = b.locator('[data-banner="other-window"]');
  await expect(bannerB).toBeVisible();
  await expect(b.locator('main')).toHaveAttribute('aria-label', 'Today');

  // It takes the save over, and the first window steps back.
  await bannerB.getByRole('button', { name: 'Use here' }).click();
  await expect(bannerB).toHaveCount(0);
  await expect(a.locator('[data-banner="other-window"]')).toBeVisible();

  // It starts over, with both confirmations.
  await b.evaluate(() => (location.hash = '#/you'));
  await expect(b.locator('main h1')).toHaveText('You');
  const data = b.locator('section').filter({ has: b.getByRole('heading', { level: 2, name: 'Your data', exact: true }) }).first();
  await data.getByRole('button', { name: 'Start over' }).click();
  await b.getByRole('alertdialog').filter({ hasText: 'Every habit, plant and pet' }).getByRole('button', { name: 'Start over' }).click();
  const again = b.getByRole('alertdialog').filter({ hasText: 'The daily copies stay on this device.' });
  await expect(again).toBeVisible();
  await b.waitForTimeout(800); // the last "Start over" arms itself a moment after it appears
  await again.getByRole('button', { name: 'Start over' }).click();
  await expect(b.locator('main h1')).toHaveText(ONBOARDING_H1);

  // The first window follows: a fresh start, and the note says why.
  const note = a.locator('[data-banner="started-over"]');
  await expect(note).toBeVisible();
  await expect(note).toContainText(STARTED_OVER);
  await expect(a.locator('main h1')).toHaveText(ONBOARDING_H1);

  // It takes the save back and nothing old returns to disk.
  await a.locator('[data-banner="other-window"]').getByRole('button', { name: 'Use here' }).click();
  await expect(a.locator('[data-banner="other-window"]')).toHaveCount(0);
  await a.getByLabel('Your name').fill('Jo');
  await a.getByRole('button', { name: 'Next' }).click();
  await a.getByRole('button', { name: 'Read', exact: true }).click();
  await a.getByRole('button', { name: 'Plant it' }).click();
  await expect.poll(() => savedHabits(a)).toEqual(['Read']);

  // The note is put away with Close.
  await note.getByRole('button', { name: 'Close' }).click();
  await expect(note).toHaveCount(0);
  expect([...errorsA, ...errorsB], [...errorsA, ...errorsB].join('\n')).toEqual([]);
});

/**
 * Onboarding in two windows (WP-C5: creative-cr-d1, UI2-07). The window that doesn't own the save
 * can't plant: its picks stay chosen and it points to "Use here"; after Use here the same picks plant
 * once. The other window, now read-only, shows the step the owner is on, and leaves onboarding for
 * Today when the owner does; a reload there stays on Today (no stale progress left anywhere).
 */
test('onboarding in two windows: a refused planting keeps its picks, Use here plants them, and the other window follows', async ({ context }) => {
  const USE_HERE = 'Choose Use here above to carry on in this window.';
  const a = await context.newPage();
  const errorsA = watchErrors(a);
  await a.goto('./#/today');
  await expect(a.locator('main h1')).toHaveText(ONBOARDING_H1);

  const b = await context.newPage();
  const errorsB = watchErrors(b);
  await b.goto('./#/today');
  const bannerB = b.locator('[data-banner="other-window"]');
  await expect(bannerB).toBeVisible();
  await expect(b.locator('main h1')).toHaveText(ONBOARDING_H1);

  // The read-only window picks and plants: nothing is planted, the picks stay, the note points up.
  await b.getByRole('button', { name: 'Next' }).click();
  await b.getByRole('button', { name: 'Walk', exact: true }).click();
  await b.getByRole('button', { name: 'Plant it' }).click();
  await expect(b.locator('[data-onboarding-note]')).toHaveText(USE_HERE);
  await expect(b.locator('main h1')).toHaveText('Pick up to 3.');
  await expect(b.getByRole('button', { name: 'Walk', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await savedHabits(b)).toEqual([]);

  // Use here, and the same picks plant once.
  await bannerB.getByRole('button', { name: 'Use here' }).click();
  await expect(bannerB).toHaveCount(0);
  await expect(b.locator('[data-onboarding-note]')).toHaveCount(0);
  await b.getByRole('button', { name: 'Plant it' }).click();
  await expect(b.locator('main h1')).toHaveText('Anything already done today?');
  await expect.poll(() => savedHabits(b)).toEqual(['Walk']);

  // The first window, read-only now, shows the step the owner is on.
  await expect(a.locator('[data-banner="other-window"]')).toBeVisible();
  await expect(a.locator('main h1')).toHaveText('Anything already done today?');

  // The owner finishes; the other window leaves onboarding too, and stays out after a reload.
  await b.getByRole('button', { name: 'Skip' }).click();
  await b.getByRole('button', { name: 'Not yet, I’ll earn it' }).first().click();
  await expect(b.locator('main')).toHaveAttribute('aria-label', 'Today');
  await expect(a.locator('main')).toHaveAttribute('aria-label', 'Today');
  await a.reload();
  await expect(a.locator('main')).toHaveAttribute('aria-label', 'Today');
  expect(await a.evaluate(() => localStorage.getItem('catkin:onboarding'))).toBeNull();
  expect([...errorsA, ...errorsB], [...errorsA, ...errorsB].join('\n')).toEqual([]);
});
