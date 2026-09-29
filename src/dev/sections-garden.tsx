/**
 * Garden module gallery: plants at every stage, progress & blooms, pots, habit-card sizes, treats.
 * View all with /gallery.html?only=garden, or one section with ?only=garden-<name>.
 * `&species=<id>[,<id>…]` narrows the plant sections; `&pot=<id>` changes their pot;
 * the matrix also takes `&size=<px>`, `&progress=<0..1>` and `&stages=4,5,6`;
 * treats take `&size=<px>` and `&treats=cookie,donut`.
 */
import { Fragment, type JSX } from 'preact';
import { useState } from 'preact/hooks';
import type { PlantSpeciesId, PotId } from '@/catalog/types';
import { PLANTS, POTS, TREATS } from '@/catalog/collectibles';
import { PlantArt, PotArt, PLANT_STAGE_NAMES } from '@/art/plants';
import { TREAT_ART } from '@/art/items';
import type { GallerySection } from './sections';

const SPECIES: PlantSpeciesId[] = ['pothos', 'pilea', 'begonia', 'snakeplant', 'catgrass', 'monstera', 'strawberry', 'lavender', 'catnip', 'hoya', 'orchid', 'calathea', 'violet', 'tulip', 'xmascactus', 'sunflower'];
const POT_IDS = POTS.map((p) => p.pot);
const STAGES = [0, 1, 2, 3, 4, 5, 6, 7];

function speciesFrom(params: URLSearchParams): PlantSpeciesId[] {
  const picked = (params.get('species')?.split(',') ?? []).filter((s): s is PlantSpeciesId => SPECIES.includes(s as PlantSpeciesId));
  return picked.length ? picked : SPECIES;
}

function potFrom(params: URLSearchParams, fallback: PotId = 'terracotta'): PotId {
  const p = params.get('pot') as PotId | null;
  return p && POT_IDS.includes(p) ? p : fallback;
}

const speciesName = (s: PlantSpeciesId) => PLANTS.find((p) => p.plant === s)?.name ?? s;

const matrixStyle = (cols: number, cell: number): JSX.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: `96px repeat(${cols}, ${cell}px)`,
  gap: '6px',
  alignItems: 'center',
});

const label: JSX.CSSProperties = { fontSize: '12px', fontWeight: 700, color: 'var(--ink-2)' };
const tile: JSX.CSSProperties = { background: 'var(--card)', borderRadius: '14px', boxShadow: 'var(--shadow-sm)', display: 'grid', placeItems: 'center' };

function Matrix({ params }: { params: URLSearchParams }) {
  const pot = potFrom(params);
  const size = Number(params.get('size')) || 88;
  const progress = Number(params.get('progress') ?? 0.35);
  const stages = params.get('stages')?.split(',').map(Number) ?? STAGES;
  // Narrow columns only fit the stage number; the full names go in a legend underneath.
  const compact = size < 80;
  return (
    <div>
      <div style={matrixStyle(stages.length, size + 8)}>
        <span />
        {stages.map((s) => (
          <small key={s} style={{ ...label, textAlign: 'center' }} title={PLANT_STAGE_NAMES[s]}>
            {compact ? s : `${s} · ${PLANT_STAGE_NAMES[s]}`}
          </small>
        ))}
        {speciesFrom(params).map((sp) => (
          <Fragment key={sp}>
            <b style={label}>{speciesName(sp)}</b>
            {stages.map((s) => (
              <div key={`${sp}${s}`} style={{ ...tile, padding: '4px' }}>
                <PlantArt species={sp} stage={s} progress={progress} pot={pot} size={size} title={`${speciesName(sp)}, ${PLANT_STAGE_NAMES[s]}`} />
              </div>
            ))}
          </Fragment>
        ))}
      </div>
      {compact && <p style={{ ...label, marginTop: '8px' }}>{stages.map((s) => `${s} ${PLANT_STAGE_NAMES[s]}`).join(' · ')}</p>}
    </div>
  );
}

const PROGRESS = [0, 0.5, 0.95];

