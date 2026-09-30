// @vitest-environment jsdom
/**
 * WP-A8: a capsule interaction lives only as long as its screen and its save (UI2-01, UI2-02,
 * integration-i3, P-ui-05; INV-7). The persisted `pendingReveal` is the only authority for "a
 * capsule waits"; everything the hook shows is choreography keyed to `{saveEpoch, pending}`.
 *
 * Real store (fakeBrowser + hydrate), real CapsuleMachine, and fake timers with animation frames,
 * so every frame and timeout the hook scheduled can be run after it is gone. Cases marked "failed
 * before" failed against the code before WP-A8; "(shape)" marks those that failed there only
 * because an API did not exist yet.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { getMachine, itemsInMachine } from '@/catalog';
import { getCollectible } from '@/catalog/collectibles';
import type { PendingReveal } from '@/state/types';
import { SAVE_KEY, readSave } from '@/state/persist';
import * as store from '@/state/store';
import { CapsuleMachine } from './CapsuleMachine';
import { usePull } from './usePull';
import { buttonWithText, installDom, revealDialog } from './testing';
import { fakeBrowser, type FakeBrowser } from '../../../tests/unit/state/fixtures';

const cats = getMachine('cats');
const cows = getMachine('cows');

let browser: FakeBrowser;
let root: HTMLElement | null = null;

function show(ui: preact.ComponentChild) {
  if (!root) {
    root = document.createElement('div');
    document.body.append(root);
  }
  const r = root;
  act(() => render(ui, r));
}
function unmount() {
  if (!root) return;
  const r = root;
  act(() => render(null, r));
  r.remove();
  root = null;
}

/** Runs `ms` of timers and animation frames (and the promises between them) inside act. */
const run = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));
/** One animation frame. */
const frame = () => run(16);

const handle = () => document.querySelector<HTMLElement>('[role="slider"][aria-label="Turn the handle"]')!;
const insert = () => buttonWithText('Put a coin in')!;

async function until<T>(get: () => T | null | undefined | false, what: string, ms = 5000): Promise<T> {
  for (let t = 0; t <= ms; t += 16) {
    const v = get();
    if (v) return v;
    await frame();
  }
  throw new Error(`Timed out waiting for ${what}`);
}

/** Pays and waits for the handle to be ready (the token is in). */
async function payIn() {
  act(() => insert().click());
  await until(() => handle().getAttribute('aria-disabled') === 'false', 'the handle to be ready');
}

/** Taps the handle: the automatic turn. */
function tapHandle() {
  act(() => handle().click());
}

function motion(kind: 'reduced' | 'full') {
  document.documentElement.dataset.motion = kind;
}

/** A booted, onboarded window with coins in the jar. */
function boot(coins = 100) {
  browser = fakeBrowser();
  store.hydrate();
  store.completeOnboarding({ name: 'Sam', templateIds: [] });
  setCoins(coins);
  browser.advance(1000);
}
function setCoins(coins: number) {
  act(() => {
    store.state.value = { ...store.state.value, wallet: { ...store.state.value.wallet, coins } };
  });
}

const onDisk = () => {
  const r = readSave(browser.storage, SAVE_KEY);
  if (r.kind !== 'ok') throw new Error(`no readable save: ${r.kind}`);
  return r.state;
};

/** A backup of this save as it is now, but with `pendingReveal` as given (or none). */
function backupWith(pending: PendingReveal | undefined): string {
  const was = store.state.value;
  store.state.value = { ...was, pendingReveal: pending };
  const text = store.backupJson();
  store.state.value = was;
  return text;
}

/** Pulls on the Cats cabinet through the real screen, and leaves mid-drop (the store has committed). */
async function pullAndLeaveMidDrop(): Promise<PendingReveal> {
  motion('full');
  show(<CapsuleMachine machine={cats} active />);
  await payIn();
  tapHandle();
  await until(() => store.state.value.pendingReveal, 'the pull to commit');
  const pending = store.state.value.pendingReveal!;
  unmount();
  motion('reduced');
  return pending;
}

