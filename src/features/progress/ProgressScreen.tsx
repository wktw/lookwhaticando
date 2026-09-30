/**
 * The Progress screen (DESIGN §9.2): the one screen that looks back, and only at what happened.
 * Hero → Recent months → Plants → Calendar → The year → Records · Insights → Pins → Memory shelf.
 * Showing up over time, never a streak that falls to zero; a number that went down is simply not
 * shown (VOICE.md §6).
 *
 * Everything comes from the view models (`progressView`, `badgesView`, `memoryShelfView`,
 * `selectCalendarMonth`, `selectYearQuilt`); the words from src/catalog/format.ts and lines.ts.
 * Plants open Habit Detail and notes and pages the ritual reader: shared sheets the app shell loads
 * and hosts (src/app/SheetHosts.tsx), so a chunk that can't load shows the same retry there.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { badgesView, memoryShelfView, progressView } from '@/state/selectors';
import { state } from '@/state/store';
import { EMPTY } from '@/catalog/lines';
import { openHabitEditor } from '@/features/habits/open';
import { PlantArt } from '@/art/plants';
import { Button } from '@/ui/Button';
import es from '@/ui/EmptyState.module.css';
import { cx } from '@/ui/cx';
import { Calendar } from './Calendar';
import { Hero, RecentMonths, hasMonths } from './Hero';
import { BALCONY_ID, Insights, MemoryShelf, Pins, Records } from './Keepsakes';
import { PlantShelf } from './PlantShelf';
import { YearStrip } from './YearStrip';
import { PROGRESS_UI } from './copy';
import s from './ProgressScreen.module.css';

const T = PROGRESS_UI.sections;

/** A section with a small-caps heading (DESIGN §10.2). */
function Section({ id, title, meta, children, class: cls }: { id: string; title: string; meta?: string | null; children: ComponentChildren; class?: string }) {
  return (
    <section class={cx(s.section, cls)} aria-labelledby={`progress-${id}`} data-section={id}>
      <div class={s.sectionHead}>
        <h2 id={`progress-${id}`} class={s.sectionTitle}>
          {title}
        </h2>
        {meta && <span class={s.sectionMeta}>{meta}</span>}
      </div>
      {children}
    </section>
  );
}

/**
 * The screen's first frame is the hero, the months and the plants; everything below the fold
 * follows in four small steps after it (the calendar, the year, records and pins, the memory
 * shelf), each in its own idle slice, so opening Progress on a long history stays quick and
 * a tap right after it is never kept waiting behind one long task.
 */
const STAGES = 4;
function useStages(): number {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (stage >= STAGES) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const next = () => setStage((n) => n + 1);
    if (stage === 0) {
      // The first step waits for the first paint.
      let t = 0;
      const raf = requestAnimationFrame(() => (t = window.setTimeout(next, 0)));
      return () => (cancelAnimationFrame(raf), clearTimeout(t));
    }
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(next, { timeout: 120 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(next, 16);
    return () => clearTimeout(t);
  }, [stage]);
  return stage;
}

/** Pins, reading the badges only once they are drawn (not before the first paint). */
function PinsSection() {
  const badges = badgesView.value;
  return (
    <Section id="pins" class={s.later} title={T.pins} meta={badges.earned > 0 ? String(badges.earned) : null}>
      <Pins badges={badges.badges} />
    </Section>
  );
}

/** The memory shelf, reading its view only once it is drawn. */
function MemorySection({ retired }: { retired: number }) {
  return (
    <Section id="memory" class={s.later} title={T.memory}>
      <MemoryShelf shelf={memoryShelfView.value} retired={retired} />
    </Section>
  );
}

