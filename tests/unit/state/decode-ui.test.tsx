// @vitest-environment jsdom
/**
 * WP-A4 in You › Data: while a newer catkin's save is shown read-only, "Save a backup" saves its
 * own bytes (FS2), the CSV says it is partial or that there is nothing it can read, and a newer
 * catkin's daily copy is refused in words that say so. Cases marked "failed before" failed against
 * the code before WP-A4 on what they did; "new line" ones only because the line did not exist.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { SAVE_KEY } from '@/state/persist';
import { createInitialState } from '@/state/defaults';
import * as store from '@/state/store';
import { DATA, DATA_COPY } from '@/catalog/lines';
import { DataSection } from '@/features/you/DataSection';
import { replaceErrorText } from '@/features/you/ImportSheet';
import { toasts } from '@/ui/toast';
import { button, click, installDom, mount, until } from '@/features/capsules/testing';
import { fakeBrowser } from './fixtures';

/** What the page downloaded: the file names and texts of the blob links it clicked. */
const downloads: { name: string; text: Promise<string> }[] = [];

beforeAll(() => {
  installDom();
  window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
  let last: Blob | null = null;
  URL.createObjectURL = (blob: Blob) => ((last = blob), 'blob:test');
  URL.revokeObjectURL = () => undefined;
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    const blob = last;
    if (!blob) return;
    // jsdom's Blob has no text(); its FileReader reads one.
    const text = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob);
    });
    downloads.push({ name: this.download, text });
  };
});

let view: ReturnType<typeof mount> | null = null;
afterEach(() => {
  view?.unmount();
  view = null;
  toasts.value = [];
  downloads.length = 0;
  store.configureStore({ locks: null });
});

const toast = (key: string) => toasts.value.find((t) => t.key === key);

function newerRaw(readable: boolean): string {
  const s = createInitialState(Date.UTC(2026, 8, 20));
  return JSON.stringify({ v: 2, appVersion: 'future', rev: 3, savedAt: 1, state: { ...s, version: 2, profile: { name: 'Future Sam', onboarded: true, createdAt: 1 }, ...(readable ? {} : { wallet: 'later' }) } });
}

function bootNewer(readable: boolean): string {
  const b = fakeBrowser();
  const raw = newerRaw(readable);
  b.storage.setItem(SAVE_KEY, raw);
  store.hydrate();
  expect(store.readOnly.value).toBe('newer-version');
  return raw;
}

describe('You › Data with a newer catkin’s save', () => {
  it('Save a backup saves the newer save’s own bytes (failed before)', async () => {
    const raw = bootNewer(false);
    view = mount(<DataSection />);
    await click(button(new RegExp(`^${DATA.save}`)), 'Save a backup');
    await until(() => downloads[0], 'the download');
    expect(await downloads[0]!.text).toBe(raw);
  });

  it('new line: the CSV of a readable newer save is labelled partial, in its name and its note', async () => {
    bootNewer(true);
    view = mount(<DataSection />);
    await click(button(new RegExp(`^${DATA.csv}`)), 'Export waterings as CSV');
    const note = await until(() => toast('csv'), 'the CSV note');
    expect(note.message).toBe(DATA_COPY.csvPartial);
    expect(downloads[0]?.name).toMatch(/-partial\.csv$/);
  });

  it('a newer save this catkin can’t read gives no CSV, and says why (failed before)', async () => {
    bootNewer(false);
    view = mount(<DataSection />);
    await click(button(new RegExp(`^${DATA.csv}`)), 'Export waterings as CSV');
    const note = await until(() => toast('csv'), 'the CSV note');
    expect(downloads).toEqual([]);
    expect(note.message).toBe(DATA_COPY.csvNewer);
  });

  it('new line: a newer catkin’s daily copy is refused in its own words', () => {
    expect(replaceErrorText('newer-copy')).toBe(DATA_COPY.copyNewer);
    expect(DATA_COPY.copyNewer).toBe('That copy is from a newer catkin. Update, then restore it.');
  });
});
