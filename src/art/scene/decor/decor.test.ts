// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { DECOR } from '@/catalog';
import { DAY_LIGHT, NIGHT_LIGHT, type Light } from '@/art/light';
import { DECOR_ART } from '@/art/items/decor';
// Treats and the placeholder share the crescent table, so their shapes must be registered too.
import '@/art/items';
import { artBounds } from '@/art/plants/svgBounds.testutil';
import { DECOR_ENTRIES, decorFootprint } from './index';
import { CRESCENT_OFFSET, LAMP, LIGHT_ORDER, SHAPES, contact, nightTone, paint, shapeHash, warmBandOf } from './kit';
import { SHADE } from './shade.gen';
import { ell, poly, rect, smooth, star } from './geo';
import { SYMMETRIC_SHADE, artProblems, mount, pathDataError, pathsFilled, shadeCentreX } from './artCheck.testutil';

const LIGHTS: Light[] = [DAY_LIGHT, { from: 'top', night: false }, { from: 'right', night: false }, NIGHT_LIGHT];
const catalogIds = DECOR.map((d) => d.id).sort();

describe('decor contract', () => {
  it('has art, bounds and a footprint for every catalog item, by day and by night', () => {
    for (const d of DECOR) {
      const entry = DECOR_ENTRIES[d.id];
      expect(entry, d.id).toBeDefined();
      expect(decorFootprint(d.id), d.id).toBeGreaterThan(0);
      expect(entry!.bounds[0], d.id).toBeLessThan(entry!.bounds[1]);
      expect(entry!.art(), d.id).toBeTruthy();
      expect(entry!.art({ night: true, line: 0.5 }), d.id).toBeTruthy();
      expect(DECOR_ART[d.id]!(), d.id).toBeTruthy();
    }
  });

  it('holds exactly the catalog decor: no Meadow-era entries or fields remain', () => {
    expect(Object.keys(DECOR_ENTRIES).sort()).toEqual(catalogIds);
    for (const [id, entry] of Object.entries(DECOR_ENTRIES)) {
      expect(entry.sky, id).toBeUndefined();
      expect(entry.tied, id).toBeUndefined();
    }
  });

  it('hangs the sky-slot decor from the window, and nothing else', () => {
    for (const d of DECOR) expect(DECOR_ENTRIES[d.id]!.hang === 'window', d.id).toBe(d.slot === 'sky');
  });

  it('lets pets stand on the flat things', () => {
    const flat = Object.entries(DECOR_ENTRIES)
      .filter(([, e]) => e.flat)
      .map(([id]) => id)
      .sort();
    expect(flat).toEqual(['decor-lily-pad', 'decor-stepping-stones']);
  });

  it('gives every light source a warm glow at night, on its canvas', () => {
    const glowing = Object.entries(DECOR_ENTRIES)
      .filter(([, e]) => e.glow)
      .map(([id]) => id)
      .sort();
    expect(glowing).toEqual(['decor-birthday-cake', 'decor-jack-lantern', 'decor-jam-jar', 'decor-moon-nightlight', 'decor-paper-star', 'decor-reading-lamp']);
    for (const id of glowing) {
      const [cx, cy, r] = DECOR_ENTRIES[id]!.glow!;
      expect(cx >= 0 && cx <= 100 && cy >= 0 && cy <= 100 && r > 0, id).toBe(true);
    }
  });

  it('keeps real proportions at capsule scale', () => {
    const size = (id: string) => decorFootprint(`decor-${id}`);
    // A matchbox bed is exactly one cat wide, and a sitting cat is 16 units tall.
    expect(size('matchbox-bed')).toBeGreaterThan(18);
    expect(size('matchbox-bed')).toBeLessThan(30);
    expect(size('tennis-ball')).toBeLessThan(size('yarn-ball'));
    expect(size('teacup-bath')).toBeLessThan(size('copper-kettle'));
    expect(size('beach-umbrella')).toBeGreaterThan(size('paper-umbrella'));
    // The 365-day Window Seat is the largest thing on the shelf.
    for (const d of DECOR) if (d.id !== 'decor-window-seat') expect(size('window-seat'), d.id).toBeGreaterThan(decorFootprint(d.id));
    for (const d of DECOR) expect(decorFootprint(d.id), d.id).toBeGreaterThanOrEqual(8);
  });

  it('keeps each drawing on its canvas, with bounds that fit it closely', () => {
    for (const [id, entry] of Object.entries(DECOR_ENTRIES)) {
      let [x0, x1] = [Infinity, -Infinity];
      for (const light of LIGHTS.slice(0, 3)) {
        const { svg, done } = mount(entry.art({ light }));
        const b = artBounds(svg, { stroked: true });
        done();
        expect(b.x0 >= entry.bounds[0] - 0.5 && b.x1 <= entry.bounds[1] + 0.5, `${id} ${light.from}: ${b.x0.toFixed(1)}…${b.x1.toFixed(1)}`).toBe(true);
        expect(b.y0 >= 0 && b.y1 <= 100, `${id} ${light.from}: y ${b.y0.toFixed(1)}…${b.y1.toFixed(1)}`).toBe(true);
        [x0, x1] = [Math.min(x0, b.x0), Math.max(x1, b.x1)];
      }
      expect(x0 - entry.bounds[0] < 3 && entry.bounds[1] - x1 < 3, `${id} bounds are loose: art ${x0.toFixed(1)}…${x1.toFixed(1)}`).toBe(true);
    }
  });
});

