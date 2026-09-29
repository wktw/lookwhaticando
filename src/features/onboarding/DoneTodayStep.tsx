/**
 * Step 3 (DESIGN §9.6, VOICE §16): "Anything already done today?" Each new habit with its live
 * water button. A watering plays the whole choreography: the ring fills, water pours on its
 * glass on the sill, "+5" floats up, a coin drops into the jar, and the note says "Walk, watered.
 * +5". The first watering tops the jar up to 25 coins (First Sprout, in the domain), and the line
 * "There are 25 coins in the jar. That’s a capsule." appears.
 */
import { useState } from 'preact/hooks';
import { ONBOARDING, TODAY_LINES, fillLine } from '@/catalog/lines';
import { cardAriaLabel } from '@/catalog/format';
import { HabitIcon } from '@/art/habit-icons';
import { checkIn, now, state, storeLocal, storeTimeZone, today, undoCheckIn } from '@/state/store';
import { habitCard, type HabitCardVM } from '@/state/views/common';
import { CheckRing } from '@/ui/CheckRing';
import { Button } from '@/ui/Button';
import { announce } from '@/ui/announce';
import { cx } from '@/ui/cx';
import { toneClass } from '@/ui/tone';
import { celebrateCheckIn, showCheckInNote, showUncheckNote } from '@/fx/checkin';
import { ONBOARDING_COPY } from '@/features/you/copy';
import { stageBand } from './SillStage';
import { unitFor } from './flow';

const addLabel = (c: HabitCardVM) => fillLine(TODAY_LINES.addOne, { step: c.step, unit: unitFor(c.unit ?? '', c.step), habit: c.name }).replace(/\s+/g, ' ');
import s from './Onboarding.module.css';

function cardsFor(ids: readonly string[]): HabitCardVM[] {
  const app = state.value;
  const env = { today: today.value, now: now.value, local: storeLocal(), timeZone: storeTimeZone() };
  return ids
    .map((id) => app.habits.find((h) => h.id === id))
    .filter((h): h is NonNullable<typeof h> => !!h)
    .map((h) => habitCard(app, h, today.value, env));
}

/** Whether a check-in's events hold the one-time top-up (First Sprout pays with reason 'gift'). */
export const toppedUp = (events: readonly { type: string; reason?: string; amount?: number }[]): boolean =>
  events.some((e) => e.type === 'coins' && e.reason === 'gift' && (e.amount ?? 0) > 0);

export function DoneTodayStep({ habitIds, onNext }: { habitIds: string[]; onNext: () => void }) {
  const cards = cardsFor(habitIds);
  const [topUp, setTopUp] = useState(() => state.value.wallet.coins >= 25 && state.value.lifetime.checkins > 0);
  const anyDone = cards.some((c) => c.done);

  const water = (card: HabitCardVM, el: HTMLElement) => {
    const counting = card.target > 1;
    if (card.done && !counting) {
      const res = undoCheckIn(card.id);
      const refunded = res.events.reduce((sum, e) => (e.type === 'uncheck' ? sum + e.refunded : sum), 0);
      showUncheckNote({ habitId: card.id, habitName: card.name, refunded });
      return;
    }
    const res = checkIn(card.id);
    celebrateCheckIn(res, card.id, el);
    stageBand.current?.pour(card.id);
    if (res.completed) {
      showCheckInNote({
        habitId: card.id,
        habitName: card.name,
        // The watering's own coins ("Walk, watered. +5"); the top-up has its own line below.
        coins: res.events.reduce((sum, e) => (e.type === 'coins' && e.reason === 'checkin' && e.habitId === card.id ? sum + e.amount : sum), 0),
        ...(counting ? { count: card.target, unit: card.unit ?? undefined } : {}),
        events: res.events,
        onUndo: () => {
          const back = undoCheckIn(card.id);
          const refunded = back.events.reduce((sum, e) => (e.type === 'uncheck' ? sum + e.refunded : sum), 0);
          showUncheckNote({ habitId: card.id, habitName: card.name, refunded });
        },
      });
    }
    if (toppedUp(res.events)) {
      setTopUp(true);
      // After the check-in's own note has been heard.
      setTimeout(() => announce(ONBOARDING.topUp), 1600);
    }
  };

  return (
    <div class={s.step}>
      <h1 class={s.title}>{ONBOARDING.doneToday}</h1>
      <ul class={s.waterList}>
        {cards.map((c) => (
          <li key={c.id} class={s.waterRow}>
            <span class={cx(s.tile, toneClass(c.color))} aria-hidden="true">
              <HabitIcon id={c.icon} size={26} tone={c.color} />
            </span>
            <span class={s.waterName}>{c.name}</span>
            <CheckRing
              label={c.target > 1 ? addLabel(c) : c.name}
              description={c.target > 1 ? cardAriaLabel(c).replace(`${c.name}, `, '') : undefined}
              count={c.target > 1 ? c.count : undefined}
              target={c.target > 1 ? c.target : undefined}
              state={c.target > 1 ? undefined : c.done ? 'done' : 'empty'}
              tone={c.color}
              size={52}
              onClick={(e) => water(c, e.currentTarget as HTMLElement)}
            />
          </li>
        ))}
      </ul>
      <p class={cx(s.topUp, topUp && s.topUpOn)} aria-hidden={!topUp}>
        {topUp ? ONBOARDING.topUp : ''}
      </p>
      <div class={s.foot}>
        <Button size="lg" block variant={anyDone ? 'primary' : 'secondary'} onClick={onNext}>
          {ONBOARDING_COPY.next}
        </Button>
      </div>
    </div>
  );
}
