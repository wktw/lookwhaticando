import type { JSX } from 'preact';
import { PETS, WEARABLES } from '@/catalog/collectibles';
import { SPECIES, type Species, type WearableSlot } from '@/catalog/types';
import type { Light } from '@/art/light';
import { PetArt } from '@/art/pets/PetArt';
import { EXPRESSIONS, POSES, type Expression, type Pose } from '@/art/pets/types';
import { WEARABLE_ART } from '@/art/wearables';
import type { GallerySection } from './sections';

/**
 * Pets gallery (animals and wearables). Most sections take &species=cat,cow to focus species,
 * &ids=pet-cat-calico,… to focus pets, &size=… to change the drawing size and &facing=left.
 */

/** One model per species: the coats the style frames were drawn with, where there is one. */
const MODELS: Record<Species, string> = {
  cat: 'pet-cat-calico',
  cow: 'pet-cow-holstein',
  dog: 'pet-dog-shiba',
  bunny: 'pet-bunny-dutch',
  frog: 'pet-frog-tree',
  bear: 'pet-bear-brown',
  hamster: 'pet-hamster-syrian',
  duck: 'pet-duck-mallard',
};

const DAYS: { label: string; light: Light }[] = [
  { label: 'window left', light: { from: 'left', night: false } },
  { label: 'window top', light: { from: 'top', night: false } },
  { label: 'window right', light: { from: 'right', night: false } },
];
const NIGHTS: { label: string; light: Light }[] = [
  { label: 'lamp left', light: { from: 'left', night: true } },
  { label: 'lamp top', light: { from: 'top', night: true } },
  { label: 'lamp right', light: { from: 'right', night: true } },
];

/** A Lamplight card with the night art tokens, so night drawings read correctly on the day gallery. */
const NIGHT_CARD = {
  background: '#2d2733',
  color: '#f4ede6',
  '--shade': 'rgba(10, 8, 22, 0.3)',
  '--contact': 'rgba(0, 0, 0, 0.22)',
  '--card': '#2d2733',
} as JSX.CSSProperties;

const ROW: JSX.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'flex-end', marginBottom: '6px' };
const CELL: JSX.CSSProperties = { padding: '6px', borderRadius: '12px', gap: '2px' };

const pickSpecies = (params: URLSearchParams, fallback: readonly Species[] = SPECIES): Species[] => {
  const s = params.get('species')?.split(',');
  return s?.length ? SPECIES.filter((x) => s.includes(x)) : [...fallback];
};
const pickPets = (params: URLSearchParams) => {
  const ids = params.get('ids')?.split(',');
  const species = pickSpecies(params);
  return PETS.filter((p) => (ids ? ids.includes(p.id) : species.includes(p.species)));
};
const modelFor = (params: URLSearchParams, s: Species) => params.get('ids')?.split(',').find((i) => i.startsWith(`pet-${s}-`)) ?? MODELS[s];
const facingOf = (params: URLSearchParams) => (params.get('facing') === 'left' ? 'left' : 'right');
const sizeOf = (params: URLSearchParams, fallback: number) => Number(params.get('size') ?? fallback);

function Cell({ children, label, night }: { children: JSX.Element; label: string; night?: boolean }) {
  return (
    <div class="gal-cell" style={{ ...CELL, ...(night ? NIGHT_CARD : {}) }}>
      {children}
      <small style={night ? { color: '#cfc5c9' } : undefined}>{label}</small>
    </div>
  );
}

function Heading({ children }: { children: string }) {
  return <h3 style={{ margin: '10px 0 4px', fontSize: '15px' }}>{children}</h3>;
}

function PoseMatrix({ species, params }: { species: Species; params: URLSearchParams }) {
  const id = modelFor(params, species);
  return (
    <div>
      <Heading>{species}</Heading>
      {POSES.map((pose) => (
        <div style={ROW} key={pose}>
          {[...DAYS, ...NIGHTS].map(({ label, light }) => (
            <Cell key={label} label={`${pose} · ${label}`} night={light.night}>
              <PetArt petId={id} pose={pose} light={light} size={sizeOf(params, 160)} facing={facingOf(params)} animated={params.has('animate')} />
            </Cell>
          ))}
        </div>
      ))}
    </div>
  );
}

/** A strip of small pets on a card, where they live at that size. */
function SmallStrip({ ids, size, pose }: { ids: string[]; size: number; pose: Pose }) {
  return (
    <div class="gal-cell" style={{ ...CELL, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: '6px', marginTop: '8px' }}>
      {ids.map((id) => (
        <PetArt key={id} petId={id} pose={pose} size={size} />
      ))}
      <small style={{ width: '100%', textAlign: 'left' }}>{`${size} px`}</small>
    </div>
  );
}

