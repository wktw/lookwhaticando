// @vitest-environment jsdom
/**
 * The celebration host off the first paint (first-paint diet, 1 October 2026). `main.tsx` mounts
 * `<LazyCelebrationHost/>`, which brings `<CelebrationHost/>` (the planner, the notes, the banners,
 * the epic moment, the coin flight) from its own chunk. The host used to start listening in its
 * first effect after first paint; the loader arms the event bus's hold at that same moment, so:
 *
 * - an event from before then (hydrate's own, at boot) is not celebrated, as before;
 * - an event that comes after it and before the chunk (a tap on a screen that loaded first) is
 *   kept, and the host celebrates it when it starts listening, its rewards reserved then;
 * - once the host listens, events reach it directly;
 * - a chunk that can't load lets the hold go (nothing piles up), and the next game event asks for
 *   it again, kept until that load settles.
 *
 * Each test starts from a fresh module graph (`vi.resetModules`), so the chunk is never already
 * loaded; the real `./celebrations` sits behind a switch that holds its import, or rejects it the
 * way a missing chunk does.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'preact/test-utils';
import type { GameEvent } from '@/state/api';
import { installDom, mount, pause, until } from '@/features/capsules/testing';

vi.setConfig({ testTimeout: 30_000 });

const ctl = vi.hoisted(() => ({
  attempts: 0,
  /** While set, the chunk's import waits for it. */
  hold: null as Promise<void> | null,
  /** While true, the chunk's import rejects. */
  offline: false,
  /** The latest import, settled either way: a test does not end with one still running. */
  loading: null as Promise<unknown> | null,
}));

function gateChunk() {
  vi.doMock('./celebrations', (orig) => {
    ctl.attempts++;
    const load = (async () => {
      if (ctl.hold) await ctl.hold;
      if (ctl.offline) throw new TypeError('Failed to fetch dynamically imported module: celebrations');
      return orig();
    })();
    ctl.loading = load.catch(() => undefined);
    return load;
  });
}

/** A first import is transformed on the spot: room for a busy machine. */
const LOAD = 20_000;
const COINS: GameEvent = { type: 'coins', amount: 3, reason: 'home' };

let view: ReturnType<typeof mount> | null = null;

/** The loader, the toasts, the event bus and the ledger from one fresh module graph. */
async function fresh() {
  vi.resetModules();
  gateChunk();
  const events = await import('@/state/events');
  const toast = await import('@/ui/toast');
  const ledger = await import('./walletLedger');
  const { Toaster } = await import('@/ui/Toaster');
  const { LazyCelebrationHost } = await import('./celebrationHostLoader');
  const show = () => {
    view = mount(
      <>
        <Toaster />
        <LazyCelebrationHost />
      </>,
    );
  };
  const labels = () => toast.toasts.value.map((t) => t.label ?? t.message);
  return { events, toast, ledger, show, labels };
}

let release: () => void = () => undefined;
function holdChunk() {
  ctl.hold = new Promise<void>((r) => (release = r));
}

beforeAll(() => {
  installDom();
  window.scrollTo = () => undefined;
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
});
beforeEach(() => {
  ctl.attempts = 0;
  ctl.hold = null;
  ctl.offline = false;
  ctl.loading = null;
});
afterEach(async () => {
  release();
  view?.unmount();
  view = null;
  await ctl.loading;
  ctl.loading = null;
  await pause(0);
  document.body.innerHTML = '';
  vi.doUnmock('./celebrations');
});
// A note's coin hops out of it after the test has its answer (TOAST_HOP_MS, then the flight) and
// draws on the page: let the last flights land before the page is torn down.
afterAll(() => pause(2_000));

