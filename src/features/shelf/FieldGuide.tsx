import { memo } from 'preact/compat';
import { useMemo, useRef } from 'preact/hooks';
import { getCollectible } from '@/catalog/collectibles';
import { MACHINE_BY_ID } from '@/catalog/machines';
import { EXCLUSIVE_LINES, fillLine, withArticle } from '@/catalog/lines';
import { num } from '@/catalog/format';
import type { MachineId } from '@/catalog/types';
import { CollectibleArt } from '@/art/CollectibleArt';
import { collectionView, type AlbumVM, type BookItemVM } from '@/state/selectors';
import { state } from '@/state/store';
import { openPetCard } from '@/features/habits/open';
import { Card } from '@/ui/Card';
import { Sheet } from '@/ui/Sheet';
import { SecretSparkle } from '@/ui/SecretSparkle';
import { SHELF_COPY, emptyPageLine } from './copy';
import { keyed } from './stable';
import s from './Sheets.module.css';
import c from './ShelfScreen.module.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const md = (d: { month: number; day: number }) => `${MONTHS[d.month - 1]} ${d.day}`;

/** "Visits Sep 1 to Nov 10": when a seasonal edition's things come round. */
export function visitsLine(v: BookItemVM['visits']): string | null {
  return v ? fillLine(SHELF_COPY.fieldGuideSheet.visits, { from: md(v.start), to: md(v.end) }) : null;
}

/** The cabinet a page's pets come from ("No. 02"), for the empty page's line. */
export function pageCabinet(album: AlbumVM): string {
  const source = getCollectible(album.pets[0]?.id ?? '')?.source;
  const m = source && MACHINE_BY_ID.get(source as MachineId);
  return m ? (m.number ?? m.name) : '';
}

/** The page's keepsake once it is full ("The Cats page is full. A reading chair, for the Shelf."). */
export function rewardLine(album: AlbumVM): string | null {
  if (!album.complete || !album.reward) return null;
  const line = EXCLUSIVE_LINES[album.reward];
  if (line) return line;
  const name = getCollectible(album.reward)?.name ?? album.reward;
  return fillLine(EXCLUSIVE_LINES.fallback, { A: withArticle(name, true) });
}

/**
 * A page of the Field Guide: a species page (`album`), the Moonlit page, or the wearables, treats,
 * decor, plants and pots (DESIGN §8.5). The pets' own category is the species pages.
 */
export interface GuidePage {
  id: string;
  name: string;
  owned: number;
  total: number;
  items: BookItemVM[];
  album: AlbumVM | null;
}

/** The Field Guide's view: rebuilt only when her collection changes (never on a stroke). */
export const guideView = keyed(
  () => state.value.collection,
  () => {
    const guide = collectionView.peek();
    const pages: GuidePage[] = guide.albums.map((a) => ({ id: a.id, name: a.name, owned: a.owned, total: a.total, items: a.pets, album: a }));
    if (guide.moonlit.items.length > 0) pages.push({ id: 'moonlit', name: SHELF_COPY.fieldGuideSheet.moonlit, owned: guide.moonlit.owned, total: guide.moonlit.total, items: guide.moonlit.items, album: null });
    for (const c of guide.categories) if (c.category !== 'pet' && c.total > 0) pages.push({ id: `things-${c.category}`, name: c.label, owned: c.owned, total: c.total, items: c.items, album: null });
    return { owned: guide.owned, total: guide.total, pages };
  },
);

/** A page's cover: its first thing she has, else its first thing, muted. */
function coverOf(page: GuidePage): { id: string; owned: boolean } {
  const mine = page.items.find((p) => p.owned > 0);
  const first = mine ?? page.items.find((p) => !p.hidden) ?? page.items[0];
  return { id: first?.id ?? '', owned: !!mine };
}

const ofLine = (owned: number, total: number) => fillLine(SHELF_COPY.fieldGuideSheet.of, { owned: num(owned), total: num(total) });

/**
 * The Field Guide on the Shelf (DESIGN §8.5): how much of it is hers (everything, as the pins count
 * it), and a cover per page. Each page opens the Field Guide sheet there.
 */