function WearRow({ id, params }: { id: string; params: URLSearchParams }) {
  const w = WEARABLES.find((x) => x.id === id)!;
  const art = WEARABLE_ART[id];
  const models = pickSpecies(params, ['cat', 'cow', 'frog', 'hamster', 'duck']);
  const poses = (params.get('poses')?.split(',') as Pose[] | undefined) ?? (['sit', 'loaf', 'stand'] as Pose[]);
  const light: Light = { from: (params.get('light') as Light['from']) ?? 'left', night: params.has('night') };
  return (
    <div style={{ ...ROW, alignItems: 'center', marginBottom: '8px' }}>
      <Cell label={`${w.name} · ${w.slot}`}>
        <svg viewBox="0 0 100 100" width={64} height={64} aria-hidden="true">
          {art?.icon()}
        </svg>
      </Cell>
      {models.flatMap((s) =>
        poses.map((pose) => <PetArt key={`${s}-${pose}`} petId={modelFor(params, s)} pose={pose} light={light} outfit={{ [w.slot]: w.id }} size={sizeOf(params, 84)} />),
      )}
    </div>
  );
}

const wearSection = (id: string, title: string, slots: WearableSlot[]): GallerySection => ({
  id,
  title,
  render: (params) => {
    const ids = params.get('ids')?.split(',');
    return (
      <div>
        {WEARABLES.filter((w) => slots.includes(w.slot) && (!ids || ids.includes(w.id))).map((w) => (
          <WearRow key={w.id} id={w.id} params={params} />
        ))}
      </div>
    );
  },
});

