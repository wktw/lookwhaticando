/**
 * Two windows on one save (WP-A2: audit FS3, data-d5). Two pages in one browser context share
 * localStorage and Web Locks, like two tabs: the second opens read-only, takes the save with
 * "Use here" and starts over; the first follows the deletion instead of keeping the old save on
 * screen, says so calmly, and never writes the old habits back.
 *
 * Runs in Chromium and actual WebKit. Safari's install choice is followed through its real
 * Keep it in this tab control, including when a reset returns a window to onboarding.
 */
import { expect, test, type Page } from '@playwright/test';
import { watchErrors } from './support';

const STARTED_OVER = 'Little by Little was started over in another window, so it starts fresh here too.';
const ONBOARDING_H1 = 'New place. Which plants came with you?';

/** A fresh Safari tab asks about installation before presenting the onboarding form. */
async function onboardingReady(page: Page) {
  const stay = page.getByRole('button', { name: 'Keep it in this tab' });
  await expect(stay.or(page.getByLabel('Your name'))).toBeVisible();
  if (await stay.isVisible()) await stay.click();
  await expect(page.locator('main h1')).toHaveText(ONBOARDING_H1);
}

/** Onboarding the way a person does it, planting three habits and skipping the rest. */
async function onboard(page: Page) {
  await page.goto('./#/today');
  await onboardingReady(page);
  await page.getByLabel('Your name').fill('Sam');
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
  await expect.poll(() => savedHabits(a)).toContain('Walk');

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
  await b.getByRole('alertdialog').filter({ hasText: 'The habits, plants and pets here go.' }).getByRole('button', { name: 'Start over' }).click();
  const again = b.getByRole('alertdialog').filter({ hasText: 'Start over now?' });
  await expect(again).toBeVisible();
  await b.waitForTimeout(800); // the last "Start over" arms itself a moment after it appears
  await again.getByRole('button', { name: 'Start over' }).click();
  await onboardingReady(b);

  // The first window follows: a fresh start, and the note says why.
  const note = a.locator('[data-banner="started-over"]');
  await expect(note).toBeVisible();
  await expect(note).toContainText(STARTED_OVER);
  await onboardingReady(a);

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

test('erasing in one window removes every copy, the other follows, and neither revives the old save', async ({ context }) => {
  const owner = await context.newPage();
  const errors = watchErrors(owner);
  await onboard(owner);
  const follower = await context.newPage();
  const followerErrors = watchErrors(follower);
  await follower.goto('./#/today');
  await expect(follower.locator('[data-banner="other-window"]')).toBeVisible();
  await owner.evaluate(() => {
    localStorage.setItem('catkin:unknown-private-data', 'private');
    localStorage.setItem('unrelated-app', 'keep');
    location.hash = '#/you';
  });
  await owner.getByRole('button', { name: 'Start over', exact: true }).click();
  await owner.getByRole('button', { name: 'Erase everything on this device', exact: true }).click();
  const confirm = owner.getByRole('alertdialog').filter({ hasText: 'There is no undo.' });
  await expect(confirm).toBeVisible();
  await owner.waitForTimeout(800); // a tap carried over from the erase choice cannot confirm it
  await confirm.getByRole('button', { name: 'Erase everything', exact: true }).click();
  await onboardingReady(owner);
  await onboardingReady(follower);
  await expect(follower.locator('[data-banner="started-over"]')).toHaveText(STARTED_OVER);
  await expect.poll(() => owner.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('catkin:')))).toEqual([]);
  expect(await owner.evaluate(() => localStorage.getItem('unrelated-app'))).toBe('keep');
  expect(await owner.evaluate(async () => (await indexedDB.databases()).filter((db) => db.name === 'catkin'))).toEqual([]);
  await follower.close();
  await owner.reload();
  await onboardingReady(owner);
  expect(await savedHabits(owner)).toEqual([]);
  expect([...errors, ...followerErrors]).toEqual([]);
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
  await onboardingReady(a);

  const b = await context.newPage();
  const errorsB = watchErrors(b);
  await b.goto('./#/today');
  const bannerB = b.locator('[data-banner="other-window"]');
  await expect(bannerB).toBeVisible();
  await onboardingReady(b);

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
