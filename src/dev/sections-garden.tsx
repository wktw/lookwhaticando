/**
 * Plants module gallery: every species at every stage, the night row, window light from each side, every pot in
 * every light, card-size plants, the water glass close up, blooms, watering and plant tags.
 * View all with /gallery.html?only=garden, or one section with ?only=garden-<name>.
 * The plant sections take `&species=<id>[,<id>…]`, `&pot=<id>`, `&size=<px>`, `&progress=<0..1>` and `&stages=4,5,6`.
 */
import { Fragment, type ComponentChildren, type JSX } from 'preact';
import { useState } from 'preact/hooks';
import type { PlantSpeciesId, PotId } from '@/catalog/types';
import { PLANTS, POTS } from '@/catalog/collectibles';
import { PlantArt, PlantTag, PotArt, PLANT_STAGE_NAMES, tagAnchor, FLOURISHES } from '@/art/plants';
import { CardPlant } from '@/art/plants/CardPlant';
import type { PlantLookArt } from '@/art/plants';
import { DayGlyph, MonthJar, NoteCard, Pressing } from '@/art/progress';
import { DAY_LIGHT, NIGHT_LIGHT, type Light } from '@/art/light';
import type { GallerySection } from './sections';

const SPECIES: PlantSpeciesId[] = ['pothos', 'pilea', 'begonia', 'snakeplant', 'catgrass', 'monstera', 'strawberry', 'lavender', 'catnip', 'hoya', 'orchid', 'calathea', 'violet', 'tulip', 'xmascactus', 'sunflower'];
const POT_IDS = POTS.map((p) => p.pot);
const STAGES = [0, 1, 2, 3, 4, 5, 6, 7];

const LIGHTS: { label: string; light: Light }[] = [
  { label: 'Window left', light: DAY_LIGHT },
  { label: 'Overhead', light: { from: 'top', night: false } },
  { label: 'Window right', light: { from: 'right', night: false } },
  { label: 'Lamplight', light: NIGHT_LIGHT },
];

/** Most plants start in the pot a new habit gets; a few favourites go in something prettier. */
const HOME_POT: Partial<Record<PlantSpeciesId, PotId>> = { begonia: 'cream', pilea: 'ticking', violet: 'blush', hoya: 'speckled', orchid: 'cream', calathea: 'midnight', strawberry: 'terracotta', catnip: 'tincan', lavender: 'speckled', xmascactus: 'rosy', sunflower: 'terracotta', snakeplant: 'cream', monstera: 'terracotta', catgrass: 'mug' };

function speciesFrom(params: URLSearchParams): PlantSpeciesId[] {
  const picked = (params.get('species')?.split(',') ?? []).filter((s): s is PlantSpeciesId => SPECIES.includes(s as PlantSpeciesId));
  return picked.length ? picked : SPECIES;
}

function potFor(params: URLSearchParams, sp: PlantSpeciesId): PotId {
  const p = params.get('pot') as PotId | null;
  return p && POT_IDS.includes(p) ? p : (HOME_POT[sp] ?? 'terracotta');
}

const speciesName = (s: PlantSpeciesId) => PLANTS.find((p) => p.plant === s)?.name ?? s;
const potName = (p: PotId) => POTS.find((x) => x.pot === p)?.name ?? p;

const label: JSX.CSSProperties = { fontSize: '12px', fontWeight: 700, color: 'var(--ink-2)' };
const tile: JSX.CSSProperties = { background: 'var(--card)', borderRadius: '14px', boxShadow: 'var(--shadow-sm)', display: 'grid', placeItems: 'center' };
/** A lamplit panel, so the night art is seen against the night it was drawn for. */
const nightTile: JSX.CSSProperties = { ...tile, background: '#2D2733' };

const grid = (cols: number, cell: number, head = 104): JSX.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: `${head}px repeat(${cols}, ${cell}px)`,
  gap: '6px',
  alignItems: 'center',
});

function Matrix({ params }: { params: URLSearchParams }) {
  const size = Number(params.get('size')) || 120;
  const progress = Number(params.get('progress') ?? 0.5);
  const stages = params.get('stages')?.split(',').map(Number) ?? STAGES;
  return (
    <div style={grid(stages.length, size + 8)}>
      <span />
      {stages.map((s) => (
        <small key={s} style={{ ...label, textAlign: 'center' }}>
          {s} · {PLANT_STAGE_NAMES[s]}
        </small>
      ))}
      {speciesFrom(params).map((sp) => (
        <Fragment key={sp}>
          <b style={label}>{speciesName(sp)}</b>
          {stages.map((s) => (
            <div key={`${sp}${s}`} style={{ ...tile, padding: '4px' }}>
              <PlantArt species={sp} stage={s} progress={progress} pot={potFor(params, sp)} size={size} title={`${speciesName(sp)}, ${PLANT_STAGE_NAMES[s]}`} />
            </div>
          ))}
        </Fragment>
      ))}
    </div>
  );
}

