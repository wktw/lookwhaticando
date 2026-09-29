import type { ComponentChildren, JSX } from 'preact';
import { useState } from 'preact/hooks';
import { MACHINES, getMachine } from '@/catalog/machines';
import { getCollectible, itemsInMachine, SECRET_IDS } from '@/catalog/collectibles';
import type { MachineDef } from '@/catalog/types';
import { DAY_LIGHT, NIGHT_LIGHT, type Light } from '@/art/light';
import { CabinetArt } from '@/art/machines/CabinetArt';
import { CapsuleArt, OpenCapsuleArt, type CapsuleFinish } from '@/art/machines/CapsuleArt';
import { CollectibleArt } from '@/art/CollectibleArt';
import { WindowCapsules, ShellSymbol, CapsuleLightSymbols } from '@/art/machines/WindowCapsules';
import { settledPile } from '@/art/machines/pile';
import { lighting } from '@/art/machines/lighting';
import { CAPSULE_R, CHUTE_CAPSULE_R, CHUTE_REST, SLOT } from '@/art/machines/geometry';
import { CapsulesScreen } from '@/features/capsules/CapsulesScreen';
import { CapsuleMachine } from '@/features/capsules/CapsuleMachine';
import { FirstPick } from '@/features/capsules/FirstPick';
import { RevealOverlay, type RevealStage } from '@/features/capsules/RevealOverlay';
import { RevealCard } from '@/features/capsules/RevealCard';
import { LineupSheet } from '@/features/capsules/LineupSheet';
import { OddsSheet } from '@/features/capsules/OddsSheet';
import { SpecialOrderSheet } from '@/features/capsules/SpecialOrder';
import { SwapRing } from '@/features/capsules/SwapRing';
import { WalletStrip } from '@/features/capsules/WalletStrip';
import { LeafletCard } from '@/features/capsules/Leaflet';
import { Token } from '@/features/capsules/Token';
import { CapsuleFigure } from '@/features/capsules/CapsuleFigure';
import type { RevealData } from '@/features/capsules/reveal';
import type { Payment } from '@/features/capsules/payment';
import { state } from '@/state/store';
import type { PullOutcome } from '@/state/api';
import type { GallerySection } from './sections';

const LIGHTS: [string, Light][] = [
  ['day · window left', DAY_LIGHT],
  ['day · window above', { from: 'top', night: false }],
  ['day · window right', { from: 'right', night: false }],
  ['night · the lamp', NIGHT_LIGHT],
];

const NIGHT_CELL: JSX.CSSProperties = { background: '#1e1a22', color: '#f4ede6' };

let seeded = false;

/** A few finds across the counter so progress, ticks and the swap ring have something to show. */
const DEMO_OWNED: Record<string, number> = {
  'pet-cat-orange': 2,
  'pet-cat-calico': 1,
  'pet-cat-tuxedo': 1,
  'pet-cat-grey': 1,
  'wear-bell-collar': 3,
  'treat-fish-crackers': 1,
  'decor-cardboard-box': 1,
  'pet-cow-holstein': 1,
  'pet-cow-beltie': 2,
  'treat-strawberry-milk': 1,
  'wear-cowbell': 1,
};

/**
 * Dev helper: a wallet worth pulling with (once per page; peek() so the gallery doesn't subscribe).
 * URL overrides: &coins=10 &stamps=0 &tickets=0 &swaps=7 &quick=1 (quick open).
 */
function seedWallet(params: URLSearchParams) {
  if (seeded) return;
  seeded = true;
  const s = state.peek();
  const collection = { ...s.collection };
  for (const [id, count] of Object.entries(DEMO_OWNED)) collection[id] = { count, firstAt: 0 };
  const num = (key: string, fallback: number) => Number(params.get(key) ?? fallback);
  state.value = {
    ...s,
    collection,
    profile: { ...s.profile, createdAt: Date.UTC(2026, 6, 1) },
    settings: { ...s.settings, quickOpen: params.get('quick') === '1' },
    wallet: { coins: num('coins', 500), stars: num('stamps', 20), stardust: num('swaps', 7), tickets: num('tickets', 2) },
  };
}

