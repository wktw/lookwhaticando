import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Category, MachineId } from '@/catalog/types';
import { MACHINE_BY_ID, WISH_PRICE } from '@/catalog/machines';
import { MOONLIT_WISH_PRICE, SPARKLE_EXCHANGE } from '@/domain/gacha';
import { sparkleExchange, wish } from '@/state/store';
import { capsulesView, walletView, wishListView } from '@/state/selectors';
import type { WishItemVM } from '@/state/views/capsules';
import { CollectibleArt } from '@/art/CollectibleArt';
import { StampIcon } from '@/art/icons';
import { sfx } from '@/fx/sound';
import { haptic } from '@/fx/haptics';
import { Sheet } from '@/ui/Sheet';
import { Button } from '@/ui/Button';
import { Pill, RarityPill } from '@/ui/Pill';
import { cx } from '@/ui/cx';
import { CATEGORY_LABEL, MACHINE_SHORT, monthDay, monthDayOfKey, orderErrorText } from './copy';
import { SwapRing } from './SwapRing';
import type { RevealData } from './reveal';
import s from './Sheets.module.css';

const CATEGORIES: Category[] = ['pet', 'wearable', 'treat', 'decor', 'plant', 'pot'];
/** Tiles are built a page at a time as you scroll, so the sheet opens light. */
const PAGE = 24;
/** On a completed series: coins for swaps (DESIGN §7.3). */
const SPARKLE_EXCHANGE_COINS = SPARKLE_EXCHANGE.coins;
const SPARKLE_EXCHANGE_SWAPS = SPARKLE_EXCHANGE.stardust;
/** The counter's price list (VOICE §10): "Classic 2 · Special 4 · Rare 8 · Super rare 15 · Moonlit 8". */
const PRICE_LIST = `Classic ${WISH_PRICE.common} · Special ${WISH_PRICE.uncommon} · Rare ${WISH_PRICE.rare} · Super rare ${WISH_PRICE.ultra} · Moonlit ${MOONLIT_WISH_PRICE}`;

/** The Moonlit page (No. 07's variants of pets you have) is its own filter. */
type SeriesKey = MachineId | 'moonlit';

/** One orderable tile: the item, and the series it belongs to. */
interface Tile extends WishItemVM {
  series: SeriesKey;
}

export interface SpecialOrderSheetProps {
  open: boolean;
  /** The series on screen: the list starts there. */
  machineId: MachineId;
  onClose: () => void;
  onOrdered: (reveal: RevealData) => void;
}

/**
 * Special Order, at the counter (DESIGN §7.3, VOICE §10): anything not yet in the Field Guide, for
 * stamps. Everything it offers, and why a tile waits, comes from wishListView, the same rule
 * wish() checks, so the counter never offers what it would refuse. A Secret shows as a "?" and
 * still arrives in its capsule. The swap shelf is here too.
 */
export function SpecialOrderSheet({ open, machineId, onClose, onOrdered }: SpecialOrderSheetProps) {
  const stamps = walletView.value.stars;
  return (
    <Sheet
      open={open}
      title="Special Order"
      onClose={onClose}
      detents={['large']}
      aside={
        <Pill tone="butter" icon={<StampIcon size={16} />}>
          <span class="num">{stamps}</span>
          <span class="sr-only"> {stamps === 1 ? 'stamp' : 'stamps'}</span>
        </Pill>
      }
    >
      <OrderBody initialMachine={machineId} onOrdered={onOrdered} />
    </Sheet>
  );
}

function SwapShelf({ machineId }: { machineId: MachineId }) {
  const w = walletView.value;
  const swaps = w.dust.have % w.dust.of;
  const card = capsulesView.value.machines.find((m) => m.id === machineId);
  const [note, setNote] = useState('');
  const swapIn = () => {
    const r = sparkleExchange(machineId);
    setNote(r.ok ? `${SPARKLE_EXCHANGE_SWAPS} swaps, onto the swap shelf.` : `That takes ${SPARKLE_EXCHANGE_COINS} coins.`);
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
          <b class="num">{swaps}</b> of {w.dust.of} swaps toward the next stamp. Repeats come here, and every 10 make a stamp.
        </p>
        {card?.swapIn && (
          <p class={s.swapIn}>
            <Button variant="secondary" size="sm" onClick={swapIn}>
              Trade {SPARKLE_EXCHANGE_COINS} coins for {SPARKLE_EXCHANGE_SWAPS} swaps
            </Button>
            <span role="status">{note}</span>
          </p>
        )}
      </div>
    </section>
  );
}

