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

/** A page's cover: its first pet she has, else its first pet, muted. */
function coverOf(album: AlbumVM): { id: string; owned: boolean } {
  const mine = album.pets.find((p) => p.owned > 0);
  const first = mine ?? album.pets.find((p) => !p.hidden) ?? album.pets[0];
  return { id: first?.id ?? '', owned: !!mine };
}

/**
 * The Field Guide on the Shelf (DESIGN §8.5): how much of it is hers, and a cover per species page.
 * Each page opens the Field Guide sheet there.
 */
export function FieldGuideCard({ onOpen }: { onOpen: (page: string | null) => void }) {
  const guide = collectionView.value;
  const petsOwned = guide.albums.reduce((n, a) => n + a.owned, 0);
  const petsTotal = guide.albums.reduce((n, a) => n + a.total, 0);
  return (
    <section class={c.guide} aria-labelledby="shelf-guide">
      <Card class={c.guideCard} padding="md">
        <div class={c.guideHead}>
          <h2 id="shelf-guide" class={c.guideTitle}>
            {SHELF_COPY.fieldGuide}
          </h2>
          <span class={c.guideMeta}>{fillLine(SHELF_COPY.fieldGuideSheet.of, { owned: num(petsOwned), total: num(petsTotal) })}</span>
        </div>
        <ul class={c.pageRow}>
          {guide.albums.map((a) => {
            const cover = coverOf(a);
            return (
              <li key={a.id}>
                <button type="button" class={c.pageTile} data-complete={a.complete ? '' : undefined} onClick={() => onOpen(a.id)} aria-label={`${a.name}, ${fillLine(SHELF_COPY.fieldGuideSheet.of, { owned: a.owned, total: a.total })}`}>
                  <span class={c.pageArt} aria-hidden="true">
                    {cover.id && <CollectibleArt id={cover.id} size={56} px={56} muted={!cover.owned} animated={false} />}
                  </span>
                  <span class={c.pageName} aria-hidden="true">
                    {a.name}
                  </span>
                  <span class={c.pageCount} aria-hidden="true">
                    {a.owned} of {a.total}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
    </section>
  );
}

export interface FieldGuideSheetProps {
  open: boolean;
  /** The page to show (an album id); null opens the first page. */
  page: string | null;
  onPage: (page: string) => void;
  onClose: () => void;
}

/**
 * The Field Guide (DESIGN §8.5, VOICE §17): one page per species, with the real art for everyone she
 * has and the rest at 35% saturation, "not yet". Only a Secret is a "?". Each thing says where it
 * comes from (the series, and when a seasonal edition visits); a full page shows its keepsake. A pet
 * she has opens its Pet Card.
 */
export function FieldGuideSheet({ open, page, onPage, onClose }: FieldGuideSheetProps) {
  const guide = collectionView.value;
  const albums = guide.albums;
  const current = albums.find((a) => a.id === page) ?? albums[0]!;
  const tabs = useRef<HTMLDivElement>(null);
  const select = (i: number) => {
    const next = albums[(i + albums.length) % albums.length]!;
    onPage(next.id);
    tabs.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[albums.indexOf(next)]?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    const i = albums.indexOf(current);
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (step) {
      e.preventDefault();
      select(i + step);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      select(e.key === 'Home' ? 0 : albums.length - 1);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title={SHELF_COPY.fieldGuideSheet.title} size="lg" detents={['large']} initialFocus='[role="tab"][aria-selected="true"]'>
      <div class={s.guide}>
        <div class={s.tabs} role="tablist" aria-label={SHELF_COPY.fieldGuideSheet.pages} ref={tabs} onKeyDown={onKey}>
          {albums.map((a) => (
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
              <span class={s.tabCount}>
                {a.owned}/{a.total}
              </span>
            </button>
          ))}
        </div>
        <Page album={current} />
      </div>
    </Sheet>
  );
}

function Page({ album }: { album: AlbumVM }) {
  const pets = state.value.pets;
  const reward = rewardLine(album);
  const items = useMemo(() => album.pets, [album]);
  return (
    <div class={s.page} role="tabpanel" id="guide-page" aria-labelledby={`guide-tab-${album.id}`} tabIndex={0}>
      <header class={s.pageHead}>
        <h3 class={s.pageTitle}>{album.name}</h3>
        <span class={s.pageMeta}>{fillLine(SHELF_COPY.fieldGuideSheet.of, { owned: album.owned, total: album.total })}</span>
      </header>
      {album.complete && (
        <div class={s.reward}>
          {album.reward && (
            <span class={s.rewardArt} aria-hidden="true">
              <CollectibleArt id={album.reward} size={64} px={64} animated={false} />
            </span>
          )}
          <p class={s.rewardText}>{reward ?? SHELF_COPY.fieldGuideSheet.pageFull}</p>
        </div>
      )}
      {album.owned === 0 && <p class={s.empty}>{emptyPageLine(album.name, pageCabinet(album))}</p>}
      <ul class={s.grid}>
        {items.map((item) => (
          <li key={item.id}>
            <Tile item={item} name={pets[item.id]?.name ?? null} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tile({ item, name }: { item: BookItemVM; name: string | null }) {
  const owned = item.owned > 0;
  const where = [item.from, visitsLine(item.visits)].filter(Boolean).join(' · ');
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
      <span class={s.tileMeta}>{owned ? (name ? item.name : where) : SHELF_COPY.fieldGuideSheet.notYet}</span>
      {!owned && where && <span class={s.tileFrom}>{where}</span>}
    </>
  );
  if (owned && name) {
    return (
      <button type="button" class={s.tile} data-owned="" onClick={() => openPetCard(item.id)} aria-label={`${name}, ${item.name}`}>
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


