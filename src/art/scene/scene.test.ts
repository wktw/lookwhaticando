import { describe, expect, it } from 'vitest';
import { DECOR, DECOR_SLOTS } from '@/catalog';
import { DECOR_ART } from '@/art/items/decor';
import { DECOR_ENTRIES, decorFootprint } from './decor';
import { nightTone, paint } from './decor/kit';
import { depthAt, groundPoint, groundToStyle, HORIZON, insideX, pointToGround } from './ground';
import { GATE, GATE_HALF, SWING_END, TREE_LEFT, decorUnitScale, groundX, len, clampLen, unitScale } from './layout';
import { DECOR_DEFAULT_POS, decorDefaultPos, decorGroundRect, pathAt, placeDecor, planterGroundRect } from './placement';
import { sillLayout, sillRow, sillSlotStyle, SILL_MAX_ITEMS } from './WindowsillScene';
import { timeOfDayAt } from './time';

/** Phone, tall phone, tablet, wide and ultra-wide scenes. */
const ASPECTS = [390 / 700, 390 / 560, 768 / 560, 1200 / 600, 1600 / 480];

/** How far (in scene heights) a placed item's art reaches left and right of its centre. */
function reach(itemId: string, y: number, aspect: number): [number, number] {
  const e = DECOR_ENTRIES[itemId]!;
  const w = (e.size * decorUnitScale(aspect) * depthAt(y)) / 100;
  return [(0.5 - e.bounds[0] / 100) * w, (e.bounds[1] / 100 - 0.5) * w];
}

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

  it('builds absolute-position CSS sized in meadow units, standing on the point by default', () => {
    const style = groundToStyle(0.5, 1, { size: 16 });
    expect(style).toMatchObject({ position: 'absolute', left: '50%', top: '100%', height: 'calc(16 * var(--u))', aspectRatio: '1', translate: '-50% -100%' });
    expect(groundToStyle(0.5, -0.5).translate).toBe('-50% -50%');
    expect(groundToStyle(0.5, 0.5, { size: 20, unit: 'var(--du)' }).height).toBe('calc(20 * var(--du))');
  });

  it('keeps art in frame when asked, by the same amount in CSS and in JS', () => {
    expect(groundToStyle(0, 0.5, { size: 20, inside: [10, 90] }).left).toMatch(/^clamp\(/);
    for (const aspect of ASPECTS) {
      const x = insideX(0, 0.5, 20, [10, 90], aspect, unitScale(aspect));
      const leftEdge = x * aspect - ((20 * unitScale(aspect) * depthAt(0.5)) / 100) * 0.4;
      expect(leftEdge).toBeCloseTo(0, 6);
      expect(insideX(0.5, 0.5, 20, [10, 90], aspect, unitScale(aspect))).toBe(0.5);
    }
  });
});

describe('scene layout', () => {
  it('renders each length to CSS and evaluates it for any aspect', () => {
    const l = clampLen(len(0, -10), len(0.5, -20), len(0, 5));
    expect(l.css).toBe('clamp(calc(0cqw + -10 * var(--u)), calc(50cqw + -20 * var(--u)), calc(0cqw + 5 * var(--u)))');
    expect(l.at(2)).toBeCloseTo(0.05);
    // Narrower than 0.7 : 1 the unit shrinks (to 0.8% of the height at most).
    expect(l.at(0.5)).toBeCloseTo(0.04);
    expect(l.at(0.3)).toBeCloseTo(-0.01);
  });

  it('shrinks the unit only on tall portrait scenes, and decor a little more on narrow ones', () => {
    expect(unitScale(2)).toBe(1);
    expect(unitScale(0.7)).toBe(1);
    expect(unitScale(0.56)).toBeCloseTo(0.8);
    expect(decorUnitScale(2)).toBe(1);
    expect(decorUnitScale(0.7)).toBeCloseTo(0.85);
  });

  it('keeps the gate between the swing and the right edge at every size', () => {
    for (const aspect of ASPECTS) {
      const gate = GATE.at(aspect);
      expect(gate, `${aspect}`).toBeGreaterThan(SWING_END.at(aspect));
      expect(gate + GATE_HALF / 100, `${aspect}`).toBeLessThan(aspect);
      expect(TREE_LEFT.at(aspect)).toBeLessThanOrEqual(0.04);
    }
  });
});

