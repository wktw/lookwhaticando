/**
 * The save stays bounded (DESIGN §13.8): five years of twelve busy habits (see bigsave.ts)
 * serialise to well under 1,000,000 characters once compacted.
 */
import { describe, expect, it, vi } from 'vitest';
import { encodeEnvelope } from '@/state/persist';
import { validateState } from '@/state/validate';
import { addDays } from '@/domain/dates';
import { compactSave } from '@/domain/rollover';
import { transact } from '@/domain/tx';
import { mulberry32 } from '@/domain/rng';
import { UTC, at } from '../domain/game';
import { fiveYearSave } from './bigsave';

// Builds whole saves (the 120-day demo, months of play): generous time for a busy CI machine.
vi.setConfig({ testTimeout: 30_000 });

const TODAY = '2026-09-29';

describe('save size stays bounded', () => {
  it('5 years × 12 habits serialise to < 1,000,000 characters after compaction (and stay valid)', () => {
    const big = fiveYearSave();
    const before = encodeEnvelope(big, 1, 0, 'test').length;
    const compacted = transact(big, { now: at(TODAY, 21), today: TODAY, local: UTC, rng: mulberry32(1) }, (tx) => {
      compactSave(tx);
      return {};
    }).state;
    const after = encodeEnvelope(compacted, 2, 0, 'test').length;
    expect(validateState(compacted)).toMatchObject({ ok: true });
    expect(before).toBeGreaterThan(1_000_000);
    expect(after).toBeLessThan(1_000_000);
    expect(Object.keys(compacted.ledger.recent).every((k) => k.slice(-10) >= addDays(TODAY, -7))).toBe(true);
    expect(Object.keys(compacted.ledger.daily)).toHaveLength(8);
    // History itself is never compacted away: every log survives (only stamps older than 120 days go).
    expect(Object.keys(compacted.logs['h-00000000']!)).toEqual(Object.keys(big.logs['h-00000000']!));
    console.info(`5y×12 save: ${before.toLocaleString('en-US')} → ${after.toLocaleString('en-US')} chars`);
  });
});
