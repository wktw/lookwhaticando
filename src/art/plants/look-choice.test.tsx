// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from 'preact';
import { DAY_LIGHT } from '@/art/light';
import { PlantArt } from './PlantArt';
import type { BloomColour } from '@/state/types';

const colours: BloomColour[] = ['dawn', 'sunlit', 'twilight', 'wildflower'];
describe('the snake plant’s authored flower spike', () => {
  it.each(colours)('visibly changes the cream flowers for %s and preserves every leaf', (colour) => {
    const host = document.createElement('div');
    const paints = () => [...host.querySelectorAll('path')].map((p) => ({ d: p.getAttribute('d'), fill: p.getAttribute('fill'), stroke: p.getAttribute('stroke') }));
    render(<PlantArt species="snakeplant" stage={5} pot="terracotta" light={DAY_LIGHT} />, host);
    const classic = paints();
    const flowers = classic.filter((p) => p.fill === '#F6EBCF');
    expect(flowers.length).toBeGreaterThan(0);
    render(<PlantArt species="snakeplant" stage={5} pot="terracotta" light={DAY_LIGHT} look={{ colour, shape: 'classic' }} />, host);
    const changed = paints();
    for (const flower of flowers) expect(changed.find((p) => p.d === flower.d)?.fill).not.toBe(flower.fill);
    expect(changed.filter((p) => !flowers.some((f) => f.d === p.d))).toEqual(classic.filter((p) => !flowers.some((f) => f.d === p.d)));
    render(null, host);
  });
});
