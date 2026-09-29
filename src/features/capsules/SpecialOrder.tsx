import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Category, CollectibleDef, MachineId } from '@/catalog/types';
import { COLLECTIBLES, SECRET_IDS } from '@/catalog/collectibles';
import { MACHINE_BY_ID, MACHINES, STARDUST_PER_STAR, WISH_PRICE } from '@/catalog/machines';
import { machineStatus, sparkleExchange, state, today, wish } from '@/state/store';
import { CollectibleArt } from '@/art/CollectibleArt';
import { StarIcon } from '@/art/icons';
import { sfx } from '@/fx/sound';
import { haptic } from '@/fx/haptics';
import { Sheet } from './ui/Sheet';
import { PillButton, Pill, cx, type PillTone } from './ui/CandyButton';
import { CATEGORY_LABEL, MACHINE_SHORT, monthDay, orderErrorText, tierLabel } from './copy';
import { dayKeyOf, seasonHasVisited } from './season';
import { SwapRing } from './SwapRing';
import type { RevealData } from './reveal';
import s from './Sheets.module.css';

const CATEGORIES: Category[] = ['pet', 'wearable', 'treat', 'decor', 'plant', 'pot'];
/** Tiles are built a page at a time as you scroll, so the sheet opens light. */
const PAGE = 24;
/** On a completed series: coins for swaps (DESIGN §7.3). */
const SWAP_IN = { coins: 250, swaps: 40 } as const;

const TONE: Record<CollectibleDef['rarity'], PillTone> = { common: 'common', uncommon: 'uncommon', rare: 'rare', ultra: 'ultra' };

/** Anything from any series you don't have yet (exclusives come another way). */
function orderable(collection: Record<string, unknown>): CollectibleDef[] {
  return COLLECTIBLES.filter((c) => MACHINE_BY_ID.has(c.source as MachineId) && !collection[c.id]);
}

/** Series whose season has visited since the profile began (the Memories rule): orderable. */
function visitedSeries(): Set<MachineId> {
  const from = dayKeyOf(state.value.profile.createdAt || Date.now());
  const to = today.value;
  return new Set(MACHINES.filter((m) => seasonHasVisited(m, from, to)).map((m) => m.id));
}

export interface SpecialOrderSheetProps {
  open: boolean;
  /** The series on screen: the list starts there. */
  machineId: MachineId;
  onClose: () => void;
  onOrdered: (reveal: RevealData) => void;
}

/**
 * Special Order, at the counter (DESIGN §7.3): any item you don't have yet, for stamps. A Secret
 * shows as a "?" and still arrives in its capsule. Seasonal lineups can be ordered once their
 * season has visited. The swap shelf is here too.
 */
export function SpecialOrderSheet({ open, machineId, onClose, onOrdered }: SpecialOrderSheetProps) {
  const stamps = state.value.wallet.stars;
  return (
    <Sheet
      open={open}
      title="Special Order"
      onClose={onClose}
      aside={
        <Pill tone="butter">
          <StarIcon size={16} /> <span class="num">{stamps}</span>
          <span class="sr-only"> stamps</span>
        </Pill>
      }
    >
      <OrderBody initialMachine={machineId} onOrdered={onOrdered} />
    </Sheet>
  );
}

function SwapShelf({ machineId }: { machineId: MachineId }) {
  const w = state.value.wallet;
  const swaps = w.stardust % STARDUST_PER_STAR;
  const complete = machineStatus(machineId).complete;
  const [note, setNote] = useState('');
  const swapIn = () => {
    const r = sparkleExchange(machineId);
    setNote(r.ok ? `${SWAP_IN.swaps} swaps, onto the shelf.` : `That takes ${SWAP_IN.coins} coins.`);
    if (r.ok) sfx.play('chime');
  };
  return (
    <section class={s.shelf} aria-labelledby="swap-shelf-title">
      <SwapRing swaps={swaps} size={52} />
      <div class={s.shelfText}>
        <h3 id="swap-shelf-title" class={s.shelfTitle}>
          The swap shelf
        </h3>
        <p>
          <b class="num">{swaps}</b> of {STARDUST_PER_STAR} swaps toward the next stamp. Repeats come here, and every ten make a stamp.
        </p>
        {complete && (
          <p class={s.swapIn}>
            <PillButton variant="secondary" size="sm" onClick={swapIn}>
              {SWAP_IN.coins} coins for {SWAP_IN.swaps} swaps
            </PillButton>
            <span role="status">{note}</span>
          </p>
        )}
      </div>
    </section>
  );
}

