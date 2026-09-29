/** Gallery sections for the shelf module: the Sill, the Today band, the places and the vignettes. */
import type { JSX } from 'preact';
import { useRef } from 'preact/hooks';
import type { SillPot, ShelfPet, ShelfDecor } from '@/art/scene';
import { CoinJar, PlaceArt, ShelfScene, SillScene, TableLamp, WindowsillBand, momentAt, lightAtSun, type Moment, type WindowsillBandHandle } from '@/art/scene';
import { DAY_LIGHT, NIGHT_LIGHT, type Light } from '@/art/light';
import type { PlaceId } from '@/catalog/types';
import { PLACES } from '@/catalog/places';
import { DECOR as CATALOG_DECOR } from '@/catalog/collectibles';
import { DECOR_ENTRIES } from '@/art/scene/decor';
import type { GallerySection } from './sections';

const POTS: SillPot[] = [
  { habitId: 'walk', name: 'Walk', note: 'after lunch', species: 'pothos', stage: 6, pot: 'terracotta', damp: true },
  { habitId: 'water', name: 'Drink water', note: 'after coffee', species: 'pilea', stage: 4, pot: 'cream' },
  { habitId: 'read', name: 'Read', note: 'before bed', species: 'begonia', stage: 5, pot: 'blush' },
  { habitId: 'stretch', name: 'Stretch', species: 'snakeplant', stage: 3, pot: 'speckled' },
  { habitId: 'grass', name: 'Tidy 10 min', species: 'catgrass', stage: 5, pot: 'cream' },
  { habitId: 'yoga', name: 'Yoga', species: 'pothos', stage: 1, pot: 'blush' },
];

const PETS: ShelfPet[] = [
  { petId: 'pet-cat-grey', name: 'Pepper', personality: 'sleepy', home: 'walk' },
  { petId: 'pet-cow-highland', name: 'Hattie', personality: 'gentle', home: 'water' },
  { petId: 'pet-cat-calico', name: 'Juniper', personality: 'sunny' },
  { petId: 'pet-cow-beltie', name: 'Oreo', personality: 'dreamy' },
  { petId: 'pet-frog-tree', name: 'Basil', personality: 'curious' },
];

const DECOR: ShelfDecor[] = [];

/** A pinned moment: `sun` 0 morning … 1 evening on a September day, or night. */
function at(sun: number, night = false, hour = night ? 21.5 : 7 + sun * 12): Moment {
  const base = momentAt(new Date(2026, 8, 29, 12));
  return { ...base, light: lightAtSun(sun, night), time: night ? 'night' : sun < 0.2 ? 'dawn' : sun > 0.8 ? 'golden' : 'day', hour };
}

const TIMES: { label: string; moment: Moment }[] = [
  { label: 'Morning · 8:40 am', moment: at(0.12) },
  { label: 'Midday · 1:10 pm', moment: at(0.5) },
  { label: 'Evening · 6:20 pm', moment: at(0.9) },
  { label: 'Night · 9:30 pm', moment: at(1, true) },
];

