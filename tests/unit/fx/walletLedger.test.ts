import { afterEach, describe, expect, it, vi } from 'vitest';
import { chunkOf, onPendingChange, pendingFor, reserve, reserveInto, type Payout } from '@/fx/walletLedger';

afterEach(() => vi.useRealTimers());

describe('wallet ledger', () => {
  it('holds a reward back until it is released, piece by piece', () => {
    const r = reserve('coins', 10);
    expect(pendingFor('coins')).toBe(10);
    r.release(4);
    expect(pendingFor('coins')).toBe(6);
    r.release();
    expect(pendingFor('coins')).toBe(0);
    expect(r.left).toBe(0);
  });

  it('never holds a counter back forever: an unflown reservation lets go on its own', () => {
    vi.useFakeTimers();
    reserve('stars', 3, 1000);
    expect(pendingFor('stars')).toBe(3);
    vi.advanceTimersByTime(1001);
    expect(pendingFor('stars')).toBe(0);
  });

  it('a hold keeps it until released (a banner still showing)', () => {
    vi.useFakeTimers();
    const r = reserve('coins', 5, 1000);
    r.hold(Infinity);
    vi.advanceTimersByTime(60_000);
    expect(pendingFor('coins')).toBe(5);
    r.release();
    expect(pendingFor('coins')).toBe(0);
  });

  it('collects one action’s rewards into one payout, and tells counters about every change', () => {
    const seen: number[] = [];
    const off = onPendingChange(() => seen.push(pendingFor('coins')));
    const payout: Payout = {};
    reserveInto(payout, 'coins', 5);
    reserveInto(payout, 'coins', 8);
    expect(payout.coins?.left).toBe(13);
    payout.coins?.release();
    off();
    expect(seen).toEqual([5, 13, 0]);
  });

  it('splits an amount into whole landings that add up', () => {
    const parts = Array.from({ length: 3 }, (_, i) => chunkOf(10, 3, i));
    expect(parts).toEqual([3, 3, 4]);
    expect(parts.reduce((a, b) => a + b)).toBe(10);
  });
});
