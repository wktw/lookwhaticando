/**
 * The Today screen view-model (DESIGN §9.1 as amended by §13.2 time blocks, §13.10 windowsill and
 * §13.11 layout/backdating/card rules).
 */
import { BUDDY_LINES } from '@/catalog/personalities';
import { getCollectible } from '@/catalog/collectibles';
import type { Species } from '@/catalog/types';
import type { AppState, DateKey, Habit, TimeOfDay } from '../types';
import { OFF_DAYS_PER_MONTH, canLogOn, isInBackfillWindow, offDaysRemaining } from '@/domain/activity';
import { dayCompletion, trackingOf } from '@/domain/consistency';
import { WEEKDAY_LETTERS, addDays, dayNumber, parseDateKey, shortDateLabel, startOfWeek, weekday } from '@/domain/dates';
import { isFlexible } from '@/domain/schedule';
import { isPausedOn, pauseReturnDay } from '@/domain/pauses';
import { ruleAt, scheduleStatusOn } from '@/domain/rules';
import { levelForXp } from '@/domain/levels';
import { rewardsPaused } from '@/domain/wallet';
import { habitCard, liveHabits, longDateLabel, monthDayLabel, type HabitCardVM, type ViewEnv } from './common';
import { aggregateDayState, type DayState } from './calendar';
import { firstTrackedDay } from '@/domain/insights';

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

export interface WeekStripDay {
  date: DateKey;
  /** Weekday letter ("M"). */
  letter: string;
  /** Day of the month. */
  day: number;
  isToday: boolean;
  selected: boolean;
  /** Day-based occurrences done ÷ due (null when nothing was due: numeral only). */
  fraction: number | null;
  done: number;
  due: number;
  /** A global day off (lavender moon). */
  offDay: boolean;
  /**
   * The shared day-state glyph (the calendar's, upstream §13.11): a day whose only check-ins were
   * flexible reads 'done' rather than "nothing due".
   */
  state: DayState;
  /** First day of a calendar week: the strip draws a hairline gap before it (§13.11). */
  weekStart: boolean;
  /** "Saturday, September 27, 3 of 5 done" */
  ariaLabel: string;
}

export interface TimeBlockVM {
  id: TimeOfDay;
  /** "Morning" · "Midday" · "Evening" · "Anytime" */
  label: string;
  /** The block the wall clock is in (listed first). */
  current: boolean;
  /** An earlier block with everything done: shown folded ("Morning 3/3"). */
  collapsed: boolean;
  done: number;
  total: number;
  /** "Morning 3/3" */
  summary: string;
  cards: HabitCardVM[];
}

export interface DayProgressVM {
  /** Day-based occurrences achieved on the day (§13.3: done counts; today pending never counts against). */
  done: number;
  /** Day-based occurrences due that day (scheduled, active; allowed rests, pauses and off days excluded). */
  total: number;
  /**
   * 0..1. When nothing day-based is due the vine doesn't claim a bloom it wasn't asked for: 1 only
   * if a flexible habit was checked in that day, else 0 (`nothingDue` lets the card say so).
   */
  fraction: number;
  /** No day-based habit is due that day (only flexible habits, rests, pauses or a day off). */
  nothingDue: boolean;
  /** "3 of 5" */
  label: string;
  /** Flexible check-ins that day (they count toward a perfect day). */
  flexibleCheckins: number;
  /** The day is complete and earned (or can still earn) a perfect day. */
  perfect: boolean;
}

export interface PausedSummaryVM {
  count: number;
  habits: { id: string; name: string; back: DateKey | null }[];
  /** "Resting: 2 habits · back Oct 6" */
  text: string;
}

export interface BuddyVM {
  petId: string;
  name: string;
  species: Species | null;
  level: number;
  /** A daily line for the buddy corner (rotates by day and time of day). */
  line: string;
}

export interface SillPotVM {
  habitId: string;
  icon: string;
  plant: Habit['plant'];
  pot: Habit['pot'];
  stage: number;
  progress: number;
  blooms: number;
  done: boolean;
}

