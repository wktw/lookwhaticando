// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from 'preact';
import { MACHINES } from '@/catalog/machines';
import { DAY_LIGHT, NIGHT_LIGHT, type Light } from '@/art/light';
import { CabinetArt, cabinetWords, untilLabel } from './CabinetArt';
import { CapsuleArt, OpenCapsuleArt, finishOf, type CapsuleFinish } from './CapsuleArt';
import { band, lowerMoon, moon } from './crescent';
import { BODY, GLASS, rectPath } from './geometry';
import { lighting } from './lighting';

const LIGHTS: Light[] = [DAY_LIGHT, { from: 'top', night: false }, { from: 'right', night: false }, NIGHT_LIGHT];

function draw(ui: preact.ComponentChild): SVGSVGElement {
  const host = document.createElement('div');
  render(ui, host);
  return host.querySelector('svg')!;
}

/** Every number in a path is finite, and it closes. */
function wellFormed(d: string) {
  expect(d).toMatch(/^M/);
  expect(d.trim()).toMatch(/Z$/);
  for (const n of d.match(/-?\d*\.?\d+(e-?\d+)?/g) ?? []) expect(Number.isFinite(Number(n)), d).toBe(true);
}

describe('crescent geometry', () => {
  it('bands are closed paths on the side asked for', () => {
    for (const side of ['left', 'right', 'under', 'over'] as const) {
      for (const w of [2, 7, 30]) wellFormed(band(BODY, side, w));
    }
    // A right band of a body lives in its right-hand strip; a left band in its left.
    const xs = (d: string) => (d.match(/[ML]\s*-?[\d.]+/g) ?? []).map((m) => Number(m.slice(1)));
    expect(Math.min(...xs(band(BODY, 'right', 7)))).toBeGreaterThanOrEqual(BODY.x + BODY.w - 7 - 0.01);
    expect(Math.max(...xs(band(BODY, 'left', 7)))).toBeLessThanOrEqual(BODY.x + 7 + 0.01);
  });

  it('moons sit on the side away from the light', () => {
    const d = moon(0, 0, 10, [-1, 0], 4);
    wellFormed(d);
    // Starting on the perpendicular bisector, left of centre, the crescent sweeps round the right.
    expect(d.startsWith('M-2 ')).toBe(true);
    for (const side of ['left', 'right', 'under'] as const) wellFormed(lowerMoon(40, side, 9));
  });

  it('are memoised: the same shape is the same string object', () => {
    expect(band(GLASS, 'right', 5)).toBe(band(GLASS, 'right', 5));
    expect(moon(3, 4, 5, [1, 0], 2)).toBe(moon(3, 4, 5, [1, 0], 2));
  });

  it('the shade side follows the light, and flips for the lamp', () => {
    expect(lighting(DAY_LIGHT).side).toBe('right');
    expect(lighting({ from: 'right', night: false }).side).toBe('left');
    expect(lighting({ from: 'top', night: false }).side).toBe('under');
    expect(lighting(NIGHT_LIGHT).side).toBe('left');
    expect(lighting(NIGHT_LIGHT).rim).not.toBeNull();
  });
});