/**
 * The dev counter's pull (the store is still a stub): pays, picks something from the series,
 * favouring what you don't have, and adds it to the collection. &pick=<item id> forces a result.
 */
function demoPull(params: URLSearchParams) {
  return (machineId: MachineDef['id'], opts: { useTicket?: boolean; free?: boolean } = {}): PullOutcome => {
    const s = state.peek();
    const m = getMachine(machineId);
    const items = itemsInMachine(machineId);
    const forced = params.get('pick');
    const fresh = items.filter((i) => !s.collection[i.id]);
    const pool = fresh.length ? fresh : items;
    const item = (forced && getCollectible(forced)) || pool[Math.floor(Math.random() * pool.length)]!;
    const had = s.collection[item.id];
    const wallet = { ...s.wallet };
    if (opts.useTicket) wallet.tickets -= 1;
    else if (!opts.free) m.currency === 'coins' ? (wallet.coins -= m.price) : (wallet.stars -= m.price);
    const stardust = had ? { common: 2, uncommon: 4, rare: 8, ultra: 15 }[item.rarity] : 0;
    wallet.stardust += stardust;
    state.value = { ...s, wallet, collection: { ...s.collection, [item.id]: { count: (had?.count ?? 0) + 1, firstAt: had?.firstAt ?? Date.now() } } };
    return {
      ok: true,
      machineId,
      itemId: item.id,
      rarity: item.rarity,
      secret: SECRET_IDS.has(item.id),
      isNew: !had,
      stardust,
      fusedStars: 0,
      pity: { rareIn: 9, ultraIn: 39 },
      dupStreak: 0,
      paidWith: opts.useTicket ? 'ticket' : opts.free ? 'free' : m.currency,
      events: [],
    };
  };
}

function Frame({ w, h, children }: { w: number; h: number; children: ComponentChildren }) {
  return (
    <div
      style={{
        width: `${w}px`,
        height: `${h}px`,
        maxWidth: '100%',
        margin: '0 auto',
        overflow: 'auto',
        borderRadius: w < 600 ? '44px' : '22px',
        background: 'var(--bg)',
        boxShadow: '0 0 0 10px #2b2233, var(--shadow-lg)',
      }}
    >
      {children}
    </div>
  );
}

function demo(itemId: string, o: { dupe?: boolean; fused?: number; shell?: [string, string] } = {}): RevealData {
  const def = getCollectible(itemId)!;
  const rarity = def.rarity;
  return {
    itemId,
    rarity,
    secret: SECRET_IDS.has(itemId),
    machineId: def.source as MachineDef['id'],
    isNew: !o.dupe,
    stardust: o.dupe ? { common: 2, uncommon: 4, rare: 8, ultra: 15 }[rarity] : 0,
    fusedStars: o.fused ?? 0,
    friendshipXp: o.dupe && def?.category === 'pet' ? 20 : undefined,
    shell: { color: o.shell?.[0] ?? '#F5CDD6', color2: o.shell?.[1] ?? '#D2E4F2' },
    via: 'pull',
  };
}

/** One reveal per tier and the Secret, plus decor, a stamp made from swaps, and a Special Order. */
const DEMOS: Record<string, RevealData> = {
  classic: demo('pet-cow-holstein', { shell: ['#F6E6B4', '#D5E3C7'] }),
  special: demo('pet-cow-beltie', { dupe: true, shell: ['#F5CDD6', '#D2E4F2'] }),
  rare: demo('pet-cat-siamese', { shell: ['#DDD4F1', '#F6E6B4'] }),
  super: demo('pet-cat-oddeyed', { shell: ['#D2E4F2', '#F5CDD6'] }),
  secret: demo('pet-cow-highland', { shell: ['#F5CDD6', '#F6E6B4'] }),
  item: demo('decor-matchbox-bed', { shell: ['#F6E6B4', '#F5CDD6'] }),
  swaps: demo('treat-fish-crackers', { dupe: true, fused: 1, shell: ['#D2E4F2', '#F6E6B4'] }),
  order: { ...demo('pet-cow-jersey'), via: 'order' },
};

