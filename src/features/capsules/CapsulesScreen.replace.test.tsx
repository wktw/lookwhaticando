// @vitest-environment jsdom
/**
 * WP-A8 review: the Capsules screen follows the save it shows (INV-7). A Special Order's reveal,
 * a capsule from a season that has gone, and the cabinet the counter opens on all belong to the
 * save they were shown in: another save coming in (another window starting over, an import) takes
 * them with it, and a newer write of the same save by another window leaves them be, so their
 * close still clears what they showed, and only that. Real store (fakeBrowser + hydrate), real
 * timers. Cases marked "failed before" failed against 55266fe; the others pin a guard.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act } from 'preact/test-utils';
import { getCollectible, itemsInMachine } from '@/catalog/collectibles';
import { getMachine, seriesLabel } from '@/catalog/machines';
import type { MachineId } from '@/catalog/types';
import { SAVE_KEY, encodeEnvelope, peekHead, readSave } from '@/state/persist';
import type { AppState, PendingReveal } from '@/state/types';
import * as store from '@/state/store';
import { CapsulesScreen, availableCabinets } from './CapsulesScreen';
import { button, click, installDom, key, mount, pause, revealDialog, until } from './testing';
import { fakeBrowser, fakeLocks, type FakeBrowser } from '../../../tests/unit/state/fixtures';

const ORDER = 'wear-bell-collar';

let b: FakeBrowser;
let locks: ReturnType<typeof fakeLocks> | null = null;
let view: ReturnType<typeof mount> | null = null;
const wasToday = store.today.value;

const settle = () => act(() => new Promise<void>((r) => setTimeout(r, 0)));

/** A booted, onboarded window with coins and stamps (with a writer lock, or without Web Locks). */
async function boot(withLocks: boolean) {
  locks = withLocks ? fakeLocks({ byOther: false }) : null;
  b = fakeBrowser({ locks });
  store.hydrate();
  await settle();
  store.completeOnboarding({ name: 'Sam', templateIds: [] });
  store.state.value = { ...store.state.value, wallet: { ...store.state.value.wallet, coins: 100, stars: 50 } };
  b.advance(1000);
}

const onDisk = () => {
  const r = readSave(b.storage, SAVE_KEY);
  if (r.kind !== 'ok') throw new Error(`no readable save: ${r.kind}`);
  return r.state;
};

/** Another window, which has this window's save as it is now, writes a newer rev of it (the same lineage). */
function otherWindowWrites(change: (s: AppState) => AppState) {
  const head = peekHead(b.storage, SAVE_KEY)!;
  const text = encodeEnvelope(change(store.state.peek()), head.rev + 1, b.clock.now, 'test', head.gen);
  b.storage.setItem(SAVE_KEY, text);
  b.fire('storage', { key: SAVE_KEY, newValue: text });
}

/** A backup of this save as it is now, but with `pendingReveal` as given. */
function backupWith(pending: PendingReveal | undefined): string {
  const was = store.state.value;
  store.state.value = { ...was, pendingReveal: pending };
  const text = store.backupJson();
  store.state.value = was;
  return text;
}

const capsuleOn = (machineId: MachineId, at = 7): PendingReveal => ({
  machineId,
  itemId: itemsInMachine(machineId).find((i) => i.category !== 'pet' && i.id !== ORDER)!.id,
  isNew: true,
  stardust: 0,
  fusedStars: 0,
  at,
});

const onCounter = () => document.querySelector('[aria-label="Choose a cabinet"] [aria-current="true"]')?.getAttribute('aria-label');

/** Places the order through the store, then opens the Capsules tab on its reveal, at the card. */
async function orderOnShow(): Promise<HTMLElement> {
  expect(store.wish(ORDER)).toMatchObject({ ok: true });
  view = mount(<CapsulesScreen />);
  const reveal = await until(revealDialog, 'the order’s reveal');
  await until(() => reveal.textContent?.includes(getCollectible(ORDER)!.name), 'the card');
  expect(reveal.textContent).toMatch(/Your order/);
  await until(() => document.activeElement?.tagName === 'H2', 'the card to take focus');
  return reveal;
}

