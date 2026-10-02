/**
 * Records, Insights, Pins and the Memory shelf (DESIGN §9.2, §13; VOICE.md §6, §8, §12, §17).
 * Records and Insights are plain rows that leave out anything that would say 0. Pins are enamel
 * pins: earned ones in colour, then the four nearest "not yet" ones as outlines (the rest behind one
 * quiet button, never a wall of what's undone), and a pin that stays hidden until it is earned isn't
 * on the shelf at all; a tap says how each one is earned. The memory shelf keeps every Sunday Note,
 * Herbarium page and anniversary note and the past seasons, and points to the balcony tier on
 * Plants for the retired plants (drawn once, there).
 */
import { useRef, useState } from 'preact/hooks';
import { FitObject } from '@/features/shelf/FitObject';
import { keepsakeCaption } from '@/features/pets/petCopy';
import { BadgeMedal } from '@/art/badges';
import { NoteCard } from '@/art/progress';
import { insightLines, recordLines, plural, num } from '@/catalog/format';
import { EMPTY, PROGRESS_LINES, fillLine } from '@/catalog/lines';
import { monthDayLabel } from '@/domain/dates';
import type { BadgeVM, MemoryShelfVM, ProgressVM, RitualVM } from '@/state/selectors';
import { state } from '@/state/store';
import { openRitual, openSeason } from '@/features/rituals/open';
import { SEASON_LABEL, anniversaryWords, monthName } from '@/features/rituals/words';
import { ritualLookup } from '@/features/rituals/lookup';
import { Sheet } from '@/ui/Sheet';
import { haptic } from '@/fx/haptics';
import { cx } from '@/ui/cx';
import { PROGRESS_UI } from './copy';
import s from './ProgressScreen.module.css';

/* ------------------------------------------------------------------ */
/* Records and Insights                                                */
/* ------------------------------------------------------------------ */

/** "Waterings: 312" → a label and its value (the words are the formatter's; the split is only type). */
function splitRecord(line: string): [string, string] | [string] {
  const i = line.indexOf(': ');
  return i < 0 ? [line] : [line.slice(0, i), line.slice(i + 2)];
}

export function Records({ records }: { records: ProgressVM['records'] }) {
  const lines = recordLines(records);
  if (lines.length === 0) return <p class={s.quiet}>{EMPTY.records}</p>;
  return (
    <dl class={s.records}>
      {lines.map((l) => {
        const [k, v] = splitRecord(l);
        return v === undefined ? (
          <div key={l} class={s.record}>
            <dd>{k}</dd>
          </div>
        ) : (
          <div key={l} class={s.record}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        );
      })}
    </dl>
  );
}

