/**
 * Records, Insights, Pins and the Memory shelf (DESIGN §9.2, §13; VOICE.md §6, §8, §12, §17).
 * Records and Insights are plain rows that leave out anything that would say 0. Pins are enamel
 * pins: earned ones in colour, the rest outline-only "not yet", and a pin that stays hidden until
 * it is earned isn't on the shelf at all; a tap says how each one is earned. The memory shelf keeps
 * every Sunday Note, Herbarium page and anniversary note, the retired plants and the past seasons.
 */
import { useState } from 'preact/hooks';
import { BadgeMedal } from '@/art/badges';
import { NoteCard } from '@/art/progress';
import { PlantArt } from '@/art/plants';
import { insightLines, recordLines, plural, num } from '@/catalog/format';
import { EMPTY, PROGRESS_LINES, fillLine } from '@/catalog/lines';
import { monthDayLabel } from '@/domain/dates';
import type { BadgeVM, GardenPlantVM, MemoryShelfVM, ProgressVM, RitualVM } from '@/state/selectors';
import { state } from '@/state/store';
import { openHabitDetail } from '@/features/habits/open';
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

export function Pins({ badges }: { badges: readonly BadgeVM[] }) {
  const [open, setOpen] = useState<BadgeVM | null>(null);
  const [shown, setShown] = useState<BadgeVM | null>(null);
  const shelf = badges.filter((b) => !b.hidden);
  const earned = shelf.filter((b) => b.earned);
  return (
    <>
      {earned.length === 0 && <p class={s.quiet}>{EMPTY.pins}</p>}
      <ul class={s.pins}>
        {[...earned, ...shelf.filter((b) => !b.earned)].map((b) => (
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
              {!b.earned && (
                <span class={s.notYet} aria-hidden="true">
                  {PROGRESS_UI.pins.notYet}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <Sheet open={open !== null} onClose={() => setOpen(null)} title={shown?.name ?? PROGRESS_UI.sections.pins} detents={['content']} size="sm" peek={shown ? <BadgeMedal badgeId={shown.id} earned={shown.earned} size={96} /> : undefined}>
        {shown && <PinDetail pin={shown} />}
      </Sheet>
    </>
  );
}

function PinDetail({ pin }: { pin: BadgeVM }) {
  const quiet = state.value.settings.quietRewards;
  return (
    <div class={s.pinDetail}>
      <p class={s.pinDescription}>{pin.description}</p>
      {pin.earned && pin.earnedAt !== null ? (
        <p class={s.pinMeta}>{fillLine(PROGRESS_UI.pins.earned, { date: monthDayLabel(dateKeyOf(pin.earnedAt)) })}</p>
      ) : pin.progress && pin.progress.have > 0 ? (
        <p class={s.pinMeta}>{fillLine(PROGRESS_UI.pins.progress, { have: num(pin.progress.have), need: num(pin.progress.need) })}</p>
      ) : (
        <p class={s.pinMeta}>{PROGRESS_UI.pins.notYet}</p>
      )}
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

export function MemoryShelf({ shelf, garden }: { shelf: MemoryShelfVM; garden: readonly GardenPlantVM[] }) {
  const empty = shelf.items.length === 0 && shelf.retired.length === 0 && shelf.seasons.length === 0;
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
      {shelf.retired.length > 0 && (
        <ul class={s.memoryRow} data-memory="retired">
          {shelf.retired.map((r) => {
            const g = garden.find((x) => x.habitId === r.habitId)?.plant;
            return (
            <li key={r.habitId}>
              <button type="button" class={s.memoryItem} aria-haspopup="dialog" onClick={() => openHabitDetail(r.habitId)}>
                <span class={s.memoryPlant} aria-hidden="true">
                  <PlantArt species={r.plant} stage={g?.displayStage ?? 2} progress={g?.progress} blooms={g?.blooms} pot={g?.pot ?? 'terracotta'} withPot size="100%" animated={false} />
                </span>
                <span class={s.memoryLabel}>{fillLine(M.retired, { habit: r.name, date: monthDayLabel(r.archivedOn) })}</span>
              </button>
            </li>
            );
          })}
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
    </div>
  );
}
