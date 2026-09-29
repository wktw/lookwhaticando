// @vitest-environment jsdom
/**
 * Generates `iconFrames.ts` (skipped unless GEN_ICON_FRAMES is set):
 *   GEN_ICON_FRAMES=1 npx vitest run src/art/plants/iconFrames.gen.test.tsx
 * For each species and stage it takes the union of the painted bounds over every pot, light, progress and bloom
 * count, and pads it to a square whose bottom sits just under the contact shadow.
 */
import { describe, it } from 'vitest';
import { render } from 'preact';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PlantSpeciesId, PotId } from '@/catalog/types';
import { DAY_LIGHT, NIGHT_LIGHT, type Light } from '@/art/light';
import { MAX_BLOOMS, PlantArt, PLANT_SPECIES_WITH_ART, POTS_WITH_ART } from '@/art/plants';
import { artBounds, type Box } from './svgBounds.testutil';

const LIGHTS: Light[] = [DAY_LIGHT, { from: 'top', night: false }, { from: 'right', night: false }, NIGHT_LIGHT];
/** Room around the painted bounds, in canvas units. */
const PAD = 1;

function bounds(species: PlantSpeciesId, stage: number, pot: PotId, light: Light, progress: number, blooms: number): Box {
  const host = document.createElement('div');
  render(<PlantArt species={species} stage={stage} progress={progress} blooms={blooms} pot={pot} light={light} fit="icon" />, host);
  const b = artBounds(host.querySelector('svg')!, { stroked: true, sampled: true });
  render(null, host);
  return b;
}

export function frameFor(b: Box): [number, number, number] {
  const side = Math.min(100, Math.max(b.x1 - b.x0, b.y1 - b.y0) + PAD * 2);
  const cx = (b.x0 + b.x1) / 2;
  const y1 = Math.min(100, b.y1 + PAD);
  const r = (n: number) => Math.round(n * 10) / 10;
  return [r(cx - side / 2), r(y1 - side), r(side)];
}

describe.skipIf(!process.env.GEN_ICON_FRAMES)('icon frames', () => {
  it('writes iconFrames.ts', () => {
    const rows: string[] = [];
    for (const species of PLANT_SPECIES_WITH_ART) {
      const frames: string[] = [];
      for (let stage = 0; stage <= 7; stage++) {
        const pots = stage <= 1 ? (['terracotta'] as PotId[]) : [...POTS_WITH_ART];
        let u: Box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
        const add = (b: Box) => (u = { x0: Math.min(u.x0, b.x0), y0: Math.min(u.y0, b.y0), x1: Math.max(u.x1, b.x1), y1: Math.max(u.y1, b.y1) });
        for (const pot of pots) add(bounds(species, stage, pot, DAY_LIGHT, 0.999, MAX_BLOOMS));
        for (const light of LIGHTS) for (const blooms of [0, MAX_BLOOMS]) for (const progress of [0, 0.999]) add(bounds(species, stage, 'terracotta', light, progress, blooms));
        frames.push(`[${frameFor(u).join(', ')}]`);
      }
      rows.push(`  ${species}: [${frames.join(', ')}],`);
    }
    const file = resolve(process.cwd(), 'src/art/plants/iconFrames.ts');
    const src = readFileSync(file, 'utf8').replace(/export const ICON_FRAMES[^;]*;/s, `export const ICON_FRAMES: Readonly<Record<PlantSpeciesId, Frames>> = {\n${rows.join('\n')}\n};`);
    writeFileSync(file, src);
  }, 300_000);
});
