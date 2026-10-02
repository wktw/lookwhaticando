import { expect, test, type Page } from '@playwright/test';
import { createInitialState } from '../src/state/defaults';
import { completeOnboarding, setStartedOn } from '../src/domain/habits';
import { pull } from '../src/domain/gacha';
import { transact } from '../src/domain/tx';
import { mulberry32 } from '../src/domain/rng';
import { runtimeLocalTime } from '../src/domain/dates';
import { encodeEnvelope } from '../src/state/persist';
import { expectNoAxeViolations, watchErrors } from './support';

const now = Date.UTC(2026, 8, 29, 12);
const day = '2026-09-29';
function household(pending = false) {
  const env = { now, today: day, local: runtimeLocalTime, rng: mulberry32(1) };
  const made = transact(createInitialState(now), env, (tx) => {
    const ids = completeOnboarding(tx, { name: 'Sam', templateIds: ['walk', 'read'] });
    for (const id of ids) setStartedOn(tx, id, '2026-09-01');
    if (pending) pull(tx, 'cats', { free: true });
    return {};
  }).state;
  return { ...made, settings: { ...made.settings, quietRewards: true, keyboardShortcuts: true } };
}

async function boot(page: Page, pending = false) {
  await page.clock.install({ time: now });
  await page.clock.resume();
  const state = household(pending);
  await page.goto('./');
  await page.evaluate((raw) => {
    localStorage.setItem('catkin:v1', raw);
    sessionStorage.setItem('catkin:stay-in-tab', '1');
  }, encodeEnvelope(state, 1, now, 'e2e'));
  await page.goto('./#/today');
  await page.reload();
  const stay = page.getByRole('button', { name: 'Keep it in this tab' });
  await expect(stay.or(page.locator('main h1'))).toBeVisible();
  if (await stay.isVisible()) await stay.click();
  await expect(page.locator('main h1')).toBeVisible();
  return state;
}

async function assertQuiet(page: Page) {
  const text = await page.evaluate(() => [document.body.innerText, ...Array.from(document.querySelectorAll('[aria-live]')).map((el) => el.textContent)].join(' '));
  expect(text).not.toMatch(/\bcoins?\b|capsules?/i);
}

test('quiet daily journey: water, Undo, note, history correction, detail, rest and review', async ({ page }, info) => {
  const errors = watchErrors(page);
  const seed = await boot(page);
  await expect(page.locator('nav a[href="#/capsules"]')).toHaveCount(0);
  await assertQuiet(page);
  // Capture transient spoken output too, including notes that disappear before the next assertion.
  await page.evaluate(() => {
    const leaks: string[] = [];
    (window as unknown as { quietLeaks: string[] }).quietLeaks = leaks;
    new MutationObserver(() => {
      for (const el of document.querySelectorAll('[aria-live]')) {
        const text = el.textContent ?? '';
        if (/\bcoins?\b|capsules?/i.test(text)) leaks.push(text);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true });
  });
  const ring = page.getByRole('button', { name: 'Walk', exact: true });
  await ring.click();
  await expect(ring).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(ring).toHaveAttribute('aria-pressed', 'false');
  await assertQuiet(page);
  await ring.click();
  await expect(ring).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'More for Walk', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Add a note', exact: true }).click();
  const note = page.getByRole('dialog').filter({ has: page.locator('textarea') });
  await note.locator('textarea').fill('A walk by the river.');
  await note.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(note).toBeHidden();
  await page.getByRole('button', { name: 'More for Walk', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Details', exact: true }).click();
  const detail = page.getByRole('dialog').filter({ has: page.locator('[data-habit-detail]') });
  await expect(detail).toBeVisible();
  await assertQuiet(page);
  await detail.locator('[data-date="2026-09-15"]').click();
  await assertQuiet(page);
  await detail.getByRole('button', { name: 'Water it for Sep 15', exact: true }).click();
  await expect(detail.getByRole('button', { name: 'Not watered after all', exact: true })).toBeVisible();
  await assertQuiet(page);
  await page.keyboard.press('Escape');
  await expect(detail).toBeHidden();
  await page.getByRole('button', { name: 'More for Read', exact: true }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Rest day', exact: true }).click();
  await expect(page.getByText('Read is resting today. Nothing here wilts.').first()).toBeVisible();
  await assertQuiet(page);
  await page.locator('nav a[href="#/progress"]:visible').click();
  await expect(page.locator('main h1')).toHaveText('Progress');
  await page.locator('main [data-date="2026-09-29"]').click();
  await expect(page.getByText('A walk by the river.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Edit the note for Walk/ }).click();
  const correction = page.getByRole('dialog').filter({ has: page.locator('textarea') });
  await correction.locator('textarea').fill('Walked a little farther.');
  await correction.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(correction).toBeHidden();
  await expect(page.getByText('Walked a little farther.', { exact: true })).toBeVisible();
  await assertQuiet(page);
  await expectNoAxeViolations(page, info);
  expect(await page.evaluate(() => (window as unknown as { quietLeaks: string[] }).quietLeaks)).toEqual([]);
  await page.reload();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('catkin:v1')!).state);
  const walk = seed.habits.find((h) => h.name === 'Walk')!.id;
  expect(saved.logs[walk][day].note).toBe('Walked a little farther.');
  expect(saved.logs[walk]['2026-09-15'].count).toBe(1);
  expect(saved.wallet.coins).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('quiet import keeps a pending reveal, stable shortcut destinations and a lossless way back', async ({ page }, info) => {
  const seed = await boot(page, true);
  await expect(page.locator('nav a[href="#/capsules"]')).toHaveCount(0);
  await assertQuiet(page);
  await page.keyboard.press('4');
  await expect(page).toHaveURL(/#\/shelf$/);
  await expect(page.locator('[data-wallet-target="coins"]')).toHaveCount(0);
  expect(await page.locator('main').innerText()).not.toMatch(/capsules?|\bin the jar\b/i);
  await page.keyboard.press('5');
  await expect(page).toHaveURL(/#\/you$/);
  const quiet = page.getByRole('switch', { name: /^Quiet rewards/ });
  await expect(quiet).toBeChecked();
  await quiet.click();
  await expect(quiet).not.toBeChecked();
  await expect(page.locator('nav a[href="#/capsules"]:visible')).toBeVisible();
  await quiet.click();
  await page.keyboard.press('3');
  await expect(page).toHaveURL(/#\/capsules$/);
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('nav a[href="#/capsules"]')).toHaveCount(0);
  await page.reload();
  await expect(page).toHaveURL(/#\/capsules$/);
  await expect(page.locator('main h1')).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('catkin:v1')!).state);
  expect(saved.pendingReveal).toEqual(seed.pendingReveal);
  expect(saved.wallet).toEqual(seed.wallet);
  expect(saved.collection).toEqual(seed.collection);
  expect(saved.pets).toEqual(seed.pets);
  await expectNoAxeViolations(page, info);
});