function ProgressDemo({ params }: { params: URLSearchParams }) {
  const pot = potFrom(params);
  return (
    <div style={matrixStyle(7, 156)}>
      <span />
      {STAGES.slice(0, 7).map((s) => (
        <small key={s} style={{ ...label, textAlign: 'center' }}>
          {PLANT_STAGE_NAMES[s]}
        </small>
      ))}
      {speciesFrom(params).map((sp) => (
        <Fragment key={sp}>
          <b style={label}>{speciesName(sp)}</b>
          {STAGES.slice(0, 7).map((s) => (
            <div key={`${sp}${s}`} style={{ ...tile, display: 'flex', justifyContent: 'center', padding: '2px' }}>
              {PROGRESS.map((p) => (
                <PlantArt key={p} species={sp} stage={s} progress={p} pot={pot} size={50} title={`${PLANT_STAGE_NAMES[s]} at ${p * 100}%`} />
              ))}
            </div>
          ))}
        </Fragment>
      ))}
    </div>
  );
}

function BloomsDemo({ params }: { params: URLSearchParams }) {
  const pot = potFrom(params, 'cream');
  const size = Number(params.get('size')) || 104;
  return (
    <div class="gal-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${size * 3 + 28}px, 1fr))` }}>
      {speciesFrom(params).map((sp) => (
        <div class="gal-cell" key={sp}>
          <div class="gal-row" style={{ gap: '4px' }}>
            {[0, 3, 6].map((b) => (
              <PlantArt key={b} species={sp} stage={7} blooms={b} pot={pot} size={size} animated />
            ))}
          </div>
          <b>{speciesName(sp)}</b>
          <small>Evergreen · blooms 0 / 3 / 6</small>
        </div>
      ))}
    </div>
  );
}

function PotsDemo({ params }: { params: URLSearchParams }) {
  const size = Number(params.get('size')) || 96;
  return (
    <div class="gal-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${size * 3 + 72}px, 1fr))` }}>
      {POTS.map((p) => (
        <div class="gal-cell" key={p.id}>
          <div class="gal-row" style={{ gap: '6px', flexWrap: 'nowrap' }}>
            <PotArt pot={p.pot} size={size} title={p.name} />
            <PlantArt species="tulip" stage={5} progress={0.5} pot={p.pot} size={size} />
            <PlantArt species="begonia" stage={7} pot={p.pot} size={size} title={`Evergreen daisy in the ${p.name}`} />
            <PotArt pot={p.pot} size={40} />
          </div>
          <b>{p.name}</b>
          <small>
            {p.pot} · {p.rarity}
          </small>
        </div>
      ))}
    </div>
  );
}

/** Demo habits whose subtitles match their growth stage (DESIGN §5.5 thresholds for a daily habit). */
const CARD_DEMO: { name: string; sub: string; species: PlantSpeciesId; stage: number; pot: PotId; blooms?: number; done?: boolean }[] = [
  { name: 'Drink water', sub: '2 weeks', species: 'monstera', stage: 3, pot: 'cream' },
  { name: 'Take vitamins', sub: '7 weeks', species: 'pilea', stage: 5, pot: 'blush', done: true },
  { name: 'Go for a walk', sub: '3 months', species: 'sunflower', stage: 6, pot: 'terracotta', done: true },
  { name: 'Stretch', sub: 'Day 2', species: 'tulip', stage: 1, pot: 'mug' },
  { name: 'Yoga', sub: '1 of 2 this week', species: 'lavender', stage: 4, pot: 'speckled' },
  { name: 'In bed by 11', sub: '8 weeks', species: 'pothos', stage: 5, pot: 'midnight' },
  { name: 'Read', sub: '7 months', species: 'begonia', stage: 7, blooms: 2, pot: 'ticking', done: true },
  { name: 'Strength training', sub: '2 of 3 this week', species: 'snakeplant', stage: 2, pot: 'tincan' },
  { name: 'Practice a hobby', sub: 'Just planted', species: 'strawberry', stage: 0, pot: 'rosy' },
  { name: 'Meal prep', sub: '4 months', species: 'catnip', stage: 6, pot: 'gourd' },
  { name: 'Journal', sub: '9 weeks', species: 'hoya', stage: 5, pot: 'eggshell' },
  { name: 'Water the plants', sub: '6 months', species: 'calathea', stage: 7, pot: 'mug' },
];