function Frame({ w, h, label, children }: { w: number; h: number; label: string; children: JSX.Element }) {
  return (
    <figure style={{ margin: 0, display: 'grid', gap: '6px' }}>
      <div style={{ width: `${w}px`, height: `${h}px`, borderRadius: '18px', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>{children}</div>
      <figcaption style={{ fontSize: '12px', color: 'var(--ink-2)' }}>{label}</figcaption>
    </figure>
  );
}

export const SECTIONS: GallerySection[] = [
  {
    id: 'shelf-sill',
    title: 'The Sill · 390×300 through the day',
    render: (params) => {
      const w = Number(params.get('w') ?? 390);
      const h = Number(params.get('h') ?? 300);
      return (
        <div class="gal-row" style={{ alignItems: 'flex-start' }}>
          {TIMES.map((t) => (
            <Frame key={t.label} w={w} h={h} label={t.label}>
              <SillScene pots={POTS} pets={PETS} decor={DECOR} coins={142} moment={t.moment} live={false} style={{ width: '100%', height: '100%' }} />
            </Frame>
          ))}
        </div>
      );
    },
  },
];

const SEASON_MONTHS: { label: string; month: number }[] = [
  { label: 'Spring · April', month: 3 },
  { label: 'Summer · July', month: 6 },
  { label: 'Autumn · October', month: 9 },
  { label: 'Winter · January', month: 0 },
];

SECTIONS.push({
  id: 'shelf-seasons',
  title: 'The Sill and the Balcony Box through the year · midday and night',
  render: () => (
    <div style={{ display: 'grid', gap: '16px' }}>
      {[false, true].map((night) => (
        <div key={String(night)} class="gal-row" style={{ alignItems: 'flex-start' }}>
          {SEASON_MONTHS.map((m) => {
            const base = momentAt(new Date(2026, m.month, 12, 12));
            const moment: Moment = { ...base, light: lightAtSun(0.5, night), time: night ? 'night' : 'day', hour: night ? 21.5 : 13 };
            return (
              <Frame key={m.label} w={300} h={200} label={`${m.label}${night ? ' · night' : ''}`}>
                <ShelfScene pots={POTS.slice(0, 2)} pets={[]} places={['balcony']} open="start" moment={moment} live={false} style={{ width: '100%', height: '100%' }} />
              </Frame>
            );
          })}
        </div>
      ))}
      <div class="gal-row" style={{ alignItems: 'flex-start' }}>
        {SEASON_MONTHS.map((m) => {
          const base = momentAt(new Date(2026, m.month, 12, 12));
          return (
            <Frame key={m.label} w={300} h={200} label={`${m.label} · Balcony Box`}>
              <ShelfScene pots={POTS.slice(0, 1)} pets={[]} retired={RETIRED_SHORT} places={['balcony']} open="balcony" moment={{ ...base, light: lightAtSun(0.55), time: 'day', hour: 13 }} live={false} style={{ width: '100%', height: '100%' }} />
            </Frame>
          );
        })}
      </div>
    </div>
  ),
});

const RETIRED_SHORT: SillPot[] = [{ habitId: 'old-run', name: 'Run', species: 'lavender', stage: 7, pot: 'terracotta' }];

const BAND_POTS = POTS.slice(0, 5);

/** The chips the Today screen lays over the band, mocked for review. */
function Chips({ collapsed, night }: { collapsed: boolean; night: boolean }) {
  const chip: JSX.CSSProperties = {
    position: 'absolute',
    top: collapsed ? '14px' : '12px',
    background: night ? 'rgba(45, 39, 51, 0.88)' : 'rgba(255, 253, 249, 0.85)',
    color: night ? '#f4ede6' : '#3b3236',
    borderRadius: '14px',
    padding: collapsed ? '6px 12px' : '8px 14px',
    zIndex: 1000,
  };
  return (
    <>
      <div style={{ ...chip, left: '16px' }}>
        {collapsed ? (
          <b style={{ font: '700 14px var(--font-body)' }}>Tue 29 · 3 of 5</b>
        ) : (
          <>
            <div style={{ font: '700 12px var(--font-body)', opacity: 0.8 }}>Tuesday, Sep 29</div>
            <div style={{ font: '20px var(--font-display)' }}>{night ? 'Good evening, Sam' : 'Good afternoon, Sam'}</div>
          </>
        )}
      </div>
      <div style={{ ...chip, right: '16px', borderRadius: '999px', font: '700 15px var(--font-body)' }}>
        <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '50%', background: '#EDCB72', boxShadow: 'inset 0 0 0 2px #D2A24B', verticalAlign: '-2px', marginRight: '6px' }} />
        142
      </div>
    </>
  );
}

function BandFrame({ moment, collapse, label }: { moment: Moment; collapse: number; label: string }) {
  const visible = 168 - 104 * collapse;
  return (
    <figure style={{ margin: 0, display: 'grid', gap: '6px' }}>
      <div style={{ position: 'relative', width: '390px', height: `${visible}px`, overflow: 'hidden', borderRadius: '14px', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ position: 'absolute', inset: 0, height: '168px', top: 0 }}>
          <WindowsillBand pots={BAND_POTS} pets={PETS} coins={142} moment={moment} collapse={collapse} onWindowTap={() => {}} />
        </div>
        <Chips collapsed={collapse > 0.5} night={moment.light.night} />
      </div>
      <figcaption style={{ fontSize: '12px', color: 'var(--ink-2)' }}>{label}</figcaption>
    </figure>
  );
}

