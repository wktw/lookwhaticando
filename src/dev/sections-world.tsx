/** Gallery sections for the world module: the Meadow, the Today windowsill and all decor. */
import type { JSX } from 'preact';
import { DECOR, MACHINES } from '@/catalog';
import type { DecorSlot, PlantSpeciesId, PotId } from '@/catalog/types';
import { PetArt } from '@/art/pets/PetArt';
import { PlantArt } from '@/art/plants';
import { CollectibleArt } from '@/art/CollectibleArt';
import {
  MeadowScene,
  WindowsillScene,
  TIMES_OF_DAY,
  PET_UNITS,
  groundToStyle,
  placeDecor,
  sillLayout,
  type PlanterPlant,
  type TimeOfDay,
} from '@/art/scene';
import type { GallerySection } from './sections';

type Slots = Partial<Record<DecorSlot, string>>;

const PLANTERS: PlanterPlant[] = [
  { species: 'sunflower', stage: 6, pot: 'terracotta' },
  { species: 'tulip', stage: 5, pot: 'blush' },
  { species: 'monstera', stage: 4, pot: 'cream' },
];

const SHOWCASE: Slots = {
  'back-left': 'decor-mushroom-house',
  'back-right': 'decor-cherry-tree',
  'ground-center': 'decor-picnic-blanket',
  'ground-right': 'decor-yarn-basket',
  sky: 'decor-heart-balloons',
};

/** One item in every slot: the busiest a Meadow can get. */
const EVERY_SLOT: Slots = {
  'back-left': 'decor-little-barn',
  'back-right': 'decor-cherry-tree',
  'ground-left': 'decor-tulip-bed',
  'ground-center': 'decor-tea-party',
  'ground-right': 'decor-beach-umbrella',
  sky: 'decor-fairy-lights',
};

const PETS: readonly { id: string; x: number; y: number; facing: 'left' | 'right' }[] = [
  { id: 'pet-mochi', x: 0.52, y: 0.62, facing: 'right' },
  { id: 'pet-cat-orange', x: 0.76, y: 0.8, facing: 'left' },
  { id: 'pet-cow-holstein', x: 0.3, y: 0.3, facing: 'right' },
  { id: 'pet-cat-calico', x: 0.66, y: 0.24, facing: 'left' },
];

