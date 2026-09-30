// @vitest-environment jsdom
/**
 * WP-A7, visible recovery states (data-d10, the data-d12 interface half, the data-d1 volatile note,
 * the P-persistence-01 manual Reload warning, X-03's residual): every state the store knows about
 * the save that isn't "all is well" has a note with a way forward, the storage row says what is
 * true, and the daily copies can't be read as "none yet". These run the real store over a fake
 * browser. Cases marked "failed before" failed against the code before WP-A7 (b2061e5) on what the
 * page showed or did; "new line" ones only because a line or an export did not exist yet.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { SAVE_KEY, backupKeyOf, corruptKeyOf } from '@/state/persist';
import { createInitialState } from '@/state/defaults';
import type { SnapshotStore } from '@/state/snapshots';
import * as store from '@/state/store';
import * as pwa from '@/app/pwa';
import { ShellBanners } from '@/app/App';
import { SHELL_LINES } from '@/features/you/shellCopy';
import { DATA, DATA_COPY, EMPTY, ERRORS, INSTALL, fillLine } from '@/catalog/lines';
import { DataSection } from '@/features/you/DataSection';
import { toasts } from '@/ui/toast';
import { button, click, installDom, mount, pause, until } from '@/features/capsules/testing';
import { deferredLocks, failWrites, fakeBrowser, type FakeBrowser } from './fixtures';

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
  localStorage.clear();
});

/** A save that can't be read here: an envelope around a state that is only a version (WP-A4: damage). */
const DAMAGED = '{"v":1,"appVersion":"test","rev":9,"savedAt":1,"state":{"version":1}}';

