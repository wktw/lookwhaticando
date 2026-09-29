/** Gallery sections for the world module: the Meadow, the Today windowsill and all decor. */
import type { JSX } from 'preact';
import { DECOR, MACHINES } from '@/catalog';
import { PetArt } from '@/art/pets/PetArt';
import { PlantArt } from '@/art/plants';
import { CollectibleArt } from '@/art/CollectibleArt';
import {
  MeadowScene,
  WindowsillScene,
  TIMES_OF_DAY,
  DECOR_DEFAULT_POS,
  PET_UNITS,
  groundToStyle,
  sillSlotStyle,
  type PlacedDecor,
  type PlanterPlant,
  type TimeOfDay,
} from '@/art/scene';
import type { GallerySection } from './sections';

const PLANTERS: PlanterPlant[] = [
  { species: 'sunflower', stage: 6, pot: 'terracotta' },
  { species: 'tulip', stage: 5, pot: 'blush' },
  { species: 'monstera', stage: 4, pot: 'cream' },
];

const at = (itemId: string, slot: keyof typeof DECOR_DEFAULT_POS): PlacedDecor => ({ itemId, ...DECOR_DEFAULT_POS[slot] });

const SHOWCASE_DECOR: PlacedDecor[] = [
  at('decor-mushroom-house', 'back-left'),
  at('decor-cherry-tree', 'back-right'),
  at('decor-picnic-blanket', 'ground-center'),
  at('decor-yarn-basket', 'ground-right'),
  at('decor-heart-balloons', 'sky'),
];

const PETS: { id: string; x: number; y: number; facing: 'left' | 'right' }[] = [
  { id: 'pet-mochi', x: 0.46, y: 0.68, facing: 'right' },
  { id: 'pet-cat-orange', x: 0.72, y: 0.8, facing: 'left' },
  { id: 'pet-cow-holstein', x: 0.42, y: 0.28, facing: 'right' },
  { id: 'pet-cat-calico', x: 0.84, y: 0.28, facing: 'left' },
];

function Pets({ time }: { time: TimeOfDay }) {
  return (
    <>
      {PETS.map((p) => (
        <div key={p.id} style={groundToStyle(p.x, p.y, { size: PET_UNITS })}>
          <PetArt petId={p.id} size="100%" facing={p.facing} expression={time === 'night' ? 'sleep' : 'idle'} animated />
        </div>
      ))}
    </>
  );
}

