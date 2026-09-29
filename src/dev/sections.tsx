import type { JSX } from 'preact';
import { PETS, WEARABLES } from '@/catalog/collectibles';
import { PetArt } from '@/art/pets/PetArt';
import type { Expression } from '@/art/pets/types';

export interface GallerySection {
  id: string;
  title: string;
  render: (params: URLSearchParams) => JSX.Element;
}

const EXPRESSIONS: Expression[] = ['idle', 'happy', 'sleep', 'love', 'eat', 'surprised', 'wink'];

/**
 * Art modules register their gallery sections here. Keep each section self-contained.
 */
export const GALLERY_SECTIONS: GallerySection[] = [
  {
    id: 'mascot',
    title: 'Mochi: expressions',
    render: () => (
      <div class="gal-row">
        {EXPRESSIONS.map((e) => (
          <div class="gal-cell" key={e}>
            <PetArt petId="pet-mochi" expression={e} size={150} animated />
            <small>{e}</small>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'pets',
    title: 'Pets (all variants)',
    render: (params) => {
      const expr = (params.get('expr') as Expression) || 'idle';
      return (
        <div class="gal-grid">
          {PETS.map((p) => (
            <div class="gal-cell" key={p.id}>
              <PetArt petId={p.id} size={130} expression={expr} animated />
              <b>{p.name}</b>
              <small>
                {p.species} · {p.rarity} · {p.source}
              </small>
            </div>
          ))}
        </div>
      );
    },
  },
  {
    id: 'wearables',
    title: 'Wearables on every species',
    render: () => {
      const bases = ['pet-mochi', 'pet-cow-holstein', 'pet-bunny-white', 'pet-frog-green', 'pet-bear-brown', 'pet-hamster-golden', 'pet-duck-yellow'];
      return (
        <div class="gal-grid">
          {WEARABLES.map((w) => (
            <div class="gal-cell" key={w.id} style={{ gridColumn: 'span 3' }}>
              <div class="gal-row" style={{ gap: '2px' }}>
                {bases.map((b) => (
                  <PetArt key={b} petId={b} size={62} outfit={{ [w.slot]: w.id }} shadow={false} />
                ))}
              </div>
              <b>{w.name}</b>
              <small>
                {w.slot} · {w.rarity} · {w.source}
              </small>
            </div>
          ))}
        </div>
      );
    },
  },
];