/** Lamplight: each species at the stages that change most, on a lamplit panel. */
function NightRow({ params }: { params: URLSearchParams }) {
  const size = Number(params.get('size')) || 120;
  const stages = params.get('stages')?.split(',').map(Number) ?? [1, 3, 5, 7];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${(size + 8) * stages.length + 16}px, 1fr))`, gap: '10px' }}>
      {speciesFrom(params).map((sp) => (
        <div key={sp} style={{ ...nightTile, padding: '8px', gap: '4px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {stages.map((s) => (
              <PlantArt key={s} species={sp} stage={s} progress={0.5} pot={potFor(params, sp)} size={size} light={NIGHT_LIGHT} title={`${speciesName(sp)}, ${PLANT_STAGE_NAMES[s]}, lamplight`} />
            ))}
          </div>
          <small style={{ ...label, color: '#CFC5C9' }}>{speciesName(sp)}</small>
        </div>
      ))}
    </div>
  );
}

function LightDemo({ params }: { params: URLSearchParams }) {
  const size = Number(params.get('size')) || 150;
  const picked = params.get('species') ? speciesFrom(params) : (['pothos', 'begonia', 'calathea', 'sunflower'] as PlantSpeciesId[]);
  const stage = Number(params.get('stage') ?? 6);
  return (
    <div style={grid(LIGHTS.length, size + 8, 120)}>
      <span />
      {LIGHTS.map((l) => (
        <small key={l.label} style={{ ...label, textAlign: 'center' }}>
          {l.label}
        </small>
      ))}
      {picked.map((sp) => (
        <Fragment key={sp}>
          <b style={label}>{speciesName(sp)}</b>
          {LIGHTS.map((l) => (
            <div key={l.label} style={{ ...(l.light.night ? nightTile : tile), padding: '4px' }}>
              <PlantArt species={sp} stage={stage} progress={0.6} pot={potFor(params, sp)} size={size} light={l.light} title={`${speciesName(sp)}, ${l.label.toLowerCase()}`} />
            </div>
          ))}
        </Fragment>
      ))}
    </div>
  );
}

function PotsDemo({ params }: { params: URLSearchParams }) {
  const size = Number(params.get('size')) || 104;
  return (
    <div style={grid(LIGHTS.length + 1, size + 8, 132)}>
      <span />
      {LIGHTS.map((l) => (
        <small key={l.label} style={{ ...label, textAlign: 'center' }}>
          {l.label}
        </small>
      ))}
      <small style={{ ...label, textAlign: 'center' }}>Damp · 40 px</small>
      {POT_IDS.map((pot) => (
        <Fragment key={pot}>
          <b style={label}>{potName(pot)}</b>
          {LIGHTS.map((l) => (
            <div key={l.label} style={{ ...(l.light.night ? nightTile : tile), padding: '4px' }}>
              <PotArt pot={pot} size={size} light={l.light} title={`${potName(pot)}, ${l.label.toLowerCase()}`} />
            </div>
          ))}
          <div style={{ ...tile, padding: '4px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '6px', height: `${size + 8}px` }}>
            <PotArt pot={pot} size={Math.round(size * 0.6)} damp />
            <PotArt pot={pot} size={40} />
          </div>
        </Fragment>
      ))}
    </div>
  );
}

/** Demo habits at card size (DESIGN §9.1): the plant at 40 px beside the name and the anchor. */
const CARD_DEMO: { name: string; note: string; line: string; species: PlantSpeciesId; stage: number; pot: PotId; done?: boolean }[] = [
  { name: 'Drink water', note: 'after coffee', line: '5 of 8 glasses', species: 'pilea', stage: 5, pot: 'ticking' },
  { name: 'Walk', note: 'after lunch', line: '26 of the last 30 days', species: 'monstera', stage: 6, pot: 'terracotta', done: true },
  { name: 'Read', note: 'before bed', line: '12 days', species: 'begonia', stage: 5, pot: 'cream' },
  { name: 'Stretch', note: 'after the alarm', line: 'Resting today', species: 'snakeplant', stage: 4, pot: 'cream' },
  { name: 'Yoga', note: 'Tuesdays', line: 'Rooting', species: 'pothos', stage: 1, pot: 'blush' },
  { name: 'Journal', note: 'with tea', line: 'Just planted', species: 'violet', stage: 0, pot: 'blush' },
  { name: 'Take vitamins', note: 'with breakfast', line: '2 of 3 this week', species: 'catgrass', stage: 3, pot: 'mug', done: true },
  { name: 'Meditate', note: 'first thing', line: '41 days', species: 'orchid', stage: 7, pot: 'speckled' },
  { name: 'Call family', note: 'Sundays', line: '3 of the last 4 weeks', species: 'hoya', stage: 6, pot: 'teacup' },
  { name: 'Practice a hobby', note: 'evenings', line: '9 of the last 10 days', species: 'strawberry', stage: 6, pot: 'terracotta' },
  { name: 'In bed by 11', note: 'lights out', line: '14 days', species: 'calathea', stage: 5, pot: 'midnight' },
  { name: 'Skincare', note: 'before bed', line: 'First bud showing', species: 'tulip', stage: 4, pot: 'rosy' },
  { name: 'Water the plants', note: 'Saturdays', line: '5 of the last 6 weeks', species: 'lavender', stage: 5, pot: 'speckled' },
  { name: 'Tidy for 10 min', note: 'after dinner', line: '12 in a row', species: 'catnip', stage: 5, pot: 'tincan' },
  { name: 'No-spend day', note: 'weekdays', line: 'Held off 8 days', species: 'xmascactus', stage: 5, pot: 'gourd' },
  { name: 'Go outside', note: 'at noon', line: '20 of the last 30 days', species: 'sunflower', stage: 5, pot: 'eggshell' },
];

/**
 * Today cards frame the plant as an icon (`fit="icon"`): cropped to the stage, so a cutting in its glass fills the
 * 40 px tile as fully as an Evergreen. `&fit=scene` shows the old full-canvas framing for comparison.
 */
function HabitCards({ params }: { params: URLSearchParams }) {
  const size = Number(params.get('size')) || 40;
  const fit = params.get('fit') === 'scene' ? 'scene' : 'icon';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
      {CARD_DEMO.map((c) => (
        <div key={c.name} style={{ ...tile, display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', border: '1px solid var(--line)' }}>
          <PlantArt species={c.species} stage={c.stage} progress={0.5} pot={c.pot} size={size} damp={c.done} fit={fit} title={`${speciesName(c.species)}, ${PLANT_STAGE_NAMES[c.stage]}`} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '19px', lineHeight: 1.15 }}>{c.name}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '14px', color: 'var(--ink-2)' }}>{c.note}</div>
            <div style={{ fontSize: '13px', color: 'var(--ink-2)', fontWeight: 600 }}>{c.line}</div>
          </div>
          <span aria-hidden style={{ width: '40px', height: '40px', flex: 'none', borderRadius: '50%', background: c.done ? 'var(--sky-500)' : 'transparent', border: c.done ? 'none' : '2px solid var(--control-border)' }} />
        </div>
      ))}
    </div>
  );
}

/** The habit card's plant (DESIGN §9.1): resident peeking from the rim, the icon on a stake; a mixed cast. */
const CARD_PLANTS: { species: PlantSpeciesId; stage: number; pot: PotId; pet?: string; icon: string; tone: 'blush' | 'sage' | 'sky' | 'butter' | 'lavender' | 'peach' | 'mint' | 'lilac' }[] = [
  { species: 'pilea', stage: 5, pot: 'ticking', pet: 'pet-cow-holstein', icon: 'water', tone: 'sky' },
  { species: 'monstera', stage: 6, pot: 'terracotta', pet: 'pet-dog-corgi', icon: 'walk', tone: 'sage' },
  { species: 'begonia', stage: 5, pot: 'cream', pet: 'pet-cat-calico', icon: 'book', tone: 'blush' },
  { species: 'snakeplant', stage: 4, pot: 'cream', pet: 'pet-duck-yellow', icon: 'stretch', tone: 'butter' },
  { species: 'pothos', stage: 1, pot: 'blush', pet: 'pet-frog-tree', icon: 'yoga', tone: 'mint' },
  { species: 'violet', stage: 0, pot: 'blush', icon: 'journal', tone: 'lavender' },
  { species: 'catgrass', stage: 3, pot: 'mug', pet: 'pet-bunny-lop', icon: 'vitamins', tone: 'peach' },
  { species: 'orchid', stage: 7, pot: 'speckled', pet: 'pet-hamster-syrian', icon: 'sparkle', tone: 'lilac' },
];

function CardPlants() {
  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      {[DAY_LIGHT, NIGHT_LIGHT].map((light) => (
        <div key={String(light.night)} class="gal-row" style={{ gap: '10px', padding: '12px', borderRadius: '14px', background: light.night ? '#2b2436' : 'var(--card)' }}>
          {CARD_PLANTS.map((c) => (
            <div key={c.species} style={{ display: 'grid', justifyItems: 'center', gap: '4px' }}>
              <CardPlant species={c.species} stage={c.stage} progress={0.5} pot={c.pot} residentPetId={c.pet} icon={c.icon} tone={c.tone} size={56} light={light} />
              <CardPlant species={c.species} stage={c.stage} progress={0.5} pot={c.pot} residentPetId={c.pet} icon={c.icon} tone={c.tone} size={40} light={light} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Blooms Like You (DESIGN §14.2): each look on a flowering plant, and Flourishes 0–8 on an Evergreen. */
const LOOKS: [string, PlantLookArt | undefined][] = [
  ['Classic', undefined],
  ['Dawn', { colour: 'dawn', shape: 'classic' }],
  ['Sunlit', { colour: 'sunlit', shape: 'classic' }],
  ['Twilight', { colour: 'twilight', shape: 'classic' }],
  ['Wildflower', { colour: 'wildflower', shape: 'classic' }],
  ['Petite', { colour: 'twilight', shape: 'petite' }],
  ['Paired (sky)', { colour: 'sunlit', shape: 'paired', partnerColour: 'sky' }],
];

function LooksDemo() {
  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      {(['begonia', 'violet', 'tulip'] as PlantSpeciesId[]).map((sp) => (
        <div key={sp} class="gal-row" style={{ gap: '8px' }}>
          {LOOKS.map(([name, look]) => (
            <div key={name} class="gal-cell" style={{ ...tile, padding: '6px' }}>
              <PlantArt species={sp} stage={6} pot="cream" size={96} look={look} />
              <small>{name}</small>
            </div>
          ))}
        </div>
      ))}
      <div class="gal-row" style={{ gap: '8px' }}>
        {Array.from({ length: FLOURISHES.length + 1 }, (_, n) => (
          <div key={n} class="gal-cell" style={{ ...tile, padding: '6px' }}>
            <PlantArt species="pothos" stage={7} pot="terracotta" size={96} flourishes={n} />
            <small>{n === 0 ? 'Evergreen' : `+ ${FLOURISHES[n - 1]}`}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The Progress screen's and the rituals' drawings: day glyphs, pressings, note cards and the month's jar. */
function ProgressArt() {
  const days: [Parameters<typeof DayGlyph>[0]['state'], number | null, string][] = [
    ['done', 1, 'done'],
    ['done', null, 'done (weekly)'],
    ['partial', 0.66, '2 of 3'],
    ['partial', 0.25, '1 of 4'],
    ['tiny', 1, 'tiny'],
    ['rest', null, 'rest'],
    ['off', null, 'off'],
    ['paused', null, 'paused'],
    ['none', 0, 'empty'],
  ];
  const stems = (['begonia', 'pothos', 'lavender', 'violet', 'catgrass', 'tulip', 'pilea'] as PlantSpeciesId[]).map((plant, i) => ({ habitId: `h${i}`, plant }));
  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      {[DAY_LIGHT, NIGHT_LIGHT].map((light) => (
        <div key={String(light.night)} style={{ display: 'grid', gap: '10px', padding: '12px', borderRadius: '14px', background: light.night ? '#2b2436' : 'var(--card)', color: light.night ? '#f4ede6' : undefined }}>
          <div class="gal-row" style={{ gap: '12px' }}>
            {days.map(([state, fraction, label]) => (
              <div key={label} style={{ display: 'grid', justifyItems: 'center', gap: '2px', fontSize: '11px' }}>
                <DayGlyph state={state} fraction={fraction} size={32} light={light} />
                <DayGlyph state={state} fraction={fraction} size={16} light={light} />
                {label}
              </div>
            ))}
          </div>
          <div class="gal-row" style={{ gap: '14px', alignItems: 'flex-end' }}>
            {([['begonia', 1, 0], ['pothos', 0.6, 2], ['lavender', 0.25, 4], ['violet', 0.05, 6]] as [PlantSpeciesId, number, number][]).map(([sp, share, rests]) => (
              <Pressing key={sp} species={sp} share={share} rests={rests} size={110} light={light} />
            ))}
            <NoteCard kind="sundayNote" sketch="read" size={120} light={light} />
            <NoteCard kind="herbarium" pressings={[{ species: 'begonia', share: 0.9 }, { species: 'lavender', share: 0.5, rests: 2 }, { species: 'pothos', share: 0.3 }]} size={120} light={light} />
            <NoteCard kind="anniversary" size={96} light={light} />
            <NoteCard kind="story" size={96} light={light} />
            <MonthJar stems={stems} size={120} light={light} />
            <MonthJar stems={stems.slice(0, 1)} size={80} light={light} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Small-size tests: the same plants at 64, 32 and 20 px, framed as icons (`&fit=scene` for the full canvas). */
function SmallSizes({ params }: { params: URLSearchParams }) {
  const stage = Number(params.get('stage') ?? 5);
  const fit = params.get('fit') === 'scene' ? 'scene' : 'icon';
  return (
    <div class="gal-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
      {speciesFrom(params).map((sp) => (
        <div class="gal-cell" key={sp}>
          <div class="gal-row" style={{ gap: '6px', alignItems: 'flex-end' }}>
            {[64, 32, 20].map((s) => (
              <PlantArt key={s} species={sp} stage={stage} progress={0.5} pot={potFor(params, sp)} size={s} fit={fit} />
            ))}
          </div>
          <small>{speciesName(sp)}</small>
        </div>
      ))}
    </div>
  );
}

/** The water glass close up: stage 0 and 1 at the start, middle and end of each stage, beside the empty pot it will go in (`&pot=none` hides it). */
function GlassDemo({ params }: { params: URLSearchParams }) {
  const size = Number(params.get('size')) || 180;
  const steps: [number, number][] = [
    [0, 0],
    [0, 0.9],
    [1, 0],
    [1, 0.5],
    [1, 0.95],
  ];
  return (
    <div style={grid(steps.length, size + 8, 120)}>
      <span />
      {steps.map(([s, p]) => (
        <small key={`${s}${p}`} style={{ ...label, textAlign: 'center' }}>
          {PLANT_STAGE_NAMES[s]} · {Math.round(p * 100)}%
        </small>
      ))}
      {speciesFrom(params).map((sp) => (
        <Fragment key={sp}>
          <b style={label}>{speciesName(sp)}</b>
          {steps.map(([s, p]) => (
            <div key={`${s}${p}`} style={{ ...tile, padding: '4px' }}>
              <PlantArt species={sp} stage={s} progress={p} pot={potFor(params, sp)} withPot={params.get('pot') !== 'none'} size={size} title={`${speciesName(sp)}, ${PLANT_STAGE_NAMES[s]}`} />
            </div>
          ))}
        </Fragment>
      ))}
    </div>
  );
}

function BloomsDemo({ params }: { params: URLSearchParams }) {
  const size = Number(params.get('size')) || 110;
  const stage = Number(params.get('stage') ?? 6);
  return (
    <div class="gal-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${size * 4 + 40}px, 1fr))` }}>
      {speciesFrom(params).map((sp) => (
        <div class="gal-cell" key={sp}>
          <div class="gal-row" style={{ gap: '4px' }}>
            {[0, 2, 4, 6].map((b) => (
              <PlantArt key={b} species={sp} stage={stage} blooms={b} pot={potFor(params, sp)} size={size} />
            ))}
          </div>
          <small>
            {speciesName(sp)} · {PLANT_STAGE_NAMES[stage]} · blooms 0, 2, 4, 6
          </small>
        </div>
      ))}
    </div>
  );
}