function Frame({ w, h, label, children }: { w: number; h: number; label: string; children: JSX.Element }) {
  return (
    <figure style={{ margin: 0, display: 'grid', gap: '6px' }}>
      <div style={{ width: `${w}px`, height: `${h}px`, borderRadius: '22px', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>{children}</div>
      <figcaption style={{ fontSize: '12px', color: 'var(--ink-2)' }}>{label}</figcaption>
    </figure>
  );
}

/** `?time=night` narrows a section to one time of day. */
const timesFrom = (params: URLSearchParams) => TIMES_OF_DAY.filter((t) => !params.get('time') || params.get('time') === t);

function meadows(params: URLSearchParams, w: number, h: number, bare = false) {
  return (
    <div class="gal-row" style={{ alignItems: 'flex-start' }}>
      {timesFrom(params).map((t) => (
        <Frame key={t} w={w} h={h} label={`${t} · ${w}×${h}`}>
          <MeadowScene time={t} decor={bare ? [] : SHOWCASE_DECOR} planters={bare ? [] : PLANTERS} style={{ width: '100%', height: '100%' }}>
            {!bare && <Pets time={t} />}
          </MeadowScene>
        </Frame>
      ))}
    </div>
  );
}

const SILL_PLANTS: PlanterPlant[] = [
  { species: 'tulip', stage: 5, pot: 'blush' },
  { species: 'succulent', stage: 3, pot: 'terracotta' },
  { species: 'sunflower', stage: 6, pot: 'cream' },
  { species: 'monstera', stage: 4, pot: 'terracotta' },
  { species: 'daisy', stage: 2, pot: 'blush' },
];

function Sill({ time, w, h, plants }: { time: TimeOfDay; w: number; h: number; plants: number }) {
  const count = plants + 1;
  const buddyAt = Math.min(1, plants);
  const shown = SILL_PLANTS.slice(0, plants);
  return (
    <Frame w={w} h={h} label={`${time} · ${w}×${h} · buddy + ${plants} pots`}>
      <WindowsillScene time={time} style={{ width: '100%', height: '100%' }}>
        {Array.from({ length: count }, (_, i) => {
          if (i === buddyAt)
            return (
              <div key="buddy" style={sillSlotStyle(i, count, 60)}>
                <PetArt petId="pet-mochi" size="100%" expression={time === 'night' ? 'sleep' : 'happy'} animated />
              </div>
            );
          const p = shown[i < buddyAt ? i : i - 1]!;
          return (
            <div key={i} style={sillSlotStyle(i, count, 46)}>
              <PlantArt species={p.species as never} stage={p.stage} pot={p.pot as never} size="100%" />
            </div>
          );
        })}
      </WindowsillScene>
    </Frame>
  );
}

function DecorCell({ id, name, slot, size }: { id: string; name: string; slot: string; size: number }) {
  return (
    <div class="gal-cell">
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
        <CollectibleArt id={id} size={size} />
        <CollectibleArt id={id} size={48} />
      </div>
      <b>{name}</b>
      <small>{slot}</small>
    </div>
  );
}

/** One small meadow per machine, its decor at the default slot positions. */
function DecorInScene({ time }: { time: TimeOfDay }) {
  const machines = MACHINES.filter((m) => DECOR.some((d) => d.source === m.id));
  return (
    <div class="gal-row" style={{ alignItems: 'flex-start' }}>
      {machines.map((m) => {
        const items = DECOR.filter((d) => d.source === m.id).map((d) => at(d.id, d.slot));
        return (
          <Frame key={m.id} w={300} h={430} label={m.name}>
            <MeadowScene time={time} decor={items} planters={PLANTERS.slice(0, 2)} style={{ width: '100%', height: '100%' }}>
              <div style={groundToStyle(0.55, 0.78, { size: PET_UNITS })}>
                <PetArt petId="pet-mochi" size="100%" />
              </div>
            </MeadowScene>
          </Frame>
        );
      })}
    </div>
  );
}

export const SECTIONS: GallerySection[] = [
  { id: 'world-meadow-phone', title: 'Meadow · phone (390×560)', render: (p) => meadows(p, 390, 560) },
  { id: 'world-meadow-wide', title: 'Meadow · wide (1200×600)', render: (p) => meadows(p, 1200, 600) },
  { id: 'world-meadow-bare', title: 'Meadow · bare backdrop', render: (p) => meadows(p, 390, 560, true) },
  {
    id: 'world-meadow-sizes',
    title: 'Meadow · other sizes (small phone, tall phone, tablet, ultra-wide)',
    render: (params) => {
      const time = (params.get('time') as TimeOfDay) || 'day';
      return (
        <div class="gal-row" style={{ alignItems: 'flex-start' }}>
          {[
            [320, 480],
            [390, 700],
            [768, 560],
            [1600, 480],
          ].map(([w, h]) => (
            <Frame key={w} w={w!} h={h!} label={`${time} · ${w}×${h}`}>
              <MeadowScene time={time} decor={SHOWCASE_DECOR} planters={PLANTERS} style={{ width: '100%', height: '100%' }}>
                <Pets time={time} />
              </MeadowScene>
            </Frame>
          ))}
        </div>
      );
    },
  },
  {
    id: 'world-sill',
    title: 'Today windowsill',
    render: () => (
      <div style={{ display: 'grid', gap: '18px' }}>
        <div class="gal-row" style={{ alignItems: 'flex-start' }}>
          {TIMES_OF_DAY.map((t) => (
            <Sill key={t} time={t} w={390} h={170} plants={3} />
          ))}
        </div>
        <div class="gal-row" style={{ alignItems: 'flex-start' }}>
          <Sill time="day" w={320} h={150} plants={5} />
          <Sill time="golden" w={900} h={190} plants={5} />
        </div>
      </div>
    ),
  },
  {
    id: 'world-decor',
    title: 'Decor (110 px and 48 px; ?size= for a closer look)',
    render: (params) => {
      const size = Number(params.get('size') ?? 110);
      return (
        <div class="gal-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${size + 80}px, 1fr))` }}>
          {DECOR.map((d) => (
            <DecorCell key={d.id} id={d.id} name={d.name} slot={`${d.slot} · ${d.rarity}`} size={size} />
          ))}
        </div>
      );
    },
  },
  {
    id: 'world-decor-scene',
    title: 'Decor in the Meadow, by series (default slots)',
    render: (params) => <DecorInScene time={(params.get('time') as TimeOfDay) || 'day'} />,
  },
];
