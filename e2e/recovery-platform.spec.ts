/**
 * Inherited A6/A7 browser obligations. setInputFiles drives the real file input, not the system
 * Files picker. Clipboard and storage rejection are explicit capability emulation in each engine;
 * they do not claim Safari Private Browsing, system clipboard prompts or physical storage pressure.
 */
import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createInitialState } from '../src/state/defaults';
import { transact } from '../src/domain/tx';
import { completeOnboarding } from '../src/domain/habits';
import { mulberry32 } from '../src/domain/rng';
import { runtimeLocalTime } from '../src/domain/dates';
import { encodeEnvelope } from '../src/state/persist';
import { makeBackup } from '../src/state/handoffCore';
import { openRoute, watchErrors } from './support';

const NOW = Date.parse('2026-10-02T12:00:00Z');
function household(name: string) {
  return transact(createInitialState(NOW), { now: NOW, today: '2026-10-02', local: runtimeLocalTime, rng: mulberry32(71) }, (tx) => {
    completeOnboarding(tx, { name, templateIds: ['walk', 'water'] });
    return {};
  }).state;
}
const backup = (name: string) => JSON.stringify(makeBackup(household(name), { now: NOW, appVersion: 'browser-capabilities', device: 'Test browser' }));
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('catkin:v1')!).state);
const data = (page: Page) => page.locator('section').filter({ has: page.getByRole('heading', { name: 'Your data', exact: true }) }).first();
async function seed(page: Page, name: string) {
  await page.clock.setFixedTime(NOW);
  await page.goto('./');
  await page.evaluate((raw) => localStorage.setItem('catkin:v1', raw), encodeEnvelope(household(name), 1, NOW, 'browser-capabilities', '1234567890abcdef1234567890abcdef'));
  await page.goto('./#/you');
  await page.reload();
  await expect(page.locator('main h1')).toHaveText('You');
}

declare global {
  interface Window {
    __g1ClipboardFaults: { reads: number; writes: number; legacyCopies: number };
    __g1StorageFaults: { reads: number; opens: number; readDurable: () => string | null };
  }
}