export interface TodayVM {
  date: DateKey;
  isToday: boolean;
  /** "Tuesday, September 29" */
  dateLabel: string;
  /** A past day is selected: the sticky banner "Logging for Sat, Sep 27" (and whether it still earns). */
  backdating: { label: string; rewards: boolean } | null;
  greeting: { part: DayPart; name: string; text: string };
  /** The last 7 app days (6 back + today). */
  weekStrip: WeekStripDay[];
  progress: DayProgressVM;
  /** Coins paid by check-ins on today's action day (the "+18 today" chip). */
  coinsToday: number;
  /**
   * Time blocks: the current block first, then the later ones, Anytime, then earlier blocks (folded
   * when complete). For a past day: natural order. Each holds day-based habits scheduled that day
   * and weekly habits not yet met. Grouping reflects the state now; per §13.11 the screen snapshots
   * group membership on load / day change so the list never jumps on tap.
   */
  blocks: TimeBlockVM[];
  /** Flexible habits already met this period ("Done for the week/month" fold; still tappable). */
  doneForPeriod: HabitCardVM[];
  /** Monthly-kind habits not yet met: one collapsible "This month" row at the end (§13.11). */
  thisMonth: HabitCardVM[];
  /** Day-based habits with no occurrence that day ("Not today", collapsed). */
  notToday: HabitCardVM[];
  paused: PausedSummaryVM | null;
  offDay: { isOff: boolean; remaining: number; perMonth: number; canToggle: boolean };
  /** No habits yet: the empty state ("Let's plant your first habit!"). */
  empty: boolean;
  /** No capsule pulled yet: the pinned "Your first capsule: check in anything ✨" card (§13.10). */
  firstCapsule: boolean;
  /** Rewards are paused by the clock guard (calm banner). */
  clockBehind: boolean;
  quietRewards: boolean;
  buddy: BuddyVM | null;
  /** Windowsill pots for the day's habits, in card order (the band shows up to 6). */
  sill: SillPotVM[];
  /** An unread letter waiting on the windowsill. */
  letterWaiting: string | null;
  /** A capsule reveal was interrupted: resume it. */
  pendingReveal: boolean;
}

const BLOCK_ORDER: readonly Exclude<TimeOfDay, 'anytime'>[] = ['morning', 'midday', 'evening'];
const BLOCK_LABEL: Record<TimeOfDay, string> = { morning: 'Morning', midday: 'Midday', evening: 'Evening', anytime: 'Anytime' };

/**
 * Which time block of the app day the wall clock is in: morning from the day start until 11:00,
 * midday until 17:00, then evening. Hours before `dayStartsAt` (minutes after midnight) still
 * belong to the previous app day's evening; from the day start on it is the new day's morning, so
 * at 4 am with a 3 am day start Morning comes first rather than being folded as "earlier" (§13.2
 * day boundary + "the current block comes first").
 */
export function currentBlock(hour: number, dayStartsAt = 0, minute = 0): Exclude<TimeOfDay, 'anytime'> {
  if (hour * 60 + minute < dayStartsAt) return 'evening';
  if (hour < 11) return 'morning';
  if (hour < 17) return 'midday';
  return 'evening';
}