/** Interactive: water the plants to replay the leaf lift and the glint (shoot with --motion). */
function WaterDemo() {
  const [pulse, setPulse] = useState(0);
  const row: [PlantSpeciesId, number, PotId][] = [
    ['pothos', 1, 'terracotta'],
    ['pilea', 3, 'ticking'],
    ['begonia', 5, 'cream'],
    ['monstera', 6, 'terracotta'],
    ['tulip', 5, 'rosy'],
    ['catgrass', 0, 'mug'],
  ];
  return (
    <div class="gal-cell" style={{ alignItems: 'flex-start' }}>
      <button type="button" onClick={() => setPulse((p) => p + 1)} style={{ padding: '8px 16px', borderRadius: '99px', background: 'var(--sky-300)', fontWeight: 700 }}>
        Water them ({pulse})
      </button>
      <div class="gal-row">
        {row.map(([sp, s, pot]) => (
          <PlantArt key={sp} species={sp} stage={s} progress={0.5} pot={pot} size={140} pulse={pulse} animated />
        ))}
      </div>
      <div class="gal-row">
        {row.map(([sp, s, pot]) => (
          <PlantArt key={sp} species={sp} stage={s} progress={0.5} pot={pot} size={40} pulse={pulse} animated fit="icon" />
        ))}
      </div>
    </div>
  );
}

