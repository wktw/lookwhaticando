import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { CapsulesScreen } from '@/features/capsules/CapsulesScreen';
import { MACHINES } from '@/catalog/machines';
import { getCollectible } from '@/catalog/collectibles';
import type { Rarity } from '@/catalog/types';
import { RevealOverlay, type RevealStage } from '@/features/capsules/RevealOverlay';
import type { RevealData } from '@/features/capsules/reveal';
import { MachineArt } from '@/art/machines/MachineArt';
import { CapsuleArt } from '@/art/machines/CapsuleArt';
import { RARITIES } from '@/catalog/types';
import { CapsuleMachine } from '@/features/capsules/CapsuleMachine';
import { state } from '@/state/store';
import type { GallerySection } from './sections';

let seeded = false;

/** A few Kitty Capsule finds so the series progress and lineup have something to show. */
const DEMO_OWNED: Record<string, number> = {
  'pet-cat-orange': 2,
  'pet-cat-calico': 1,
  'pet-cat-tuxedo': 1,
  'wear-pink-bow': 1,
  'wear-bell-collar': 3,
  'treat-fish-crackers': 1,
  'decor-cardboard-box': 1,
  'pot-kitty': 1,
};

/** Dev helper: a wallet worth pulling with (once per page; peek() so the gallery doesn't subscribe). */
function seedWallet() {
  if (seeded) return;
  seeded = true;
  const s = state.peek();
  const collection = { ...s.collection };
  for (const [id, count] of Object.entries(DEMO_OWNED)) collection[id] = { count, firstAt: 0 };
  state.value = { ...s, collection, wallet: { coins: 500, stars: 20, stardust: 7, tickets: 2 } };
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

/** Reveal demos: one per rarity, plus the duplicate/fusion, wish and quick-open variants. */
const DEMOS: Record<string, RevealData> = {
  common: demo('pet-cat-orange', 'common', { pet: true }),
  uncommon: demo('wear-fish-hat', 'uncommon', {}),
  rare: demo('pet-cat-strawberry', 'rare', { pet: true }),
  ultra: demo('pet-cat-lucky', 'ultra', { pet: true }),
  duplicate: demo('pet-cat-calico', 'uncommon', { dupe: true }),
  fusion: demo('treat-salmon-sushi', 'uncommon', { dupe: true, fused: 1 }),
  wish: { ...demo('pet-cow-highland', 'rare', { pet: true }), via: 'wish' },
};

function demo(itemId: string, rarity: Rarity, o: { pet?: boolean; dupe?: boolean; fused?: number }): RevealData {
  const def = getCollectible(itemId);
  const name = def?.category === 'pet' ? def.defaultName : '';
  return {
    itemId,
    rarity,
    isNew: !o.dupe,
    stardust: o.dupe ? { common: 2, uncommon: 4, rare: 8, ultra: 15 }[rarity] : 0,
    fusedStars: o.fused ?? 0,
    friendshipXp: o.dupe && def?.category === 'pet' ? 20 : undefined,
    pet: o.pet
      ? {
          id: itemId,
          name,
          personality: 'sleepy',
          favoriteTreat: 'treat-strawberry',
          favoriteKnown: false,
          xp: 0,
          outfit: {},
          inMeadow: true,
          favorite: false,
          obtainedAt: 0,
          daily: { date: '2026-09-29', pets: 0, treats: 0, buddy: 0 },
        }
      : undefined,
    shell: { color: '#FFC4D3', color2: '#BBDCF6' },
    via: 'pull',
  };
}

function RevealDemos({ params }: { params: URLSearchParams }) {
  const [open, setOpen] = useState<{ key: string; quick?: boolean } | null>(() => {
    const key = params.get('reveal');
    return key && DEMOS[key] ? { key, quick: params.get('quick') === '1' } : null;
  });
  const stage = (params.get('stage') as RevealStage | null) ?? undefined;
  const cracks = Number(params.get('cracks') ?? 0);
  const data = open ? DEMOS[open.key] : undefined;
  return (
    <div class="gal-row">
      {Object.keys(DEMOS).map((key) => (
        <button key={key} type="button" class="gal-cell" style={{ minWidth: '120px', minHeight: '44px' }} onClick={() => setOpen({ key })}>
          <b>{key}</b>
        </button>
      ))}
      <button type="button" class="gal-cell" style={{ minWidth: '120px', minHeight: '44px' }} onClick={() => setOpen({ key: 'rare', quick: true })}>
        <b>quick open</b>
      </button>
      {data && (
        <RevealOverlay
          data={data}
          quickOpen={open?.quick}
          initialStage={stage}
          initialCracks={cracks}
          onClose={() => setOpen(null)}
          onPullAgain={() => setOpen(null)}
        />
      )}
    </div>
  );
}

export const SECTIONS: GallerySection[] = [
  {
    id: 'capsules-screen',
    title: 'Capsules screen · phone (dev wallet: 500 coins, 20 stars, 2 tickets)',
    render: () => {
      seedWallet();
      return (
        <Frame w={390} h={844}>
          <CapsulesScreen />
        </Frame>
      );
    },
  },
  {
    id: 'capsules-screen-wide',
    title: 'Capsules screen · desktop',
    render: () => {
      seedWallet();
      return (
        <Frame w={1180} h={820}>
          <CapsulesScreen />
        </Frame>
      );
    },
  },
  {
    id: 'capsules-reveal',
    title: 'Reveal demos (?reveal=rare&stage=card)',
    render: (params) => <RevealDemos params={params} />,
  },
  {
    id: 'capsules-pull',
    title: 'Interactive machine',
    render: (params) => {
      seedWallet();
      const m = MACHINES.find((x) => x.id === (params.get('machine') ?? 'kitty')) ?? MACHINES[0]!;
      return (
        <div style={{ maxWidth: '390px', margin: '0 auto', padding: '12px 0 24px', background: 'var(--bg)' }}>
          <CapsuleMachine machine={m} active />
        </div>
      );
    },
  },
  {
    id: 'capsules-machines',
    title: 'Capsule machines (static, capsules settled)',
    render: () => (
      <div class="gal-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
        {MACHINES.map((m) => (
          <div class="gal-cell" key={m.id}>
            <MachineArt machine={m} height={320} title={m.name} />
            <b>{m.name}</b>
            <small>{m.id}</small>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'capsules-shells',
    title: 'Capsule shells: rarity × state',
    render: () => (
      <div class="gal-grid">
        {RARITIES.map((r) =>
          [0, 1, 2, 3].map((c) => (
            <div class="gal-cell" key={`${r}${c}`}>
              <CapsuleArt rarity={r} color="#FFC4D3" color2="#BBDCF6" cracks={c} size={110} animated />
              <small>
                {r} · {c} cracks
              </small>
            </div>
          )),
        )}
        {RARITIES.map((r) => (
          <div class="gal-cell" key={`${r}open`}>
            <CapsuleArt rarity={r} color="#FFE593" color2="#FFC4D3" state="open" size={110} />
            <small>{r} · open</small>
          </div>
        ))}
      </div>
    ),
  },
];