describe('default decor positions', () => {
  it('has a spot for every slot, with the sky above the horizon', () => {
    for (const slot of DECOR_SLOTS) {
      const pos = DECOR_DEFAULT_POS[slot];
      expect(pos.x, slot).toBeGreaterThan(0);
      expect(pos.x, slot).toBeLessThan(1);
      if (slot === 'sky') expect(pos.y).toBeLessThan(0);
      else expect(pos.y, slot).toBeGreaterThanOrEqual(0);
    }
  });

  it('stands back-left decor clear of the swing and lantern', () => {
    for (const d of DECOR.filter((c) => c.slot === 'back-left')) {
      for (const aspect of ASPECTS) {
        const pos = decorDefaultPos('back-left', aspect, d.id);
        const [l] = reach(d.id, pos.y, aspect);
        expect(pos.x * aspect - l, `${d.id} @ ${aspect.toFixed(2)}`).toBeGreaterThanOrEqual(SWING_END.at(aspect));
      }
    }
  });

  it('stands back-right decor clear of the gate wherever the scene is wide enough', () => {
    for (const d of DECOR.filter((c) => c.slot === 'back-right')) {
      for (const aspect of ASPECTS.filter((a) => a >= 1)) {
        const pos = decorDefaultPos('back-right', aspect, d.id);
        const [l, r] = reach(d.id, pos.y, aspect);
        expect(pos.x * aspect - l, d.id).toBeGreaterThan(GATE.at(aspect) + (GATE_HALF * unitScale(aspect)) / 100);
        expect(pos.x * aspect + r, d.id).toBeLessThanOrEqual(aspect);
      }
    }
  });

  it('keeps ground decor off the stepping-stone path', () => {
    for (const d of DECOR.filter((c) => c.slot.startsWith('ground-'))) {
      for (const aspect of ASPECTS) {
        const pos = decorDefaultPos(d.slot, aspect, d.id);
        const [l, r] = reach(d.id, pos.y, aspect);
        const path = pathAt(pos.y, aspect);
        const clear = pos.x * aspect + r < path || pos.x * aspect - l > path;
        expect(clear, `${d.id} @ ${aspect.toFixed(2)}`).toBe(true);
      }
    }
  });

  it('hangs sky decor on the tree or behind the hills, never mid-air on its own', () => {
    for (const aspect of ASPECTS) {
      const lights = decorDefaultPos('sky', aspect, 'decor-fairy-lights');
      const balloons = decorDefaultPos('sky', aspect, 'decor-heart-balloons');
      const rainbow = decorDefaultPos('sky', aspect, 'decor-rainbow');
      const tree = [TREE_LEFT.at(aspect), TREE_LEFT.at(aspect) + 0.4 * unitScale(aspect)];
      expect(lights.x * aspect).toBeGreaterThan(tree[0]!);
      expect(lights.x * aspect).toBeLessThan(tree[1]!);
      expect(balloons.x).toBeCloseTo(groundX(SWING_END, aspect), 1);
      expect(rainbow.y).toBeLessThan(0);
      expect(rainbow.x).toBeLessThan(0.75);
    }
  });

  it('places a whole meadow from its slots', () => {
    const placed = placeDecor({ 'back-left': 'decor-little-barn', sky: 'decor-rainbow' }, 0.7);
    expect(placed.map((p) => p.itemId)).toEqual(['decor-little-barn', 'decor-rainbow']);
    expect(placed[0]).toMatchObject(decorDefaultPos('back-left', 0.7, 'decor-little-barn'));
  });
});