function Choreography() {
  const band = useRef<WindowsillBandHandle>(null);
  const button: JSX.CSSProperties = { font: '700 13px var(--font-body)', padding: '8px 14px', borderRadius: '999px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)' };
  return (
    <div style={{ display: 'grid', gap: '10px', width: '390px' }}>
      <div style={{ position: 'relative', height: '168px', overflow: 'hidden', borderRadius: '14px', boxShadow: 'var(--shadow-md)' }}>
        <WindowsillBand ref={band} pots={BAND_POTS} pets={PETS} coins={142} moment={at(0.62)} />
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button type="button" style={button} onClick={() => band.current?.pour('water')}>Pour on Drink water</button>
        <button type="button" style={button} onClick={() => band.current?.coinToJar()}>Coin to the jar</button>
        <button type="button" style={button} onClick={() => band.current?.react('pet-cat-grey')}>Pepper looks up</button>
      </div>
    </div>
  );
}

SECTIONS.push(
  {
    id: 'shelf-band',
    title: 'The Today band · 168 px and 64 px, day and night',
    render: () => (
      <div style={{ display: 'grid', gap: '18px' }}>
        <div class="gal-row" style={{ alignItems: 'flex-start' }}>
          <BandFrame moment={at(0.62)} collapse={0} label="Afternoon · open" />
          <BandFrame moment={at(1, true)} collapse={0} label="Night · open" />
        </div>
        <div class="gal-row" style={{ alignItems: 'flex-start' }}>
          <BandFrame moment={at(0.62)} collapse={1} label="Afternoon · collapsed to 64 px" />
          <BandFrame moment={at(1, true)} collapse={1} label="Night · collapsed" />
          <BandFrame moment={at(0.62)} collapse={0.5} label="Halfway" />
        </div>
      </div>
    ),
  },
  {
    id: 'shelf-choreography',
    title: 'Check-in choreography (tap the buttons)',
    render: () => <Choreography />,
  },
);

/** Everyone out across every place. */
const HOUSEHOLD: ShelfPet[] = [
  ...PETS,
  { petId: 'pet-duck-yellow', name: 'Sunny', personality: 'playful', place: 'pond' },
  { petId: 'pet-duck-pekin', name: 'Dumpling', personality: 'curious', place: 'pond' },
  { petId: 'pet-frog-tomato', name: 'Poppy', personality: 'sleepy', place: 'pond' },
  { petId: 'pet-cow-holstein', name: 'Clover', personality: 'gentle', place: 'grass' },
  { petId: 'pet-bunny-dutch', name: 'Toffee', personality: 'curious', place: 'grass' },
  { petId: 'pet-cat-black', name: 'Olive', personality: 'dreamy', place: 'bookshelf' },
  { petId: 'pet-cat-orange', name: 'Pudding', personality: 'sleepy', place: 'bookshelf' },
  { petId: 'pet-dog-shiba', name: 'Kinako', personality: 'sunny', place: 'balcony' },
  { petId: 'pet-hamster-syrian', name: 'Nugget', personality: 'foodie', place: 'balcony' },
  { petId: 'pet-bear-brown', name: 'Honey', personality: 'sleepy', place: 'quilt' },
  { petId: 'pet-dog-corgi', name: 'Waffles', personality: 'dramatic', place: 'quilt' },
  { petId: 'pet-hamster-winterwhite', name: 'Onigiri', personality: 'shy', place: 'quilt' },
];

const RETIRED: SillPot[] = [
  { habitId: 'old-run', name: 'Run', species: 'lavender', stage: 7, pot: 'terracotta' },
  { habitId: 'old-piano', name: 'Piano', species: 'violet', stage: 6, pot: 'rosy' },
  { habitId: 'old-french', name: 'French', species: 'hoya', stage: 7, pot: 'speckled' },
];

const ALL_PLACES: PlaceId[] = PLACES.map((p) => p.id);