/** Mounted only while the sheet is, so each visit starts on the series you were looking at. */
function OrderBody({ initialMachine, onOrdered }: { initialMachine: MachineId; onOrdered: (reveal: RevealData) => void }) {
  const list = wishListView.value;
  const all = useMemo<Tile[]>(
    () => [...list.groups.flatMap((g) => g.items.map((i) => ({ ...i, series: g.machineId as SeriesKey }))), ...list.moonlit.map((i) => ({ ...i, series: 'moonlit' as const }))],
    [list],
  );
  const seriesWithItems = useMemo(() => [...new Set(all.map((t) => t.series))], [all]);
  const [series, setSeries] = useState<SeriesKey | 'all'>(() => (all.some((t) => t.series === initialMachine) ? initialMachine : 'all'));
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);
  const picked = all.find((t) => t.id === pickedId) ?? null;

  const items = all.filter((t) => (series === 'all' || t.series === series) && (category === 'all' || t.category === category));
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

  const filterSeries = (m: SeriesKey | 'all') => {
    setSeries(m);
    setLimit(PAGE);
  };
  const filterCategory = (c: Category | 'all') => {
    setCategory(c);
    setLimit(PAGE);
  };

  const pick = (item: Tile | null) => {
    setPickedId(item?.id ?? null);
    setError('');
  };

  const place = () => {
    if (!picked) return;
    const outcome = wish(picked.id);
    if (!outcome.ok) {
      const m = picked.series === 'moonlit' ? undefined : MACHINE_BY_ID.get(picked.series);
      setError(orderErrorText(outcome.error, { rarity: picked.rarity, price: picked.price, machine: m }, list.stars));
      haptic('light');
      return;
    }
    sfx.play('chime');
    const m = picked.series === 'moonlit' ? MACHINE_BY_ID.get('night') : MACHINE_BY_ID.get(picked.series);
    const colors = m?.theme.capsules ?? ['#DDD4F1', '#F6E6B4'];
    setPickedId(null);
    onOrdered({
      itemId: outcome.itemId,
      rarity: picked.rarity,
      secret: picked.hidden,
      machineId: m?.id,
      isNew: true,
      stardust: 0,
      fusedStars: 0,
      pet: outcome.pet,
      shell: { color: colors[0]!, color2: colors[1] ?? colors[0]! },
      via: 'order',
    });
  };

  const short = picked ? picked.price - list.stars : 0;
  const empty = all.length === 0 ? 'Everything in the Field Guide is yours.' : 'Everything in this series is in your collection. Try another series.';

  return (
    <>
      <p class={s.lead}>Anything not yet in the Field Guide, for stamps.</p>
      <p class={s.muted}>{PRICE_LIST}</p>

      <SwapShelf machineId={initialMachine} />

      <div class={s.filters} role="group" aria-label="Series">
        <Chip on={series === 'all'} onClick={() => filterSeries('all')}>
          Every series
        </Chip>
        {seriesWithItems.map((key) => (
          <Chip key={key} on={series === key} onClick={() => filterSeries(key)}>
            {seriesChip(key)}
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
        <p class={s.empty}>{empty}</p>
      ) : (
        <ul class={s.orderGrid}>
          {items.slice(0, limit).map((item) => {
            const away = item.status === 'season-not-visited';
            const m = item.series === 'moonlit' ? undefined : MACHINE_BY_ID.get(item.series);
            const visits = away && m?.seasonal ? `Can be ordered once the ${m.name} has visited. It visits ${monthDay(m.seasonal.start)} to ${monthDay(m.seasonal.end)}, every year.` : '';
            return (
              <li key={item.id}>
                <button
                  type="button"
                  class={cx(s.orderTile, pickedId === item.id && s.orderPicked, away && s.orderAway)}
                  onClick={() => pick(item)}
                  aria-pressed={pickedId === item.id}
                  aria-disabled={away || undefined}
                  disabled={away}
                  title={visits || undefined}
                >
                  <span class={s.orderArt}>
                    <OrderArt item={item} />
                  </span>
                  <span class={s.tileName}>{orderName(item)}</span>
                  {away ? (
                    <span class={s.orderAwayNote}>
                      {item.arrives ? `Visits ${monthDayOfKey(item.arrives)}` : 'Visits later'}
                      <span class="sr-only">. {visits}</span>
                    </span>
                  ) : (
                    <span class={s.orderPrice}>
                      <StampIcon size={14} />
                      <span class="num">{item.price}</span>
                      <span class="sr-only"> stamps, {item.rarityLabel}</span>
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
            <p class={s.confirmTitle}>
              Order the {orderName(picked)} for {picked.price} stamps?
            </p>
            <p class={s.confirmMeta}>
              <RarityPill rarity={picked.rarity} secret={picked.hidden} size="sm" />
              <span>
                <StampIcon size={16} /> <span class="num">{list.stars}</span> on the card
              </span>
            </p>
            {error ? (
              <p class={s.confirmError} role="alert">
                {error}
              </p>
            ) : short > 0 ? (
              <p class={s.confirmError}>{orderErrorText('not-enough-stars', { rarity: picked.rarity, price: picked.price }, list.stars)}</p>
            ) : null}
          </div>
          <div class={s.confirmActions}>
            <Button size="sm" variant="quiet" onClick={() => pick(null)}>
              Not now
            </Button>
            <Button size="sm" face={{ fill: 'var(--lavender-500)', ink: '#3B3236' }} onClick={place} disabled={short > 0}>
              Order
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

/** A Secret stays a secret at the counter too: it can be ordered, and it's still a surprise. */
function OrderArt({ item }: { item: Tile }) {
  if (!item.hidden) return <CollectibleArt id={item.id} size="100%" px={64} />;
  return (
    <span class={s.secretMark} aria-hidden="true">
      ?
    </span>
  );
}

function seriesChip(key: SeriesKey): string {
  if (key === 'moonlit') return 'Moonlit';
  const m = MACHINE_BY_ID.get(key);
  return m?.number ? `${m.number} ${MACHINE_SHORT[key]}` : MACHINE_SHORT[key];
}

function orderName(item: Tile): string {
  return item.hidden && item.series !== 'moonlit' ? `${MACHINE_SHORT[item.series]} Secret` : item.name;
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ComponentChildren }) {
  return (
    <button type="button" class={cx(s.chip, on && s.chipOn)} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}
