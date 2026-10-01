// @vitest-environment jsdom
/**
 * WP-A7, visible recovery states (data-d10, the data-d12 interface half, the data-d1 volatile note,
 * the P-persistence-01 manual Reload warning, X-03's residual): every state the store knows about
 * the save that isn't "all is well" has a note with a way forward, the storage row says what is
 * true, and the daily copies can't be read as "none yet". These run the real store over a fake
 * browser. Cases marked "failed before" failed against the code before WP-A7 (b2061e5) on what the
 * page showed or did; "new line" ones only because a line or an export did not exist yet.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DEMO_KEY, SAVE_KEY, backupKeyOf, corruptKeyOf, encodeEnvelope } from '@/state/persist';
import { createInitialState } from '@/state/defaults';
import type { SnapshotStore } from '@/state/snapshots';
import * as store from '@/state/store';
import * as pwa from '@/app/pwa';
import { App, ShellBanners } from '@/app/App';
import * as files from '@/features/you/files';
import { saveBackupNow } from '@/features/you/recovery';
import { onboardingActive, onboardingProgress, saveProgress } from '@/features/onboarding/progress';
import { SHELL_LINES } from '@/features/you/shellCopy';
import { DATA, DATA_COPY, EMPTY, ERRORS, INSTALL, fillLine } from '@/catalog/lines';
import { DataSection } from '@/features/you/DataSection';
import { toasts } from '@/ui/toast';
import { button, click, installDom, mount, pause, until } from '@/features/capsules/testing';
import { deferredLocks, failWrites, fakeBrowser, type FakeBrowser } from './fixtures';

// saveFile as it is, but a test can hold one open (a share sheet that stays up).
vi.mock('@/features/you/files', async (importOriginal) => {
  const m = await importOriginal<typeof import('@/features/you/files')>();
  return { ...m, saveFile: vi.fn(m.saveFile) };
});

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
    // Put away again, so the shell's sheet isn't left open for the next case.
    await click(document.querySelector('[role="dialog"] button[aria-label="Close"]'), 'Close');
    await until(() => document.querySelector('[role="dialog"]') === null, 'the sheet to close');
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

/* ------------------------------------------------------------------ */
/* The WP-A7 review                                                    */
/* ------------------------------------------------------------------ */

/** Another window's save, on a lineage of its own (an import, a restore or an Undo over there). */
function otherWindowsSave(b: FakeBrowser, name: string, key = SAVE_KEY): void {
  const s = createInitialState(b.clock.now);
  const other = { ...s, profile: { ...s.profile, name, onboarded: true } };
  b.storage.setItem(key, encodeEnvelope(other, 1, b.clock.now, 'test', 'f'.repeat(32)));
  b.fire('storage', { key });
}

const HABIT = { name: 'Walk', icon: 'walk', color: 'sage', plant: 'pothos', pot: 'terracotta', schedule: { kind: 'daily' }, target: 1, step: 1, effort: 'steady', timeOfDay: 'morning', polarity: 'build' } as const;

/** Fills the save until a write has had to take the room the damaged save was kept aside in. */
function fillUntilCorruptGoes(b: FakeBrowser): void {
  for (let i = 0; i < 80 && b.storage.getItem(corruptKeyOf(SAVE_KEY)) !== null; i++) {
    store.createHabit({ ...HABIT, name: `Walk ${i}` });
    b.advance(300);
  }
  expect(b.storage.getItem(corruptKeyOf(SAVE_KEY))).toBeNull();
}