/** The calendar's habit filter: "All habits" and each habit, as one radio group with roving focus. */
function HabitFilter({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const habits = [...state.value.habits].sort((a, b) => Number(a.archivedOn !== undefined) - Number(b.archivedOn !== undefined) || a.order - b.order);
  const options: { id: string | null; label: string }[] = [{ id: null, label: PROGRESS_UI.calendar.all }, ...habits.map((h) => ({ id: h.id, label: h.name }))];
  const group = useRef<HTMLDivElement>(null);
  const onKey = (e: KeyboardEvent) => {
    const i = Math.max(0, options.findIndex((o) => o.id === value));
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    const j = dir ? (i + dir + options.length) % options.length : e.key === 'Home' ? 0 : e.key === 'End' ? options.length - 1 : -1;
    if (j < 0) return;
    e.preventDefault();
    onChange(options[j]!.id);
    requestAnimationFrame(() => {
      const el = group.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[j];
      el?.focus();
      el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    });
  };
  return (
    <div ref={group} class={s.filter} role="radiogroup" aria-label={PROGRESS_UI.calendar.filter} onKeyDown={onKey}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button key={o.id ?? 'all'} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} class={cx(s.filterChip, on && s.filterOn)} onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function ProgressScreen() {
  const vm = progressView.value;
  const [calHabit, setCalHabit] = useState<string | null>(null);
  const stage = useStages();
  const live = vm.garden.filter((g) => !g.retired);
  const retired = vm.garden.filter((g) => g.retired);
  const hasHabits = vm.garden.length > 0;
  // A filtered habit that was deleted meanwhile falls back to all habits.
  const filter = calHabit && vm.garden.some((g) => g.habitId === calHabit) ? calHabit : null;
  const watered = vm.records.totalCheckins > 0;

  return (
    <div class={s.screen} data-screen="progress">
      <header class={s.header}>
        <h1 class={s.title}>{PROGRESS_UI.title}</h1>
      </header>

      {!hasHabits ? (
        // The kit's empty state, with its line as a sentence rather than a heading (h1 → h3 would skip a level).
        <div class={es.empty} data-empty="progress">
          <div class={es.tile} aria-hidden="true">
            <PlantArt species="pothos" stage={0} pot="terracotta" fit="icon" withPot size={104} animated={false} />
          </div>
          <p class={cx(es.title, s.emptyTitle)}>{EMPTY.progress}</p>
          <div class={es.action}>
            <Button onClick={() => openHabitEditor()}>{EMPTY.addHabit}</Button>
          </div>
        </div>
      ) : (
        <>
          <Hero vm={vm} />

          {/* A month with no days yet has nothing to draw: the hero already says it fills in. */}
          {hasMonths(vm.recentMonths) && (
            <Section id="months" title={T.months}>
              <RecentMonths months={vm.recentMonths} />
            </Section>
          )}

          <Section id="plants" title={T.plants}>
            {live.length > 0 && <PlantShelf garden={live} />}
            {retired.length > 0 && (
              <>
                <h3 id={BALCONY_ID} class={s.subTitle} tabIndex={-1}>
                  {T.balcony}
                </h3>
                <PlantShelf garden={retired} balcony />
              </>
            )}
          </Section>

          {stage >= 1 && (
            <Section id="calendar" class={s.later} title={T.calendar}>
              <HabitFilter value={filter} onChange={setCalHabit} />
              <div class={s.card}>
                <Calendar key={filter ?? 'all'} habitId={filter} idPrefix="progress-cal" />
              </div>
            </Section>
          )}

          {stage >= 2 && watered && (
            <Section id="year" class={s.later} title={T.year}>
              <div class={s.card}>
                <YearStrip />
              </div>
            </Section>
          )}

          {stage >= 3 && (
            <>
              <div class={cx(s.pair, s.later)}>
                <Section id="records" title={T.records}>
                  <Records records={vm.records} />
                </Section>
                <Section id="insights" title={T.insights}>
                  <Insights insights={vm.insights} />
                </Section>
              </div>
              <PinsSection />
            </>
          )}
          {stage >= 4 && <MemorySection retired={retired.length} />}
          {stage < STAGES && <div class={s.pending} style={{ minHeight: `${(STAGES - stage) * 450}px` }} aria-hidden="true" />}
        </>
      )}
    </div>
  );
}
