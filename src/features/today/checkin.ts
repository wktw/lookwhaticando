/**
 * The check-in choreography (DESIGN §9.1): ≤ 700 ms, never blocking the next tap.
 *
 *   tap → the ring fills (CheckRing) → a hairline check → the band pours onto that pot → its
 *   resident looks up → the chime → one brass coin arcs into the jar (the counter rolls once per
 *   burst) → the note "Walk, watered. +5 · Pudding opened one eye. · Undo · Add a note".
 *
 * The store commits first (the tap's result is known before anything moves); everything after is
 * garnish scheduled on CHECKIN_CHOREOGRAPHY, and with reduced motion it happens at once. The burst
 * rule (one coin in the air, one announcement after 1.2 s of quiet) and the celebration queue live
 * in src/fx; this file only wires the Today screen into them.
 */
import type { CheckInResult, GameEvent } from '@/state/api';
import type { DateKey } from '@/state/types';
import type { HabitCardVM } from '@/state/selectors';
import { checkIn, checkInTiny, setCount, toggleRest, undoCheckIn } from '@/state/store';
import { CHECKIN_TOASTS, fillLine } from '@/catalog/lines';
import { num } from '@/catalog/format';
import { CHECKIN_CHOREOGRAPHY } from '@/ui/checkRing';
import { announce } from '@/ui/announce';
import { toast } from '@/ui/toast';
import { celebrateCheckIn, showCheckInNote, showUncheckNote } from '@/fx/checkin';
import { markCelebratedLocally } from '@/fx/celebrations';
import { haptic } from '@/fx/haptics';
import { sfx } from '@/fx/sound';
import { prefersReducedMotion } from '@/fx/motion';
import { restLine } from '@/fx/copy';

/** What the choreography reaches on the screen. */
export interface Stage {
  /** The band: pour onto a pot, let a resident look up. Null while it is not mounted. */
  pour(habitId: string): void;
  react(habitId: string): void;
  /** Quiet rewards (DESIGN §9.5): the tracker on its own, no coins or wallet. */
  quiet: boolean;
  /** "Add a note" on the note: opens the note field for that habit and day. */
  addNote(habitId: string, date: DateKey): void;
}

/** What a ring tap does for a card. */
export type TapAction = 'water' | 'unwater' | 'unrest' | 'adjust';

/**
 * A tap on the ring (DESIGN §5.2): a one-tap habit toggles; a count habit adds its step until it is
 * full, and after that the tap opens the inline stepper ('adjust'); a moon takes the rest back off.
 */
export function tapAction(card: Pick<HabitCardVM, 'rested' | 'done' | 'full' | 'flexible' | 'target' | 'count' | 'tiny'>): TapAction {
  if (card.rested) return 'unrest';
  const counting = !card.flexible && card.target > 1;
  if (counting && !card.tiny) return card.count >= card.target ? 'adjust' : 'water';
  return card.done ? 'unwater' : 'water';
}

/** Coins the check-in itself paid for this habit (bonuses are the celebration host's). */
export function checkinCoins(events: readonly GameEvent[], habitId: string): number {
  return events.reduce((sum, e) => (e.type === 'coins' && e.reason === 'checkin' && e.habitId === habitId && e.amount > 0 ? sum + e.amount : sum), 0);
}

/** What an un-watering gave back. */
export function refundedOf(events: readonly GameEvent[], habitId: string): number {
  const e = events.find((x): x is Extract<GameEvent, { type: 'uncheck' }> => x.type === 'uncheck' && x.habitId === habitId);
  return e ? e.refunded : 0;
}

/** Coins paid per (habit, day) this session: an un-watering that refunds less says they were spent. */
const paid = new Map<string, number>();
const paidKey = (habitId: string, date: DateKey) => `${habitId}|${date}`;

const timers = new Set<ReturnType<typeof setTimeout>>();
function later(ms: number, fn: () => void): void {
  if (ms <= 0 || prefersReducedMotion()) return fn();
  const t = setTimeout(() => {
    timers.delete(t);
    fn();
  }, ms);
  timers.add(t);
}

/** Stops any choreography still scheduled (leaving the screen). The store has long committed. */
export function cancelChoreography(): void {
  for (const t of timers) clearTimeout(t);
  timers.clear();
}

/** Waters a card (the whole thing, or its tiny version). Returns the store's result. */
export function water(card: HabitCardVM, date: DateKey, ring: Element | null, stage: Stage, opts: { tiny?: boolean } = {}): CheckInResult {
  const result = opts.tiny ? checkInTiny(card.id, date) : checkIn(card.id, date);
  play(result, card, date, ring, stage, opts);
  return result;
}