describe('decor art language', () => {
  it('uses no filters, masks, clip paths, outlines or broken path data, in any light', () => {
    for (const [id, entry] of Object.entries(DECOR_ENTRIES)) {
      for (const light of LIGHTS) {
        const { svg, done } = mount(entry.art({ light, night: light.night }));
        expect(artProblems(svg), `${id} ${light.from}${light.night ? ' night' : ''}`).toEqual([]);
        done();
      }
    }
  });

  it('puts the shade crescent on the side away from the light, item by item', () => {
    const wrong: string[] = [];
    for (const [id, entry] of Object.entries(DECOR_ENTRIES)) {
      const left = mount(entry.art({ light: DAY_LIGHT }));
      const right = mount(entry.art({ light: { from: 'right', night: false } }));
      const l = pathsFilled(left.svg, 'var(--shade)');
      expect(l.length, `${id} has crescents`).toBeGreaterThan(0);
      expect(l.join(''), `${id} crescents move with the light`).not.toEqual(pathsFilled(right.svg, 'var(--shade)').join(''));
      // Crescents sit on the far edge: right of where they sit in light from the right.
      if (!SYMMETRIC_SHADE[id] && !(shadeCentreX(left.svg) > shadeCentreX(right.svg))) wrong.push(id);
      left.done();
      right.done();
    }
    expect(wrong).toEqual([]);
  });

  it('lights a mirrored item as if the light came from the other side', () => {
    for (const [id, entry] of Object.entries(DECOR_ENTRIES)) {
      const mirrored = mount(entry.art({ light: DAY_LIGHT, facing: 'left' }));
      const rightLit = mount(entry.art({ light: { from: 'right', night: false } }));
      expect(mirrored.html, id).toEqual(rightLit.html);
      mirrored.done();
      rightLit.done();
    }
    const top = mount(DECOR_ART['decor-copper-kettle']!({ light: { from: 'top', night: false }, facing: 'left' }));
    const plainTop = mount(DECOR_ART['decor-copper-kettle']!({ light: { from: 'top', night: false } }));
    expect(top.html).toEqual(plainTop.html);
    top.done();
    plainTop.done();
    expect(paint({ light: DAY_LIGHT, facing: 'left' })).toMatchObject({ from: 'right', i: 2, away: -1 });
    expect(paint({ light: NIGHT_LIGHT, facing: 'left' })).toMatchObject({ from: 'left', i: 0, night: true });
  });

  it('warms the lamp side of every solid shape at night, and only at night', () => {
    for (const [id, entry] of Object.entries(DECOR_ENTRIES)) {
      const night = mount(entry.art({ light: NIGHT_LIGHT }));
      const day = mount(entry.art({ light: DAY_LIGHT }));
      // The paper moon and star are themselves the light: they glow all over rather than taking a band.
      if (id !== 'decor-moon-nightlight' && id !== 'decor-paper-star') expect(pathsFilled(night.svg, LAMP).length, id).toBeGreaterThan(0);
      expect(pathsFilled(day.svg, LAMP), id).toEqual([]);
      night.done();
      day.done();
    }
    // The band is the crescent the opposite light would cast: on the lamp's side.
    const s = SHAPES.get('decor-milk-can/body')!;
    expect(warmBandOf(paint({ light: NIGHT_LIGHT }), s)).toBe(SHADE[s.ref]!.c![0]);
    expect(warmBandOf(paint({ light: DAY_LIGHT }), s)).toBeUndefined();
  });

  it('draws the lamplight version darker, with lit light sources glowing', () => {
    for (const [id, entry] of Object.entries(DECOR_ENTRIES)) {
      const day = mount(entry.art({ light: DAY_LIGHT }));
      const night = mount(entry.art({ light: NIGHT_LIGHT, night: true }));
      expect(night.html, id).not.toEqual(day.html);
      expect(night.svg.querySelector('radialGradient') !== null, `${id} glows`).toBe(!!entry.glow);
      expect(day.svg.querySelector('radialGradient'), `${id} by day`).toBeNull();
      day.done();
      night.done();
    }
  });

  it('follows light.night when only a light is given (the icon view)', () => {
    const night = mount(DECOR_ART['decor-jam-jar']!({ light: NIGHT_LIGHT }));
    const day = mount(DECOR_ART['decor-jam-jar']!());
    expect(night.svg.querySelector('radialGradient')).not.toBeNull();
    expect(day.svg.querySelector('radialGradient')).toBeNull();
    night.done();
    day.done();
  });
});

