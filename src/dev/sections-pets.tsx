import { PETS, WEARABLES } from '@/catalog/collectibles';
import { SPECIES, type Species } from '@/catalog/types';
import { PetArt } from '@/art/pets/PetArt';
import { PATTERNS } from '@/art/pets/patterns';
import type { Expression, PatternId, PetLook } from '@/art/pets/types';
import { CollectibleArt } from '@/art/CollectibleArt';
import type { GallerySection } from './sections';

/**
 * Pets module gallery. Useful params: ?only=pets (all sections), &ids=pet-cow-moon,pet-cat-black
 * to focus pets, &size=260 to enlarge, &expr=happy, &facing=left, &slot=head to filter wearables.
 */

const EXPRESSIONS: Expression[] = ['idle', 'happy', 'sleep', 'love', 'eat', 'surprised', 'wink'];

/** One representative per species, used for the expression matrix and wearable fitting. */
const MODELS: Record<Species, string> = {
  cat: 'pet-cat-orange',
  cow: 'pet-cow-holstein',
  dog: 'pet-dog-shiba',
  bunny: 'pet-bunny-white',
  frog: 'pet-frog-green',
  bear: 'pet-bear-brown',
  hamster: 'pet-hamster-golden',
  duck: 'pet-duck-yellow',
};

function pickPets(params: URLSearchParams) {
  const ids = params.get('ids')?.split(',');
  return ids ? PETS.filter((p) => ids.includes(p.id)) : PETS;
}

function pickWearables(params: URLSearchParams) {
  const slot = params.get('slot');
  const ids = params.get('ids')?.split(',');
  return WEARABLES.filter((w) => (!slot || w.slot === slot) && (!ids || ids.includes(w.id)));
}

function patternLook(species: Species, pattern: PatternId): PetLook {
  return {
    species,
    pattern,
    palette: { body: '#FFF3E6', pattern: '#B48C80', pattern2: '#8FB8E8', belly: '#FFFFFF', earInner: '#FFC4D3', nose: '#F58CAA' },
  };
}

export const SECTIONS: GallerySection[] = [
  {
    id: 'pets-all',
    title: 'All pets · 130px, animated',
    render: (params) => {
      const size = Number(params.get('size') ?? 130);
      const expr = (params.get('expr') as Expression) || 'idle';
      const facing = params.get('facing') === 'left' ? 'left' : 'right';
      return (
        <div class="gal-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${size + 20}px, 1fr))` }}>
          {pickPets(params).map((p) => (
            <div class="gal-cell" key={p.id}>
              <PetArt petId={p.id} size={size} expression={expr} facing={facing} animated />
              <b>{p.name}</b>
              <small>
                {p.species} · {p.rarity}
              </small>
            </div>
          ))}
        </div>
      );
    },
  },
  {
    id: 'pets-small',
    title: 'All pets · 56px (collection grid)',
    render: (params) => (
      <div class="gal-row" style={{ gap: '10px' }}>
        {pickPets(params).map((p) => (
          <PetArt key={p.id} petId={p.id} size={56} title={p.name} />
        ))}
      </div>
    ),
  },
  {
    id: 'pets-moonlit',
    title: "Moonlit variants ('moonlit:<petId>', DESIGN §13.6)",
    render: (params) => (
      <div class="gal-row" style={{ gap: '8px' }}>
        {pickPets(params).map((p) => (
          <PetArt key={p.id} petId={`moonlit:${p.id}`} size={Number(params.get('size') ?? 80)} title={`Moonlit ${p.name}`} />
        ))}
      </div>
    ),
  },
  {
    id: 'pets-list',
    title: 'List view · 44px rows',
    render: (params) => (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '6px' }}>
        {pickPets(params).map((p) => (
          <li
            key={p.id}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--card)', borderRadius: '14px', padding: '4px 12px 4px 6px' }}
          >
            <PetArt petId={p.id} size={44} shadow={false} />
            <span style={{ display: 'grid', lineHeight: 1.2 }}>
              <b style={{ fontSize: '14px' }}>{p.defaultName}</b>
              <small style={{ fontSize: '12px', color: 'var(--ink-2)' }}>{p.name}</small>
            </span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    id: 'pets-expressions',
    title: 'Every species × every expression',
    render: (params) => {
      const size = Number(params.get('size') ?? 110);
      const only = params.get('species');
      return (
        <div style={{ display: 'grid', gap: '6px' }}>
          {SPECIES.filter((s) => !only || s === only).map((s) => (
            <div class="gal-row" key={s} style={{ gap: '6px', alignItems: 'center' }}>
              <small style={{ width: '60px' }}>{s}</small>
              {EXPRESSIONS.map((e) => (
                <PetArt key={e} petId={MODELS[s]} expression={e} size={size} />
              ))}
            </div>
          ))}
        </div>
      );
    },
  },
  {
    id: 'pets-patterns',
    title: 'Patterns on every species (faces stay clear)',
    render: () => (
      <div style={{ display: 'grid', gap: '4px' }}>
        {(Object.keys(PATTERNS) as PatternId[]).map((pattern) => (
          <div class="gal-row" key={pattern} style={{ gap: '4px', alignItems: 'center' }}>
            <small style={{ width: '90px' }}>{pattern}</small>
            {SPECIES.map((s) => (
              <PetArt key={s} petId={MODELS[s]} look={patternLook(s, pattern)} size={88} shadow={false} />
            ))}
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'pets-wearables',
    title: 'Every wearable on all 8 species',
    render: (params) => {
      const size = Number(params.get('size') ?? 72);
      return (
        <div style={{ display: 'grid', gap: '8px' }}>
          {pickWearables(params).map((w) => (
            <div class="gal-row" key={w.id} style={{ gap: '2px', alignItems: 'center' }}>
              <small style={{ width: '110px' }}>
                <b>{w.name}</b>
                <br />
                {w.slot} · {w.rarity}
              </small>
              {SPECIES.map((s) => (
                <PetArt key={s} petId={MODELS[s]} size={size} outfit={{ [w.slot]: w.id }} shadow={false} />
              ))}
            </div>
          ))}
        </div>
      );
    },
  },
  {
    id: 'pets-wearable-icons',
    title: 'Wearable icons (collection book)',
    render: (params) => {
      const size = Number(params.get('size') ?? 96);
      return (
        <div class="gal-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${size + 24}px, 1fr))` }}>
          {pickWearables(params).map((w) => (
            <div class="gal-cell" key={w.id}>
              <CollectibleArt id={w.id} size={size} />
              <b>{w.name}</b>
              <small>
                {w.slot} · {w.rarity}
              </small>
            </div>
          ))}
        </div>
      );
    },
  },
];
