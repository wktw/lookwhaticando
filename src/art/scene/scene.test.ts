import { describe, expect, it } from 'vitest';
import { DECOR, DECOR_SLOTS } from '@/catalog';
import { DECOR_ART } from '@/art/items/decor';
import { DECOR_ENTRIES, decorFootprint } from './decor';
import { DECOR_DEFAULT_POS, groundPoint, groundToStyle, HORIZON, pointToGround } from './ground';
import { sillSlotStyle, SILL_MAX_ITEMS } from './WindowsillScene';
import { timeOfDayAt } from './time';

describe('ground coordinates', () => {
  it('maps the horizon and the front edge onto the scene', () => {
    expect(groundPoint(0, 0)).toMatchObject({ left: 0, top: HORIZON * 100, scale: 0.7 });
    expect(groundPoint(1, 1)).toMatchObject({ left: 100, top: 100 });
    expect(groundPoint(0.5, 1).scale).toBeCloseTo(1.1);
  });

  it('draws nearer things in front and larger', () => {
    const far = groundPoint(0.5, 0.2);
    const near = groundPoint(0.5, 0.8);
    expect(near.zIndex).toBeGreaterThan(far.zIndex);
    expect(near.scale).toBeGreaterThan(far.scale);
  });

  it('puts negative y in the sky, unscaled and behind the ground', () => {
    const top = groundPoint(0.3, -1);
    expect(top.top).toBe(0);
    expect(top.scale).toBe(1);
    expect(top.zIndex).toBeLessThan(groundPoint(0.3, 0).zIndex);
  });

  it('turns a pointer position back into ground coordinates', () => {
    const rect = { left: 10, top: 20, width: 400, height: 500 } as DOMRect;
    const p = groundPoint(0.25, 0.6);
    const hit = pointToGround(10 + (p.left / 100) * 400, 20 + (p.top / 100) * 500, rect);
    expect(hit!.x).toBeCloseTo(0.25);
    expect(hit!.y).toBeCloseTo(0.6);
    expect(pointToGround(100, 30, rect)).toBeNull();
  });

  it('builds absolute-position CSS, standing on the point by default', () => {
    const style = groundToStyle(0.5, 1, { size: 16 });
    expect(style).toMatchObject({ position: 'absolute', left: '50%', top: '100%', height: '16%', aspectRatio: '1', translate: '-50% -100%' });
    expect(groundToStyle(0.5, -0.5).translate).toBe('-50% -50%');
  });

  it('has a default position for every decor slot', () => {
    for (const slot of DECOR_SLOTS) {
      const pos = DECOR_DEFAULT_POS[slot];
      expect(pos.x, slot).toBeGreaterThan(0);
      expect(pos.x, slot).toBeLessThan(1);
      if (slot === 'sky') expect(pos.y).toBeLessThan(0);
      else expect(pos.y, slot).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('decor', () => {
  it('has art and a footprint for every catalog item, by day and by night', () => {
    for (const d of DECOR) {
      const entry = DECOR_ENTRIES[d.id];
      expect(entry, d.id).toBeDefined();
      expect(decorFootprint(d.id), d.id).toBeGreaterThan(0);
      expect(entry!.art(), d.id).toBeTruthy();
      expect(entry!.art({ night: true }), d.id).toBeTruthy();
      expect(DECOR_ART[d.id]!(), d.id).toBeTruthy();
    }
  });

  it('draws big things bigger than small things', () => {
    expect(decorFootprint('decor-little-barn')).toBeGreaterThan(decorFootprint('decor-tennis-balls'));
    expect(decorFootprint('decor-cherry-tree')).toBeGreaterThan(decorFootprint('decor-yarn-basket'));
    expect(decorFootprint('decor-rainbow')).toBeGreaterThan(decorFootprint('decor-heart-balloons'));
  });
});

describe('windowsill', () => {
  it('centres a single thing', () => {
    expect(sillSlotStyle(0, 1, 60).left).toBe('calc(50% + 0 * 0px)');
  });

  it('spreads things symmetrically and caps the row', () => {
    const first = sillSlotStyle(0, 3, 50).left as string;
    const last = sillSlotStyle(2, 3, 50).left as string;
    expect(first).toContain('-1 *');
    expect(last).toContain('+ 1 *');
    expect(sillSlotStyle(0, 99, 50).left).toBe(sillSlotStyle(0, SILL_MAX_ITEMS, 50).left);
  });
});

describe('time of day', () => {
  const at = (h: number, m = 0) => timeOfDayAt(new Date(2026, 8, 29, h, m));
  it('follows the DESIGN §9.4 windows', () => {
    expect(at(4, 59)).toBe('night');
    expect(at(5)).toBe('dawn');
    expect(at(8)).toBe('day');
    expect(at(16, 59)).toBe('day');
    expect(at(17)).toBe('golden');
    expect(at(20)).toBe('night');
  });
});