function HabitCards() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
      {CARD_DEMO.map((c) => (
        <div key={c.name} style={{ ...tile, display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '22px' }}>
          <PlantArt species={c.species} stage={c.stage} progress={0.4} blooms={c.blooms} pot={c.pot} size={40} animated />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{c.name}</div>
            <div style={{ fontSize: '13px', color: 'var(--ink-2)' }}>
              {PLANT_STAGE_NAMES[c.stage]} · {c.sub}
            </div>
          </div>
          <span
            aria-hidden
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: c.done ? 'var(--sage-500)' : 'var(--bg-2)',
              border: c.done ? 'none' : '2px solid var(--line)',
            }}
          />
        </div>
      ))}
    </div>
  );
}

/** Interactive: water plants to replay the wiggle + droplets (needs motion; shoot with --motion). */
function WaterDemo() {
  const [pulse, setPulse] = useState(0);
  return (
    <div class="gal-cell" style={{ alignItems: 'flex-start' }}>
      <button
        type="button"
        onClick={() => setPulse((p) => p + 1)}
        style={{ padding: '8px 16px', borderRadius: '99px', background: 'var(--sky-300)', fontWeight: 700 }}
      >
        Water them ({pulse})
      </button>
      <div class="gal-row" style={{ width: '100%' }}>
        {(['tulip', 'sunflower', 'succulent', 'lemon', 'mushroom'] as PlantSpeciesId[]).map((sp, i) => (
          <PlantArt key={sp} species={sp} stage={i + 3} pot={POT_IDS[i]!} size={140} pulse={pulse} animated />
        ))}
        <PlantArt species="begonia" stage={0} progress={0.8} pot="mug" size={140} pulse={pulse} animated />
      </div>
      <div class="gal-row" style={{ width: '100%' }}>
        {(['tulip', 'sunflower', 'succulent', 'lemon', 'mushroom', 'daisy'] as PlantSpeciesId[]).map((sp, i) => (
          <PlantArt key={sp} species={sp} stage={i + 2} pot={POT_IDS[i + 4]!} size={40} pulse={pulse} animated />
        ))}
      </div>
    </div>
  );
}

function TreatsDemo({ params }: { params: URLSearchParams }) {
  const size = Number(params.get('size')) || 96;
  const picked = params.get('treats')?.split(',');
  const treats = picked ? TREATS.filter((t) => picked.some((p) => t.id === `treat-${p}`)) : TREATS;
  return (
    <div class="gal-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${size + 64}px, 1fr))` }}>
      {treats.map((t) => {
        const Art = TREAT_ART[t.id];
        return (
          <div class="gal-cell" key={t.id}>
            <div class="gal-row" style={{ gap: '6px' }}>
              <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={t.name}>
                {Art ? <Art /> : null}
              </svg>
              <svg viewBox="0 0 100 100" width={40} height={40} aria-hidden>
                {Art ? <Art /> : null}
              </svg>
            </div>
            <b>{t.name}</b>
            <small>
              {t.rarity} · {t.source}
            </small>
          </div>
        );
      })}
    </div>
  );
}

export const SECTIONS: GallerySection[] = [
  { id: 'garden-matrix', title: 'Garden: every species × every stage', render: (params) => <Matrix params={params} /> },
  { id: 'garden-progress', title: 'Garden: progress within a stage (0 / .5 / .95)', render: (params) => <ProgressDemo params={params} /> },
  { id: 'garden-blooms', title: 'Garden: Evergreen blooms (0 / 3 / 6)', render: (params) => <BloomsDemo params={params} /> },
  { id: 'garden-pots', title: 'Garden: pots alone, with a Blooming tulip, with an Evergreen daisy (ribbon + charm), and at 40px', render: (params) => <PotsDemo params={params} /> },
  { id: 'garden-cards', title: 'Garden: 40px habit-card row', render: () => <HabitCards /> },
  { id: 'garden-water', title: 'Garden: watering (tap to replay)', render: () => <WaterDemo /> },
  { id: 'garden-treats', title: 'Garden: treats at 96px and 40px', render: (params) => <TreatsDemo params={params} /> },
];
