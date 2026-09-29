// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { AnimatedNumber } from '@/ui/AnimatedNumber';
import { Toaster } from '@/ui/Toaster';
import { toasts } from '@/ui/toast';
import { BATCH_MS, CelebrationHost, markCelebratedLocally } from '@/fx/celebrations';
import { loadCelebrationArt } from '@/fx/celebrationArtLoader';
import { pushLayer, removeLayer } from '@/ui/sheetStack';
import { pendingFor, reserve } from '@/fx/walletLedger';
import { emitGameEvents } from '@/state/events';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
// jsdom has no Element.animate: petals quietly skip themselves.

let host: HTMLElement;

beforeEach(() => {
  // The layer stack's scroll lock restores the page position (jsdom has no scrolling).
  window.scrollTo = () => undefined;
  document.body.innerHTML = '<div id="app"></div>';
  host = document.getElementById('app')!;
});

afterEach(() => {
  act(() => render(null, host));
  toasts.value = [];
  document.body.innerHTML = '';
});

describe('AnimatedNumber with a wallet reservation', () => {
  it('holds the old value while the coins are in the air, then ticks up as they land', async () => {
    act(() => render(<AnimatedNumber value={100} walletKind="coins" />, host));
    expect(host.textContent).toBe('100');

    // The store commits +20 and the reward is reserved in the same tick.
    const flight = reserve('coins', 20);
    act(() => render(<AnimatedNumber value={120} walletKind="coins" />, host));
    await act(() => sleep(700));
    expect(host.textContent).toBe('100');

    flight.release(10);
    await act(() => sleep(400));
    expect(host.textContent).toBe('110');

    flight.release();
    await act(() => sleep(400));
    expect(host.textContent).toBe('120');
  });

  it('never dips when a flight is reserved after its coins were already shown', async () => {
    act(() => render(<AnimatedNumber value={50} walletKind="coins" />, host));
    const late = reserve('coins', 20);
    await act(() => sleep(300));
    expect(host.textContent).toBe('50');
    late.release();
    await act(() => sleep(300));
    expect(host.textContent).toBe('50');
  });

  it('counts plain value changes without waiting for anything', async () => {
    act(() => render(<AnimatedNumber value={5} />, host));
    act(() => render(<AnimatedNumber value={9} />, host));
    await act(() => sleep(800));
    expect(host.textContent).toBe('9');
  });
});

describe('CelebrationHost', () => {
  const mountHost = () =>
    act(() =>
      render(
        <>
          <Toaster />
          <CelebrationHost />
        </>,
        host,
      ),
    );

  it('events arriving within one batch become ONE banner that mentions the rest', async () => {
    await loadCelebrationArt();
    mountHost();
    act(() => emitGameEvents([{ type: 'perfectDay', date: '2026-09-29', coins: 10 }]));
    await sleep(BATCH_MS / 2);
    act(() => emitGameEvents([{ type: 'badge', badgeId: 'checkins-50', stars: 2 }]));
    await act(() => sleep(BATCH_MS + 30));
    const banners = document.querySelectorAll('#overlay-root [role="region"]');
    expect(banners).toHaveLength(1);
    expect(banners[0]!.getAttribute('aria-label')).toContain('Everything’s watered');
    expect(banners[0]!.textContent).toContain('Fifty waterings, a new pin');
  });

  it('a banner waits for its drawings, and for a full-screen moment (the capsule reveal) to close', async () => {
    await loadCelebrationArt();
    mountHost();
    act(() => pushLayer('reveal-test', { moment: true }));
    act(() => emitGameEvents([{ type: 'badge', badgeId: 'checkins-50', stars: 2 }, { type: 'letter', letterId: 'w1', kind: 'sundayNote' }]));
    await act(() => sleep(BATCH_MS + 30));
    expect(document.querySelectorAll('#overlay-root [role="region"]')).toHaveLength(0);
    // The note on the sill waits too: queued, not drawn over the reveal.
    expect(toasts.value.map((t) => t.key)).toEqual(['letter']);
    expect(document.querySelector('[data-toast-id]')).toBeNull();
    act(() => removeLayer('reveal-test'));
    await act(() => sleep(10));
    expect(document.querySelectorAll('#overlay-root [role="region"]')).toHaveLength(1);
    expect(document.querySelector('[data-toast-id]')).not.toBeNull();
  });

  it('reserves rewards the instant they arrive, and hands check-in coins to the screen’s own flourish', async () => {
    mountHost();
    act(() =>
      emitGameEvents([
        { type: 'coins', amount: 5, reason: 'checkin', habitId: 'h-walk' },
        { type: 'coins', amount: 3, reason: 'home' },
      ]),
    );
    expect(pendingFor('coins')).toBe(8);
    markCelebratedLocally('h-walk');
    expect(pendingFor('coins')).toBe(3);
    await act(() => sleep(BATCH_MS + 30));
    // Only the unclaimed coins are toasted.
    expect(toasts.value.map((t) => t.label ?? t.message)).toEqual(['+3 coins']);
  });
});