function Panel({ children, dark }: { children: ComponentChildren; dark?: boolean }) {
  return <div style={{ ...(dark ? nightTile : tile), padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '18px' }}>{children}</div>;
}

/** Size of the plants the demo tags stand in. */
const TAG_PLANT = 160;

function TagsDemo() {
  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      <Panel>
        <PlantTag name="Read" size={11} />
        <PlantTag name="Drink water" note="after coffee" size={14} />
        <PlantTag name="Walk" note="after lunch" size={18} />
        <PlantTag name="Journal" note="with tea" size={24} />
        <PlantTag name="Stretch" note="after the alarm" size={14} stand="propped" />
        <PlantTag name="Water the fern on the landing, and the one by the door" note="every other Saturday morning, before the market" size={14} />
      </Panel>
      <Panel>
        {(['begonia', 'pilea', 'pothos'] as PlantSpeciesId[]).map((sp, i) => {
          // The stake's foot lands on the soil line (tagAnchor), so the tag stands in the pot, not in mid-air.
          const pot = HOME_POT[sp] ?? 'terracotta';
          const at = tagAnchor(pot);
          const px = TAG_PLANT / 100;
          return (
            <div key={sp} style={{ position: 'relative', width: `${TAG_PLANT}px`, height: `${TAG_PLANT}px` }}>
              <PlantArt species={sp} stage={i + 3} progress={0.5} pot={pot} size={TAG_PLANT} />
              <PlantTag name={['Read', 'Drink water', 'Walk'][i]!} size={10} style={{ position: 'absolute', left: `${at.x * px}px`, bottom: `${TAG_PLANT - at.y * px}px`, transform: 'translateX(-50%)' }} />
            </div>
          );
        })}
      </Panel>
      <Panel dark>
        <PlantTag name="In bed by 11" note="lights out" size={14} />
        <PlantTag name="Read" size={18} />
        <PlantArt species="calathea" stage={5} pot="midnight" size={120} light={NIGHT_LIGHT} />
      </Panel>
    </div>
  );
}