describe('the cabinet art', () => {
  // Every series in one light, and one series in every light (the palette is per series, the
  // geometry per light), rather than the full product, which is slow under a loaded test run.
  const CASES = [...MACHINES.map((m) => [m, DAY_LIGHT] as const), ...LIGHTS.slice(1).map((l) => [MACHINES[6]!, l] as const)];

  it('every series draws in every light: flat shapes, no filters, masks or clipping', () => {
    for (const [m, light] of CASES) {
      {
        const svg = draw(<CabinetArt machine={m} light={light} title={m.name} />);
        expect(svg.getAttribute('role')).toBe('img');
        expect(svg.querySelectorAll('filter, mask, clipPath, [filter], [mask], [clip-path]')).toHaveLength(0);
        expect(svg.querySelectorAll('linearGradient, radialGradient')).toHaveLength(0);
        // Strokes only for genuinely thin things: the printed arrow, a tag's thread.
        for (const el of svg.querySelectorAll('[stroke]')) expect(Number(el.getAttribute('stroke-width')), m.id).toBeLessThanOrEqual(1.6);
        // Twenty capsules behind the glass, each a shell, a crescent and a glint.
        expect(svg.querySelectorAll('.window-capsules > g')).toHaveLength(20);
        expect(svg.textContent).toContain(cabinetWords(m).label);
      }
    }
  }, 20_000);

  it('gives the capsules in a cabinet a thin lit-side arc, not a glossy white glint', () => {
    for (const light of LIGHTS) {
      const svg = draw(<CabinetArt machine={MACHINES[0]!} light={light} />);
      const pile = svg.querySelector('symbol[id$="-glint"]')!;
      expect(pile.querySelector('ellipse')).toBeNull();
      expect(pile.querySelector('path')!.getAttribute('fill')).toBe('none');
      // The close-up glint is there for the one capsule in the chute, never used by the pile itself.
      expect(svg.querySelector('symbol[id$="-glint-close"] ellipse')).not.toBeNull();
      for (const u of svg.querySelectorAll('.window-capsules use')) expect(u.getAttribute('href')).not.toMatch(/glint-close$/);
    }
  });

  it('keeps the glint for a capsule in close-up, and drops it below 120 px', () => {
    expect(draw(<CapsuleArt finish="rare" color="#DDD4F1" size={130} />).querySelector('.cap-glint')).not.toBeNull();
    expect(draw(<CapsuleArt finish="rare" color="#DDD4F1" size={64} />).querySelector('.cap-glint')).toBeNull();
    expect(draw(<CapsuleArt finish="rare" color="#DDD4F1" size="100%" />).querySelector('.cap-glint')).not.toBeNull();
  });

  it('warms the side facing the lamp at night, and only at night', () => {
    const count = (light: Light) => draw(<CabinetArt machine={MACHINES[0]!} light={light} />).querySelectorAll('path[fill]').length;
    // Three lamp-side bands (body, plinth, bezel) at night.
    expect(count(NIGHT_LIGHT) - count({ from: 'right', night: false })).toBe(3);
    const L = lighting(NIGHT_LIGHT);
    expect(L.lampSide).not.toBeNull();
    expect(lighting(DAY_LIGHT).lampSide).toBeNull();
    // A pastel capsule tint dims less than a painted surface.
    expect(L.tint('#F5CDD6')).not.toBe(L.lit('#F5CDD6'));
  });

  it('prints no price when asked (a free first capsule), and drops the fine print when small', () => {
    const m = MACHINES.find((x) => x.id === 'cows')!;
    expect(draw(<CabinetArt machine={m} />).querySelector('.cabinet-price')?.textContent).toContain(String(m.price));
    expect(draw(<CabinetArt machine={m} price={null} />).querySelector('.cabinet-price')).toBeNull();
    const small = draw(<CabinetArt machine={m} height={64} />);
    expect(small.classList.contains('is-low')).toBe(true);
    expect(small.querySelector('.cabinet-plate, .cabinet-price, .cabinet-name, .cabinet-glass')).toBeNull();
    expect(small.querySelectorAll('.window-capsules > g').length).toBeLessThanOrEqual(6);
    expect(draw(<CabinetArt machine={m} height={120} />).classList.contains('is-low')).toBe(false);
  });

  it('a stamp cabinet prints a stamp on its price chip, not a check mark', () => {
    const night = MACHINES.find((x) => x.currency === 'stars')!;
    const chip = draw(<CabinetArt machine={night} />).querySelector('.cabinet-price')!;
    expect(chip.querySelectorAll('[stroke]')).toHaveLength(0);
  });

  it('prints the number plate, and a seasonal edition gets its paper tag', () => {
    expect(cabinetWords(MACHINES.find((m) => m.id === 'cows')!)).toEqual({ plate: 'No. 02', label: 'Cows' });
    const autumn = MACHINES.find((m) => m.id === 'autumn')!;
    expect(cabinetWords(autumn)).toEqual({ plate: 'Seasonal', label: 'Autumn' });
    expect(untilLabel(autumn)).toBe('until Nov 10');
    expect(draw(<CabinetArt machine={autumn} />).textContent).toContain('until Nov 10');
    expect(draw(<CabinetArt machine={MACHINES[0]!} />).querySelector('.cabinet-tag')).toBeNull();
  });

  it('is decorative without a title', () => {
    expect(draw(<CabinetArt machine={MACHINES[0]!} />).getAttribute('aria-hidden')).toBe('true');
  });

  it('the body keeps its openings as holes, not clips', () => {
    const svg = draw(<CabinetArt machine={MACHINES[0]!} />);
    const body = Array.from(svg.querySelectorAll('path')).find((p) => p.getAttribute('d')?.startsWith(rectPath(BODY)));
    expect(body?.getAttribute('fill-rule')).toBe('evenodd');
  });
});