const FINISHES: CapsuleFinish[] = ['classic', 'special', 'rare', 'super', 'secret'];
const FIGURE_OF: Record<CapsuleFinish, string> = {
  classic: 'pet-cow-holstein',
  special: 'pet-cow-beltie',
  rare: 'pet-cat-siamese',
  super: 'pet-cat-oddeyed',
  secret: 'pet-cow-highland',
};

/** The pull as still frames on one cabinet: insert, turning, in the chute, close up, twisting, parting. */
function Sequence({ machine, light }: { machine: MachineDef; light: Light }) {
  const L = lighting(light);
  const uid = `seq${machine.id}${light.night ? 'n' : 'd'}`;
  const colors = machine.theme.capsules;
  const inside = machine.id === 'night' ? 'pet-cat-smoke' : 'pet-cow-beltie';
  const pile = settledPile(machine);
  const shaken = pile.map((b, i) => ({ ...b, y: b.y - (i % 3 === 0 ? 10 : i % 3 === 1 ? 4 : 0), angle: b.angle + i * 0.6 }));
  const window = (bodies: typeof pile, key: string) => <WindowCapsules uid={`${uid}${key}`} colors={colors} bodies={bodies} lighting={L} />;
  const chuteCapsule = (
    <g transform={`translate(${CHUTE_REST.x} ${CHUTE_REST.y}) scale(${(CHUTE_CAPSULE_R / CAPSULE_R).toFixed(3)})`}>
      <defs>
        <ShellSymbol id={`${uid}-c`} r={CAPSULE_R} color={colors[0]!} lighting={L} />
        <CapsuleLightSymbols uid={`${uid}-cl`} r={CAPSULE_R} lighting={L} />
      </defs>
      <use href={`#${uid}-c`} />
      <use href={`#${uid}-cl-shade`} />
      <use href={`#${uid}-cl-glint`} />
    </g>
  );
  const cell = (label: string, child: JSX.Element) => (
    <div class="gal-cell" style={light.night ? NIGHT_CELL : undefined}>
      {child}
      <small>{label}</small>
    </div>
  );
  return (
    <>
      {cell(
        '1 · insert',
        <CabinetArt machine={machine} light={light} height={260} capsules={window(pile, 'a')}>
          <g transform={`translate(${SLOT.cx + 8} ${SLOT.cy - 24}) rotate(-150)`}>
            <Token kind={machine.currency === 'stars' ? 'stamp' : 'coin'} />
          </g>
        </CabinetArt>,
      )}
      {cell('2 · turning the handle', <CabinetArt machine={machine} light={light} height={260} capsules={window(shaken, 'b')} handleAngle={112} />)}
      {cell(
        '3 · in the chute',
        <CabinetArt machine={machine} light={light} height={260} capsules={window(pile.slice(1), 'c')} chute={chuteCapsule} flapOpen />,
      )}
      {cell(
        '4 · close up: the figure through the clear half',
        <CapsuleArt
          finish="special"
          color={colors[0]!}
          color2={colors[2]!}
          machineId={machine.id}
          light={light}
          size={170}
          figure={<CapsuleFigure id={inside} />}
          figureInk={machine.theme.ink}
        />,
      )}
      {cell(
        '5 · twisting',
        <div style={{ '--twist': '-12deg', position: 'relative' } as JSX.CSSProperties}>
          {/* A twist turns the lid about the capsule's own axis, which a flat drawing can only hint at:
              the printed turn arrow (the cabinet's) says which way it goes. */}
          <svg viewBox="-50 -50 100 100" width={170} height={170} style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
            <path d="M-30 -44 A34 12 0 0 0 26 -45" fill="none" stroke={light.night ? '#F4EDE6' : '#6F6065'} stroke-width={1.6} stroke-linecap="round" />
            <path d="M31 -46.5 L23.6 -49.6 L24.8 -41.8 Z" fill={light.night ? '#F4EDE6' : '#6F6065'} />
          </svg>
          <CapsuleArt
            finish="special"
            color={colors[0]!}
            color2={colors[2]!}
            machineId={machine.id}
            light={light}
            size={170}
            figure={<CapsuleFigure id={inside} />}
            figureInk={machine.theme.ink}
          />
        </div>,
      )}
      {cell(
        '6 · the halves part, and out it steps',
        <div style={{ display: 'grid', placeItems: 'center', width: '170px', height: '170px', paddingTop: '28px', boxSizing: 'content-box' }}>
          <div style={{ gridArea: '1 / 1', width: '170px', height: '170px' }}>
            <CapsuleArt finish="special" color={colors[0]!} color2={colors[2]!} machineId={machine.id} state="parting" light={light} size="100%" />
          </div>
          <div style={{ gridArea: '1 / 1', width: '104px', height: '104px', transform: 'translateY(-14px)' }}>
            <CollectibleArt id={inside} size="100%" />
          </div>
        </div>,
      )}
    </>
  );
}

