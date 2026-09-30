/**
 * WP-A8 in the store: `saveEpoch` names the save this window shows, so an interaction that began
 * on one save never acts on another (INV-7), and `finishReveal(expected)` clears only the reveal
 * that was shown (UI2-02). Cases marked "failed before" failed against the code before WP-A8;
 * "(shape)" marks those that failed there only because `saveEpoch` did not exist yet.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { SAVE_KEY, encodeEnvelope, mintGen, peekHead, readSave } from '@/state/persist';
import * as store from '@/state/store';
import type { PendingReveal } from '@/state/types';
import { fakeBrowser, fakeLocks, type FakeBrowser } from './fixtures';

const settle = () => new Promise<void>((r) => setTimeout(r, 0));

afterEach(() => {
  store.configureStore({ locks: null });
});

function boot(): FakeBrowser {
  const b = fakeBrowser();
  store.hydrate();
  store.completeOnboarding({ name: 'Sam', templateIds: [] });
  b.advance(1000);
  return b;
}

/** How far `saveEpoch` moved while `fn` ran. */
async function bumps(fn: () => unknown): Promise<number> {
  const before = store.saveEpoch.value;
  await fn();
  return store.saveEpoch.value - before;
}

const onDisk = (b: FakeBrowser) => {
  const r = readSave(b.storage, SAVE_KEY);
  if (r.kind !== 'ok') throw new Error(r.kind);
  return r.state;
};

describe('saveEpoch moves whenever the save shown is replaced, and only then (shape)', () => {
  it('a boot, Start over, the demo in and out, an import, its Undo and a restore each move it', async () => {
    const b = fakeBrowser();
    expect(await bumps(() => store.hydrate())).toBeGreaterThan(0);
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    await settle();
    b.advance(1000);
    const daily = (await b.snapshots.list()).find((m) => m.kind === 'daily')!.id;
    const backup = store.exportData();
    expect(await bumps(() => store.enterDemo())).toBeGreaterThan(0);
    expect(await bumps(() => store.exitDemo())).toBeGreaterThan(0);
    expect(await bumps(() => store.resetAll())).toBeGreaterThan(0);
    expect(await bumps(async () => expect(await store.applyImport(backup)).toMatchObject({ ok: true }))).toBeGreaterThan(0);
    expect(await bumps(async () => expect(await store.undoImport()).toMatchObject({ ok: true }))).toBeGreaterThan(0);
    expect(await bumps(async () => expect(await store.restoreSnapshot(daily)).toMatchObject({ ok: true }))).toBeGreaterThan(0);
  }, 30_000);

  it('another window starting over, and Use here, move it', async () => {
    const text = boot().storage.getItem(SAVE_KEY)!;
    const b = fakeBrowser({ locks: fakeLocks({ byOther: true }) });
    b.storage.setItem(SAVE_KEY, text);
    store.hydrate();
    await settle();
    expect(store.readOnly.value).toBe('other-window');
    const before = store.saveEpoch.value;
    store.useHere();
    expect(store.saveEpoch.value).toBeGreaterThan(before);
    const c = boot();
    const was = store.saveEpoch.value;
    c.storage.removeItem(SAVE_KEY);
    c.fire('storage', { key: SAVE_KEY, newValue: null });
    expect(store.crossWindowNotice.value).toBe('started-over');
    expect(store.saveEpoch.value).toBeGreaterThan(was);
  });

  it('another window’s newer write of the same save does not move it; another lineage does (WP-A8 review)', () => {
    const b = boot();
    const write = (gen: string | undefined, name: string) => {
      const head = peekHead(b.storage, SAVE_KEY)!;
      const text = encodeEnvelope({ ...store.state.value, profile: { ...store.state.value.profile, name } }, head.rev + 1, b.clock.now, 'test', gen ?? head.gen);
      b.storage.setItem(SAVE_KEY, text);
      b.fire('storage', { key: SAVE_KEY, newValue: text });
    };
    const was = store.saveEpoch.value;
    write(undefined, 'Samira');
    expect(store.state.value.profile.name).toBe('Samira');
    expect(store.saveEpoch.value).toBe(was);
    write(mintGen(), 'Kit');
    expect(store.state.value.profile.name).toBe('Kit');
    expect(store.saveEpoch.value).toBeGreaterThan(was);
  });

  it('ordinary changes, a pull and its reveal do not move it', async () => {
    const b = boot();
    store.state.value = { ...store.state.value, wallet: { ...store.state.value.wallet, coins: 100 } };
    expect(
      await bumps(() => {
        store.setName('Samira');
        b.advance(1000);
        expect(store.pull('cats')).toMatchObject({ ok: true });
        store.finishReveal();
      }),
    ).toBe(0);
  });
});

describe('store.finishReveal(expected): only the reveal that was shown, in the save it was shown in', () => {
  function waiting(): { b: FakeBrowser; p: PendingReveal } {
    const b = boot();
    store.state.value = { ...store.state.value, wallet: { ...store.state.value.wallet, coins: 100 } };
    expect(store.pull('cats')).toMatchObject({ ok: true });
    return { b, p: store.state.value.pendingReveal! };
  }

  it('the matching reveal is cleared and written (true; shape)', () => {
    const { b, p } = waiting();
    expect(store.finishReveal({ machineId: p.machineId, itemId: p.itemId, at: p.at, epoch: store.saveEpoch.value })).toBe(true);
    b.advance(1000);
    expect(store.state.value.pendingReveal).toBeUndefined();
    expect(onDisk(b).pendingReveal).toBeUndefined();
  });

  it('another reveal stays waiting (false; failed before)', () => {
    const { b, p } = waiting();
    const cleared = store.finishReveal({ machineId: p.machineId, itemId: p.itemId, at: p.at + 1 });
    b.advance(1000);
    expect(store.state.value.pendingReveal).toEqual(p);
    expect(onDisk(b).pendingReveal).toEqual(p);
    expect(cleared).toBe(false);
  });

  it('the same reveal shown in an earlier save stays waiting (false; shape)', async () => {
    const { b, p } = waiting();
    const epoch = store.saveEpoch.value;
    const backup = store.backupJson();
    expect(await store.applyImport(backup)).toMatchObject({ ok: true });
    expect(store.state.value.pendingReveal).toEqual(p);
    expect(store.finishReveal({ machineId: p.machineId, itemId: p.itemId, at: p.at, epoch })).toBe(false);
    b.advance(1000);
    expect(store.state.value.pendingReveal).toEqual(p);
  });
});