describe('review: a damaged save whose room a later write needed', () => {
  /** A damaged save of 12k characters, no `:backup`, and room for it twice and a little more. */
  const BIG = DAMAGED.replace('{"version":1}', `{"version":1,"note":"${'x'.repeat(12_000)}"}`);
  const roomy = () => fakeBrowser({ quotaChars: 2 * BIG.length + 6000 });

  it('says the damaged file is no longer kept, and Save the damaged file still saves its bytes (failed before)', async () => {
    const b = roomy();
    b.storage.setItem(SAVE_KEY, BIG);
    store.hydrate();
    expect(b.storage.getItem(corruptKeyOf(SAVE_KEY))).toBe(BIG);
    store.completeOnboarding({ name: 'Fresh', templateIds: [] });
    b.advance(300);
    fillUntilCorruptGoes(b);
    expect(store.durability.value.kind).toBe('ok');
    view = mount(<ShellBanners />);
    // Not "The file is kept": it isn't, any more. The one copy is this window's.
    expect(banner('corrupt')).toBeNull();
    expect(noteText('damaged')).toBe(SHELL_LINES.damagedUnkept);
    expect(actions('damaged')).toEqual([SHELL_LINES.saveDamaged, DATA_COPY.snapshotsRow, DATA.import]);
    expect(inBanner('damaged', SHELL_LINES.close)).toBeNull();
    await click(inBanner('damaged', SHELL_LINES.saveDamaged), 'Save the damaged file');
    const file = await until(() => downloads[0], 'the download');
    expect(await file.text).toBe(BIG);
    await until(() => banner('damaged') === null, 'the note to go once the file is saved');
    expect(store.damagedUnkept.value).toBeNull();
  });

  it('after a reload, a write that takes the room keeps the bytes here and says so (failed before)', async () => {
    const b = roomy();
    b.storage.setItem(SAVE_KEY, BIG);
    store.hydrate();
    store.completeOnboarding({ name: 'Fresh', templateIds: [] });
    b.advance(300);
    store.hydrate(); // a reload: the damaged text is only under :corrupt now
    expect(store.rescue.value).toBeNull();
    expect(store.loadIssue.value).toBeNull();
    fillUntilCorruptGoes(b);
    expect(store.damagedSave()).toBe(BIG);
    view = mount(<ShellBanners />);
    expect(noteText('damaged')).toBe(SHELL_LINES.damagedUnkept);
    expect(actions('damaged')).toEqual([SHELL_LINES.saveDamaged]);
    // A waiting update doesn't apply itself on hide while the text is only here.
    expect(pwa.busy()).toBe(true);
    await click(inBanner('damaged', SHELL_LINES.saveDamaged), 'Save the damaged file');
    await until(() => banner('damaged') === null, 'the note to go once the file is saved');
    expect(pwa.busy()).toBe(false);
  });

  it('new line: the note is pinned to lines.ts', () => {
    expect(ERRORS.damagedUnkept).toEqual(expect.any(String));
    expect(SHELL_LINES.damagedUnkept).toBe(ERRORS.damagedUnkept);
    expect(SHELL_LINES.corrupt).toBe(ERRORS.corrupt);
  });
});

describe('review: a backup started on one save', () => {
  it('never marks another save as backed up (failed before)', async () => {
    const b = await bootSam();
    let finish!: (o: files.SaveOutcome) => void;
    vi.mocked(files.saveFile).mockImplementationOnce(() => new Promise((r) => (finish = r)));
    const saving = saveBackupNow();
    otherWindowsSave(b, 'Other');
    expect(store.state.value.profile.name).toBe('Other');
    expect(store.state.value.lastBackupAt).toBeUndefined();
    finish('downloaded');
    await saving;
    b.advance(1000);
    expect(store.state.value.lastBackupAt).toBeUndefined();
    expect(JSON.parse(b.storage.getItem(SAVE_KEY)!).state.lastBackupAt).toBeUndefined();
  });

  it('still marks the save it was started on (a guard)', async () => {
    await bootSam();
    let finish!: (o: files.SaveOutcome) => void;
    vi.mocked(files.saveFile).mockImplementationOnce(() => new Promise((r) => (finish = r)));
    const saving = saveBackupNow();
    store.setName('Samira'); // the same save, changed meanwhile
    finish('downloaded');
    await saving;
    expect(store.state.value.lastBackupAt).toBeGreaterThan(0);
  });
});

