import { describe, expect, it } from 'vitest';
import { MACHINES } from '@/catalog/machines';
import { contrast } from '@/art/machines/color';
import { machineCandy, monthDay, pityHint, pullErrorNotice } from './copy';

describe('capsules copy', () => {
  it('machine buttons keep AA text contrast on every theme', () => {
    for (const m of MACHINES) {
      const c = machineCandy(m);
      expect(contrast(c.ink, c.face), m.id).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('formats season ends and pity hints', () => {
    expect(monthDay({ month: 11, day: 10 })).toBe('Nov 10');
    expect(pityHint(3)).toBe('Rare+ within 3 pulls ✨');
    expect(pityHint(1)).toMatch(/Next pull/);
  });

  it('every pull error has friendly copy without guilt words', () => {
    const m = MACHINES[0]!;
    for (const e of ['not-enough-coins', 'not-enough-stars', 'no-ticket', 'machine-unavailable'] as const) {
      const n = pullErrorNotice(e, m);
      expect(n.text.length).toBeGreaterThan(10);
      expect(n.text).not.toMatch(/failed|lost|broken|missed/i);
    }
  });
});
