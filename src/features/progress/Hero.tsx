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
import type { ProgressVM } from '@/state/selectors';
import { ProgressRing } from '@/ui/ProgressRing';
import { cx } from '@/ui/cx';
import { PROGRESS_UI } from './copy';
import s from './ProgressScreen.module.css';

export function Hero({ vm }: { vm: ProgressVM }) {
  const showed = showedUpLine(vm.showedUp);
  const t = vm.hero.tally;
  const soFar = t.ready ? monthSoFarLine({ month: vm.hero.month, ...vm.hero.daysSoFar }) : soFarLine(t);
  const trend = trendLine(vm.trend);
  const chips = [weekLine(vm.week.tally), goalsLine(vm.goals), restsLine(vm.rests)].filter((x): x is string => !!x);
  if (!showed && !soFar) {
    return (
      <div class={cx(s.hero, s.heroEmpty)} data-hero="empty">
        <p class={s.heroLine}>{EMPTY.progress}</p>
      </div>
    );
  }
  return (
    <div class={s.hero} data-hero>
      {showed && <p class={s.heroLine}>{showed}</p>}
      <div class={s.heroMonth}>
        {t.ready && t.percent !== null && (
          <ProgressRing value={t.percent / 100} label={vm.hero.label} valueText={`${t.percent}%`} size={76} thickness={6} tone="sage" class={s.ring}>
            <span class={s.ringValue} aria-hidden="true">
              {t.percent}
              <span class={s.ringPct}>%</span>
            </span>
          </ProgressRing>
        )}
        <div class={s.heroMonthText}>
          {soFar && <p class={s.soFar}>{soFar}</p>}
          {trend && <p class={cx(s.trend, vm.trend.kind === 'fact' && s.fact)}>{trend}</p>}
        </div>
      </div>
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
 * Recent months: one calm bar each ("Aug · 24 days"), its length the month's days showing up
 * against the month's length. This month's bar is drawn on the whole month, the days still to come
 * a faint dotted track, so it never reads as a month that fell short. The labels are the text.
 */
export function RecentMonths({ months }: { months: ProgressVM['recentMonths'] }) {
  if (months.length === 0) return <p class={s.quiet}>{EMPTY.progress}</p>;
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