describe('review: the load notes go with the save they were about', () => {
  it('another window’s import puts the recovered note away (failed before)', async () => {
    const b = await bootDamaged({ backup: true });
    view = mount(<ShellBanners />);
    expect(bannerKeys()).toEqual(['recovered']);
    otherWindowsSave(b, 'Imported');
    await pause(0);
    expect(store.state.value.profile.name).toBe('Imported');
    expect(banner('recovered')).toBeNull();
    expect(store.loadIssue.value).toBeNull();
  });

  it('a read-only window that takes in the owner’s import drops the damaged note (failed before)', async () => {
    const locks = deferredLocks();
    const b = fakeBrowser({ locks });
    b.storage.setItem(SAVE_KEY, DAMAGED);
    store.hydrate();
    await locks.refuse();
    view = mount(<ShellBanners />);
    expect(bannerKeys()).toEqual(['other-window', 'corrupt']);
    otherWindowsSave(b, 'Sam');
    await pause(0);
    expect(store.state.value.profile.name).toBe('Sam');
    expect(banner('corrupt')).toBeNull();
  });

  it('a damaged write to the demo’s save never raises a note about the real one (failed before)', async () => {
    const b = await bootSam();
    expect(store.enterDemo()).toBe(true);
    b.storage.setItem(DEMO_KEY, DAMAGED);
    b.fire('storage', { key: DEMO_KEY });
    expect(store.loadIssue.value).toBeNull();
    store.exitDemo();
    expect(store.state.value.profile.name).toBe('Sam');
    view = mount(<ShellBanners />);
    expect(bannerKeys()).toEqual([]);
    expect(store.loadIssue.value).toBeNull();
  }, 30_000); // building the demo is heavy on a busy machine (as in save-epoch.test.ts)

  it('a newer write of the same save keeps the note (a guard)', async () => {
    const b = await bootDamaged({ backup: true });
    view = mount(<ShellBanners />);
    store.setName('Samira');
    b.advance(300);
    expect(bannerKeys()).toEqual(['recovered']);
  });
});

describe('review: the corrupt note without damaged bytes', () => {
  it('offers no Save the damaged file when there is nothing to save', async () => {
    const b = await bootDamaged({ backup: false });
    store.rescue.value = null;
    b.storage.removeItem(corruptKeyOf(SAVE_KEY));
    view = mount(<ShellBanners />);
    expect(actions('corrupt')).toEqual([DATA_COPY.snapshotsRow, DATA.import]);
  });
});

describe('review: Reload with changes that can’t be written yet', () => {
  const reloads: number[] = [];
  const hookReload = () => {
    reloads.length = 0;
    const hook = (pwa as unknown as { pageReload?: { run: () => void } }).pageReload;
    if (hook) hook.run = () => void reloads.push(1);
  };

  it('warns in a browser that keeps nothing', () => {
    hookReload();
    fakeBrowser();
    store.configureStore({ storage: null });
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    pwa.reloadApp();
    expect(toast('reload-unsaved')?.message).toBe(SHELL_LINES.reloadUnsaved);
    expect(reloads).toEqual([]);
    toast('reload-unsaved')!.action!.onAction();
    expect(reloads).toEqual([1]);
  });

  it('warns while the writer lock hasn’t answered, and reloads once it has and the change is written', async () => {
    hookReload();
    const locks = deferredLocks();
    const b = fakeBrowser({ locks });
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    pwa.reloadApp();
    expect(toast('reload-unsaved')?.message).toBe(SHELL_LINES.reloadUnsaved);
    expect(reloads).toEqual([]);
    await locks.grant();
    toasts.value = [];
    pwa.reloadApp();
    expect(toast('reload-unsaved')).toBeUndefined();
    expect(JSON.parse(b.storage.getItem(SAVE_KEY)!).state.profile.name).toBe('Sam');
    expect(reloads).toEqual([1]);
  });
});

describe('review: a restore from the shell during onboarding', () => {
  it('ends onboarding’s late steps and the tabbed shell shows', async () => {
    await bootDamaged({ backup: false });
    // Onboarding's late steps, remembered (the flow is past its first two steps).
    saveProgress({ step: 'today', habitIds: [] });
    expect(onboardingActive.value).toBe(true);
    view = mount(<App />);
    expect(document.querySelector('nav[aria-label="Main"]')).toBeNull();
    await click(inBanner('corrupt', DATA_COPY.snapshotsRow), 'Daily copies');
    await click(await until(() => button(DATA.restoreSnapshot), 'a daily copy'), 'Restore this copy');
    await click(await until(() => document.querySelector('[role="alertdialog"] [data-confirm]'), 'the confirmation'), 'confirm');
    await until(() => toast('snapshot-restored'), 'the restored note');
    expect(store.state.value.profile.name).toBe('Sam');
    expect(onboardingProgress.value).toBeNull();
    await until(() => document.querySelector('nav[aria-label="Main"]'), 'the tabbed shell');
    expect(onboardingActive.value).toBe(false);
  }, 30_000); // the whole shell and its first screen load here
});
