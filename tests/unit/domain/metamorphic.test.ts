import { describe, expect, it } from 'vitest';
import { preserveFacts } from './metamorphic';

describe('historical-fact preservation harness (WP-04)', () => {
  it('accepts an unrelated mutation while deriving the facts afresh on both sides', () => {
    const state = { fact: { day: '2026-09-29' }, name: 'Sam' };
    let reads = 0;
    preserveFacts('rename', () => { reads++; return state.fact; }, () => { state.name = 'Other'; });
    expect(reads).toBe(2);
  });
  it('detects a mutation even when a consumer returns the same nested object', () => {
    const state = { fact: { day: '2026-09-29' } };
    expect(() => preserveFacts('travel', () => state.fact, () => { state.fact.day = '2026-09-30'; })).toThrow(/travel/);
  });
});