export function dayPart(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

const GREETING: Record<DayPart, [string, string]> = {
  morning: ['Good morning', '☀️'],
  afternoon: ['Good afternoon', '🌼'],
  evening: ['Good evening', '🌙'],
  night: ['Hi', '✨'],
};

export function greetingText(part: DayPart, name: string): string {
  const [hello, emoji] = GREETING[part];
  return name ? `${hello}, ${name} ${emoji}` : `${hello} ${emoji}`;
}

function buddyLine(s: AppState, date: DateKey, part: DayPart, allDone: boolean): string {
  const pool = allDone ? BUDDY_LINES.allDone : part === 'afternoon' ? BUDDY_LINES.afternoon : BUDDY_LINES[part];
  const line = pool[dayNumber(date) % pool.length]!;
  return line.replaceAll('{you}', s.profile.name.trim() || 'friend');
}

export function todayVM(s: AppState, env: ViewEnv, date: DateKey = env.today): TodayVM {
  const today = env.today;
  const day = date > today ? today : date;
  const t = trackingOf(s);
  const clock = env.local(env.now);
  const hour = clock.hour;
  const part = dayPart(hour);
  const firstTracked = firstTrackedDay(t);
  const isToday = day === today;

  // Week strip.
  const weekStrip: WeekStripDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    const c = dayCompletion(t, d, today);
    const { day: dom } = parseDateKey(d);
    weekStrip.push({
      date: d,
      letter: WEEKDAY_LETTERS[weekday(d)],
      day: dom,
      isToday: d === today,
      selected: d === day,
      fraction: c.due > 0 ? c.done / c.due : null,
      done: c.done,
      due: c.due,
      offDay: s.offDays[d] === true,
      state: aggregateDayState(s, d, today, firstTracked).state,
      weekStart: i < 6 && startOfWeek(d, s.settings.weekStart) === d,
      ariaLabel: `${longDateLabel(d)}, ${c.due > 0 ? `${c.done} of ${c.due} done` : 'nothing due'}`,
    });
  }

  // Cards.
  const live = liveHabits(s, day);
  const blocksMap = new Map<TimeOfDay, HabitCardVM[]>();
  const doneForPeriod: HabitCardVM[] = [];
  const thisMonth: HabitCardVM[] = [];
  const notToday: HabitCardVM[] = [];
  const pausedHabits: Habit[] = [];
  for (const h of live) {
    if (isPausedOn(h.pauses, day)) {
      pausedHabits.push(h);
      continue;
    }
    const card = habitCard(s, h, day, env);
    const rule = ruleAt(h, day);
    if (isFlexible(rule)) {
      if (card.met) doneForPeriod.push(card);
      else if (rule.schedule.kind === 'monthly') thisMonth.push(card);
      else blocksMap.set(h.timeOfDay, [...(blocksMap.get(h.timeOfDay) ?? []), card]);
    } else if (scheduleStatusOn(h, day) === 'scheduled') blocksMap.set(h.timeOfDay, [...(blocksMap.get(h.timeOfDay) ?? []), card]);
    else notToday.push(card);
  }

  const cur = currentBlock(hour, s.settings.dayStartsAt, clock.minute);
  const curIdx = BLOCK_ORDER.indexOf(cur);
  const order: TimeOfDay[] = isToday
    ? [cur, ...BLOCK_ORDER.slice(curIdx + 1), 'anytime', ...BLOCK_ORDER.slice(0, curIdx)]
    : [...BLOCK_ORDER, 'anytime'];
  const blocks: TimeBlockVM[] = [];
  for (const id of order) {
    const cards = blocksMap.get(id);
    if (!cards || cards.length === 0) continue;
    const done = cards.filter((c) => c.done || (c.rested && c.restState === 'allowed')).length;
    const earlier = isToday && id !== 'anytime' && BLOCK_ORDER.indexOf(id as Exclude<TimeOfDay, 'anytime'>) < curIdx;
    blocks.push({
      id,
      label: BLOCK_LABEL[id],
      current: isToday && id === cur,
      collapsed: (earlier || !isToday) && done === cards.length,
      done,
      total: cards.length,
      summary: `${BLOCK_LABEL[id]} ${done}/${cards.length}`,
      cards,
    });
  }

  // Progress & paused.
  const c = dayCompletion(t, day, today);
  const progress: DayProgressVM = {
    done: c.done,
    total: c.due,
    fraction: c.due > 0 ? c.done / c.due : c.flexibleCheckins > 0 ? 1 : 0,
    nothingDue: c.due === 0,
    label: c.due > 0 ? `${c.done} of ${c.due}` : c.flexibleCheckins > 0 ? `${c.flexibleCheckins} checked in` : 'Nothing due',
    flexibleCheckins: c.flexibleCheckins,
    perfect: s.ledger.once[`perfect|${day}`] !== undefined,
  };
  let paused: PausedSummaryVM | null = null;
  if (pausedHabits.length > 0) {
    const list = pausedHabits.map((h) => ({ id: h.id, name: h.name, back: pauseReturnDay(h.pauses, day) ?? null }));
    const backs = list.map((x) => x.back).filter((b): b is DateKey => b !== null).sort();
    const back = backs.length === list.length && backs.length > 0 ? backs[0]! : null;
    paused = {
      count: list.length,
      habits: list,
      text: `Resting: ${list.length} habit${list.length === 1 ? '' : 's'}${back ? ` · back ${monthDayLabel(back)}` : ''}`,
    };
  }

  // Buddy, sill, letters.
  const buddyId = s.profile.buddy;
  const buddyPet = buddyId ? s.pets[buddyId] : undefined;
  const buddyDef = buddyId ? getCollectible(buddyId) : undefined;
  const buddy: BuddyVM | null = buddyPet
    ? {
        petId: buddyPet.id,
        name: buddyPet.name,
        species: buddyDef?.category === 'pet' ? buddyDef.species : null,
        level: levelForXp(buddyPet.xp),
        line: buddyLine(s, day, part, progress.total > 0 && progress.done === progress.total),
      }
    : null;
  const sill: SillPotVM[] = live
    .filter((h) => !isPausedOn(h.pauses, day))
    .map((h) => {
      const card = [...blocks.flatMap((b) => b.cards), ...doneForPeriod, ...thisMonth, ...notToday].find((x) => x.id === h.id)!;
      return { habitId: h.id, icon: h.icon, plant: h.plant, pot: h.pot, stage: card.plant.displayStage, progress: card.plant.progress, blooms: card.plant.blooms, done: card.done };
    });

  return {
    date: day,
    isToday,
    dateLabel: longDateLabel(day),
    backdating: isToday ? null : { label: `Logging for ${shortDateLabel(day)}`, rewards: isInBackfillWindow(day, today) && canLogOn(day, today) },
    greeting: { part, name: s.profile.name, text: greetingText(part, s.profile.name.trim()) },
    weekStrip,
    progress,
    coinsToday: s.ledger.daily[today] ?? 0,
    blocks,
    doneForPeriod,
    thisMonth,
    notToday,
    paused,
    offDay: {
      isOff: s.offDays[day] === true,
      remaining: offDaysRemaining(s.offDays, day),
      perMonth: OFF_DAYS_PER_MONTH,
      canToggle: day === today,
    },
    empty: s.habits.every((h) => h.archivedOn !== undefined && h.archivedOn < today),
    firstCapsule: s.profile.onboarded && s.lifetime.pulls === 0,
    clockBehind: rewardsPaused(s, env.now),
    quietRewards: s.settings.quietRewards,
    buddy,
    sill,
    letterWaiting: s.inbox.find((l) => l.readAt === undefined)?.id ?? null,
    pendingReveal: s.pendingReveal !== undefined,
  };
}
