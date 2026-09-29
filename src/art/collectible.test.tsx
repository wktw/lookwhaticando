// @vitest-environment jsdom
/** CollectibleArt (M1 art audit): pets fill their tiles, every tile takes the light, and "not yet" is a repaint. */
import { describe, expect, it } from 'vitest';
import { render } from 'preact';
import type { JSX } from 'preact';
import { NIGHT_LIGHT } from '@/art/light';
import { CollectibleArt } from '@/art/CollectibleArt';
import { artBounds } from '@/art/plants/svgBounds.testutil';
import { mutedInk, muteTree } from '@/art/muted';

function html(node: JSX.Element, read?: (host: HTMLElement) => void): string {
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(node, host);
  read?.(host);
  const out = host.innerHTML;
  render(null, host);
  host.remove();
  return out;
}

const fills = (s: string) => new Set([...s.matchAll(/fill="(#[0-9A-Fa-f]{3,6})"/g)].map((m) => m[1]!.toUpperCase()));

describe('CollectibleArt', () => {
  it('lets a tree frog fill its tile about as fully as a Rain Hat fills its own', () => {
    const share = (id: string) => {
      let w = 0;
      html(<CollectibleArt id={id} size={150} />, (host) => {
        const svg = host.querySelector('svg')!;
        const b = artBounds(svg);
        const [vx, , vw] = (svg.getAttribute('viewBox') ?? '0 0 100 100').split(/\s+/).map(Number);
        void vx;
        w = (b.x1 - b.x0) / vw!;
      });
      return w;
    };
    const frog = share('pet-frog-tree');
    expect(frog).toBeGreaterThan(0.55);
    // Off, the pet keeps its world size and is visibly smaller.
    let world = 0;
    html(<CollectibleArt id="pet-frog-tree" size={150} fit={false} />, (host) => {
      const b = artBounds(host.querySelector('svg')!);
      world = (b.x1 - b.x0) / 100;
    });
    expect(frog).toBeGreaterThan(world);
  });

  it('draws treats, decor, plants and pets in Lamplight when given the lamp', () => {
    for (const id of ['treat-carob-heart', 'decor-jam-jar', 'plant-begonia', 'pet-cat-calico']) {
      expect(html(<CollectibleArt id={id} size={48} light={NIGHT_LIGHT} />), id).not.toBe(html(<CollectibleArt id={id} size={48} light={{ from: 'left', night: false }} />));
    }
  });

  it('mutes every kind to the Field Guide’s 35% saturation, with no CSS filter', () => {
    for (const id of ['pet-dog-beagle', 'treat-carob-heart', 'decor-yarn-ball', 'plant-begonia', 'pot-blush']) {
      const plain = html(<CollectibleArt id={id} size={48} light={{ from: 'left', night: false }} />);
      const muted = html(<CollectibleArt id={id} size={48} muted light={{ from: 'left', night: false }} />);
      expect(muted, id).not.toContain('filter');
      expect(muted, id).not.toBe(plain);
      if (id.startsWith('pet-')) continue; // a pet mutes through its own palette (eyes and highlights keep theirs)
      // Everything the repaint would change in the plain drawing is gone from the muted one.
      const left = [...fills(plain)].filter((c) => fills(muted).has(c) && mutedInk(c).toUpperCase() !== c);
      expect(left, id).toEqual([]);
    }
  });

  it('mutes inside drawing components and keeps tokens', () => {
    const Dot = ({ c }: { c: string }) => <circle r={2} fill={c} />;
    const out = html(<svg>{muteTree(<g><Dot c="#E36A5E" /><path d="M0 0" fill="var(--shade)" /></g>)}</svg>);
    expect(out).not.toContain('#E36A5E');
    expect(out).toContain('var(--shade)');
  });
});
