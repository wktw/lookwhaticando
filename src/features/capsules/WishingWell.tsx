import type { ComponentChildren, Ref } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Category, CollectibleDef, MachineId } from '@/catalog/types';
import { COLLECTIBLES } from '@/catalog/collectibles';
import { MACHINE_BY_ID, MACHINES, WISH_PRICE } from '@/catalog/machines';
import { state, wish } from '@/state/store';
import { CollectibleArt } from '@/art/CollectibleArt';
import { StarIcon } from '@/art/icons';
import { WishingWellArt } from '@/art/machines/WishingWellArt';
import { sfx } from '@/fx/sound';
import { haptic } from '@/fx/haptics';
import { Sheet } from './ui/Sheet';
import { CandyButton, Pill, cx } from './ui/CandyButton';
import { CATEGORY_LABEL, MACHINE_SHORT, RARITY_LABEL, wishErrorText } from './copy';
import type { RevealData } from './reveal';
import s from './Sheets.module.css';
import card from './WishingWell.module.css';

const CATEGORIES: Category[] = ['pet', 'wearable', 'treat', 'decor', 'plant', 'pot'];
/** Tiles are built a page at a time as you scroll: opening the well stays light. */
const PAGE = 24;

/** Any machine item you don't own yet, seasonal ones included (exclusives can't be wished for). */
function wishable(collection: Record<string, unknown>): CollectibleDef[] {
  return COLLECTIBLES.filter((c) => MACHINE_BY_ID.has(c.source as MachineId) && !collection[c.id]);
}

const LAVENDER = { face: 'var(--lavender-300)', lip: 'var(--lavender-500)', ink: 'var(--ink)' };

export function WishingWellCard({ onOpen, buttonRef }: { onOpen: () => void; buttonRef?: Ref<HTMLButtonElement> }) {
  const stars = state.value.wallet.stars;
  return (
    <section class={card.card} aria-labelledby="wishing-well-title">
      <WishingWellArt size={92} class={card.art} />
      <div class={card.text}>
        <h2 id="wishing-well-title" class={card.title}>
          Wishing Well
        </h2>
        <p>Pick any friend or item you're missing and wish for it with stars.</p>
        <CandyButton buttonRef={buttonRef} size="sm" colors={LAVENDER} onClick={onOpen}>
          Make a wish{' '}
          <span class={card.stars}>
            <StarIcon size={18} />
            <span class="num">{stars}</span>
            <span class="sr-only"> stars</span>
          </span>
        </CandyButton>
      </div>
    </section>
  );
}

export interface WishingWellSheetProps {
  open: boolean;
  /** The machine on screen: the grid starts filtered to its series. */
  machineId: MachineId;
  onClose: () => void;
  onGranted: (reveal: RevealData) => void;
}

/** The star shop (DESIGN §6.4): a filterable grid of everything you're missing, with star prices. */
export function WishingWellSheet({ open, machineId, onClose, onGranted }: WishingWellSheetProps) {
  const stars = state.value.wallet.stars;
  return (
    <Sheet
      open={open}
      title="Wishing Well"
      onClose={onClose}
      aside={
        <Pill tone="butter">
          <StarIcon size={18} /> <span class="num">{stars}</span>
          <span class="sr-only"> stars</span>
        </Pill>
      }
    >
      <WellBody initialMachine={machineId} onGranted={onGranted} />
    </Sheet>
  );
}