SECTIONS.push(
  {
    id: 'shelf-places',
    title: 'Places on the map · open, not yet opened, and at night',
    render: () => (
      <div style={{ display: 'grid', gap: '14px' }}>
        {[
          { label: 'Open, afternoon', moment: at(0.62), locked: false },
          { label: 'Not yet opened', moment: at(0.62), locked: true },
          { label: 'Open, night', moment: at(1, true), locked: false },
        ].map((row) => (
          <div key={row.label} style={{ display: 'grid', gap: '6px' }}>
            <small style={{ color: 'var(--ink-2)' }}>{row.label}</small>
            <div class="gal-row" style={{ alignItems: 'flex-end' }}>
              {PLACES.map((p) => (
                <figure key={p.id} style={{ margin: 0, display: 'grid', gap: '4px' }}>
                  <PlaceArt place={p.id} locked={row.locked && p.price > 0} moment={row.moment} width={200} />
                  <figcaption style={{ fontSize: '12px', color: 'var(--ink-2)' }}>{p.name}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'shelf-place-scenes',
    title: 'Each place in the Shelf · 390×300, day and night',
    render: () => (
      <div style={{ display: 'grid', gap: '16px' }}>
        {PLACES.filter((p) => p.id !== 'sill').map((p) => (
          <div key={p.id} class="gal-row" style={{ alignItems: 'flex-start' }}>
            {[at(0.55), at(1, true, 23.5)].map((m, i) => (
              <Frame key={i} w={390} h={300} label={`${p.name} · ${i === 0 ? 'day' : 'night'}`}>
                <ShelfScene pots={POTS} pets={HOUSEHOLD} retired={RETIRED} places={[p.id]} coins={142} moment={m} live={false} open={p.id} style={{ width: '100%', height: '100%' }} />
              </Frame>
            ))}
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'shelf-full',
    title: 'The whole Shelf, every place open',
    render: (params) => {
      const live = params.get('live') === '1';
      return (
        <div style={{ display: 'grid', gap: '16px' }}>
          <Frame w={1500} h={300} label="Afternoon, scrolled to the sun">
            <ShelfScene pots={POTS} pets={HOUSEHOLD} retired={RETIRED} places={ALL_PLACES} coins={142} moment={at(0.62)} live={live} style={{ width: '100%', height: '100%' }} />
          </Frame>
          <Frame w={390} h={300} label="Phone, scrolled to the lamp at night">
            <ShelfScene pots={POTS} pets={HOUSEHOLD} retired={RETIRED} places={ALL_PLACES} coins={142} moment={at(1, true)} live={live} style={{ width: '100%', height: '100%' }} />
          </Frame>
        </div>
      );
    },
  },
  {
    id: 'shelf-vignettes',
    title: 'Vignettes',
    render: () => (
      <div class="gal-row" style={{ alignItems: 'flex-start' }}>
        <Frame w={390} h={300} label="A cat asleep on a cow’s back">
          <SillScene pots={POTS.slice(0, 2)} pets={[{ petId: 'pet-cow-beltie', name: 'Oreo' }, { petId: 'pet-cat-calico', name: 'Juniper' }]} coins={60} moment={at(0.45)} vignette="cat-on-cow" style={{ width: '100%', height: '100%' }} />
        </Frame>
        <Frame w={390} h={300} label="Ducks walking in a line">
          <ShelfScene pots={POTS.slice(0, 1)} pets={['pet-duck-yellow', 'pet-duck-pekin', 'pet-duck-call', 'pet-duck-mallard'].map((petId) => ({ petId, place: 'balcony' as const }))} places={['balcony']} open="balcony" moment={at(0.55)} vignette={{ id: 'duck-line', place: 'balcony' }} style={{ width: '100%', height: '100%' }} />
        </Frame>
        <Frame w={390} h={300} label="The nap pile on the Quilt, late">
          <ShelfScene pots={POTS.slice(0, 1)} pets={HOUSEHOLD.filter((p) => p.place === 'quilt').concat([{ petId: 'pet-cat-calico', place: 'quilt' }])} places={['quilt']} open="quilt" moment={at(1, true, 23.5)} vignette={{ id: 'nap-pile', place: 'quilt' }} style={{ width: '100%', height: '100%' }} />
        </Frame>
        <Frame w={390} h={300} label="A rabbit sniffing a new leaf">
          <SillScene pots={POTS.slice(0, 3)} pets={[{ petId: 'pet-bunny-lop', name: 'Biscuit' }]} coins={30} moment={at(0.35)} vignette="bunny-leaf" style={{ width: '100%', height: '100%' }} />
        </Frame>
      </div>
    ),
  },
);

const LIGHTS: { label: string; light: Light }[] = [
  { label: 'light from the left', light: DAY_LIGHT },
  { label: 'from the top', light: { from: 'top', night: false } },
  { label: 'from the right', light: { from: 'right', night: false } },
  { label: 'lamplight', light: NIGHT_LIGHT },
];

function Swatch({ night, children, label }: { night: boolean; children: JSX.Element; label: string }) {
  return (
    <figure style={{ margin: 0, display: 'grid', gap: '4px', justifyItems: 'center' }}>
      <div style={{ width: '132px', height: '132px', borderRadius: '14px', background: night ? '#34304A' : '#EFE5D8', display: 'grid', placeItems: 'center', '--shade': night ? 'rgba(10, 8, 22, 0.3)' : 'rgba(94, 76, 154, 0.16)', '--contact': night ? 'rgba(0, 0, 0, 0.22)' : 'rgba(59, 50, 54, 0.08)' } as JSX.CSSProperties}>
        {children}
      </div>
      <figcaption style={{ fontSize: '11px', color: 'var(--ink-2)' }}>{label}</figcaption>
    </figure>
  );
}

SECTIONS.push({
  id: 'shelf-props',
  title: 'The coin jar and the lamp · every light, and the jar filling',
  render: () => (
    <div style={{ display: 'grid', gap: '14px' }}>
      <div class="gal-row">
        {LIGHTS.map((l) => (
          <Swatch key={l.label} night={l.light.night} label={`Jar · ${l.label}`}>
            <div style={{ width: '120px', height: '120px' }}>
              <CoinJar coins={260} light={l.light} />
            </div>
          </Swatch>
        ))}
        {LIGHTS.map((l) => (
          <Swatch key={l.label} night={l.light.night} label={`Lamp · ${l.label}`}>
            <div style={{ width: '120px', height: '120px' }}>
              <TableLamp light={l.light} />
            </div>
          </Swatch>
        ))}
      </div>
      <div class="gal-row" style={{ alignItems: 'flex-end' }}>
        {[0, 1, 25, 142, 400, 700, 1000, 5000].map((c) => (
          <Swatch key={c} night={false} label={c === 1 ? '1 coin' : `${c} coins`}>
            <div style={{ width: '96px', height: '96px' }}>
              <CoinJar coins={c} />
            </div>
          </Swatch>
        ))}
        {[40, 28].map((px) => (
          <Swatch key={px} night={false} label={`${px} px`}>
            <div style={{ width: `${px}px`, height: `${px}px` }}>
              <CoinJar coins={260} />
            </div>
          </Swatch>
        ))}
      </div>
    </div>
  ),
});

/** Twelve decor items: catalog ids that have art, topped up with whatever else is drawn. */
function busyDecor(): ShelfDecor[] {
  const ids = CATALOG_DECOR.map((d) => d.id).filter((id) => DECOR_ENTRIES[id]);
  for (const id of Object.keys(DECOR_ENTRIES)) if (ids.length < 12 && !ids.includes(id)) ids.push(id);
  return ids.slice(0, 12).map((itemId, i) => ({ itemId, flip: i % 3 === 1 }));
}

const EIGHT: ShelfPet[] = [...PETS, { petId: 'pet-bunny-lop', personality: 'shy' }, { petId: 'pet-duck-yellow', personality: 'playful' }, { petId: 'pet-hamster-syrian', personality: 'foodie' }];

SECTIONS.push({
  id: 'shelf-busy',
  title: 'The busiest Sill · 6 plants, 8 pets, 12 decor (live)',
  render: (params) => (
    <div style={{ display: 'grid', gap: '16px' }}>
      <Frame w={1400} h={300} label="Afternoon">
        <SillScene pots={POTS} pets={EIGHT} decor={busyDecor()} coins={420} moment={at(0.6)} live={params.get('live') !== '0'} style={{ width: '100%', height: '100%' }} />
      </Frame>
      <Frame w={1400} h={300} label="Late at night: beds first, then under the lamp">
        <SillScene pots={POTS} pets={EIGHT} decor={busyDecor()} coins={420} moment={at(1, true, 23.5)} live={false} style={{ width: '100%', height: '100%' }} />
      </Frame>
    </div>
  ),
});