export const SECTIONS: GallerySection[] = [
  { id: 'garden-matrix', title: 'Plants: every species × every stage, window light (120 px)', render: (params) => <Matrix params={params} /> },
  { id: 'garden-night', title: 'Plants: lamplight (Rooting, Leafy, Blooming, Evergreen)', render: (params) => <NightRow params={params} /> },
  { id: 'garden-light', title: 'Plants: the window on the left, overhead, on the right, and the lamp', render: (params) => <LightDemo params={params} /> },
  { id: 'garden-pots', title: 'Pots: every pot in every light, damp soil, and at 40 px', render: (params) => <PotsDemo params={params} /> },
  { id: 'garden-cards', title: 'Plants at card size (40 px)', render: (params) => <HabitCards params={params} /> },
  { id: 'garden-cardplant', title: 'The card plant: resident peeking, the icon on a stake (56 and 40 px, day and lamplight)', render: () => <CardPlants /> },
  { id: 'garden-looks', title: 'Blooms Like You looks, and the Flourishes', render: () => <LooksDemo /> },
  { id: 'garden-progress', title: 'Progress and ritual art: day glyphs (32 and 16 px), pressings, note cards, the month’s jar', render: () => <ProgressArt /> },
  { id: 'garden-small', title: 'Plants at 64, 32 and 20 px', render: (params) => <SmallSizes params={params} /> },
  { id: 'garden-glass', title: 'The water glass: Cutting and Rooting, close up, beside the empty pot', render: (params) => <GlassDemo params={params} /> },
  { id: 'garden-blooms', title: 'Blooms: 0, 2, 4 and 6 showing', render: (params) => <BloomsDemo params={params} /> },
  { id: 'garden-water', title: 'Watering: a leaf lift and a glint on damp soil (tap to replay)', render: () => <WaterDemo /> },
  { id: 'garden-tags', title: 'Plant tags', render: () => <TagsDemo /> },
];