/** Mounted only while the sheet is, so each visit starts fresh on the machine you were looking at. */
function WellBody({ initialMachine, onGranted }: { initialMachine: MachineId; onGranted: (reveal: RevealData) => void }) {
  const { collection, wallet } = state.value;
  const all = useMemo(() => wishable(collection), [collection]);
  const [machine, setMachine] = useState<MachineId | 'all'>(() => (all.some((c) => c.source === initialMachine) ? initialMachine : 'all'));
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [picked, setPicked] = useState<CollectibleDef | null>(null);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);

  const items = all.filter((c) => (machine === 'all' || c.source === machine) && (category === 'all' || c.category === category));
  const machinesWithItems = MACHINES.filter((m) => all.some((c) => c.source === m.id));
  const more = items.length > limit;

  // The next page arrives as the end of the grid scrolls near.
  useEffect(() => {
    const el = sentinel.current;
    if (!more || !el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setLimit(Infinity);
      return;
    }
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setLimit((n) => n + PAGE), { rootMargin: '320px' });
    io.observe(el);
    return () => io.disconnect();
  }, [more, limit]);

  const filterMachine = (m: MachineId | 'all') => {
    setMachine(m);
    setLimit(PAGE);
  };
  const filterCategory = (c: Category | 'all') => {
    setCategory(c);
    setLimit(PAGE);
  };

  const pick = (item: CollectibleDef | null) => {
    setPicked(item);
    setError('');
  };

  const makeWish = () => {
    if (!picked) return;
    const price = WISH_PRICE[picked.rarity];
    const outcome = wish(picked.id);
    if (!outcome.ok) {
      setError(wishErrorText(outcome.error, price, wallet.stars));
      haptic('light');
      return;
    }
    sfx.play('sparkle');
    const m = MACHINE_BY_ID.get(picked.source as MachineId);
    const colors = m?.theme.capsules ?? ['#D6C8F8', '#FFE593'];
    setPicked(null);
    onGranted({
      itemId: outcome.itemId,
      rarity: picked.rarity,
      isNew: true,
      stardust: 0,
      fusedStars: 0,
      pet: outcome.pet,
      shell: { color: colors[0]!, color2: colors[1] ?? colors[0]! },
      via: 'wish',
    });
  };

  const price = picked ? WISH_PRICE[picked.rarity] : 0;
  const short = picked ? price - wallet.stars : 0;

  return (
    <>
      <p class={s.lead}>Every item from every series, seasonal ones too, whenever you like. Wishes cost stars.</p>

      <div class={s.filters} role="group" aria-label="Filter by machine">
        <Chip on={machine === 'all'} onClick={() => filterMachine('all')}>
          All machines
        </Chip>
        {machinesWithItems.map((m) => (
          <Chip key={m.id} on={machine === m.id} onClick={() => filterMachine(m.id)}>
            {m.seasonal && <span aria-hidden="true">{m.seasonal.emoji} </span>}
            {MACHINE_SHORT[m.id]}
          </Chip>
        ))}
      </div>
      <div class={s.filters} role="group" aria-label="Filter by kind">
        <Chip on={category === 'all'} onClick={() => filterCategory('all')}>
          Everything
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c} on={category === c} onClick={() => filterCategory(c)}>
            {CATEGORY_LABEL[c]}
          </Chip>
        ))}
      </div>

      {items.length === 0 ? (
        <p class={s.empty}>
          {all.length === 0 ? 'You have every single thing. The well is simply proud of you 💫' : 'Nothing missing here. Try another filter!'}
        </p>
      ) : (
        <ul class={s.wishGrid}>
          {items.slice(0, limit).map((item) => (
            <li key={item.id}>
              <button
                type="button"
                class={cx(s.wishTile, picked?.id === item.id && s.wishPicked)}
                onClick={() => pick(item)}
                aria-pressed={picked?.id === item.id}
              >
                <span class={s.wishArt}>
                  <WishArt item={item} />
                </span>
                <span class={s.tileName}>{wishName(item)}</span>
                <span class={s.wishPrice}>
                  <StarIcon size={16} />
                  <span class="num">{WISH_PRICE[item.rarity]}</span>
                  <span class="sr-only"> stars, {RARITY_LABEL[item.rarity]}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {more && <div ref={sentinel} class={s.more} aria-hidden="true" />}

      {picked && (
        <div class={s.confirm} role="region" aria-label="Confirm your wish">
          <span class={s.confirmArt}>
            <WishArt item={picked} />
          </span>
          <div class={s.confirmText}>
            <p class={s.confirmTitle}>Wish for {picked.rarity === 'ultra' ? `the ${wishName(picked)}` : picked.name}?</p>
            <p class={s.confirmMeta}>
              <Pill tone={picked.rarity}>{RARITY_LABEL[picked.rarity]}</Pill>
              <span>
                <StarIcon size={16} /> <b class="num">{price}</b> · you have <span class="num">{wallet.stars}</span>
              </span>
            </p>
            {error ? (
              <p class={s.confirmError} role="alert">
                {error}
              </p>
            ) : short > 0 ? (
              <p class={s.confirmError}>{short === 1 ? 'Just 1 more star to go!' : `${short} more stars to go. You're getting there!`}</p>
            ) : null}
          </div>
          <div class={s.confirmActions}>
            <CandyButton size="sm" variant="plain" onClick={() => pick(null)}>
              Not now
            </CandyButton>
            <CandyButton size="sm" colors={LAVENDER} onClick={makeWish} disabled={short > 0}>
              Make the wish
            </CandyButton>
          </div>
        </div>
      )}
    </>
  );
}

/** A series Secret stays a secret even in the well: you can wish for it, and it's still a surprise. */
function WishArt({ item }: { item: CollectibleDef }) {
  if (item.rarity !== 'ultra') return <CollectibleArt id={item.id} size="100%" />;
  return (
    <span class={s.secretMark} aria-hidden="true">
      ?
    </span>
  );
}

function wishName(item: CollectibleDef): string {
  return item.rarity === 'ultra' ? `${MACHINE_SHORT[item.source as MachineId]} Secret` : item.name;
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ComponentChildren }) {
  return (
    <button type="button" class={cx(s.chip, on && s.chipOn)} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}
