import { describe, expect, it } from 'vitest';
import { MACHINES } from '@/catalog/machines';
import { PETS } from '@/catalog/collectibles';
import { contrast } from '@/art/machines/color';
import { kindLabel, machineCandy, monthDay, pityHint, pullErrorNotice } from './copy';
import { nextPayment } from './payment';
import { capsuleShell, isWhiteish } from './reveal';

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

  it('pet subtitles never say the species twice', () => {
    for (const p of PETS) {
      const label = kindLabel(p);
      expect(label.toLowerCase().split(p.species).length - 1, label).toBe(1);
    }
    expect(kindLabel(PETS.find((p) => p.id === 'pet-cat-calico')!)).toBe('Calico · Cat');
    expect(kindLabel(PETS.find((p) => p.id === 'pet-frog-green')!)).toBe('Pond Frog');
  });
});

describe('pull again', () => {
  it('pays the same way as last time when it can, otherwise the other way, never silently', () => {
    expect(nextPayment('price', true, 0)).toBe('price');
    expect(nextPayment('ticket', true, 1)).toBe('ticket');
    expect(nextPayment('ticket', true, 0)).toBe('price');
    expect(nextPayment('price', false, 2)).toBe('ticket');
    expect(nextPayment('price', false, 0)).toBeNull();
  });
});

describe('capsule shells', () => {
  it('a reveal shell is never white on white, for any machine and tint', () => {
    for (const m of MACHINES) {
      m.theme.capsules.forEach((_, tint) => {
        const shell = capsuleShell(m.theme.capsules, tint);
        expect(isWhiteish(shell.color), `${m.id} ${tint}`).toBe(false);
        expect(isWhiteish(shell.color2), `${m.id} ${tint}`).toBe(false);
      });
    }
  });
});