describe('the lazy celebration host', () => {
  it('keeps an event that comes before its chunk, and the host celebrates it once it listens', async () => {
    holdChunk();
    const { events, ledger, show, labels } = await fresh();
    show();
    await pause(30);
    act(() => events.emitGameEvents([COINS]));
    await pause(120);
    expect(labels()).toEqual([]);
    expect(ledger.pendingFor('coins')).toBe(0);
    release();
    await until(() => labels().length > 0, 'the note for the kept event', LOAD);
    expect(labels()).toEqual(['+3 coins']);
    expect(ctl.attempts).toBe(1);
  });

  it('does not celebrate what came before it mounted (hydrate’s events at boot), as the host never did', async () => {
    const { events, show, labels } = await fresh();
    act(() => events.emitGameEvents([COINS]));
    show();
    act(() => events.emitGameEvents([{ type: 'coins', amount: 4, reason: 'home' }]));
    await until(() => labels().length > 0, 'the note for the later event', LOAD);
    await pause(200);
    // Not "+7 coins": the 3 from before it mounted went nowhere.
    expect(labels()).toEqual(['+4 coins']);
  });

  it('once the host listens, an event reaches it directly: its rewards are reserved the instant it arrives', async () => {
    const { events, ledger, show, labels } = await fresh();
    show();
    act(() => events.emitGameEvents([{ type: 'coins', amount: 4, reason: 'home' }]));
    await until(() => labels().length > 0, 'the host listening', LOAD);
    const before = ledger.pendingFor('coins');
    act(() => events.emitGameEvents([COINS]));
    expect(ledger.pendingFor('coins')).toBe(before + 3);
    expect(ctl.attempts).toBe(1);
  });

  it('a check-in while held: coins a screen claimed and flies itself are not reserved again when the host is handed them', async () => {
    const { events, ledger, show, labels } = await fresh();
    // Today imports ./celebrations itself, so the module is there before the host listens.
    const host = await import('./celebrations');
    let peak = 0;
    const off = ledger.onPendingChange(() => (peak = Math.max(peak, ledger.pendingFor('coins'))));
    // The gap: held (as the loader holds at mount), the host not yet listening. A tap on Today:
    // the check-in's events, then what play() / celebrateCheckIn do in the same tick.
    act(() => {
      events.holdGameEvents();
      events.emitGameEvents([
        { type: 'coins', amount: 5, reason: 'checkin', habitId: 'h1' },
        { type: 'coins', amount: 10, reason: 'perfect' },
      ]);
      host.markCelebratedLocally('h1');
      ledger.reserve('coins', 5);
    });
    expect(ledger.pendingFor('coins')).toBe(5);
    show();
    await until(() => labels().length > 0, 'the note for the kept events', LOAD);
    off();
    // As when the host already listens: its 10, and the 5 the flourish reserved and flies. Not
    // 20: the claimed check-in coins are not reserved (and flown) a second time.
    expect(peak).toBe(15);
    expect(labels()).toEqual(['+10 coins']);
  });

  it('lets what it kept go when its chunk can’t load, and the next event asks for it again', async () => {
    holdChunk();
    ctl.offline = true;
    const { events, show, labels } = await fresh();
    show();
    act(() => events.emitGameEvents([{ type: 'coins', amount: 4, reason: 'home' }]));
    release();
    await until(() => ctl.attempts === 1, 'the first load', LOAD);
    await pause(50);
    expect(labels()).toEqual([]);
    // Back online: the next event asks for the chunk again, and is celebrated once it arrives.
    ctl.offline = false;
    act(() => events.emitGameEvents([COINS]));
    await until(() => labels().length > 0, 'the note after the retry', LOAD);
    await pause(200);
    // Not "+7 coins": the 4 kept while the first load failed were let go.
    expect(labels()).toEqual(['+3 coins']);
    expect(ctl.attempts).toBe(2);
  });

  it('lets the hold go when it unmounts before its chunk arrives', async () => {
    holdChunk();
    const { events, show } = await fresh();
    show();
    await pause(30);
    act(() => events.emitGameEvents([COINS]));
    view!.unmount();
    view = null;
    const heard: GameEvent[] = [];
    const off = events.onGameEvent((e) => heard.push(e));
    expect(heard).toEqual([]);
    off();
  });
});

describe('the event bus’s hold', () => {
  it('keeps events while held and hands them, in order, to the next listener; then they flow', async () => {
    vi.resetModules();
    const events = await import('@/state/events');
    const a: GameEvent = { type: 'coins', amount: 1, reason: 'home' };
    const b: GameEvent = { type: 'coins', amount: 2, reason: 'home' };
    const c: GameEvent = { type: 'coins', amount: 5, reason: 'home' };
    events.holdGameEvents();
    events.emitGameEvents([a]);
    events.emitGameEvents([b]);
    const heard: GameEvent[] = [];
    const off = events.onGameEvent((e) => heard.push(e));
    expect(heard).toEqual([a, b]);
    events.emitGameEvents([c]);
    expect(heard).toEqual([a, b, c]);
    off();
  });

  it('drops what it kept when let go, and tells its watcher about the first event it keeps', async () => {
    vi.resetModules();
    const events = await import('@/state/events');
    const first = vi.fn();
    events.holdGameEvents(first);
    events.emitGameEvents([COINS]);
    events.emitGameEvents([COINS]);
    expect(first).toHaveBeenCalledTimes(1);
    events.dropHeldGameEvents();
    const heard: GameEvent[] = [];
    const off = events.onGameEvent((e) => heard.push(e));
    expect(heard).toEqual([]);
    events.emitGameEvents([COINS]);
    expect(heard).toEqual([COINS]);
    off();
  });

  it('is not held unless asked: with nobody listening, events go nowhere, as before', async () => {
    vi.resetModules();
    const events = await import('@/state/events');
    events.emitGameEvents([COINS]);
    const heard: GameEvent[] = [];
    const off = events.onGameEvent((e) => heard.push(e));
    expect(heard).toEqual([]);
    off();
  });
});