describe('precomputed crescents', () => {
  it('are fresh for every registered shape (rebuild with tools/build-shade.mjs when this fails)', () => {
    const stale = [...SHAPES.values()].filter((s) => SHADE[s.ref]?.h !== shapeHash(s)).map((s) => s.ref);
    expect(stale).toEqual([]);
  });

  it('hold a crescent per light for every shaded shape, a rim for every dark one, and a trim for every clipped one', () => {
    for (const s of SHAPES.values()) {
      const row = SHADE[s.ref]!;
      if (s.k !== 0) expect(row.c?.length, s.ref).toBe(LIGHT_ORDER.length);
      else expect(row.c, s.ref).toBeUndefined();
      if (s.rim) expect(row.r?.length, s.ref).toBe(LIGHT_ORDER.length);
      if (s.clip) expect(row.d, s.ref).toBeTruthy();
      for (const d of [...(row.c ?? []), ...(row.r ?? []), ...(row.d ? [row.d] : [])].filter(Boolean)) expect(pathDataError(d), s.ref).toBeNull();
    }
  });

  it('carry no rows for shapes that no longer exist', () => {
    expect(Object.keys(SHADE).filter((ref) => !SHAPES.has(ref))).toEqual([]);
  });

  it('are nudged toward the light: from the left the offset points left, from the right it points right', () => {
    expect(CRESCENT_OFFSET.left[0]).toBeLessThan(0);
    expect(CRESCENT_OFFSET.right[0]).toBeGreaterThan(0);
    expect(CRESCENT_OFFSET.top[0]).toBe(0);
    for (const from of LIGHT_ORDER) expect(CRESCENT_OFFSET[from][1], from).toBeLessThan(0);
  });
});

describe('drawing kit', () => {
  it('builds valid path data', () => {
    for (const d of [
      ell(50, 50, 20, 10, 30),
      rect(10, 10, 30, 20, 4),
      rect(0, 0, 10, 10, [2, 0, 3, 0]),
      poly(
        [
          [0, 0],
          [10, 0],
          [5, 8],
        ],
        1,
      ),
      smooth([
        [0, 0],
        [10, 0],
        [10, 10],
      ]),
      star(50, 50, 30, 12),
    ]) {
      expect(pathDataError(d), d).toBeNull();
    }
    expect(pathDataError('M0 0Q1 1Q2 2')).not.toBeNull();
  });

  it('tones surfaces toward the lamplit room and keeps light sources as they are', () => {
    const lum = (hex: string) => {
      const v = parseInt(hex.slice(1), 16);
      return ((v >> 16) & 255) * 0.3 + ((v >> 8) & 255) * 0.59 + (v & 255) * 0.11;
    };
    expect(nightTone('#F6A6A2')).toMatch(/^#[0-9a-f]{6}$/);
    expect(lum(nightTone('#F6A6A2'))).toBeLessThan(lum('#F6A6A2'));
    expect(paint().c('#F6A6A2')).toBe('#F6A6A2');
    expect(paint({ night: true }).c('#F6A6A2')).toBe(nightTone('#F6A6A2'));
  });

  it('reads the light: defaults to the window from the left, and night follows the light', () => {
    expect(paint()).toMatchObject({ from: 'left', night: false, away: 1, i: 0 });
    expect(paint({ light: NIGHT_LIGHT })).toMatchObject({ from: 'right', night: true, away: -1, i: 2 });
    expect(paint({ night: true })).toMatchObject({ from: 'right', night: true });
    expect(paint({ light: { from: 'top', night: false } })).toMatchObject({ away: 0, i: 1 });
    expect(paint({ line: 0.5 }).w(2)).toBe(1);
  });

  it('slides the contact shadow away from the light and keeps it on the canvas', () => {
    const at = (light: Light) => {
      const { svg, done } = mount(contact(paint({ light }), 50, 90, 30));
      const cx = Number(svg.querySelector('ellipse')!.getAttribute('cx'));
      done();
      return cx;
    };
    expect(at(DAY_LIGHT)).toBeGreaterThan(50);
    expect(at({ from: 'right', night: false })).toBeLessThan(50);
    expect(at({ from: 'top', night: false })).toBe(50);
    const { svg, done } = mount(contact(paint(), 96, 90, 30));
    const e = svg.querySelector('ellipse')!;
    expect(Number(e.getAttribute('cx')) + Number(e.getAttribute('rx'))).toBeLessThanOrEqual(99.5);
    done();
  });
});