function Pets({ time, count = PETS.length }: { time: TimeOfDay; count?: number }) {
  return (
    <>
      {PETS.slice(0, count).map((p) => (
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

interface MeadowCase {
  w: number;
  h: number;
  time: TimeOfDay;
  slots?: Slots;
  planters?: PlanterPlant[];
  pets?: number;
  label?: string;
}

/** A Meadow at a fixed size, its decor placed for that size just as the Meadow screen would. */
function Meadow({ w, h, time, slots = {}, planters = [], pets = 0, label }: MeadowCase) {
  return (
    <Frame w={w} h={h} label={label ?? `${time} · ${w}×${h}`}>
      <MeadowScene time={time} decor={placeDecor(slots, w / h)} planters={planters} label="Meadow" style={{ width: '100%', height: '100%' }}>
        {pets > 0 && <Pets time={time} count={pets} />}
      </MeadowScene>
    </Frame>
  );
}

/** `?time=night` narrows a section to one time of day. */
const timesFrom = (params: URLSearchParams) => TIMES_OF_DAY.filter((t) => !params.get('time') || params.get('time') === t);
const timeFrom = (params: URLSearchParams, fallback: TimeOfDay = 'day') => (params.get('time') as TimeOfDay | null) ?? fallback;

function meadows(params: URLSearchParams, w: number, h: number, bare = false) {
  return (
    <div class="gal-row" style={{ alignItems: 'flex-start' }}>
      {timesFrom(params).map((t) => (
        <Meadow key={t} w={w} h={h} time={t} slots={bare ? {} : SHOWCASE} planters={bare ? [] : PLANTERS} pets={bare ? 0 : PETS.length} />
      ))}
    </div>
  );
}

const SILL_PLANTS: readonly { species: PlantSpeciesId; stage: number; pot: PotId }[] = [
  { species: 'tulip', stage: 5, pot: 'blush' },
  { species: 'pilea', stage: 3, pot: 'terracotta' },
  { species: 'sunflower', stage: 6, pot: 'cream' },
  { species: 'monstera', stage: 4, pot: 'terracotta' },
  { species: 'begonia', stage: 2, pot: 'blush' },
];
const BUDDY_SIZE = 60;
const POT_SIZE = 46;

function Sill({ time, w, h, plants }: { time: TimeOfDay; w: number; h: number; plants: number }) {
  const shown = SILL_PLANTS.slice(0, plants);
  // The buddy sits second from the left, with the pots around it.
  const buddyAt = Math.min(1, plants);
  const sizes = Array.from({ length: plants + 1 }, (_, i) => (i === buddyAt ? BUDDY_SIZE : POT_SIZE));
  const styles = sillLayout(sizes, buddyAt);
  return (
    <Frame w={w} h={h} label={`${time} · ${w}×${h} · buddy + ${plants} pots`}>
      <WindowsillScene time={time} style={{ width: '100%', height: '100%' }}>
        {styles.map((style, i) => {
          if (i === buddyAt)
            return (
              <div key="buddy" style={style}>
                <PetArt petId="pet-mochi" size="100%" expression={time === 'night' ? 'sleep' : 'happy'} animated />
              </div>
            );
          const p = shown[i < buddyAt ? i : i - 1]!;
          return (
            <div key={i} style={style}>
              <PlantArt species={p.species} stage={p.stage} pot={p.pot} size="100%" />
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

/** One small meadow per series, its decor at the default slot positions. */
function DecorInScene({ time }: { time: TimeOfDay }) {
  const machines = MACHINES.filter((m) => DECOR.some((d) => d.source === m.id));
  return (
    <div class="gal-row" style={{ alignItems: 'flex-start' }}>
      {machines.map((m) => {
        const slots: Slots = Object.fromEntries(DECOR.filter((d) => d.source === m.id).map((d) => [d.slot, d.id]));
        return <Meadow key={m.id} w={300} h={430} time={time} slots={slots} planters={PLANTERS.slice(0, 2)} pets={1} label={m.name} />;
      })}
    </div>
  );
}

const BACK_LEFT = DECOR.filter((d) => d.slot === 'back-left');

export const SECTIONS: GallerySection[] = [
  { id: 'world-meadow-phone', title: 'Meadow · phone (390×560)', render: (p) => meadows(p, 390, 560) },
  { id: 'world-meadow-wide', title: 'Meadow · wide (1200×600)', render: (p) => meadows(p, 1200, 600) },
  { id: 'world-meadow-bare', title: 'Meadow · bare backdrop (first run)', render: (p) => meadows(p, 390, 560, true) },
  {
    id: 'world-meadow-sizes',
    title: 'Meadow · other sizes (small phone, tall phone, tablet, ultra-wide)',
    render: (params) => (
      <div class="gal-row" style={{ alignItems: 'flex-start' }}>
        {[
          [320, 480],
          [390, 700],
          [768, 560],
          [1600, 480],
        ].map(([w, h]) => (
          <Meadow key={w} w={w!} h={h!} time={timeFrom(params)} slots={SHOWCASE} planters={PLANTERS} pets={PETS.length} />
        ))}
      </div>
    ),
  },
  {
    id: 'world-meadow-slots',
    title: 'Meadow · every slot filled (the busiest case) at phone, tall phone and wide',
    render: (params) => (
      <div class="gal-row" style={{ alignItems: 'flex-start' }}>
        {[
          [390, 560],
          [390, 700],
          [1200, 600],
        ].map(([w, h]) => (
          <Meadow key={`${w}x${h}`} w={w!} h={h!} time={timeFrom(params)} slots={EVERY_SLOT} planters={PLANTERS} pets={2} />
        ))}
      </div>
    ),
  },
  {
    id: 'world-meadow-backleft',
    title: 'Meadow · each back-left item beside the tree (swing and lantern stay in view)',
    render: (params) => (
      <div class="gal-row" style={{ alignItems: 'flex-start' }}>
        {BACK_LEFT.flatMap((d) =>
          [
            [390, 560],
            [1200, 600],
          ].map(([w, h]) => <Meadow key={`${d.id}-${w}`} w={w!} h={h!} time={timeFrom(params, 'night')} slots={{ 'back-left': d.id }} label={`${d.name} · ${w}×${h}`} />),
        )}
      </div>
    ),
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
          <Sill time="night" w={320} h={150} plants={5} />
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
    render: (params) => <DecorInScene time={timeFrom(params)} />,
  },
];
