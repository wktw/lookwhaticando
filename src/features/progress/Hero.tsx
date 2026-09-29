/**
 * The hero and the recent months (DESIGN §9.2, §5.4, VOICE.md §6). Showing up over time, never a
 * streak that falls to zero: "You showed up 26 of the last 30 days", this month's weighted
 * percentage once there are 10 expected waterings to judge it by ("4 of 4 so far" until then), the
 * week, the same days last month only when this month is up or level (a quieter month shows its
 * best fact instead), goals on track, and rests in numbers. A line that would say 0 isn't there.
 */
import { daysInMonth, monthIndex } from '@/domain/dates';
import { goalsLine, monthBarLabel, monthSoFarLine, restsLine, showedUpLine, soFarLine, trendLine, weekLine } from '@/catalog/format';
import { EMPTY } from '@/catalog/lines';
import { monthJarStems, type ProgressVM } from '@/state/selectors';
import { memo } from 'preact/compat';
import { computed } from '@preact/signals';
import { state, today } from '@/state/store';
import { MonthJar } from '@/art/progress';
import { ProgressRing } from '@/ui/ProgressRing';
import { cx } from '@/ui/cx';
import { PROGRESS_UI } from './copy';
import s from './ProgressScreen.module.css';

export function Hero({ vm }: { vm: ProgressVM }) {
  // A one-day window reads as a grade of one ("1 of the last 1 days"): the month line says it.
  const showed = vm.showedUp.span > 1 ? showedUpLine(vm.showedUp) : null;
  const t = vm.hero.tally;
  const soFar = t.ready ? monthSoFarLine({ month: vm.hero.month, ...vm.hero.daysSoFar }) : soFarLine(t);
  // Nothing watered yet: one calm line, said once on the page.
  if (!showed && !soFar) {
    return (
      <div class={cx(s.hero, s.heroEmpty)} data-hero="empty">
        <p class={s.heroLine}>{EMPTY.progress}</p>
      </div>
    );
  }
  // The first days (a one-day window): what she has watered so far is the headline, said once.
  const headline = showed ?? soFar!;
  const monthLine = showed ? soFar : null;
  const trend = trendLine(vm.trend);
  const w = vm.week.tally;
  // The week chip says nothing new while the week and the month are the same few days.
  const sameAsMonth = !t.ready && w.achieved === t.achieved && w.expected === t.expected;
  const chips = [sameAsMonth ? null : weekLine(w), goalsLine(vm.goals), restsLine(vm.rests)].filter((x): x is string => !!x);
  const ring = t.ready && t.percent !== null;
  return (
    <div class={s.hero} data-hero>
      <div class={s.heroTop}>
        <p class={cx(s.heroLine, !showed && s.heroLineQuiet)}>{headline}</p>
        {/* This month's flowers: a stem from each habit watered so far (DESIGN §13). */}
        <HeroJar />
      </div>
      {(ring || monthLine || trend) && (
        <div class={s.heroMonth}>
          {ring && (
            <figure class={s.ringFigure}>
              <ProgressRing value={t.percent! / 100} label={vm.hero.label} valueText={`${t.percent}%`} size={76} thickness={6} tone="sage" class={s.ring}>
                <span class={s.ringValue} aria-hidden="true">
                  {t.percent}
                  <span class={s.ringPct}>%</span>
                </span>
              </ProgressRing>
              {/* What the percentage is a share of, so it never reads against the days beside it. */}
              <figcaption class={s.ringCaption} aria-hidden="true">
                {PROGRESS_UI.hero.ringCaption}
              </figcaption>
            </figure>
          )}
          <div class={s.heroMonthText}>
            {monthLine && <p class={s.soFar}>{monthLine}</p>}
            {trend && <p class={cx(s.trend, vm.trend.kind === 'fact' && s.fact)}>{trend}</p>}
          </div>
        </div>
      )}
      {chips.length > 0 && (
        <ul class={s.chips}>
          {chips.map((c) => (
            <li key={c} class={s.chip}>
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * This month's jar reads only the habits and the logs, so a coin or a pet moving doesn't redraw it:
 * the stems are kept while those two are the same objects, and the jar skips its parent's renders.
 */
let jarMemo: { habits: unknown; logs: unknown; day: string; stems: ReturnType<typeof monthJarStems> } | null = null;
const jarStems = computed(() => {
  const { habits, logs } = state.value;
  const day = today.value;
  if (jarMemo && jarMemo.habits === habits && jarMemo.logs === logs && jarMemo.day === day) return jarMemo.stems;
  jarMemo = { habits, logs, day, stems: monthJarStems({ habits, logs }, day) };
  return jarMemo.stems;
});
const HeroJar = memo(function HeroJar() {
  return <MonthJar stems={jarStems.value} size={88} class={s.jar} />;
});

/**
 * Recent months: one calm bar each ("Aug · 24 days"), its length the month's days showing up
 * against the month's length. This month's bar is drawn on the whole month, the days still to come
 * a faint dotted track, so it never reads as a month that fell short. The labels are the text.
 * The section only shows once a month has a day in it (`hasMonths`).
 */
export const hasMonths = (months: ProgressVM['recentMonths']): boolean => months.some((m) => m.days > 0);

export function RecentMonths({ months }: { months: ProgressVM['recentMonths'] }) {
  return (
    <ul class={s.months}>
      {months.map((m) => {
        const i = monthIndex(m.month);
        const length = daysInMonth(Math.floor(i / 12), (i % 12) + 1);
        const share = Math.min(1, m.days / length);
        return (
          <li key={m.month} class={cx(s.monthRow, m.current && s.current)}>
            <span class={s.monthLabel}>
              {monthBarLabel(m)}
              {m.current && <span class={s.soFarMark}> · {PROGRESS_UI.soFarMark}</span>}
            </span>
            <span class={s.bar} aria-hidden="true">
              <span class={s.barFill} style={{ width: `${(share * 100).toFixed(1)}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
