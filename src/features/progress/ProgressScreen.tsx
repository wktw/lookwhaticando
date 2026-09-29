/**
 * The Progress screen (DESIGN §9.2): the one screen that looks back, and only at what happened.
 * Hero → Recent months → Plants → Calendar → The year → Records · Insights → Pins → Memory shelf.
 * Showing up over time, never a streak that falls to zero; a number that went down is simply not
 * shown (VOICE.md §6).
 *
 * Everything comes from the view models (`progressView`, `badgesView`, `memoryShelfView`,
 * `selectCalendarMonth`, `selectYearQuilt`); the words from src/catalog/format.ts and lines.ts.
 * Plants open Habit Detail (the shared sheet); notes and pages open in the ritual reader, which
 * loads lazily the first time one is asked for.
 */
import type { ComponentChildren, ComponentType } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { badgesView, memoryShelfView, progressView } from '@/state/selectors';
import { state } from '@/state/store';
import { EMPTY } from '@/catalog/lines';
import { openHabitEditor } from '@/features/habits/open';
import { ritualRequest } from '@/features/rituals/open';
import { PlantArt } from '@/art/plants';
import { Button } from '@/ui/Button';
import es from '@/ui/EmptyState.module.css';
import { cx } from '@/ui/cx';
import { Calendar } from './Calendar';
import { Hero, RecentMonths } from './Hero';
import { Insights, MemoryShelf, Pins, Records } from './Keepsakes';
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

/** The ritual reader, loaded the first time a note is opened (a lazy chunk, like the sheets). */
function useRitualReader(): ComponentType | null {
  const [Host, setHost] = useState<ComponentType | null>(null);
  const wanted = ritualRequest.value !== null;
  useEffect(() => {
    if (wanted && !Host) void import('@/features/rituals/RitualReaderHost').then((m) => setHost(() => m.default));
  }, [wanted, Host]);
  return Host;
}

/**
 * The screen's first frame is the hero, the months and the plants; everything below the fold
 * (the calendar, the year, records, pins, the memory shelf) follows a frame later, so opening
 * Progress on a long history stays quick.
 */
function useAfterFirstPaint(): boolean {
  const [done, setDone] = useState(false);
  useEffect(() => {
    let t = 0;
    const raf = requestAnimationFrame(() => (t = window.setTimeout(() => setDone(true), 0)));
    return () => (cancelAnimationFrame(raf), clearTimeout(t));
  }, []);
  return done;
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
  const badges = badgesView.value;
  const shelf = memoryShelfView.value;
  const [calHabit, setCalHabit] = useState<string | null>(null);
  const Reader = useRitualReader();
  const rest = useAfterFirstPaint();
  const live = vm.garden.filter((g) => !g.retired);
  const retired = vm.garden.filter((g) => g.retired);
  const hasHabits = vm.garden.length > 0;
  // A filtered habit that was deleted meanwhile falls back to all habits.
  const filter = calHabit && vm.garden.some((g) => g.habitId === calHabit) ? calHabit : null;

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

          <Section id="months" title={T.months}>
            <RecentMonths months={vm.recentMonths} />
          </Section>

          <Section id="plants" title={T.plants}>
            {live.length > 0 && <PlantShelf garden={live} />}
            {retired.length > 0 && (
              <>
                <h3 class={s.subTitle}>{T.balcony}</h3>
                <PlantShelf garden={retired} balcony />
              </>
            )}
          </Section>

          {!rest ? (
            <div class={s.pending} aria-hidden="true" />
          ) : (
            <>
          <Section id="calendar" class={s.later} title={T.calendar}>
            <HabitFilter value={filter} onChange={setCalHabit} />
            <div class={s.card}>
              <Calendar key={filter ?? 'all'} habitId={filter} idPrefix="progress-cal" />
            </div>
          </Section>

          <Section id="year" class={s.later} title={T.year}>
            <div class={s.card}>
              <YearStrip />
            </div>
          </Section>

          <div class={cx(s.pair, s.later)}>
            <Section id="records" title={T.records}>
              <Records records={vm.records} />
            </Section>
            <Section id="insights" title={T.insights}>
              <Insights insights={vm.insights} />
            </Section>
          </div>

          <Section id="pins" class={s.later} title={T.pins} meta={badges.earned > 0 ? String(badges.earned) : null}>
            <Pins badges={badges.badges} />
          </Section>

          <Section id="memory" class={s.later} title={T.memory}>
            <MemoryShelf shelf={shelf} garden={vm.garden} />
          </Section>
            </>
          )}
        </>
      )}
      {Reader && <Reader />}
    </div>
  );
}