beforeAll(installDom);
afterEach(() => {
  view?.unmount();
  view = null;
  store.today.value = wasToday;
  store.configureStore({ locks: null });
});

describe('a Special Order on show belongs to its save', () => {
  it('another window takes the save and starts over: the order goes with it (failed before)', async () => {
    await boot(true);
    expect(store.ownership.value).toBe('granted');
    await orderOnShow();
    act(() => locks!.stolen()); // "Use here" in another window
    await settle();
    expect(store.readOnly.value).toBe('other-window');
    b.storage.removeItem(SAVE_KEY); // …which then starts over
    act(() => b.fire('storage', { key: SAVE_KEY, newValue: null }));
    expect(store.crossWindowNotice.value).toBe('started-over');
    expect(store.state.value.pendingReveal).toBeUndefined();
    await pause(50);
    expect(revealDialog()).toBeNull();
    expect(document.body.textContent).not.toMatch(/Your order/);
  });

  it('another window writes the same save meanwhile (no Web Locks): closing the order clears it, and it never plays again (failed before)', async () => {
    await boot(false);
    await orderOnShow();
    act(() => otherWindowWrites((s) => ({ ...s, profile: { ...s.profile, name: 'Samira' } })));
    expect(store.state.value.profile.name).toBe('Samira');
    expect(revealDialog()?.textContent).toMatch(/Your order/);
    await key(document.activeElement ?? document.body, 'Escape');
    await until(() => !revealDialog(), 'the reveal to close');
    expect(store.state.value.pendingReveal).toBeUndefined();
    b.advance(1000);
    expect(onDisk().pendingReveal).toBeUndefined();
    view!.unmount();
    view = mount(<CapsulesScreen />);
    await pause(50);
    expect(revealDialog()).toBeNull();
  });

  it('an import whose save has an order of its own unfinished: that order is shown instead, and its close clears it', async () => {
    await boot(false);
    const other = itemsInMachine('dogs').find((i) => i.category !== 'pet')!;
    const theirs = backupWith({ machineId: 'dogs', itemId: other.id, isNew: true, stardust: 0, fusedStars: 0, order: true, at: 3 });
    await orderOnShow();
    await act(async () => void expect(await store.applyImport(theirs)).toMatchObject({ ok: true }));
    const reveal = await until(() => revealDialog()?.textContent?.includes(other.name) && revealDialog(), 'the imported save’s order');
    expect(reveal.textContent).toMatch(/Your order/);
    expect(reveal.textContent).not.toMatch(new RegExp(getCollectible(ORDER)!.name));
    await until(() => document.activeElement?.tagName === 'H2', 'the card to take focus');
    await key(document.activeElement ?? document.body, 'Escape');
    await until(() => !revealDialog(), 'the reveal to close');
    expect(store.state.value.pendingReveal).toBeUndefined();
  });

  it('closing the order clears only the order: a capsule another window pulled into the same save meanwhile stays waiting', async () => {
    await boot(false);
    await orderOnShow();
    const cat = capsuleOn('cats');
    act(() => otherWindowWrites((s) => ({ ...s, pendingReveal: cat })));
    expect(store.state.value.pendingReveal).toEqual(cat);
    expect(revealDialog()?.textContent).toMatch(/Your order/);
    await key(document.activeElement ?? document.body, 'Escape');
    await until(() => !revealDialog()?.textContent?.includes('Your order'), 'the order to close');
    expect(store.state.value.pendingReveal).toEqual(cat);
  });
});

