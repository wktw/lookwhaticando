// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { AnimatedNumber } from '@/ui/AnimatedNumber';
import { Toaster } from '@/ui/Toaster';
import { toasts } from '@/ui/toast';
import { BATCH_MS, CelebrationHost, markCelebratedLocally } from '@/fx/celebrations';
import { pendingFor, reserve } from '@/fx/walletLedger';
import { emitGameEvents } from '@/state/events';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
// jsdom has no canvas: confetti quietly skips itself.
HTMLCanvasElement.prototype.getContext = () => null;

let host: HTMLElement;

beforeEach(() => {
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
    mountHost();
    act(() => emitGameEvents([{ type: 'perfectDay', date: '2026-09-29', coins: 10 }]));
    await sleep(BATCH_MS / 2);
    act(() => emitGameEvents([{ type: 'badge', badgeId: 'checkins-50', stars: 2 }]));
    await act(() => sleep(BATCH_MS + 30));
    const banners = document.querySelectorAll('#overlay-root [role="group"]');
    expect(banners).toHaveLength(1);
    expect(banners[0]!.getAttribute('aria-label')).toContain('Perfect day');
    expect(banners[0]!.textContent).toContain('Fifty & Flourishing badge');
  });

  it('reserves rewards the instant they arrive, and hands check-in coins to the screen’s own flourish', async () => {
    mountHost();
    act(() =>
      emitGameEvents([
        { type: 'coins', amount: 5, reason: 'checkin', habitId: 'h-walk' },
        { type: 'coins', amount: 3, reason: 'welcome' },
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
