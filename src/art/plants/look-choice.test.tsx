// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from 'preact';
import { DAY_LIGHT } from '@/art/light';
import { PlantArt } from './PlantArt';
import type { BloomColour } from '@/state/types';

const colours: BloomColour[] = ['dawn', 'sunlit', 'twilight', 'wildflower'];
describe.each(['snakeplant', 'begonia'] as const)('the %s’s authored flowers', (species) => {
  it.each(colours)('visibly changes the flowers for %s and preserves every leaf', (colour) => {
    const host = document.createElement('div');
    const paints = () => [...host.querySelectorAll('path, ellipse, circle')].map((p) => ({ shape: p.outerHTML.replace(/(fill|stroke)="[^"]*"/g, ''), fill: p.getAttribute('fill'), stroke: p.getAttribute('stroke') }));
    render(<PlantArt species={species} stage={5} pot="terracotta" light={DAY_LIGHT} />, host);
    const classic = paints();
    const flowers = classic.filter((p) => (species === 'snakeplant' ? ['#F6EBCF'] : ['#FCEEF1', '#F5CBD5', '#F0B9C6']).includes(p.fill ?? ''));
    expect(flowers.length).toBeGreaterThan(0);
    render(<PlantArt species={species} stage={5} pot="terracotta" light={DAY_LIGHT} look={{ colour, shape: 'classic' }} />, host);
    const changed = paints();
    expect(changed).toHaveLength(classic.length);
    classic.forEach((paint, i) => {
      if (flowers.includes(paint)) { expect(changed[i]!.fill).not.toBe(paint.fill); expect(changed[i]!.shape).toBe(paint.shape); }
      else expect(changed[i]).toEqual(paint);
    });
    render(null, host);
  });
});