describe('check-in announcements (burst rule)', () => {
  it('reads a burst of check-ins as one sentence', async () => {
    const { settledCheckInLine } = await import('@/fx/checkin');
    expect(settledCheckInLine([{ name: 'Walk', coins: 5, tiny: false, note: 'Pudding opened one eye.' }])).toBe('Walk, watered. Plus 5 coins. Pudding opened one eye. Undo available.');
    expect(settledCheckInLine([{ name: 'Walk', coins: 0, tiny: true }])).toBe('Walk, watered: the tiny version. Undo available.');
    expect(
      settledCheckInLine([
        { name: 'Walk', coins: 5, tiny: false },
        { name: 'Read', coins: 5, tiny: false },
        { name: 'Stretch', coins: 0, tiny: true },
      ]),
    ).toBe('3 habits watered. Plus 10 coins. Undo available.');
    expect(settledCheckInLine([])).toBe('');
  });

  it('keeps the pet and plant reactions in a multi-habit burst, the latest two distinct', async () => {
    const { settledCheckInLine, MAX_SETTLED_NOTES } = await import('@/fx/checkin');
    expect(MAX_SETTLED_NOTES).toBe(2);
    expect(
      settledCheckInLine([
        { name: 'Walk', coins: 5, tiny: false, note: 'Pudding opened one eye.' },
        { name: 'Read', coins: 5, tiny: false },
      ]),
    ).toBe('2 habits watered. Plus 10 coins. Pudding opened one eye. Undo available.');
    expect(
      settledCheckInLine([
        { name: 'Walk', coins: 5, tiny: false, note: 'Pudding opened one eye.' },
        { name: 'Read', coins: 0, tiny: false, note: 'The pothos put out a new leaf.' },
        { name: 'Yoga', coins: 0, tiny: false, note: 'The pothos put out a new leaf.' },
        { name: 'Water', coins: 0, tiny: false, note: 'Clover rolled into the sun.' },
      ]),
    ).toBe('4 habits watered. Plus 5 coins. The pothos put out a new leaf. Clover rolled into the sun. Undo available.');
  });
});

describe('the check-in note (VOICE §5)', () => {
  it('offers Undo and Add a note, and words each kind from CHECKIN_TOASTS', async () => {
    const { showCheckInNote } = await import('@/fx/checkin');
    const undo = vi.fn();
    const add = vi.fn();
    toasts.value = [];
    showCheckInNote({ habitId: 'h-drink', habitName: 'Drink water', coins: 4, count: 8, unit: 'glasses', onUndo: undo, onAddNote: add });
    const t = toasts.value.find((x) => x.key === 'checkin-h-drink')!;
    expect(t.label).toBe('Drink water, watered. 8 glasses. Plus 4 coins.');
    expect(t.actions?.map((a) => a.label)).toEqual(['Undo', 'Add a note']);
    t.actions![1]!.onAction();
    expect(add).toHaveBeenCalled();
    showCheckInNote({ habitId: 'h-walk', habitName: 'Walk', coins: 0, date: 'Sat, Sep 27', onUndo: undo });
    expect(toasts.value.find((x) => x.key === 'checkin-h-walk')?.label).toBe('Walk, watered for Sat, Sep 27. History only, no coins.');
  });

  it('un-watering says where the coins went', async () => {
    const { showUncheckNote } = await import('@/fx/checkin');
    toasts.value = [];
    showUncheckNote({ habitId: 'h-walk', habitName: 'Walk', refunded: 5 });
    expect(toasts.value[0]?.message).toBe('Walk, not watered after all. The 5 coins went back in the jar.');
    showUncheckNote({ habitId: 'h-walk', habitName: 'Walk', refunded: 0, spent: 5 });
    expect(toasts.value[0]?.message).toBe('Walk, not watered after all. The coins were spent already, and stay spent.');
  });

  it('the aside: a harvest always, the companion about 1 in 4, species-true', async () => {
    const { checkInAside } = await import('@/fx/checkin');
    const pet = () => ({ name: 'Clover', species: 'cow' as const, level: 1 });
    const xp = { type: 'companionXp', petId: 'pet-cow-holstein', habitId: 'h-walk', date: '2026-09-29', xp: 3 } as const;
    expect(checkInAside({ habitId: 'h-walk', events: [{ type: 'harvest', habitId: 'h-walk', treatId: 't', firstTime: false }, xp], plant: 'catgrass', pet, roll: 0.9, night: false })).toBe('A pinch of cat grass, into the basket.');
    expect(checkInAside({ habitId: 'h-walk', events: [xp], pet, roll: 0.9, night: false })).toBeUndefined();
    expect(checkInAside({ habitId: 'h-walk', events: [], pet, roll: 0.1, night: false })).toBeUndefined();
    const said = new Set<string>();
    for (let i = 0; i < 40; i++) said.add(checkInAside({ habitId: 'h-walk', events: [xp], pet, roll: (i / 40) * 0.249, night: false })!);
    for (const line of said) {
      expect(line.startsWith('Clover ')).toBe(true);
      expect(line).not.toMatch(/\b(blink|ear|throat|wagged|wing|looked up)\b/);
    }
    const asleep = checkInAside({ habitId: 'h-walk', events: [xp], pet, roll: 0.05, night: true });
    expect(asleep).toMatch(/^Clover (opened one eye|slept through it|shifted, still asleep|stirred, then settled|kept chewing, eyes shut)\.$/);
  });
});
