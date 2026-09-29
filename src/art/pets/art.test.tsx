// @vitest-environment jsdom
/**
 * Smoke test for the pet art system: every pet in every expression, every wearable on every
 * species, and every wearable icon renders without errors and without NaN/undefined geometry.
 */
import { describe, expect, it } from 'vitest';
import { render, type ComponentChild } from 'preact';
import { PETS, WEARABLES } from '@/catalog/collectibles';
import { SPECIES, type Species } from '@/catalog/types';
import { PetArt } from './PetArt';
import { BODIES, ANCHORS } from './geometry';
import { outlinePoints } from './outline';
import type { Expression } from './types';
import { WEARABLE_ART } from '../wearables';

const EXPRESSIONS: Expression[] = ['idle', 'happy', 'sleep', 'love', 'eat', 'surprised', 'wink'];

function markup(node: ComponentChild): string {
  const host = document.createElement('div');
  render(node, host);
  const html = host.innerHTML;
  render(null, host);
  return html;
}

function expectClean(html: string, label: string) {
  expect(html, label).not.toMatch(/NaN|undefined|Infinity/);
  expect(html.length, label).toBeGreaterThan(200);
}

describe('pet art rendering', () => {
  it('renders every pet in every expression', () => {
    for (const p of PETS) {
      for (const e of EXPRESSIONS) expectClean(markup(<PetArt petId={p.id} expression={e} animated />), `${p.id} ${e}`);
    }
  });

  it('fits every wearable on every species', () => {
    const models: Record<Species, string> = Object.fromEntries(SPECIES.map((s) => [s, PETS.find((p) => p.species === s)!.id])) as Record<Species, string>;
    for (const w of WEARABLES) {
      for (const s of SPECIES) expectClean(markup(<PetArt petId={models[s]} outfit={{ [w.slot]: w.id }} />), `${w.id} on ${s}`);
    }
  });

  it('draws every wearable icon', () => {
    for (const w of WEARABLES) expectClean(markup(<svg viewBox="0 0 100 100">{WEARABLE_ART[w.id]!.icon!()}</svg>), w.id);
  });

  it('renders a full outfit and a silhouette', () => {
    const outfit = { head: 'wear-witch-hat', face: 'wear-star-shades', neck: 'wear-knit-scarf', body: 'wear-tiny-backpack' };
    expectClean(markup(<PetArt petId="pet-bunny-lop" outfit={outfit} facing="left" />), 'outfit');
    expect(markup(<PetArt petId="pet-cat-lucky" silhouette />)).not.toContain('pet-aura');
  });

  it('draws Moonlit variants of every pet', () => {
    for (const p of PETS) expectClean(markup(<PetArt petId={`moonlit:${p.id}`} />), `moonlit ${p.id}`);
  });
});

describe('pet geometry', () => {
  it('half-width samplers match each body path', () => {
    for (const s of SPECIES) {
      const { path, halfWidthAt } = BODIES[s];
      const pts = outlinePoints(path, 3000);
      const top = Math.min(...pts.map(([, y]) => y));
      // The real half-width at y: the outermost crossing of the outline.
      const real = (y: number) => {
        let w = 0;
        pts.forEach(([x0, y0], i) => {
          const [x1, y1] = pts[(i + 1) % pts.length]!;
          if ((y0 - y) * (y1 - y) > 0 || y0 === y1) return;
          w = Math.max(w, Math.abs(x0 + ((x1 - x0) * (y - y0)) / (y1 - y0) - 50));
        });
        return w;
      };
      for (let y = top + 2; y <= 90; y += 0.5) {
        expect(Math.abs(halfWidthAt(y) - real(y)), `${s} at y=${y}`).toBeLessThanOrEqual(0.6);
      }
    }
  });

  it('keeps anchors inside each silhouette', () => {
    for (const s of SPECIES) {
      const a = ANCHORS[s];
      const hw = BODIES[s].halfWidthAt;
      expect(Math.abs(a.eyes.left - 50), s).toBeLessThan(hw(a.eyes.y));
      expect(Math.abs(a.neck.left - 50), s).toBeLessThanOrEqual(hw(a.neck.y) + 0.5);
      expect(a.body.top, s).toBe(a.neck.y);
    }
  });
});