const toast = (key: string) => toasts.value.find((t) => t.key === key);
const banner = (key: string) => document.querySelector<HTMLElement>(`[data-banner="${key}"]`);
const bannerKeys = () => [...document.querySelectorAll<HTMLElement>('[data-banner]')].map((b) => b.dataset.banner);
const noteText = (key: string) => banner(key)?.querySelector('p')?.textContent ?? null;
/** The labels of a note's own buttons (its actions; the close button is named by aria-label). */
const actions = (key: string) => [...(banner(key)?.querySelectorAll('button') ?? [])].filter((b) => !b.getAttribute('aria-label')).map((b) => b.textContent?.trim());
const inBanner = (key: string, label: string) => [...(banner(key)?.querySelectorAll('button') ?? [])].find((b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === label) ?? null;

/** Boots "Sam" (onboarded), then boots again, so `:backup` holds that save and a daily copy is kept. */
async function bootSam(): Promise<FakeBrowser> {
  const b = fakeBrowser();
  store.hydrate();
  store.completeOnboarding({ name: 'Sam', templateIds: [] });
  b.advance(1000);
  store.hydrate();
  await pause(0);
  expect(b.storage.getItem(backupKeyOf(SAVE_KEY))).not.toBeNull();
  return b;
}

/** Sam's save damaged on disk: with `:backup` kept (recovered), or without it (a fresh start). */
async function bootDamaged(opts: { backup: boolean }): Promise<FakeBrowser> {
  const b = await bootSam();
  b.storage.setItem(SAVE_KEY, DAMAGED);
  if (!opts.backup) b.storage.removeItem(backupKeyOf(SAVE_KEY));
  store.hydrate();
  await pause(0);
  return b;
}

describe('the shell: a save that was recovered from its backup', () => {
  it('says so, with Save a backup and Daily copies, and the damaged bytes are kept (failed before)', async () => {
    const b = await bootDamaged({ backup: true });
    expect(store.state.value.profile.name).toBe('Sam');
    view = mount(<ShellBanners />);
    expect(bannerKeys()).toEqual(['recovered']);
    expect(actions('recovered')).toEqual([DATA.save, DATA_COPY.snapshotsRow]);
    expect(noteText('recovered')).toBe(SHELL_LINES.recovered);
    // The raw bytes of what couldn't be read are kept: in memory for rescue, and aside on disk.
    expect(store.rescue.value).toEqual({ kind: 'damaged', raw: DAMAGED });
    expect(b.storage.getItem(corruptKeyOf(SAVE_KEY))).toBe(DAMAGED);
  });

  it('Save a backup saves the save shown, as a backup file (failed before)', async () => {
    await bootDamaged({ backup: true });
    view = mount(<ShellBanners />);
    await click(inBanner('recovered', DATA.save), 'Save a backup');
    const file = await until(() => downloads[0], 'the download');
    expect(file.name).toBe(fillLine(DATA.file, { date: store.today.value }));
    const saved = JSON.parse(await file.text) as { state: { profile: { name: string } } };
    expect(saved.state.profile.name).toBe('Sam');
    await until(() => toast('backup'), 'the Backup saved note');
    expect(store.state.value.lastBackupAt).toBeGreaterThan(0);
  });

  it('Close puts the note away for this visit; the next load issue shows again (failed before)', async () => {
    await bootDamaged({ backup: true });
    view = mount(<ShellBanners />);
    expect(banner('recovered')).not.toBeNull();
    await click(inBanner('recovered', SHELL_LINES.close), 'Close');
    expect(banner('recovered')).toBeNull();
    // Diagnostics still has it.
    expect(store.loadIssue.value?.kind).toBe('recovered-from-backup');
    const b2 = fakeBrowser();
    b2.storage.setItem(SAVE_KEY, DAMAGED);
    store.hydrate();
    await pause(0);
    expect(banner('corrupt')).not.toBeNull();
  });
});

describe('the shell: a save that could not be read at all', () => {
  it('says so, with Save the damaged file, Daily copies and Import a backup (failed before)', async () => {
    const b = await bootDamaged({ backup: false });
    expect(store.state.value.profile.onboarded).toBe(false);
    view = mount(<ShellBanners />);
    expect(bannerKeys()).toEqual(['corrupt']);
    expect(actions('corrupt')).toEqual([SHELL_LINES.saveDamaged, DATA_COPY.snapshotsRow, DATA.import]);
    expect(noteText('corrupt')).toBe(SHELL_LINES.corrupt);
    expect(b.storage.getItem(corruptKeyOf(SAVE_KEY))).toBe(DAMAGED);
  });

  it('Save the damaged file saves its bytes exactly (failed before)', async () => {
    await bootDamaged({ backup: false });
    view = mount(<ShellBanners />);
    await click(inBanner('corrupt', SHELL_LINES.saveDamaged), 'Save the damaged file');
    const file = await until(() => downloads[0], 'the download');
    expect(file.name).toBe(fillLine(DATA_COPY.damagedFile, { date: store.today.value }));
    expect(await file.text).toBe(DAMAGED);
    const note = await until(() => toast('damaged-file'), 'the note');
    expect(note.message).toBe(DATA_COPY.damagedSaved);
  });

  it('Daily copies opens the copies right there, and restoring one puts the note away (failed before)', async () => {
    await bootDamaged({ backup: false });
    view = mount(<ShellBanners />);
    await click(inBanner('corrupt', DATA_COPY.snapshotsRow), 'Daily copies');
    await click(await until(() => button(DATA.restoreSnapshot), 'a daily copy'), 'Restore this copy');
    await click(await until(() => document.querySelector('[role="alertdialog"] [data-confirm]'), 'the confirmation'), 'confirm');
    await until(() => toast('snapshot-restored'), 'the restored note');
    expect(store.state.value.profile.name).toBe('Sam');
    await until(() => banner('corrupt') === null, 'the note to go');
    expect(store.loadIssue.value).toBeNull();
  });

  it('Import a backup opens the import sheet right there (failed before)', async () => {
    await bootDamaged({ backup: false });
    view = mount(<ShellBanners />);
    await click(inBanner('corrupt', DATA.import), 'Import a backup');
    await until(() => document.querySelector('textarea'), 'the paste box');
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(DATA.import);
  });

  it('Start over puts the note away with the save it was about (failed before)', async () => {
    await bootDamaged({ backup: false });
    view = mount(<ShellBanners />);
    expect(banner('corrupt')).not.toBeNull();
    store.resetAll();
    await pause(0);
    expect(banner('corrupt')).toBeNull();
    expect(store.loadIssue.value).toBeNull();
  });

  it('another window starting over puts it away too (a guard: no note showed before)', async () => {
    const b = await bootDamaged({ backup: false });
    store.completeOnboarding({ name: 'Fresh', templateIds: [] });
    b.advance(1000);
    view = mount(<ShellBanners />);
    b.storage.removeItem(SAVE_KEY);
    b.fire('storage', { key: SAVE_KEY });
    await pause(0);
    expect(bannerKeys()).toEqual(['started-over']);
  });
});

describe('the shell: a change that did not save', () => {
  it('offers Try again and Save a backup; Try again says so while it still fails, and the note goes once it lands (failed before)', async () => {
    const b = fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    b.advance(1000);
    const broken = failWrites(b.storage, 'error', [SAVE_KEY]);
    store.setName('Samira');
    b.advance(300);
    view = mount(<ShellBanners />);
    expect(actions('save')).toEqual([SHELL_LINES.tryAgain, DATA.save]);
    expect(noteText('save')).toBe(SHELL_LINES.save);
    await click(inBanner('save', SHELL_LINES.tryAgain), 'Try again');
    expect(toast('save-retry')?.message).toBe(SHELL_LINES.stillNotSaved);
    expect(banner('save')).not.toBeNull();
    broken.heal();
    await click(inBanner('save', SHELL_LINES.tryAgain), 'Try again');
    expect(banner('save')).toBeNull();
    expect(JSON.parse(b.storage.getItem(SAVE_KEY)!).state.profile.name).toBe('Samira');
  });

  it('a full disk offers the same, and Save a backup keeps the change that is waiting (failed before)', async () => {
    const b = fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    b.advance(1000);
    failWrites(b.storage, 'quota', [SAVE_KEY]);
    store.setName('Samira');
    b.advance(300);
    view = mount(<ShellBanners />);
    expect(actions('save')).toEqual([SHELL_LINES.tryAgain, DATA.save]);
    await click(inBanner('save', DATA.save), 'Save a backup');
    const file = await until(() => downloads[0], 'the download');
    expect((JSON.parse(await file.text) as { state: { profile: { name: string } } }).state.profile.name).toBe('Samira');
  });

  it('with no storage at all, Save a backup is offered (failed before)', async () => {
    fakeBrowser();
    store.configureStore({ storage: null });
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    view = mount(<ShellBanners />);
    expect(noteText('volatile')).toBe(SHELL_LINES.volatile);
    expect(actions('volatile')).toEqual([DATA.save]);
    await click(inBanner('volatile', DATA.save), 'Save a backup');
    const file = await until(() => downloads[0], 'the download');
    expect((JSON.parse(await file.text) as { state: { profile: { name: string } } }).state.profile.name).toBe('Sam');
  });
});

describe('the shell: a damaged save with no room to keep it aside', () => {
  it('Try again keeps it aside once there is room, and then the change is written (failed before)', async () => {
    const big = DAMAGED.replace('{"version":1}', `{"version":1,"note":"${'x'.repeat(20_000)}"}`);
    const b = fakeBrowser({ quotaChars: Math.ceil(big.length * 2.2) });
    b.storage.setItem(SAVE_KEY, big);
    b.storage.setItem('other-site:cache', 'x'.repeat(Math.ceil(big.length * 0.8)));
    store.hydrate();
    b.advance(5000);
    view = mount(<ShellBanners />);
    expect(bannerKeys()).toEqual(['save', 'corrupt']);
    await click(inBanner('save', SHELL_LINES.tryAgain), 'Try again');
    expect(toast('save-retry')?.message).toBe(SHELL_LINES.stillNotSaved);
    expect(b.storage.getItem(SAVE_KEY)).toBe(big);
    b.storage.removeItem('other-site:cache');
    await click(inBanner('save', SHELL_LINES.tryAgain), 'Try again');
    expect(b.storage.getItem(corruptKeyOf(SAVE_KEY))).toBe(big);
    expect(b.storage.getItem(SAVE_KEY)).not.toBe(big);
    expect(bannerKeys()).toEqual(['corrupt']);
  });
});

describe('the shell: a newer catkin’s save', () => {
  it('keeps its words and offers Save a backup, which saves the newer save’s own bytes (failed before)', async () => {
    const b = fakeBrowser();
    const s = createInitialState(Date.UTC(2026, 8, 20));
    const raw = JSON.stringify({ v: 2, appVersion: 'future', rev: 3, savedAt: 1, state: { ...s, version: 2 } });
    b.storage.setItem(SAVE_KEY, raw);
    store.hydrate();
    view = mount(<ShellBanners />);
    expect(bannerKeys()).toEqual(['newer']);
    expect(noteText('newer')).toBe(SHELL_LINES.newerSave);
    expect(actions('newer')).toEqual([DATA.save]);
    await click(inBanner('newer', DATA.save), 'Save a backup');
    const file = await until(() => downloads[0], 'the download');
    expect(await file.text).toBe(raw);
  });
});

describe('Reload with changes that are not written (P-persistence-01, manual)', () => {
  it('warns instead of reloading, and Reload anyway reloads (failed before)', async () => {
    const reloads: number[] = [];
    const hook = (pwa as unknown as { pageReload?: { run: () => void } }).pageReload;
    if (hook) hook.run = () => void reloads.push(1);
    const b = fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    b.advance(1000);
    failWrites(b.storage, 'error', [SAVE_KEY]);
    store.setName('Samira');
    b.advance(300);
    pwa.reloadApp();
    const note = toast('reload-unsaved');
    expect(note).toBeDefined();
    expect(note?.message).toBe(SHELL_LINES.reloadUnsaved);
    expect(reloads).toEqual([]);
    expect(note?.action?.label).toBe(SHELL_LINES.reloadAnyway);
    note!.action!.onAction();
    expect(reloads).toEqual([1]);
  });

  it('writes a change still waiting for its debounce first, then reloads with no warning (a guard: before, the reload’s own pagehide wrote it)', () => {
    const reloads: number[] = [];
    const hook = (pwa as unknown as { pageReload?: { run: () => void } }).pageReload;
    if (hook) hook.run = () => void reloads.push(1);
    const b = fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    b.advance(1000);
    store.setName('Samira');
    pwa.reloadApp();
    expect(toast('reload-unsaved')).toBeUndefined();
    expect(JSON.parse(b.storage.getItem(SAVE_KEY)!).state.profile.name).toBe('Samira');
    expect(reloads).toEqual([1]);
  });

  it('new line: the warning and its button are pinned to lines.ts', () => {
    expect(SHELL_LINES.reloadUnsaved).toBe(INSTALL.reloadUnsaved);
    expect(SHELL_LINES.reloadAnyway).toBe(INSTALL.reloadAnyway);
    expect(SHELL_LINES.recovered).toBe(ERRORS.recovered);
    expect(SHELL_LINES.corrupt).toBe(ERRORS.corrupt);
    expect(SHELL_LINES.saveDamaged).toBe(ERRORS.saveDamaged);
    expect(SHELL_LINES.tryAgain).toBe(ERRORS.tryAgain);
    expect(SHELL_LINES.stillNotSaved).toBe(ERRORS.stillNotSaved);
    expect(SHELL_LINES.saveBackup).toBe(DATA.save);
    expect(SHELL_LINES.dailyCopies).toBe(DATA_COPY.snapshotsRow);
    expect(SHELL_LINES.importBackup).toBe(DATA.import);
  });
});

/** What the storage row in You › Data says, of everything it could say. */
const statusTitle = () => {
  const text = view!.root.textContent ?? '';
  return [ERRORS.volatile, ERRORS.save, DATA_COPY.storageAcquiring, DATA.storage.tab, DATA.storage.device].filter((line) => typeof line === 'string' && text.includes(line)).join(' | ');
};

describe('You › Data: the storage row says what is true', () => {
  it('with no storage at all it never says Saved (failed before)', () => {
    fakeBrowser();
    store.configureStore({ storage: null });
    store.hydrate();
    view = mount(<DataSection />);
    expect(statusTitle()).toBe(ERRORS.volatile);
    expect(view.root.textContent).not.toContain(DATA.storage.tab);
    expect(view.root.textContent).not.toContain(DATA.storage.device);
  });

  it('a write that did not go through (not a full disk) says it didn’t save yet', () => {
    const b = fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    b.advance(1000);
    failWrites(b.storage, 'error', [SAVE_KEY]);
    store.setName('Samira');
    b.advance(300);
    view = mount(<DataSection />);
    expect(statusTitle()).toBe(ERRORS.save);
  });

  it('while this window waits for the writer lock, a change held meanwhile is not called saved (failed before)', () => {
    const locks = deferredLocks();
    fakeBrowser({ locks });
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    view = mount(<DataSection />);
    expect(store.hasUnsavedWork()).toBe(true);
    expect(statusTitle()).toBe(DATA_COPY.storageAcquiring);
  });

  it('once written it says where the save is', () => {
    const b = fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    b.advance(1000);
    view = mount(<DataSection />);
    expect(statusTitle()).toBe(DATA.storage.tab);
  });
});

describe('You › Data: a damaged save that was kept aside', () => {
  it('has a Save the damaged file row, before and after a reload, until Start over (failed before)', async () => {
    const b = await bootDamaged({ backup: false });
    view = mount(<DataSection />);
    await click(button(new RegExp(`^${SHELL_LINES.saveDamaged}`)), 'Save the damaged file');
    const file = await until(() => downloads[0], 'the download');
    expect(await file.text).toBe(DAMAGED);
    view.unmount();
    // A reload: the save is fresh now, and the damaged text is still aside under :corrupt.
    store.completeOnboarding({ name: 'Fresh', templateIds: [] });
    b.advance(1000);
    store.hydrate();
    expect(store.rescue.value).toBeNull();
    view = mount(<DataSection />);
    expect(button(new RegExp(`^${SHELL_LINES.saveDamaged}`))).not.toBeNull();
    view.unmount();
    store.resetAll();
    view = mount(<DataSection />);
    expect(button(new RegExp(`^${SHELL_LINES.saveDamaged}`))).toBeNull();
  });

  it('a healthy save has no such row', () => {
    const b = fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    b.advance(1000);
    view = mount(<DataSection />);
    expect(view.root.textContent).not.toContain('damaged');
  });
});

describe('You › Data: Daily copies that can’t be read', () => {
  it('say so with Try again, not “the first daily copy is made tonight”, and Try again lists them (failed before)', async () => {
    const b = await bootSam();
    await pause(0);
    const reject = () => Promise.reject(new Error('IndexedDB is closed'));
    const broken: SnapshotStore = { durable: true, list: reject, get: b.snapshots.get, put: b.snapshots.put, remove: b.snapshots.remove };
    store.configureStore({ snapshots: broken });
    view = mount(<DataSection />);
    await click(button(new RegExp(`^${DATA_COPY.snapshotsRow}`)), 'Daily copies');
    await until(() => document.querySelector('[role="dialog"]')?.textContent?.includes(DATA_COPY.snapshotsError), 'the error line');
    expect(document.querySelector('[role="dialog"]')?.textContent).not.toContain(EMPTY.snapshots);
    store.configureStore({ snapshots: b.snapshots });
    await click(button(SHELL_LINES.tryAgain), 'Try again');
    await until(() => button(DATA.restoreSnapshot), 'the copies');
    expect(document.querySelector('[role="dialog"]')?.textContent).not.toContain(DATA_COPY.snapshotsError);
  });

  it('while the list is still being read, it says One moment, not that there are none (failed before)', async () => {
    const b = await bootSam();
    const slow: SnapshotStore = { durable: true, list: () => new Promise(() => undefined), get: b.snapshots.get, put: b.snapshots.put, remove: b.snapshots.remove };
    store.configureStore({ snapshots: slow });
    view = mount(<DataSection />);
    await click(button(new RegExp(`^${DATA_COPY.snapshotsRow}`)), 'Daily copies');
    await until(() => document.querySelector('[role="dialog"]'), 'the sheet');
    await pause(20);
    const sheet = document.querySelector('[role="dialog"]')!;
    expect(sheet.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(sheet.textContent).not.toContain(EMPTY.snapshots);
  });

  it('with none kept yet, it still says the first one is made tonight', async () => {
    const b = fakeBrowser();
    store.hydrate();
    b.advance(1000);
    view = mount(<DataSection />);
    await click(button(new RegExp(`^${DATA_COPY.snapshotsRow}`)), 'Daily copies');
    await until(() => document.querySelector('[role="dialog"]')?.textContent?.includes(EMPTY.snapshots), 'the empty line');
  });
});