export const SECTIONS: GallerySection[] = [
  {
    id: 'pets-reference',
    title: 'Pets · the style-frame line-up (Pz_poses), then at 48, 32 and 20 px',
    render: (params) => {
      const lineup: [string, Pose][] = [
        ['pet-cat-orange', 'loaf'],
        ['pet-cat-calico', 'sleep'],
        ['pet-cat-black', 'loaf'],
        ['pet-cow-highland', 'loaf'],
        ['pet-cow-beltie', 'stand'],
        ['pet-cow-holstein', 'loaf'],
      ];
      return (
        <div>
          <div class="gal-row" style={{ gap: '0' }}>
            {lineup.map(([id, pose]) => (
              <PetArt key={id} petId={id} pose={pose} size={sizeOf(params, 150)} facing="left" />
            ))}
          </div>
          <div class="gal-row" style={{ gap: '10px', marginTop: '8px' }}>
            {[48, 32, 20].flatMap((size) => lineup.map(([id, pose]) => <PetArt key={`${id}${size}`} petId={id} pose={pose} size={size} facing="left" />))}
          </div>
        </div>
      );
    },
  },
  {
    id: 'pets-one',
    title: 'Pets · large drawings (&id=a,b &pose=sit,loaf &expr &light=left|top|right &night &size &facing &outfit=wear-…)',
    render: (params) => {
      const light: Light = { from: (params.get('light') as Light['from'] | null) ?? 'left', night: params.has('night') };
      const ids = (params.get('id') ?? MODELS.cat).split(',');
      const poses = (params.get('pose') ?? 'sit').split(',') as Pose[];
      const outfit: Partial<Record<WearableSlot, string>> = {};
      for (const o of params.get('outfit')?.split(',') ?? []) {
        const w = WEARABLES.find((x) => x.id === o);
        if (w) outfit[w.slot] = o;
      }
      return (
        <div class="gal-row" style={{ gap: '6px' }}>
          {ids.flatMap((id) =>
            poses.map((pose) => (
              <div key={id + pose} style={{ background: 'var(--card)', ...(light.night ? NIGHT_CARD : {}), borderRadius: '12px' }}>
                <PetArt
                  petId={id}
                  pose={pose}
                  light={light}
                  outfit={outfit}
                  size={sizeOf(params, 300)}
                  facing={facingOf(params)}
                  expression={(params.get('expr') as Expression | null) ?? 'rest'}
                  animated={params.has('animate')}
                />
              </div>
            )),
          )}
        </div>
      );
    },
  },
  {
    id: 'pets-overview',
    title: 'Pets · every species in every pose, window light from the left',
    render: (params) => (
      <div>
        {pickSpecies(params).map((s) => (
          <div style={ROW} key={s}>
            {POSES.map((pose) => (
              <Cell key={pose} label={`${s} · ${pose}`}>
                <PetArt petId={modelFor(params, s)} pose={pose} size={sizeOf(params, 120)} facing={facingOf(params)} animated={params.has('animate')} />
              </Cell>
            ))}
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'pets-poses',
    title: 'Pets · every species in every pose × window light (left, top, right) and lamplight, 160 px',
    render: (params) => (
      <div>
        {pickSpecies(params).map((s) => (
          <PoseMatrix key={s} species={s} params={params} />
        ))}
      </div>
    ),
  },
  {
    id: 'pets-looks',
    title: 'Pets · every look at 72 px, then at 32 px and 20 px on a card (&pose=sit)',
    render: (params) => {
      const pose = (params.get('pose') as Pose | null) ?? 'sit';
      const pets = pickPets(params);
      return (
        <div>
          <div style={ROW}>
            {pets.map((p) => (
              <Cell key={p.id} label={p.name}>
                <PetArt petId={p.id} pose={pose} size={sizeOf(params, 72)} facing={facingOf(params)} />
              </Cell>
            ))}
          </div>
          <SmallStrip ids={pets.map((p) => p.id)} size={32} pose={pose} />
          <SmallStrip ids={pets.map((p) => p.id)} size={20} pose={pose} />
        </div>
      );
    },
  },
  {
    id: 'pets-floors',
    title: 'Pets · size floors: the pose at 160, 64 and 48 px; the closed-eye loaf at 32 px; the three-shape sprite at 20 px',
    render: (params) => (
      <div>
        {pickSpecies(params).map((s) => (
          <div key={s} class="gal-row" style={{ gap: '14px', marginBottom: '8px' }}>
            {[160, 64, 48, 32, 20].map((size) => (
              <PetArt key={size} petId={modelFor(params, s)} pose={(params.get('pose') as Pose | null) ?? 'stand'} size={size} />
            ))}
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'pets-expressions',
    title: 'Pets · expressions per species (still, so the slow blink holds half-closed; &animate for idle life)',
    render: (params) => (
      <div>
        {pickSpecies(params).map((s) => (
          <div style={ROW} key={s}>
            {EXPRESSIONS.map((e) => (
              <Cell key={e} label={`${s} · ${e}`}>
                <PetArt petId={modelFor(params, s)} expression={e} pose={(params.get('pose') as Pose | null) ?? 'sit'} size={sizeOf(params, 120)} animated={params.has('animate')} />
              </Cell>
            ))}
          </div>
        ))}
      </div>
    ),
  },
  wearSection('pets-wear-head', 'Wearables · head, on a cat, a cow, a frog, a hamster and a duck in sit, loaf and stand, with the icon', ['head']),
  wearSection('pets-wear-neck', 'Wearables · face and neck, on five species in sit, loaf and stand, with the icon', ['face', 'neck']),
  wearSection('pets-wear-body', 'Wearables · body, on five species in sit, loaf and stand, with the icon', ['body']),
  {
    id: 'pets-moonlit',
    title: 'Pets · Moonlit variants under the lamp, beside the everyday coat (&all for every pet)',
    render: (params) => (
      <div style={ROW}>
        {pickPets(params)
          .filter((_, i) => params.has('all') || params.has('ids') || params.has('species') || i % 4 === 0)
          .map((p) => (
            <Cell key={p.id} label={`Moonlit ${p.name}`} night>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <PetArt petId={p.id} size={sizeOf(params, 88)} light={{ from: 'right', night: true }} />
                <PetArt petId={`moonlit:${p.id}`} size={sizeOf(params, 88)} light={{ from: 'right', night: true }} />
              </div>
            </Cell>
          ))}
      </div>
    ),
  },
  {
    id: 'pets-modes',
    title: 'Pets · Field Guide "not yet" (muted, no filter) and Secret silhouettes, beside the owned drawing',
    render: (params) => (
      <div>
        <div style={ROW}>
          {pickSpecies(params).map((s) => (
            <Cell key={s} label={`${s} · owned, muted, silhouette`}>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <PetArt petId={modelFor(params, s)} size={sizeOf(params, 88)} />
                <PetArt petId={modelFor(params, s)} size={sizeOf(params, 88)} muted />
                <PetArt petId={modelFor(params, s)} size={sizeOf(params, 88)} silhouette />
              </div>
            </Cell>
          ))}
        </div>
        <div style={ROW}>
          {pickPets(params)
            .filter((_, i) => params.has('species') || i % 3 === 0)
            .map((p) => (
              <PetArt key={p.id} petId={p.id} size={64} muted />
            ))}
        </div>
      </div>
    ),
  },
];
