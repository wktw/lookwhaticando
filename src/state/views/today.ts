/**
 * The Today screen view-model (DESIGN §9.1: the windowsill band, the week strip, the habit list by
 * time block, the card status line, backdating).
 *
 * Structured data only: the greeting is `{ timeOfDay, hour, name, birthday }` and the screens pick
 * its words (and every caption) from src/catalog/lines.ts. The few labels built here are plain
 * formatting of numbers and dates.
 */
import type { AppState, BloomColour, BloomShape, DateKey, Habit, Hemisphere, SeasonName, StoryId, TimeOfDay } from '../types';
import { companionOfferOpen, habitsWithoutCompanion, pairOf, petsWithoutHabit, suggestHabitFor, type RoutineOn } from '@/domain/company';
import { birthdayCards, cameHomeToday } from '@/domain/rituals';
import { hemisphereOf, seasonAt } from '@/domain/seasonReview';
import { ritualDate, ritualKind, type RitualKind } from './pets';
import { seasonReviewVM, type SeasonReviewVM } from './season';
import { OFF_DAYS_PER_MONTH, canLogOn, isInBackfillWindow, offDaysRemaining } from '@/domain/activity';
import { dayCompletion, trackingOf } from '@/domain/consistency';
import { WEEKDAY_LETTERS, addDays, parseDateKey, shortDateLabel, startOfWeek, weekday } from '@/domain/dates';
import { isFlexible } from '@/domain/schedule';
import { isPausedOn, pauseReturnDay } from '@/domain/pauses';
import { ruleAt, scheduleStatusOn } from '@/domain/rules';
import type { CuttingVM } from '@/domain/growth';
import { cuttingOf } from '@/domain/economy';
import { rewardsPaused } from '@/domain/wallet';
import { birthdayOn } from '@/domain/rollover';
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
   * The shared day-state glyph (the calendar's, upstream v1 §13.11): a day whose only check-ins were
   * flexible reads 'done' rather than "nothing due".
   */
  state: DayState;
  /** First day of a calendar week: the strip draws a hairline gap before it (v1 §13.11). */
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
  /** Day-based occurrences achieved on the day (v1 §13.3: done counts; today pending never counts against). */
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

export interface SillPotVM {
  habitId: string;
  icon: string;
  plant: Habit['plant'];
  pot: Habit['pot'];
  stage: number;
  progress: number;
  blooms: number;
  /** Watered on the selected day: the pot shows damp soil (§9.1; there is no dry state). */
  done: boolean;
  /** Damp soil: watered on the selected day (same as `done`). */
  damp: boolean;
  /**
   * Who sits in this pot in the band: the habit's companion (`companion: true`, §14.1), else whoever
   * is nearest: the other pets out on the Shelf take the remaining pots in order (favourites first,
   * then the closest friends). With "Show companions" off, everyone is just nearest.
   */
  resident: { petId: string; companion: boolean } | null;
  /** The companion's routine that day (null on a day without one: an ordinary day). */
  routine: RoutineOn | null;
  /** The resident's came-home day: a small bow on the pot (§13). */
  bow: boolean;
  /** The plant's shown look (§14.2); null = Classic. */
  look: { colour: BloomColour; shape: BloomShape } | null;
}

/** The greeting chip's data (§9.1 "Good afternoon, Sam"); the words come from lines.ts. */
export interface GreetingVM {
  timeOfDay: DayPart;
  /** The wall-clock hour (0–23), for finer greeting periods (an early start, a late lamp). */
  hour: number;
  /** The profile name, trimmed ('' when none: the line drops ", {name}"). */
  name: string;
  /** Today is her birthday (the birthday greeting and the cake on the sill, §13). */
  birthday: boolean;
}

export interface TodayVM {
  date: DateKey;
  isToday: boolean;
  /** "Tuesday, September 29" */
  dateLabel: string;
  /** A past day is selected: the sticky banner "Logging for Sat, Sep 27" (and whether it still earns). */
  backdating: { label: string; rewards: boolean } | null;
  greeting: GreetingVM;
  /** The last 7 app days (6 back + today). */
  weekStrip: WeekStripDay[];
  progress: DayProgressVM;
  /** Coins paid by check-ins on today's action day (the "+18 today" chip). */
  coinsToday: number;
  /**
   * Time blocks: the current block first, then the later ones, Anytime, then earlier blocks (folded
   * when complete). For a past day: natural order. Each holds day-based habits scheduled that day
   * and weekly habits not yet met. Grouping reflects the state now; per v1 §13.11 the screen snapshots
   * group membership on load / day change so the list never jumps on tap.
   */
  blocks: TimeBlockVM[];
  /** Flexible habits already met this period ("Done for the week/month" fold; still tappable). */
  doneForPeriod: HabitCardVM[];
  /** Monthly-kind habits not yet met: one collapsible "This month" row at the end (v1 §13.11). */
  thisMonth: HabitCardVM[];
  /** Day-based habits with no occurrence that day ("Not today", collapsed). */
  notToday: HabitCardVM[];
  paused: PausedSummaryVM | null;
  offDay: { isOff: boolean; remaining: number; perMonth: number; canToggle: boolean };
  /** No habits yet: the empty sill. */
  empty: boolean;
  /** No capsule pulled yet: the pinned "Your first capsule: water anything." card (§9.6). */
  firstCapsule: boolean;
  /** Rewards are paused by the clock guard (calm banner). */
  clockBehind: boolean;
  quietRewards: boolean;
  /** Windowsill pots for the day's habits, in card order (the band shows up to 6). */
  sill: SillPotVM[];
  /** The Cutting on the window frame (§13), drawn in the band. */
  cutting: CuttingVM;
  /** Today's found thing on the sill, if an L6+ pet left one (§8.2). */
  found: { petId: string; seed: number } | null;
  /**
   * An unread Sunday Note, Herbarium page or anniversary note waiting on the sill ("There's a note
   * on the sill" / "There's a page on the sill"), oldest first.
   */
  letterWaiting: { id: string; kind: RitualKind } | null;
  /** A capsule reveal was interrupted: resume it. */
  pendingReveal: boolean;
  /** "Show companions" (§9.5) and "Compact Today". */
  showCompanions: boolean;
  compactToday: boolean;
  /** The season today is in (hemisphere-correct, §14.3), and the last day a "just this season" habit would run. */
  season: { name: SeasonName; start: DateKey; end: DateKey; hemisphere: Hemisphere };
  /** The Season Review card (never modal, skippable), when a season just ended. */
  seasonReview: SeasonReviewVM | null;
  /** An unread story on a plant tag ("There's a story on the plant tag for {habit}."). */
  storyWaiting: { habitId: string; petId: string; story: StoryId } | null;
  /** Her birthday: the pets out leave one-line cards; there's a tiny cake and a ticket (§13). */
  birthday: { petIds: string[] } | null;
  /** Pets whose came-home day it is (a small bow on the pot). */
  cameHome: { petId: string; years: number }[];
  /** "Find {name} a plant": the Keeping Company offer, when it may be shown today. */
  companionOffer: CompanionOfferVM | null;
}

/** The Keeping Company offer (§14.1): at most once a day, never again after 3 declines. */
export interface CompanionOfferVM {
  /** The newest pet without a habit to keep company. */
  petId: string;
  /** "Let them choose": the habit its species would pick. */
  suggested: string | null;
  /** Habits without a companion, in display order. */
  habitIds: string[];
}

const BLOCK_ORDER: readonly Exclude<TimeOfDay, 'anytime'>[] = ['morning', 'midday', 'evening'];
const BLOCK_LABEL: Record<TimeOfDay, string> = { morning: 'Morning', midday: 'Midday', evening: 'Evening', anytime: 'Anytime' };

/**
 * Which time block of the app day the wall clock is in: morning from the day start until 11:00,
 * midday until 17:00, then evening. Hours before `dayStartsAt` (minutes after midnight) still
 * belong to the previous app day's evening; from the day start on it is the new day's morning, so
 * at 4 am with a 3 am day start Morning comes first rather than being folded as "earlier" (v1 §13.2
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

/** Pets out on the Shelf in band order: favourites first, then the closest friends, then who came home first. */
export function sillResidents(s: Pick<AppState, 'pets'>): string[] {
  return Object.values(s.pets)
    .filter((p) => p.inMeadow)
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.xp - a.xp || a.obtainedAt - b.obtainedAt || (a.id < b.id ? -1 : 1))
    .map((p) => p.id);
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

  // The band: pots with their companions or whoever is nearest, the Cutting, today's found thing.
  const cards = new Map([...blocks.flatMap((b) => b.cards), ...doneForPeriod, ...thisMonth, ...notToday].map((c) => [c.id, c]));
  const showCompanions = s.settings.showCompanions !== false;
  const potHabits = live.filter((h) => !isPausedOn(h.pauses, day));
  const companions = new Set(showCompanions ? potHabits.map((h) => cards.get(h.id)?.companion?.petId).filter((x): x is string => x !== undefined) : []);
  const nearest = sillResidents(s).filter((id) => !companions.has(id));
  const cameHome = isToday ? cameHomeToday(s, today, env.local) : [];
  const bows = new Set(cameHome.map((c) => c.petId));
  let next = 0;
  const sill: SillPotVM[] = potHabits.map((h) => {
    const card = cards.get(h.id)!;
    const own = showCompanions ? card.companion : null;
    const petId = own?.petId ?? nearest[next++];
    return {
      habitId: h.id,
      icon: h.icon,
      plant: h.plant,
      pot: h.pot,
      stage: card.plant.displayStage,
      progress: card.plant.progress,
      blooms: card.plant.blooms,
      done: card.done,
      damp: card.damp,
      resident: petId ? { petId, companion: own !== null && own !== undefined } : null,
      routine: own?.routine ?? null,
      bow: petId !== undefined && bows.has(petId),
      look: card.look,
    };
  });
  const found = s.found?.find((f) => f.date === day);
  const birthday = s.profile.birthday ? birthdayOn(s.profile.birthday, parseDateKey(today).year) === today : false;
  const hemisphere = hemisphereOf(s, env.timeZone);
  const season = seasonAt(today, hemisphere);
  const waiting = [...s.inbox].filter((l) => l.readAt === undefined).sort((a, b) => (ritualDate(a) < ritualDate(b) ? -1 : 1))[0];
  const offerPet = companionOfferOpen(s, today) ? petsWithoutHabit(s)[0] : undefined;

  return {
    date: day,
    isToday,
    dateLabel: longDateLabel(day),
    backdating: isToday ? null : { label: `Logging for ${shortDateLabel(day)}`, rewards: isInBackfillWindow(day, today) && canLogOn(day, today) },
    greeting: { timeOfDay: part, hour, name: s.profile.name.trim(), birthday },
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
    sill,
    cutting: cuttingOf(s),
    found: found ? { petId: found.petId, seed: found.seed } : null,
    letterWaiting: waiting ? { id: waiting.id, kind: ritualKind(waiting) } : null,
    pendingReveal: s.pendingReveal !== undefined,
    showCompanions,
    compactToday: s.settings.compactToday === true,
    season: { name: season.name, start: season.start, end: season.end, hemisphere },
    seasonReview: seasonReviewVM(s, env),
    storyWaiting: showCompanions ? storyWaiting(s) : null,
    birthday: birthday && isToday ? { petIds: birthdayCards(s) } : null,
    cameHome,
    companionOffer: offerPet && showCompanions ? { petId: offerPet, suggested: suggestHabitFor(s, offerPet), habitIds: habitsWithoutCompanion(s).map((h) => h.id) } : null,
  };
}

/** The oldest unread story of a live habit's current companion. */
export function storyWaiting(s: AppState): TodayVM['storyWaiting'] {
  let best: { habitId: string; petId: string; story: StoryId; on: DateKey } | null = null;
  for (const h of s.habits) {
    if (h.archivedOn !== undefined || !h.companionId) continue;
    const pair = pairOf(s, h.companionId, h.id);
    for (const [story, st] of Object.entries(pair?.stories ?? {}) as [StoryId, { on: DateKey; readAt?: number }][]) {
      if (st.readAt === undefined && (!best || st.on < best.on)) best = { habitId: h.id, petId: h.companionId, story, on: st.on };
    }
  }
  return best ? { habitId: best.habitId, petId: best.petId, story: best.story } : null;
}