/** Some other Cats item than `id`. */
const otherCat = (id: string) => itemsInMachine('cats').find((i) => i.id !== id && i.category !== 'pet')!.id;
const pendingFor = (machineId: PendingReveal['machineId'], itemId: string, at: number): PendingReveal => ({ machineId, itemId, isNew: true, stardust: 0, fusedStars: 0, at });

/** The hook alone, to read what it resumes and to keep a reveal's close from an earlier render. */
let hook: ReturnType<typeof usePull> | null = null;
function Hook({ machine, active = true }: { machine: typeof cats; active?: boolean }) {
  hook = usePull(machine, active);
  return null;
}

beforeAll(installDom);
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  motion('reduced');
});
afterEach(() => {
  unmount();
  hook = null;
  vi.clearAllTimers();
  vi.useRealTimers();
  motion('reduced');
  store.configureStore({ locks: null });
  localStorage.clear();
});

describe('UI2-01: nothing a capsule screen scheduled acts after it is gone (R209 inverted)', () => {
  it('unmount mid auto-turn: no pull, the wallet is unchanged, in memory and on disk (failed before)', async () => {
    boot();
    motion('full');
    show(<CapsuleMachine machine={cats} active />);
    await payIn();
    tapHandle();
    await frame();
    await frame();
    unmount();
    await run(5000);
    expect(store.state.value.lifetime.pulls).toBe(0);
    expect(store.state.value.wallet.coins).toBe(100);
    expect(store.state.value.pendingReveal).toBeUndefined();
    expect(onDisk().lifetime.pulls).toBe(0);
    expect(onDisk().pendingReveal).toBeUndefined();
  });

  it('unmount mid auto-turn with an injected pull: it is never called (R209, failed before)', async () => {
    boot();
    motion('full');
    const pull = vi.fn(store.pull);
    show(<CapsuleMachine machine={cats} active pullWith={pull} />);
    await payIn();
    tapHandle();
    await frame();
    unmount();
    await run(5000);
    expect(pull).not.toHaveBeenCalled();
  });

  it('entering the demo mid-turn: nothing is pulled into the demo, and the crank comes back with no pull (failed before)', async () => {
    boot();
    motion('full');
    show(<CapsuleMachine machine={cats} active />);
    await payIn();
    tapHandle();
    await frame();
    act(() => void store.enterDemo());
    setCoins(200);
    const demo = store.state.value;
    await run(5000);
    expect(store.state.value.lifetime.pulls).toBe(demo.lifetime.pulls);
    expect(store.state.value.wallet.coins).toBe(200);
    expect(store.state.value.pendingReveal).toBe(demo.pendingReveal);
    expect(revealDialog()).toBeNull();
    expect(insert()).toBeTruthy();
    act(() => store.exitDemo());
    expect(store.state.value.lifetime.pulls).toBe(0);
    expect(onDisk().lifetime.pulls).toBe(0);
  }, 30_000);

  it('an import mid-turn: nothing is written into the imported save (failed before)', async () => {
    boot();
    const imported = backupWith(undefined);
    motion('full');
    show(<CapsuleMachine machine={cats} active />);
    await payIn();
    tapHandle();
    await frame();
    await act(async () => {
      expect(await store.applyImport(imported)).toMatchObject({ ok: true });
    });
    await run(5000);
    expect(store.state.value.lifetime.pulls).toBe(0);
    expect(store.state.value.wallet.coins).toBe(100);
    expect(onDisk().lifetime.pulls).toBe(0);
    expect(onDisk().pendingReveal).toBeUndefined();
    expect(revealDialog()).toBeNull();
  });

  it('Start over mid-turn: nothing is written into the fresh save (a guard: a fresh jar can’t pay)', async () => {
    boot();
    motion('full');
    show(<CapsuleMachine machine={cats} active />);
    await payIn();
    tapHandle();
    await frame();
    act(() => store.resetAll());
    await run(5000);
    expect(store.state.value.lifetime.pulls).toBe(0);
    expect(store.state.value.pendingReveal).toBeUndefined();
    expect(revealDialog()).toBeNull();
  });

  it('Start over inside the demo mid-turn: nothing is pulled into the new demo (failed before)', async () => {
    boot();
    act(() => void store.enterDemo());
    act(() => {
      store.state.value = { ...store.state.value, pendingReveal: undefined, wallet: { ...store.state.value.wallet, coins: 200 } };
    });
    motion('full');
    show(<CapsuleMachine machine={cats} active />);
    await payIn();
    tapHandle();
    await frame();
    act(() => store.resetAll());
    setCoins(200);
    const fresh = store.state.value;
    await run(5000);
    expect(store.state.value.lifetime.pulls).toBe(fresh.lifetime.pulls);
    expect(store.state.value.wallet.coins).toBe(200);
    expect(store.state.value.pendingReveal).toBe(fresh.pendingReveal);
    act(() => store.exitDemo());
  }, 30_000);

  it('unmount after the commit: no timer or frame is left, nothing opens, and a remount shows the same capsule, charged once (failed before)', async () => {
    boot();
    const pending = await pullAndLeaveMidDrop();
    expect(vi.getTimerCount()).toBe(0);
    await run(5000);
    expect(vi.getTimerCount()).toBe(0);
    expect(revealDialog()).toBeNull();
    expect(store.state.value.wallet.coins).toBe(75);
    expect(store.state.value.lifetime.pulls).toBe(1);

    show(<CapsuleMachine machine={cats} active />);
    expect(revealDialog()).toBeTruthy();
    expect(store.state.value.pendingReveal).toEqual(pending);
    expect(store.state.value.wallet.coins).toBe(75);
    expect(store.state.value.lifetime.pulls).toBe(1);
    expect(onDisk().pendingReveal).toEqual(pending);
  });
});