describe('the capsule art', () => {
  it('maps tiers onto finishes, with the Secret its own', () => {
    expect(finishOf('common')).toBe('classic');
    expect(finishOf('uncommon')).toBe('special');
    expect(finishOf('rare')).toBe('rare');
    expect(finishOf('ultra')).toBe('super');
    expect(finishOf('ultra', true)).toBe('secret');
  });

  it('draws every finish closed, cracked, parting and opened, without filters or gradients', () => {
    const finishes: CapsuleFinish[] = ['classic', 'special', 'rare', 'super', 'secret'];
    for (const f of finishes) {
      for (const light of LIGHTS) {
        for (const svg of [
          draw(<CapsuleArt finish={f} color="#F5CDD6" color2="#D2E4F2" machineId="cows" light={light} cracks={f === 'secret' ? 2 : 0} />),
          draw(<CapsuleArt finish={f} color="#F5CDD6" state="parting" light={light} />),
          draw(<OpenCapsuleArt finish={f} color="#F5CDD6" light={light} />),
        ]) {
          expect(svg.querySelectorAll('filter, mask, clipPath, linearGradient, radialGradient')).toHaveLength(0);
          // Filled shapes close; the one stroke is the thin highlight on the dome's lit edge.
          for (const p of svg.querySelectorAll('path:not([fill="none"])')) wellFormed(p.getAttribute('d') ?? 'M0 0Z');
          for (const p of svg.querySelectorAll('path[fill="none"]')) expect(Number(p.getAttribute('stroke-width'))).toBeLessThanOrEqual(1);
        }
      }
    }
  }, 20_000);

  it('shows the figure through the clear half, standing on its insert, under the clear half', () => {
    const svg = draw(<CapsuleArt finish="classic" color="#F5CDD6" figure={<rect class="fig" width={100} height={100} />} figureInk="#8F3550" />);
    const figure = svg.querySelector('.cap-inside .cap-figure');
    expect(figure?.querySelector('.fig')).not.toBeNull();
    expect((figure as SVGGElement).style.getPropertyValue('--cap-figure-ink').toLowerCase()).toBe('#8f3550');
    // Drawn before the clear half, so the plastic lies over it.
    const order = Array.from(svg.querySelectorAll('.cap-inside, .cap-top'));
    expect(order.map((g) => g.getAttribute('class'))).toEqual(['cap-inside', 'cap-top']);
    // Without a figure (a Secret), the insert alone.
    expect(draw(<CapsuleArt finish="secret" color="#F5CDD6" />).querySelector('.cap-figure')).toBeNull();
  });

  it('keeps the shade crescent below the seam bar', () => {
    for (const side of ['left', 'right', 'under'] as const) {
      const d = lowerMoon(40, side, 9, 1.8);
      wellFormed(d);
      // The y of every point the outline passes through (M, L and arc end points).
      const ys = [...d.matchAll(/([MLA])([^MLHAVZ]+)/g)].map((m) => Number(m[2]!.trim().split(/[\s,]+/).at(-1)));
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(1.8);
    }
  });

  it('the Secret shows its seam opening one step per tap', () => {
    const crack = (n: number) => draw(<CapsuleArt finish="secret" color="#F5CDD6" cracks={n} />).querySelector('.cap-crack');
    expect(crack(0)).toBeNull();
    const h = [1, 2, 3].map((n) => Number(crack(n)!.getAttribute('height')));
    expect(h[0]).toBeLessThan(h[1]!);
    expect(h[1]).toBeLessThan(h[2]!);
  });
});
