// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { render } from 'preact';
import { PlantArt } from '@/art/plants';
import { BLOOM_EVENTS, BLOOM_LINES } from '@/catalog/lines';

it('strawberry Blooming text describes its stage-five flowers, before berries appear', () => {
  const host = document.createElement('div');
  const berry = 'M0 0C2.6 0 3.4 1.8 3.2 3.4C2.9 5.6 1.4 7.4 0 7.8C-1.4 7.4 -2.9 5.6 -3.2 3.4C-3.4 1.8 -2.6 0 0 0Z';
  for (const progress of [0, 0.99]) {
    render(<PlantArt species="strawberry" stage={5} progress={progress} pot="terracotta" />, host);
    expect(Array.from(host.querySelectorAll('path')).filter((p) => p.getAttribute('d') === berry)).toHaveLength(0);
  }
  render(<PlantArt species="strawberry" stage={6} progress={0} pot="terracotta" />, host);
  expect(Array.from(host.querySelectorAll('path')).some((p) => p.getAttribute('d') === berry)).toBe(true);
  render(null, host);
  expect(`${BLOOM_EVENTS.strawberry} ${BLOOM_LINES.strawberry}`).not.toContain('berries');
});