describe('the pile is the session’s: leaving never costs it a capsule', () => {
  it('closing a reveal and leaving at once: nothing is left running, and the cabinet has its full pile back (a guard, except the timer)', async () => {
    boot();
    show(<Hook machine={cats} />);
    const pile = hook!.dome.bodies.length;
    unmount();
    show(<CapsuleMachine machine={cats} active />);
    await payIn();
    tapHandle();
    await until(revealDialog, 'the reveal');
    act(() => (document.querySelector('button[aria-label^="Open the capsule"]') as HTMLElement).click());
    await until(() => buttonWithText('Done') ?? buttonWithText('Not now'), 'the card');
    act(() => (buttonWithText('Done') ?? buttonWithText('Not now'))!.click());
    await until(() => !revealDialog(), 'the reveal to close');
    await run(1); // jsdom's own focus bookkeeping (0 ms), not the cabinet's
    expect(vi.getTimerCount()).toBeGreaterThan(0); // the fresh capsule is still on its way in
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(store.state.value.pendingReveal).toBeUndefined();
    show(<Hook machine={cats} />);
    expect(hook!.dome.bodies.length).toBe(pile);
  });
});

describe('UI2-02: the reveal shown is the save’s own pending reveal', () => {
  it('a capsule left mid-drop, then an import whose save has another capsule waiting there: the cabinet shows that one (failed before)', async () => {
    boot();
    const a = await pullAndLeaveMidDrop();
    const b = pendingFor('cats', otherCat(a.itemId), a.at + 1);
    await act(async () => void (await store.applyImport(backupWith(b))));
    expect(store.state.value.pendingReveal).toEqual(b);
    show(<Hook machine={cats} />);
    expect(hook!.phase).toBe('revealing');
    expect(hook!.reveal?.itemId).toBe(b.itemId);
  });

  it('a close kept from the reveal of A does not clear B, which came in since (failed before)', async () => {
    boot();
    const a = await pullAndLeaveMidDrop();
    show(<Hook machine={cats} />);
    expect(hook!.reveal?.itemId).toBe(a.itemId);
    const staleClose = hook!.closeReveal;
    const b = pendingFor('cats', otherCat(a.itemId), a.at + 1);
    await act(async () => void (await store.applyImport(backupWith(b))));
    act(() => staleClose());
    expect(store.state.value.pendingReveal).toEqual(b);
    expect(onDisk().pendingReveal).toEqual(b);
  });

  it('A waiting, then Start over: nothing is revealed (failed before)', async () => {
    boot();
    await pullAndLeaveMidDrop();
    act(() => store.resetAll());
    show(<Hook machine={cats} />);
    expect(hook!.phase).toBe('idle');
    expect(hook!.reveal).toBeNull();
  });

  it('A waiting, then an import with nothing waiting: nothing is revealed; Undo import brings A back (failed before)', async () => {
    boot();
    const a = await pullAndLeaveMidDrop();
    await act(async () => void (await store.applyImport(backupWith(undefined))));
    show(<Hook machine={cats} />);
    expect(hook!.reveal).toBeNull();
    unmount();
    await act(async () => void (await store.undoImport()));
    expect(store.state.value.pendingReveal).toEqual(a);
    show(<Hook machine={cats} />);
    expect(hook!.reveal?.itemId).toBe(a.itemId);
  });

  it('A waiting in the real save: the demo’s cabinet shows nothing, and leaving the demo resumes A (failed before)', async () => {
    boot();
    const a = await pullAndLeaveMidDrop();
    act(() => void store.enterDemo());
    act(() => {
      store.state.value = { ...store.state.value, pendingReveal: undefined };
    });
    show(<Hook machine={cats} />);
    expect(hook!.reveal).toBeNull();
    unmount();
    act(() => store.exitDemo());
    show(<Hook machine={cats} />);
    expect(hook!.reveal?.itemId).toBe(a.itemId);
    act(() => hook!.closeReveal());
    expect(store.state.value.pendingReveal).toBeUndefined();
    expect(onDisk().pendingReveal).toBeUndefined();
  }, 30_000);

  it('a mounted cabinet showing A follows a replacement to B, and closing it clears B (failed before)', async () => {
    boot();
    const a = await pullAndLeaveMidDrop();
    show(<CapsuleMachine machine={cats} active />);
    expect(revealDialog()).toBeTruthy();
    const b = pendingFor('cats', otherCat(a.itemId), a.at + 1);
    await act(async () => void (await store.applyImport(backupWith(b))));
    await frame();
    act(() => (document.querySelector('button[aria-label^="Open the capsule"]') as HTMLElement).click());
    const name = await until(() => revealDialog()?.querySelector('h2')?.textContent, 'the card');
    expect(name).toBe(getCollectible(b.itemId)!.name);
    act(() => buttonWithText('Done')!.click());
    await run(1000);
    expect(store.state.value.pendingReveal).toBeUndefined();
    expect(onDisk().pendingReveal).toBeUndefined();
  });
});