test('a chosen backup file is described, imported, reloaded and undone', async ({ page }) => {
  const errors = watchErrors(page);
  await seed(page, 'Before file');
  await data(page).getByRole('button', { name: 'Import a backup', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Import a backup', exact: true });
  await sheet.locator('input[type="file"]').setInputFiles({ name: 'plants.json', mimeType: 'application/json', buffer: Buffer.from(backup('From the file')) });
  await expect(sheet).toContainText('This backup has 2 habits');
  expect((await saved(page)).profile.name).toBe('Before file');
  await sheet.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(sheet).toBeHidden();
  await expect.poll(async () => (await saved(page)).profile.name).toBe('From the file');
  await page.reload();
  await expect(page.locator('main h1')).toHaveText('You');
  expect((await saved(page)).profile.name).toBe('From the file');
  await data(page).getByRole('button', { name: 'Undo import', exact: true }).click();
  await expect.poll(async () => (await saved(page)).profile.name).toBe('Before file');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('emulated clipboard denial leaves manual copy and paste available', async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript(() => {
    const faults = window.__g1ClipboardFaults = { reads: 0, writes: 0, legacyCopies: 0 };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      readText: async () => { faults.reads++; throw new DOMException('Emulated clipboard denial', 'NotAllowedError'); },
      writeText: async () => { faults.writes++; throw new DOMException('Emulated clipboard denial', 'NotAllowedError'); },
      write: async () => { faults.writes++; throw new DOMException('Emulated clipboard denial', 'NotAllowedError'); },
    } });
    const original = document.execCommand.bind(document);
    document.execCommand = (command, showUI, value) => {
      if (command === 'copy') { faults.legacyCopies++; return false; }
      return original(command, showUI, value);
    };
  });
  await seed(page, 'Manual copy');
  await data(page).getByRole('button', { name: 'Copy backup', exact: true }).click();
  const manual = page.getByRole('dialog', { name: 'Your backup', exact: true });
  await expect(manual).toContainText('Couldn’t copy. Select the text and copy it by hand.');
  const text = manual.getByRole('textbox', { name: 'Your backup', exact: true });
  await expect(text).toBeFocused();
  await expect(text).toHaveValue(/^CK[01]:/);
  const payload = await text.inputValue();
  expect((await saved(page)).lastBackupAt).toBeUndefined();
  expect(await page.evaluate(() => window.__g1ClipboardFaults.writes)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__g1ClipboardFaults.legacyCopies)).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  // Navigation flushes queued work: a falsely recorded receipt must not hide behind the debounce.
  await page.reload();
  await expect(page.locator('main h1')).toHaveText('You');
  expect((await saved(page)).lastBackupAt).toBeUndefined();
  await data(page).getByRole('button', { name: 'Import a backup', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Import a backup', exact: true });
  await sheet.getByRole('button', { name: 'Paste my plants', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__g1ClipboardFaults.reads)).toBe(1);
  await expect(sheet.getByLabel('Or paste a backup here')).toHaveValue('');
  await expect(sheet.getByRole('button', { name: 'Import', exact: true })).toHaveCount(0);
  expect((await saved(page)).profile.name).toBe('Manual copy');
  await sheet.getByLabel('Or paste a backup here').fill(payload);
  await expect(sheet).toContainText('This backup has 2 habits');
  await expect(sheet.getByRole('button', { name: 'Import', exact: true })).toBeEnabled();
  expect(errors, errors.join('\n')).toEqual([]);
});

test('emulated unavailable localStorage and IndexedDB at startup keep a truthful recovery path', async ({ page }) => {
  const errors = watchErrors(page);
  const durable = encodeEnvelope(household('Unread journal'), 1, NOW, 'browser-capabilities', '1234567890abcdef1234567890abcdef');
  await page.clock.setFixedTime(NOW);
  await page.addInitScript((raw) => {
    const storage = localStorage;
    const read = storage.getItem.bind(storage);
    if (!read('catkin:v1')) storage.setItem('catkin:v1', raw);
    const faults = window.__g1StorageFaults = { reads: 0, opens: 0, readDurable: () => read('catkin:v1') };
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { faults.reads++; throw new DOMException('Emulated blocked storage', 'SecurityError'); } });
    Object.defineProperty(indexedDB, 'open', { configurable: true, value() { faults.opens++; throw new DOMException('Emulated blocked database', 'SecurityError'); } });
  }, durable);
  await page.goto('./#/today');
  const volatile = page.locator('[data-banner="volatile"]');
  await expect(volatile).toContainText('This browser isn’t keeping');
  await expect(volatile.getByRole('button', { name: 'Save a backup', exact: true })).toBeEnabled();
  const stay = page.getByRole('button', { name: 'Keep it in this tab' });
  const name = page.getByLabel('Your name', { exact: true });
  await expect(stay.or(name)).toBeVisible();
  if (await stay.isVisible()) await stay.click();
  await name.fill('Session only');
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pick up to 3.', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(page.locator('[data-step="first"]')).toBeVisible();
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Main', exact: true })).toBeVisible();
  await openRoute(page, 'you');
  await expect(data(page)).toContainText('This browser isn’t keeping');
  await data(page).getByRole('button', { name: 'Daily copies', exact: true }).click();
  const copies = page.getByRole('dialog', { name: 'Daily copies', exact: true });
  await expect(copies).toContainText('The daily copies can’t be read on this device right now.');
  await expect(copies).not.toContainText('The first daily copy is made tonight.');
  const attempts = await page.evaluate(() => window.__g1StorageFaults.opens);
  expect(attempts).toBeGreaterThan(0);
  await copies.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__g1StorageFaults.opens)).toBeGreaterThan(attempts);
  await expect(copies).toContainText('The daily copies can’t be read on this device right now.');
  await page.keyboard.press('Escape');
  const download = page.waitForEvent('download');
  await volatile.getByRole('button', { name: 'Save a backup', exact: true }).click();
  const file = await download;
  const path = await file.path();
  expect(path).not.toBeNull();
  const rescued = JSON.parse(await readFile(path!, 'utf8'));
  expect(rescued.state.profile.name).toBe('Session only');
  expect(await page.evaluate(() => window.__g1StorageFaults.readDurable())).toBe(durable);
  expect(await page.evaluate(() => window.__g1StorageFaults.reads)).toBeGreaterThan(0);
  await page.reload();
  await expect(page.locator('[data-banner="volatile"]')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.__g1StorageFaults.readDurable())).toBe(durable);
  expect(errors, errors.join('\n')).toEqual([]);
});