/** Mounted only while the sheet is, so each visit starts on the series you were looking at. */
function OrderBody({ initialMachine, onOrdered }: { initialMachine: MachineId; onOrdered: (reveal: RevealData) => void }) {
  const { collection, wallet } = state.value;
  const all = useMemo(() => orderable(collection), [collection]);
  const visited = useMemo(visitedSeries, []);
  const [machine, setMachine] = useState<MachineId | 'all'>(() => (all.some((c) => c.source === initialMachine) ? initialMachine : 'all'));
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [picked, setPicked] = useState<CollectibleDef | null>(null);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);

  const items = all.filter((c) => (machine === 'all' || c.source === machine) && (category === 'all' || c.category === category));
  const seriesWithItems = MACHINES.filter((m) => all.some((c) => c.source === m.id));
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

  const place = () => {
    if (!picked) return;
    const price = WISH_PRICE[picked.rarity];
    const outcome = wish(picked.id);
    if (!outcome.ok) {
      setError(orderErrorText(outcome.error, price, wallet.stars));
      haptic('light');
      return;
    }
    sfx.play('chime');
    const m = MACHINE_BY_ID.get(picked.source as MachineId);
    const colors = m?.theme.capsules ?? ['#DDD4F1', '#F6E6B4'];
    setPicked(null);
    onOrdered({
      itemId: outcome.itemId,
      rarity: picked.rarity,
      secret: SECRET_IDS.has(picked.id),
      machineId: m?.id,
      isNew: true,
      stardust: 0,
      fusedStars: 0,
      pet: outcome.pet,
      shell: { color: colors[0]!, color2: colors[1] ?? colors[0]! },
      via: 'order',
    });
  };

  const price = picked ? WISH_PRICE[picked.rarity] : 0;
  const short = picked ? price - wallet.stars : 0;

  return (
    <>
      <p class={s.lead}>Anything you don't have yet, ordered at the counter for stamps. Seasonal items can be ordered once their season has visited.</p>

      <SwapShelf machineId={initialMachine} />

      <div class={s.filters} role="group" aria-label="Series">
        <Chip on={machine === 'all'} onClick={() => filterMachine('all')}>
          Every series
        </Chip>
        {seriesWithItems.map((m) => (
          <Chip key={m.id} on={machine === m.id} onClick={() => filterMachine(m.id)}>
            {m.number ? `${m.number} ${MACHINE_SHORT[m.id]}` : MACHINE_SHORT[m.id]}
          </Chip>
        ))}
      </div>
      <div class={s.filters} role="group" aria-label="Kind">
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
        <p class={s.empty}>{all.length === 0 ? 'Every item in every series is in your collection.' : 'Nothing missing here. Try another series.'}</p>
      ) : (
        <ul class={s.orderGrid}>
          {items.slice(0, limit).map((item) => {
            const m = MACHINE_BY_ID.get(item.source as MachineId);
            const away = !!m?.seasonal && !visited.has(m.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  class={cx(s.orderTile, picked?.id === item.id && s.orderPicked, away && s.orderAway)}
                  onClick={() => pick(item)}
                  aria-pressed={picked?.id === item.id}
                  disabled={away}
                >
                  <span class={s.orderArt}>
                    <OrderArt item={item} />
                  </span>
                  <span class={s.tileName}>{orderName(item)}</span>
                  {away && m?.seasonal ? (
                    <span class={s.orderAwayNote}>Visits {monthDay(m.seasonal.start)}</span>
                  ) : (
                    <span class={s.orderPrice}>
                      <StarIcon size={14} />
                      <span class="num">{WISH_PRICE[item.rarity]}</span>
                      <span class="sr-only"> stamps, {tierLabel(item.rarity, SECRET_IDS.has(item.id))}</span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {more && <div ref={sentinel} class={s.more} aria-hidden="true" />}

      {picked && (
        <div class={s.confirm} role="region" aria-label="Your order">
          <span class={s.confirmArt}>
            <OrderArt item={picked} />
          </span>
          <div class={s.confirmText}>
            <p class={s.confirmTitle}>Order {SECRET_IDS.has(picked.id) ? `the ${orderName(picked)}` : `the ${picked.name}`}?</p>
            <p class={s.confirmMeta}>
              <Pill tone={SECRET_IDS.has(picked.id) ? 'secret' : TONE[picked.rarity]}>{tierLabel(picked.rarity, SECRET_IDS.has(picked.id))}</Pill>
              <span>
                <StarIcon size={16} /> <b class="num">{price}</b> · you have <span class="num">{wallet.stars}</span>
              </span>
            </p>
            {error ? (
              <p class={s.confirmError} role="alert">
                {error}
              </p>
            ) : short > 0 ? (
              <p class={s.confirmError}>{short === 1 ? 'One more stamp.' : `${short} more stamps.`} Stamps come from showing up, Sunday Notes and pins.</p>
            ) : null}
          </div>
          <div class={s.confirmActions}>
            <PillButton size="sm" variant="quiet" onClick={() => pick(null)}>
              Not now
            </PillButton>
            <PillButton size="sm" colors={{ face: 'var(--lavender-500)', ink: '#3B3236' }} onClick={place} disabled={short > 0}>
              Place the order
            </PillButton>
          </div>
        </div>
      )}
    </>
  );
}

/** A Secret stays a secret at the counter too: it can be ordered, and it's still a surprise. */
function OrderArt({ item }: { item: CollectibleDef }) {
  if (!SECRET_IDS.has(item.id)) return <CollectibleArt id={item.id} size="100%" />;
  return (
    <span class={s.secretMark} aria-hidden="true">
      ?
    </span>
  );
}

function orderName(item: CollectibleDef): string {
  return SECRET_IDS.has(item.id) ? `${MACHINE_SHORT[item.source as MachineId]} Secret` : item.name;
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ComponentChildren }) {
  return (
    <button type="button" class={cx(s.chip, on && s.chipOn)} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}