/**
 * Sets a count habit's day to `count` (the inline stepper, the number pad). Reaching the target plays
 * the whole choreography; going back under it is an un-watering, and says so.
 */
export function countTo(card: HabitCardVM, date: DateKey, count: number, ring: Element | null, stage: Stage): void {
  const { events } = setCount(card.id, date, count);
  if (events.some((e) => e.type === 'uncheck' && e.habitId === card.id)) {
    const refunded = refundedOf(events, card.id);
    const key = paidKey(card.id, date);
    const spent = Math.max(0, (paid.get(key) ?? 0) - refunded);
    paid.delete(key);
    showUncheckNote({ habitId: card.id, habitName: card.name, refunded: stage.quiet ? 0 : refunded, spent: stage.quiet ? 0 : spent });
    return;
  }
  const checkin = events.find((e): e is Extract<GameEvent, { type: 'checkin' }> => e.type === 'checkin' && e.habitId === card.id);
  if (!checkin) return;
  const coins = checkinCoins(events, card.id);
  play({ events, coins, completed: checkin.completed, partial: !checkin.completed, rewarded: coins > 0 }, card, date, ring, stage, {});
}

function play(result: CheckInResult, card: HabitCardVM, date: DateKey, ring: Element | null, stage: Stage, opts: { tiny?: boolean }): void {
  const checkin = result.events.find((e): e is Extract<GameEvent, { type: 'checkin' }> => e.type === 'checkin' && e.habitId === card.id);
  if (!checkin) return;
  const coins = checkinCoins(result.events, card.id);
  const rect = ring?.getBoundingClientRect() ?? new DOMRect(innerWidth / 2, innerHeight / 2, 0, 0);

  if (!result.completed) {
    // A partial tap on a count habit: a ring tick, a small drop, and the count for screen readers.
    if (stage.quiet) markCelebratedLocally(card.id);
    celebrateCheckIn(result, card.id, rect);
    announce(fillLine(CHECKIN_TOASTS.progress, { count: num(checkin.count), target: num(checkin.target), unit: card.unit ?? '' }).trim());
    return;
  }

  if (coins > 0) paid.set(paidKey(card.id, date), coins);
  if (stage.quiet) {
    // The tracker on its own: the ring, the pour, the chime and the note, without coins.
    markCelebratedLocally(card.id);
    haptic('tick');
    later(CHECKIN_CHOREOGRAPHY.chime, () => sfx.play('chime'));
  } else {
    celebrateCheckIn(result, card.id, rect);
  }
  later(CHECKIN_CHOREOGRAPHY.pour, () => stage.pour(card.id));
  later(CHECKIN_CHOREOGRAPHY.resident, () => stage.react(card.id));
  const counting = !card.flexible && card.target > 1 && !opts.tiny;
  later(CHECKIN_CHOREOGRAPHY.toast, () =>
    showCheckInNote({
      habitId: card.id,
      habitName: card.name,
      coins: stage.quiet ? 0 : coins,
      tiny: checkin.tiny,
      ...(counting ? { count: checkin.count, ...(card.unit ? { unit: card.unit } : {}) } : {}),
      events: result.events,
      onUndo: () => unwater(card, date, stage),
      onAddNote: () => stage.addNote(card.id, date),
    }),
  );
}

/** "Not watered after all": undoes the day's last watering (a count habit's last step, or the tiny level). */
export function unwater(card: Pick<HabitCardVM, 'id' | 'name'>, date: DateKey, stage: Pick<Stage, 'quiet'>): void {
  const { events } = undoCheckIn(card.id, date);
  if (!events.some((e) => e.type === 'uncheck' && e.habitId === card.id)) return;
  const key = paidKey(card.id, date);
  const refunded = stage.quiet ? 0 : refundedOf(events, card.id);
  const spent = Math.max(0, (paid.get(key) ?? 0) - refundedOf(events, card.id));
  paid.delete(key);
  haptic('light');
  sfx.play('undo', { volume: 0.6 });
  showUncheckNote({ habitId: card.id, habitName: card.name, refunded, spent: stage.quiet ? 0 : spent });
}

/** A rest day on or off (DESIGN §5.3): "Yoga is resting today. Nothing here wilts." / "Yoga is back on for today." */
export function flipRest(card: Pick<HabitCardVM, 'id' | 'name' | 'rested'>, date: DateKey): void {
  const was = card.rested;
  toggleRest(card.id, date);
  haptic('light');
  toast({ key: `rest-${card.id}`, message: was ? fillLine(CHECKIN_TOASTS.restUndo, { habit: card.name }) : restLine(card.name), tone: 'lavender' });
}