function RevealDemos({ params }: { params: URLSearchParams }) {
  const [open, setOpen] = useState<{ key: string; quick?: boolean } | null>(() => {
    const key = params.get('reveal');
    return key && DEMOS[key] ? { key, quick: params.get('quick') === '1' } : null;
  });
  const stage = (params.get('stage') as RevealStage | null) ?? undefined;
  const cracks = Number(params.get('cracks') ?? 0);
  // &pay=ticket shows the ticket version of "Pull again".
  const pay: Exclude<Payment, 'free'> = params.get('pay') === 'ticket' ? 'ticket' : 'price';
  const light = params.get('light') === 'night' ? NIGHT_LIGHT : DAY_LIGHT;
  const data = open ? DEMOS[open.key] : undefined;
  return (
    <div class="gal-row">
      {Object.keys(DEMOS).map((key) => (
        <button key={key} type="button" class="gal-cell" style={{ minWidth: '110px', minHeight: '44px' }} onClick={() => setOpen({ key })}>
          <b>{key}</b>
        </button>
      ))}
      <button type="button" class="gal-cell" style={{ minWidth: '110px', minHeight: '44px' }} onClick={() => setOpen({ key: 'rare', quick: true })}>
        <b>quick open</b>
      </button>
      {data && (
        <RevealOverlay
          data={data}
          quickOpen={open?.quick}
          initialStage={stage}
          initialCracks={cracks}
          light={light}
          onClose={() => setOpen(null)}
          pullAgain={{ pay, machine: getMachine(data.machineId ?? 'cows'), onPull: () => setOpen(null) }}
        />
      )}
    </div>
  );
}

/** An open sheet takes over the page, so each one opens only when asked for by its own id. */
function SheetDemo({ id, params, children }: { id: string; params: URLSearchParams; children: JSX.Element }) {
  seedWallet(params);
  return params.get('only') === id ? children : <a href={`?only=${id}`}>Open this sheet</a>;
}