export function Insights({ insights }: { insights: ProgressVM['insights'] }) {
  const lines = insightLines(insights);
  if (lines.length === 0) return <p class={s.quiet}>{EMPTY.insights}</p>;
  return (
    <ul class={s.insights}>
      {lines.map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Pins                                                                */
/* ------------------------------------------------------------------ */

/** How many "not yet" pins stand on the shelf before the rest are asked for. */
const NEXT_PINS = 4;

export function Pins({ badges }: { badges: readonly BadgeVM[] }) {
  const [open, setOpen] = useState<BadgeVM | null>(null);
  const [shown, setShown] = useState<BadgeVM | null>(null);
  const [all, setAll] = useState(false);
  const list = useRef<HTMLUListElement>(null);
  const shelf = badges.filter((b) => !b.hidden);
  const earned = shelf.filter((b) => b.earned);
  // The pins nearest to being earned come first; the rest wait behind one quiet button.
  const notYet = shelf
    .filter((b) => !b.earned)
    .map((b, i) => ({ b, i, share: b.progress && b.progress.need > 0 ? b.progress.have / b.progress.need : 0 }))
    .sort((x, y) => y.share - x.share || x.i - y.i)
    .map((x) => x.b);
  const visible = all ? notYet : notYet.slice(0, NEXT_PINS);
  const hiddenCount = notYet.length - visible.length;
  return (
    <>
      {earned.length === 0 && <p class={cx(s.quiet, s.pinsLead)}>{EMPTY.pins}</p>}
      <ul ref={list} class={s.pins}>
        {[...earned, ...visible].map((b) => (
          <li key={b.id}>
            <button
              type="button"
              class={cx(s.pin, !b.earned && s.pinNotYet)}
              aria-label={b.earned ? b.name : fillLine(PROGRESS_UI.pins.pinLabel, { name: b.name })}
              aria-haspopup="dialog"
              data-pin={b.id}
              data-earned={b.earned}
              onClick={() => {
                haptic('tick');
                setShown(b);
                setOpen(b);
              }}
            >
              <BadgeMedal badgeId={b.id} earned={b.earned} size={52} />
              <span class={s.pinName} aria-hidden="true">
                {b.name}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <button
          type="button"
          class={s.morePins}
          data-more-pins
          onClick={() => {
            const first = earned.length + visible.length;
            setAll(true);
            // Focus lands on the first pin that just came onto the shelf.
            requestAnimationFrame(() => list.current?.querySelectorAll<HTMLButtonElement>('button')[first]?.focus());
          }}
        >
          {fillLine(plural(hiddenCount, PROGRESS_UI.pins.more), { count: num(hiddenCount) })}
        </button>
      )}
      <Sheet open={open !== null} onClose={() => setOpen(null)} title={shown?.name ?? PROGRESS_UI.sections.pins} detents={['content']} size="sm" peek={shown ? <BadgeMedal badgeId={shown.id} earned={shown.earned} size={96} /> : undefined}>
        {shown && <PinDetail pin={shown} />}
      </Sheet>
    </>
  );
}

function PinDetail({ pin }: { pin: BadgeVM }) {
  const quiet = state.value.settings.quietRewards;
  // How it is earned is the description; the meta line is only for something already true.
  const meta =
    pin.earned && pin.earnedAt !== null
      ? fillLine(PROGRESS_UI.pins.earned, { date: monthDayLabel(dateKeyOf(pin.earnedAt)) })
      : !pin.earned && pin.progress && pin.progress.have > 0
        ? fillLine(PROGRESS_UI.pins.progress, { have: num(pin.progress.have), need: num(pin.progress.need) })
        : null;
  return (
    <div class={s.pinDetail}>
      <p class={s.pinDescription}>{pin.description}</p>
      {meta && <p class={s.pinMeta}>{meta}</p>}
      {!quiet && pin.stars > 0 && <p class={s.pinStamps}>{fillLine(plural(pin.stars, PROGRESS_UI.pins.stamps), { count: num(pin.stars) })}</p>}
    </div>
  );
}

/** An epoch (a pin's earned time) as its local date key. */
function dateKeyOf(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/* The memory shelf                                                    */
/* ------------------------------------------------------------------ */

function ritualLabel(r: RitualVM): string {
  const M = PROGRESS_LINES.memoryItems;
  if (r.kind === 'sundayNote') return fillLine(M.sundayNote, { date: monthDayLabel(r.weekStart) });
  if (r.kind === 'herbarium') return fillLine(M.herbarium, { Month: monthName(r.month) });
  const text = anniversaryWords(r, ritualLookup(state.value));
  return text.slice(0, text.indexOf('.') + 1) || text;
}

/** The balcony tier's heading on Plants: the memory shelf points there rather than drawing the plants twice. */
export const BALCONY_ID = 'progress-balcony';

export function MemoryShelf({ shelf, retired }: { shelf: MemoryShelfVM; retired: number }) {
  const keepsakes = state.value.keepsakes ?? [];
  const empty = shelf.items.length === 0 && retired === 0 && shelf.seasons.length === 0 && keepsakes.length === 0;
  if (empty) return <p class={s.quiet}>{EMPTY.memoryShelf}</p>;
  const M = PROGRESS_LINES.memoryItems;
  return (
    <div class={s.memory}>
      {shelf.items.length > 0 && (
        <ul class={s.memoryRow} data-memory="notes">
          {shelf.items.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                class={s.memoryItem}
                aria-haspopup="dialog"
                data-ritual={r.kind}
                onClick={() => {
                  haptic('tick');
                  openRitual(r.id);
                }}
              >
                <NoteCard kind={r.kind} size={76} pressings={r.kind === 'herbarium' ? r.pressings.slice(0, 3).map((p) => ({ species: p.plant, share: Math.max(0.14, p.size / 7), rests: p.rests })) : undefined} />
                <span class={s.memoryLabel}>
                  {ritualLabel(r)}
                  {!r.read && <span class={s.newMark}>{PROGRESS_UI.memory.new}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {shelf.seasons.length > 0 && (
        <ul class={s.memoryRow} data-memory="seasons">
          {shelf.seasons.map((r) => (
            <li key={r.key}>
              <button type="button" class={s.memoryItem} aria-haspopup="dialog" onClick={() => openSeason(r.key)}>
                <NoteCard kind="story" size={76} />
                <span class={s.memoryLabel}>{fillLine(M.season, { Season: SEASON_LABEL[r.name] })}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {keepsakes.length > 0 && (
        <ul class={s.memoryRow} data-memory="keepsakes" tabIndex={0} aria-label={PROGRESS_UI.sections.memory}>
          {keepsakes.map((k) => (
            <li key={k.id}>
              <div class={cx(s.memoryItem, s.keepsake)}>
                <FitObject keepsake={k.kind} size={52} />
                <span class={s.memoryLabel}>{keepsakeCaption(k)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {retired > 0 && (
        <a
          class={s.balconyLink}
          href={`#${BALCONY_ID}`}
          data-memory="retired"
          onClick={(e) => {
            // In a hash router a fragment link would change the route: scroll to the tier instead.
            e.preventDefault();
            const el = document.getElementById(BALCONY_ID);
            el?.scrollIntoView({ behavior: document.documentElement.dataset.motion === 'reduced' ? 'auto' : 'smooth', block: 'start' });
            el?.focus({ preventScroll: true });
          }}
        >
          {fillLine(plural(retired, PROGRESS_UI.memory.balcony), { count: num(retired) })}
        </a>
      )}
    </div>
  );
}
