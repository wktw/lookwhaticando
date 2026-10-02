import { describe, expect, it } from 'vitest';
import { decodeState } from '@/state/decode';
import { mulberry32 } from '@/domain/rng';
import { acceptedSeeds, adversarialCase } from './acceptedSeeds';

describe('seeded accepted-state corpus (WP-04)', () => {
  it('includes usable modern additive fields instead of only pre-feature exports', () => {
    const seeds = acceptedSeeds();
    for (const { label, state } of seeds) expect(decodeState(state, 'import').kind, label).toBe('ok');
    const texts = seeds.map(({ state }) => JSON.stringify(state)).join('\n');
    for (const field of ['beforeAnchor', 'cutInactive', 'gridFrom', 'stints', 'favoriteKnownOn', 'onboardingStep', 'createdOn', 'arrivedOn', 'unstarted']) {
      expect(texts, `missing accepted-state seed field ${field}`).toContain(`"${field}"`);
    }
  });
  it('replays the same adversarial mutations from the seed without mutating its source state', () => {
    const source = acceptedSeeds().find((s) => s.label === 'modern-history')!.state;
    const before = JSON.stringify(source);
    const first = mulberry32(91), second = mulberry32(91);
    const a = Array.from({ length: 16 }, () => adversarialCase(source, first));
    const b = Array.from({ length: 16 }, () => adversarialCase(source, second));
    expect(a).toEqual(b);
    expect(JSON.stringify(source)).toBe(before);
    expect(new Set(a.map((s) => JSON.stringify(s.state))).size).toBeGreaterThan(1);
  });
});