describe('ground rects for the pets map', () => {
  it('covers an item’s base, flat items included', () => {
    const barn = decorGroundRect('decor-little-barn', 0.5, 0.2, 2)!;
    expect(barn.x0).toBeLessThan(0.5);
    expect(barn.x1).toBeGreaterThan(0.5);
    expect(barn.y1).toBe(0.2);
    expect(barn.y0).toBeLessThan(0.2);
    expect(barn.flat).toBe(false);
    expect(decorGroundRect('decor-picnic-blanket', 0.4, 0.7, 0.7)!.flat).toBe(true);
    expect(decorGroundRect('decor-rainbow', 0.4, -0.6, 0.7)).toBeNull();
  });

  it('is narrower in ground units on wider scenes', () => {
    const phone = decorGroundRect('decor-hay-bale', 0.5, 0.5, 0.7)!;
    const wide = decorGroundRect('decor-hay-bale', 0.5, 0.5, 2)!;
    expect(wide.x1 - wide.x0).toBeLessThan(phone.x1 - phone.x0);
  });

  it('maps the planter box in the front-left corner, growing with its plants', () => {
    expect(planterGroundRect(0, 0.7)).toBeNull();
    const three = planterGroundRect(3, 0.7)!;
    const five = planterGroundRect(5, 0.7)!;
    expect(three.x0).toBeGreaterThan(0);
    expect(five.x1).toBeGreaterThan(three.x1);
    expect(three.y1).toBe(1);
    expect(three.y0).toBeGreaterThan(0.8);
  });
});

describe('decor art', () => {
  it('has art, bounds and a footprint for every catalog item, by day and by night', () => {
    for (const d of DECOR) {
      const entry = DECOR_ENTRIES[d.id];
      expect(entry, d.id).toBeDefined();
      expect(decorFootprint(d.id), d.id).toBeGreaterThan(0);
      expect(entry!.bounds[0], d.id).toBeLessThan(entry!.bounds[1]);
      expect(entry!.art(), d.id).toBeTruthy();
      expect(entry!.art({ night: true, line: 0.5 }), d.id).toBeTruthy();
      expect(DECOR_ART[d.id]!(), d.id).toBeTruthy();
      if (d.slot === 'sky') expect(entry!.sky, d.id).toBeDefined();
    }
  });

  it('draws big things bigger than small things', () => {
    expect(decorFootprint('decor-little-barn')).toBeGreaterThan(decorFootprint('decor-tennis-balls'));
    expect(decorFootprint('decor-cherry-tree')).toBeGreaterThan(decorFootprint('decor-yarn-basket'));
    expect(decorFootprint('decor-rainbow')).toBeGreaterThan(decorFootprint('decor-heart-balloons'));
  });

  it('tones surfaces toward the night sky and scales outlines', () => {
    const lum = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11;
    };
    expect(nightTone('#F6A6A2')).toMatch(/^#[0-9a-f]{6}$/);
    expect(lum(nightTone('#F6A6A2'))).toBeLessThan(lum('#F6A6A2'));
    expect(paint({ night: false }).c('#F6A6A2')).toBe('#F6A6A2');
    expect(paint({ line: 0.5 }).ink['stroke-width']).toBeCloseTo(1.2);
    expect(paint().w(2)).toBe(2);
  });
});

describe('windowsill', () => {
  const centre = (style: { left?: unknown }) => style.left as string;

  it('centres a row and spaces it symmetrically', () => {
    const { offsets, span } = sillRow([46, 60, 46]);
    expect(offsets[0]).toBeCloseTo(-span / 2);
    expect(offsets[2]).toBeCloseTo(span / 2);
    expect(sillRow([50]).offsets).toEqual([0]);
  });

  it('gives bigger things more room', () => {
    const { offsets } = sillRow([46, 60, 46, 46]);
    expect(offsets[1]! - offsets[0]!).toBeGreaterThan(offsets[3]! - offsets[2]!);
  });

  it('caps the row and draws the buddy over its neighbours', () => {
    expect(sillRow(Array(9).fill(46)).offsets).toHaveLength(SILL_MAX_ITEMS);
    const styles = sillLayout([46, 60, 46], 1);
    expect(styles.map((s) => s.zIndex)).toEqual([1, 2, 1]);
    expect(centre(styles[0]!)).toContain('min(1cqh');
    expect(sillSlotStyle(0, 3, 50, true).zIndex).toBe(2);
    expect(centre(sillSlotStyle(0, 99, 50))).toBe(centre(sillSlotStyle(0, SILL_MAX_ITEMS, 50)));
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