export const SECTIONS: GallerySection[] = [
  {
    id: 'capsules-cabinets',
    title: 'Cabinets: every series, window light from the left and the right, and lamplight (&machine=cats)',
    render: (params) => {
      const only = params.get('machine');
      const ms = only ? MACHINES.filter((m) => m.id === only) : MACHINES;
      return (
        <div class="gal-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
          {ms.flatMap((m) =>
            LIGHTS.map(([name, light]) => (
              <div class="gal-cell" key={m.id + name} style={light.night ? NIGHT_CELL : undefined}>
                <CabinetArt machine={m} light={light} height={250} title={m.name} />
                <small>
                  {m.number ?? 'Seasonal'} {m.name} · {name}
                </small>
              </div>
            )),
          )}
        </div>
      );
    },
  },
  {
    id: 'capsules-small',
    title: 'Cabinets small: 120, 64 and 32 px tall',
    render: () => (
      <div class="gal-row" style={{ alignItems: 'flex-end', gap: '14px' }}>
        {MACHINES.slice(0, 7).map((m) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <CabinetArt machine={m} height={120} />
            <CabinetArt machine={m} height={64} />
            <CabinetArt machine={m} height={32} />
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'capsules-sequence',
    title: 'The pull, frame by frame (No. 02 by day, No. 07 by lamplight)',
    render: () => (
      <div class="gal-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <Sequence machine={getMachine('cows')} light={DAY_LIGHT} />
        <Sequence machine={getMachine('night')} light={NIGHT_LIGHT} />
      </div>
    ),
  },
  {
    id: 'capsules-capsule',
    title: 'The capsule: finishes, lights, the Secret opening in three taps, parted, opened',
    render: () => (
      <div class="gal-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        {FINISHES.map((f) => (
          <div class="gal-cell" key={f}>
            <CapsuleArt
              finish={f}
              color="#F5CDD6"
              color2="#D2E4F2"
              machineId="cows"
              size={130}
              figure={f === 'secret' ? undefined : <CapsuleFigure id={FIGURE_OF[f]} />}
              figureInk={getMachine('cows').theme.ink}
            />
            <small>{f === 'secret' ? 'secret · insert only' : f}</small>
          </div>
        ))}
        {(['decor-matchbox-bed', 'plant-pothos', 'wear-cowbell'] as const).map((id) => (
          <div class="gal-cell" key={id}>
            <CapsuleArt finish="classic" color="#F6E6B4" machineId="cows" size={130} figure={<CapsuleFigure id={id} />} figureInk={getMachine('cows').theme.ink} />
            <small>{id}</small>
          </div>
        ))}
        {LIGHTS.map(([name, light]) => (
          <div class="gal-cell" key={name} style={light.night ? NIGHT_CELL : undefined}>
            <CapsuleArt
              finish="classic"
              color="#D5E3C7"
              machineId="garden"
              light={light}
              size={130}
              figure={<CapsuleFigure id="pet-cat-orange" />}
              figureInk={getMachine('garden').theme.ink}
            />
            <small>{name}</small>
          </div>
        ))}
        {[1, 2, 3].map((c) => (
          <div class="gal-cell" key={c}>
            <CapsuleArt finish="secret" color="#F5CDD6" machineId="cows" cracks={c} size={130} />
            <small>secret · {c} of 3</small>
          </div>
        ))}
        <div class="gal-cell" style={{ paddingTop: '30px' }}>
          <CapsuleArt finish="rare" color="#DDD4F1" machineId="night" state="parting" size={130} />
          <small>parting</small>
        </div>
        {FINISHES.map((f) => (
          <div class="gal-cell" key={`open-${f}`}>
            <OpenCapsuleArt finish={f} color="#F6E6B4" color2="#D2E4F2" size={150} />
            <small>{f} · opened</small>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'capsules-cards',
    title: 'Reveal cards: Classic, Special (a repeat), Rare, Super rare, the Secret, decor, a stamp from swaps, a Special Order',
    render: (params) => {
      seedWallet(params);
      return (
        <div class="gal-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', alignItems: 'start' }}>
          {Object.entries(DEMOS).map(([key, data]) => (
            <div class="gal-cell" key={key} style={{ background: 'var(--bg)', padding: '12px 14px 18px' }}>
              <RevealCard data={data} light={DAY_LIGHT} onClose={() => {}} quick />
              <small>{key}</small>
            </div>
          ))}
        </div>
      );
    },
  },
  {
    id: 'capsules-swap',
    title: 'The swap ring: 0 to 10 swaps toward a stamp, and the wallet strip',
    render: (params) => {
      seedWallet(params);
      return (
        <div>
          <div class="gal-row" style={{ gap: '14px' }}>
            {Array.from({ length: 11 }, (_, i) => (
              <div class="gal-cell" key={i}>
                <SwapRing swaps={i} size={48} />
                <small>{i}/10</small>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '16px' }}>
            <WalletStrip />
          </div>
        </div>
      );
    },
  },
  {
    id: 'capsules-leaflets',
    title: 'Lineup leaflets beside the cabinets',
    render: (params) => {
      seedWallet(params);
      return (
        <div class="gal-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', alignItems: 'start' }}>
          {MACHINES.map((m) => (
            <div key={m.id} style={{ padding: '8px' }}>
              <LeafletCard machine={m} onOpen={() => {}} />
            </div>
          ))}
        </div>
      );
    },
  },
  {
    id: 'capsules-sheet-order',
    title: 'Special Order sheet',
    render: (params) => (
      <SheetDemo id="capsules-sheet-order" params={params}>
        <SpecialOrderSheet open machineId={(params.get('machine') as MachineDef['id']) ?? 'cows'} onClose={() => {}} onOrdered={() => {}} />
      </SheetDemo>
    ),
  },
  {
    id: 'capsules-sheet-odds',
    title: 'Odds sheet',
    render: (params) => (
      <SheetDemo id="capsules-sheet-odds" params={params}>
        <OddsSheet machine={getMachine((params.get('machine') as MachineDef['id']) ?? 'cows')} open onClose={() => {}} />
      </SheetDemo>
    ),
  },
  {
    id: 'capsules-sheet-lineup',
    title: 'Lineup sheet: the leaflet, full size',
    render: (params) => (
      <SheetDemo id="capsules-sheet-lineup" params={params}>
        <LineupSheet machine={getMachine((params.get('machine') as MachineDef['id']) ?? 'cats')} open onClose={() => {}} />
      </SheetDemo>
    ),
  },
  {
    id: 'capsules-pull',
    title: 'Interactive cabinet (&machine=cows &coins=10 &tickets=0 &quick=1)',
    render: (params) => {
      seedWallet(params);
      const m = MACHINES.find((x) => x.id === (params.get('machine') ?? 'cats')) ?? MACHINES[0]!;
      return (
        <div style={{ maxWidth: '390px', margin: '0 auto', padding: '12px 0 24px', background: 'var(--bg)' }}>
          <CapsuleMachine machine={m} active pullWith={demoPull(params)} />
        </div>
      );
    },
  },
  {
    id: 'capsules-reveal',
    title: 'Reveal (?reveal=secret&stage=card &cracks=2 &pay=ticket &light=night)',
    render: (params) => {
      seedWallet(params);
      return <RevealDemos params={params} />;
    },
  },
  {
    id: 'capsules-first',
    title: 'Onboarding: Cats or Cows?',
    render: (params) => {
      seedWallet(params);
      return (
        <Frame w={390} h={640}>
          <FirstPick />
        </Frame>
      );
    },
  },
  {
    id: 'capsules-phone',
    title: 'Capsules screen · 390 px (dev wallet: 500 coins, 20 stamps, 7 swaps, 2 tickets)',
    render: (params) => {
      seedWallet(params);
      return (
        <Frame w={390} h={844}>
          <CapsulesScreen />
        </Frame>
      );
    },
  },
  {
    id: 'capsules-desktop',
    title: 'Capsules screen · 1200 px',
    render: (params) => {
      seedWallet(params);
      return (
        <Frame w={1200} h={820}>
          <CapsulesScreen />
        </Frame>
      );
    },
  },
];