export const FieldGuideCard = memo(function FieldGuideCard({ onOpen }: { onOpen: (page: string | null) => void }) {
  const guide = guideView.value;
  return (
    <section class={c.guide} aria-labelledby="shelf-guide">
      <Card class={c.guideCard} padding="md">
        <div class={c.guideHead}>
          <h2 id="shelf-guide" class={c.guideTitle} aria-describedby="shelf-guide-count">
            {SHELF_COPY.fieldGuide}
          </h2>
          <span class={c.guideMeta} id="shelf-guide-count">
            {ofLine(guide.owned, guide.total)}
          </span>
        </div>
        <ul class={c.pageRow}>
          {guide.pages.map((p) => {
            const cover = coverOf(p);
            return (
              <li key={p.id}>
                <button type="button" class={c.pageTile} data-complete={p.album?.complete ? '' : undefined} onClick={() => onOpen(p.id)} aria-label={`${p.name}, ${ofLine(p.owned, p.total)}`}>
                  <span class={c.pageArt} aria-hidden="true">
                    {cover.id && <CollectibleArt id={cover.id} size={56} px={56} muted={!cover.owned} animated={false} />}
                  </span>
                  <span class={c.pageName} aria-hidden="true">
                    {p.name}
                  </span>
                  <span class={c.pageCount} aria-hidden="true">
                    {ofLine(p.owned, p.total)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
    </section>
  );
});

export interface FieldGuideSheetProps {
  open: boolean;
  /** The page to show (a page id); null opens the first page. */
  page: string | null;
  onPage: (page: string) => void;
  onClose: () => void;
}

/**
 * The Field Guide (DESIGN §8.5, VOICE §17): one page per species, then the Moonlit page and a page
 * each for things to wear, treats, decor, plants and pots. The real art for everything she has and
 * the rest at 35% saturation, "not yet"; only a Secret is a "?". Each thing says where it comes from
 * (the series, and when a seasonal edition visits) and, once hers, its rarity in words; a full
 * species page shows its keepsake. A pet she has opens its Pet Card.
 */
export function FieldGuideSheet({ open, page, onPage, onClose }: FieldGuideSheetProps) {
  const pages = guideView.value.pages;
  const current = pages.find((a) => a.id === page) ?? pages[0]!;
  const tabs = useRef<HTMLDivElement>(null);
  const select = (i: number) => {
    const next = pages[(i + pages.length) % pages.length]!;
    onPage(next.id);
    tabs.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[pages.indexOf(next)]?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    const i = pages.indexOf(current);
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (step) {
      e.preventDefault();
      select(i + step);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      select(e.key === 'Home' ? 0 : pages.length - 1);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title={SHELF_COPY.fieldGuideSheet.title} size="lg" detents={['large']} initialFocus='[role="tab"][aria-selected="true"]'>
      <div class={s.guide}>
        <div class={s.tabs} role="tablist" aria-label={SHELF_COPY.fieldGuideSheet.pages} ref={tabs} onKeyDown={onKey}>
          {pages.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              id={`guide-tab-${a.id}`}
              aria-selected={a.id === current.id}
              aria-controls="guide-page"
              tabIndex={a.id === current.id ? 0 : -1}
              class={s.tab}
              onClick={() => onPage(a.id)}
            >
              {a.name}
              <span class={s.tabCount} aria-hidden="true">
                {a.owned}/{a.total}
              </span>
              <span class="sr-only">{`, ${ofLine(a.owned, a.total)}`}</span>
            </button>
          ))}
        </div>
        <Page page={current} />
      </div>
    </Sheet>
  );
}

function Page({ page }: { page: GuidePage }) {
  const pets = state.value.pets;
  const album = page.album;
  const reward = album ? rewardLine(album) : null;
  const items = page.items;
  // The page's own series is said once, in its header; a tile names its source only when it differs.
  const series = useMemo(() => (album || page.id === 'moonlit' ? mostCommon(items.map((i) => i.from)) : null), [items, album, page.id]);
  return (
    <div class={s.page} role="tabpanel" id="guide-page" aria-labelledby={`guide-tab-${page.id}`} tabIndex={0}>
      <div class={s.pageHead}>
        <h3 class={s.pageTitle} aria-describedby="guide-page-count">
          {page.name}
        </h3>
        <span class={s.pageMeta} id="guide-page-count">
          {ofLine(page.owned, page.total)}
        </span>
      </div>
      {series && <p class={s.pageFrom}>{series}</p>}
      {album?.complete && (
        <div class={s.reward}>
          {album.reward && (
            <span class={s.rewardArt} aria-hidden="true">
              <CollectibleArt id={album.reward} size={64} px={64} animated={false} />
            </span>
          )}
          <p class={s.rewardText}>{reward ?? SHELF_COPY.fieldGuideSheet.pageFull}</p>
        </div>
      )}
      {album && album.owned === 0 && <p class={s.empty}>{emptyPageLine(album.name, pageCabinet(album))}</p>}
      <ul class={s.grid}>
        {items.map((item) => (
          <li key={item.id}>
            <Tile item={item} name={pets[item.id]?.name ?? null} series={series} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function mostCommon(xs: readonly string[]): string | null {
  const n = new Map<string, number>();
  for (const x of xs) n.set(x, (n.get(x) ?? 0) + 1);
  let best: string | null = null;
  for (const [x, c] of n) if (!best || c > n.get(best)!) best = x;
  return best;
}

function Tile({ item, name, series }: { item: BookItemVM; name: string | null; series: string | null }) {
  const owned = item.owned > 0;
  const where = [item.from === series ? null : item.from, visitsLine(item.visits)].filter(Boolean).join(' · ');
  const body = (
    <>
      <span class={s.tileArt} aria-hidden="true">
        {item.hidden ? (
          <span class={s.secret}>
            ?
            <SecretSparkle class={s.sparkle} />
          </span>
        ) : (
          <CollectibleArt id={item.id} size="100%" px={88} muted={!owned} animated={false} />
        )}
      </span>
      <span class={s.tileName}>{item.hidden ? SHELF_COPY.fieldGuideSheet.secret : (name ?? item.name)}</span>
      {owned && name && <span class={s.tileMeta}>{item.name}</span>}
      {owned && item.rarityLabel && <span class={s.tileRarity}>{item.rarityLabel}</span>}
      {owned && !name && where && <span class={s.tileMeta}>{where}</span>}
      {!owned && <span class={s.tileMeta}>{SHELF_COPY.fieldGuideSheet.notYet}</span>}
      {!owned && where && <span class={s.tileFrom}>{where}</span>}
    </>
  );
  if (owned && name) {
    return (
      <button type="button" class={s.tile} data-owned="" onClick={() => openPetCard(item.id)} aria-label={`${name}, ${item.name}, ${item.rarityLabel}`}>
        {body}
      </button>
    );
  }
  return (
    <div class={s.tile} data-owned={owned ? '' : undefined} data-hidden={item.hidden ? '' : undefined}>
      {body}
    </div>
  );
}
