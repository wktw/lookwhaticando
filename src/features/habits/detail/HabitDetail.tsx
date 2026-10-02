/**
 * Habit Detail (DESIGN §9.2): a large plant with its resident · "4 more waterings to Blooming." ·
 * the plant tag and its look in plain words · the Garden Journal · stat tiles · "Why it matters" ·
 * Moments · the history calendar · the rung ladder · the offers · the companion and its stories ·
 * the actions. All from `selectHabitDetail(id)`; words from lines.ts and format.ts.
 */
import { forecastLine } from '@/catalog/format';
import { LOOKS, fillLine } from '@/catalog/lines';
import { monthDayLabel } from '@/domain/dates';
import { stageLine } from '@/fx/copy';
import type { HabitDetailVM } from '@/state/selectors';
import { state, today, now, storeLocal } from '@/state/store';
import { Calendar } from '@/features/progress/Calendar';
import { DETAIL_UI as D, stageName } from '@/features/progress/copy';
import { plantPresentation } from '@/state/views/plantPresentation';
import { Actions } from './Actions';
import { HeroPlant } from './HeroPlant';
import { Company, DetailSection, Journal, Ladder, Moments, NudgeCard, Offer, PlantTagCard, Stats, Why } from './Parts';
import s from './HabitDetail.module.css';

export function HabitDetail({ vm, onGone }: { vm: HabitDetailVM; onGone: () => void }) {
  const h = vm.habit;
  const p = vm.plant;
  const plant = plantPresentation(state.value, h.id, { today: today.value, now: now.value, local: storeLocal() });
  if (!plant) return null;
  const forecast = forecastLine(p);
  const evergreen = p.displayStage >= 7;
  const status = vm.archived
    ? vm.ribbon
      ? fillLine(D.ribbon, { date: monthDayLabel(vm.ribbon) })
      : h.archivedOn
        ? fillLine(D.archivedOn, { date: monthDayLabel(h.archivedOn) })
        : null
    : vm.pause.paused
      ? vm.pause.back
        ? fillLine(D.pausedUntil, { date: monthDayLabel(vm.pause.back) })
        : D.pausedOpen
      : vm.pause.upcoming
        ? fillLine(D.pauseFrom, { date: monthDayLabel(vm.pause.upcoming.start) })
        : null;

  return (
    <div class={s.detail} data-habit-detail={h.id}>
      <div class={s.hero}>
        <div class={s.heroArt}>
          <HeroPlant
            {...plant}
            damp={isDampToday(vm)}
            residentArtId={vm.companion ? plant.resident?.petId : undefined}
            residentOutfit={vm.companion ? plant.resident?.outfit : undefined}
            size={184}
            animated
            title={`${h.name}, ${stageName(p.displayStage)}`}
          />
          <span class={s.sill} aria-hidden="true" />
        </div>
        <div class={s.heroText}>
          <p class={s.eyebrow}>{stageName(p.displayStage)}</p>
          <h2 class={s.name}>{h.name}</h2>
          {vm.after && <p class={s.anchor}>{fillLine(LOOK_AFTER, { anchor: vm.after.name })}</p>}
          {!vm.after && h.anchor && <p class={s.anchor}>{h.anchor}</p>}
          <p class={s.schedule}>{vm.upcoming ? `${vm.scheduleLabel} · ${vm.upcoming.label}` : vm.scheduleLabel}</p>
          {status && <p class={s.status}>{status}</p>}
        </div>
      </div>

      <div class={s.forecast}>
        {!evergreen && <p class={s.stageLine}>{stageLine({ name: h.name, plant: h.plant }, p.displayStage)}</p>}
        {forecast && !vm.archived && <p class={s.forecastLine}>{forecast}</p>}
      </div>

      <Offer vm={vm} />
      <NudgeCard vm={vm} />
      <PlantTagCard vm={vm} />
      <Journal vm={vm} />
      <Stats vm={vm} />
      <Why vm={vm} />
      <Moments vm={vm} />
      <DetailSection id="history" title={D.sections.history}>
        <div class={s.calendarCard}>
          <Calendar habitId={h.id} headingLevel="h4" idPrefix={`detail-cal-${h.id}`} />
        </div>
      </DetailSection>
      <Ladder vm={vm} />
      <Company vm={vm} />
      <Actions vm={vm} onGone={onGone} />
    </div>
  );
}

const LOOK_AFTER = LOOKS.stacking.after;

function isDampToday(vm: HabitDetailVM): boolean {
  const cell = vm.calendar.weeks.flat().find((c) => c?.isToday);
  return cell?.state === 'done' || cell?.state === 'tiny';
}