describe('integration-i3: a waiting capsule resumes whichever way its cabinet comes on screen', () => {
  it('an inactive neighbour that becomes the cabinet on screen opens its waiting capsule (failed before)', async () => {
    boot();
    const cow = itemsInMachine('cows').find((i) => i.category !== 'pet')!.id;
    act(() => {
      store.state.value = { ...store.state.value, pendingReveal: pendingFor('cows', cow, 1) };
    });
    show(<CapsuleMachine machine={cows} active={false} />);
    expect(revealDialog()).toBeNull();
    show(<CapsuleMachine machine={cows} active />);
    await frame();
    expect(revealDialog()).toBeTruthy();
  });
});

describe('P-ui-05 / DEC-E7: under reduced motion the handle turns in one step', () => {
  it('a tap on the handle commits at once, and the slider says one full turn (failed before)', async () => {
    boot();
    const pull = vi.fn(store.pull);
    show(<CapsuleMachine machine={cats} active pullWith={pull} />);
    await payIn();
    const h = handle();
    // Everything the slider says, in order (it goes back to rest once the capsule has dropped).
    const said: string[] = [];
    const set = h.setAttribute.bind(h);
    h.setAttribute = (name: string, value: string) => {
      if (name === 'aria-valuenow' || name === 'aria-valuetext') said.push(`${name}=${value}`);
      set(name, value);
    };
    tapHandle();
    expect(pull).toHaveBeenCalledTimes(1);
    expect(said).toContain('aria-valuenow=100');
    expect(said).toContain('aria-valuetext=One full turn');
    expect(getCollectible(store.state.value.pendingReveal!.itemId)).toBeTruthy();
  });
});