describe('a capsule from a season that has gone belongs to its save', () => {
  it('its close, heard before the screen has caught up with a newer write, clears only that capsule', async () => {
    await boot(false);
    store.today.value = '2026-12-01';
    const autumn = capsuleOn('autumn');
    act(() => {
      store.state.value = { ...store.state.value, pendingReveal: autumn };
    });
    view = mount(<CapsulesScreen />);
    await click(await until(() => button(/^Open the capsule/), 'the capsule'), 'the capsule');
    await until(() => revealDialog()?.querySelector('h2')?.textContent === getCollectible(autumn.itemId)!.name, 'the card');
    const cat = capsuleOn('cats');
    // One act: the other window's write lands, and the close already on its way is heard before
    // this screen re-renders for it.
    await act(async () => {
      otherWindowWrites((s) => ({ ...s, pendingReveal: cat }));
      (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(store.state.value.pendingReveal).toEqual(cat);
  });
});

describe('integration-i3 while the counter is open', () => {
  it('an import with a capsule waiting in another cabinet: the counter moves to it and opens it', async () => {
    await boot(false);
    view = mount(<CapsulesScreen />);
    const target: MachineId = onCounter() === seriesLabel(getMachine('cows')) ? 'dogs' : 'cows';
    const waiting = capsuleOn(target);
    await act(async () => void expect(await store.applyImport(backupWith(waiting))).toMatchObject({ ok: true }));
    await until(revealDialog, 'the waiting capsule');
    expect(onCounter()).toBe(seriesLabel(getMachine(target)));
    await click(await until(() => button(/^Open the capsule/), 'the capsule'), 'the capsule');
    expect(await until(() => revealDialog()?.querySelector('h2')?.textContent, 'the card')).toBe(getCollectible(waiting.itemId)!.name);
  });

  it('the counter opens on the waiting cabinet at once: it never shows another one first', async () => {
    await boot(false);
    const waiting = capsuleOn('pond');
    act(() => {
      store.state.value = { ...store.state.value, pendingReveal: waiting };
    });
    const moved: string[] = [];
    const watch = new MutationObserver((records) => {
      for (const r of records) if (r.attributeName === 'aria-current') moved.push((r.target as Element).getAttribute('aria-label') ?? '');
    });
    watch.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['aria-current'] });
    view = mount(<CapsulesScreen />);
    moved.push(...watch.takeRecords().map((r) => (r.target as Element).getAttribute('aria-label') ?? ''));
    watch.disconnect();
    expect(onCounter()).toBe(seriesLabel(getMachine('pond')));
    expect(moved).toEqual([]);
  });

  it('the carousel scrolls to the cabinet the screen picks when a capsule comes in', async () => {
    const width = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')!;
    const scrollTo = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTo');
    const scrolled: number[] = [];
    Object.defineProperty(Element.prototype, 'clientWidth', { configurable: true, get: () => 400 });
    Object.defineProperty(Element.prototype, 'scrollTo', {
      configurable: true,
      writable: true,
      // The track goes where it is told, at once, and says so (as a browser's scroll does).
      value(this: Element, o: ScrollToOptions) {
        if (this.parentElement?.getAttribute('aria-label') !== 'Capsule cabinets') return;
        scrolled.push(o.left ?? 0);
        this.scrollLeft = o.left ?? 0;
        this.dispatchEvent(new Event('scroll'));
      },
    });
    try {
      await boot(false);
      view = mount(<CapsulesScreen />);
      const target: MachineId = onCounter() === seriesLabel(getMachine('night')) ? 'pantry' : 'night';
      const index = availableCabinets().findIndex((m) => m.id === target);
      await pause(50);
      scrolled.length = 0;
      await act(async () => void expect(await store.applyImport(backupWith(capsuleOn(target)))).toMatchObject({ ok: true }));
      await until(() => onCounter() === seriesLabel(getMachine(target)), 'the counter to move');
      expect(scrolled).toContain(index * 400);
    } finally {
      Object.defineProperty(Element.prototype, 'clientWidth', width);
      if (scrollTo) Object.defineProperty(Element.prototype, 'scrollTo', scrollTo);
      else delete (Element.prototype as { scrollTo?: unknown }).scrollTo;
    }
  });
});
