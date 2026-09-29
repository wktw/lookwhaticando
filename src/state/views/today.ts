/**
 * The Today screen view-model (DESIGN §9.1: the windowsill band, the week strip, the habit list by
 * time block, the card status line, backdating).
 *
 * Structured data only: the greeting is `{ period, hour, name, birthday }` (GREETINGS[period] in
 * lines.ts), the card status line is a `StatusLine`, the vine chip, the rows and the banners are
 * numbers and dates. The words come from src/catalog/format.ts (`statusLine`, `vineChip`,
 * `blockSummary`, `restingRow`, `backdatingBanner`, `weekDayAria`…), shared with the fx layer. The
 * only strings here are dates ("Monday, September 29", "Sep 29", "Monday").
 *
 * `bandPots(vm)` and `bandPets(vm, state)` turn the VM into the WindowsillBand's `pots` and `pets`.
 */
import type { AppState, BloomColour, BloomShape, DateKey, Habit, Hemisphere, Outfit, SeasonName, StoryId, TimeOfDay } from '../types';
import type { Personality, PlaceId, PlantSpeciesId, PotId } from '@/catalog/types';
import { greetingPeriod, type GreetingPeriod } from '@/catalog/lines';
import { weekdayName } from '@/catalog/format';
import { companionOfferOpen, habitsWithoutCompanion, pairOf, petsWithoutHabit, suggestHabitFor, type RoutineOn } from '@/domain/company';
import { birthdayCards, cameHomeToday } from '@/domain/rituals';
import { hemisphereOf, seasonAt } from '@/domain/seasonReview';
import { petPlace } from '@/domain/places';
import { ritualDate, ritualKind, type RitualKind } from './pets';
import { seasonReviewVM, type SeasonReviewVM } from './season';
import { OFF_DAYS_PER_MONTH, canLogOn, isInBackfillWindow, offDaysRemaining } from '@/domain/activity';
import { dayCompletion, trackingOf } from '@/domain/consistency';
import { WEEKDAY_LETTERS, addDays, parseDateKey, startOfWeek, weekday } from '@/domain/dates';
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
}

export interface TimeBlockVM {
  /** "Morning" · "Midday" · "Evening" · "Anytime" (`blockLabel(id)`). */
  id: TimeOfDay;
  /** The block the wall clock is in (listed first). */
  current: boolean;
  /** An earlier block with everything done: shown folded ("Morning 3/3", `blockSummary(block)`). */
  collapsed: boolean;
  done: number;
  total: number;
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
  /** Flexible check-ins that day (they count toward a perfect day). The chip: `vineChip(progress, coinsToday)`. */
  flexibleCheckins: number;
  /** The day is complete and earned (or can still earn) a perfect day. */
  perfect: boolean;
}

/** The collapsed "Resting" row: `restingRow(paused)` → "Resting: 2 habits · back Oct 6". */
export interface PausedSummaryVM {
  count: number;
  habits: { id: string; name: string; back: DateKey | null }[];
  /** The earliest return day, when every paused habit has one. */
  back: DateKey | null;
}

export interface SillPotVM {
  habitId: string;
  icon: string;
  /** The habit's name and its anchor line, for the plant tag. */
  name: string;
  note: string | null;
  species: Habit['plant'];
  pot: Habit['pot'];
  stage: number;
  progress: number;
  /** The art's bloom count: undefined below Evergreen (the art follows the stage), see PlantVM.blooms. */
  blooms: number | undefined;
  /** Rises with every watering tap: the art's `pulse`. */
  pulse: number;
  /** Watered on the selected day: the pot shows damp soil (§9.1; there is no dry state). */
  done: boolean;
  /** Damp soil: watered on the selected day (same as `done`). */
  damp: boolean;
  /**
   * Who sits in this pot in the band: the habit's companion (`companion: true`, §14.1) when it is
   * out on the Shelf, else whoever is nearest: the other pets out take the remaining pots in order
   * (favourites first, then the closest friends). A companion resting indoors leaves its pot to the
   * nearest pet. With "Show companions" off, everyone is just nearest.
   */
  resident: { petId: string; companion: boolean } | null;
  /** The companion's routine that day (null on a day without one: an ordinary day). */
  routine: RoutineOn | null;
  /** The resident's came-home day: a small bow on the pot (§13). */
  bow: boolean;
  /** The plant's shown look (§14.2); null = Classic. */
  look: { colour: BloomColour; shape: BloomShape } | null;
}

/** The greeting chip's data (§9.1 "Afternoon, Sam."): GREETINGS[birthday ? 'birthday' : period] in lines.ts. */
export interface GreetingVM {
  /** The greeting period by the clock's hour (`greetingPeriod`): early, morning, afternoon, evening, late. */
  period: GreetingPeriod;
  /** The wall-clock hour (0–23). */
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
  /** "Sep 29" (the collapsed band). */
  shortDate: string;
  /** "Tuesday" (button names while a past day is selected: "Walk for Saturday", `forDayLabel`). */
  weekdayName: string;
  /**
   * A past day is selected: the sticky banner (`backdatingBanner(date)`: "Logging for Sat, Sep 27")
   * and whether it still earns.
   */
  backdating: { date: DateKey; weekdayName: string; rewards: boolean } | null;
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
  /** Day-based habits with no occurrence that day (the collapsed "Other days" row). */
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
  /**
   * Windowsill pots for the day's habits, in card order: the time blocks (the current block first),
   * then "Watered for the week", "This month" and "Other days". The band shows up to 6, so the
   * current block's pots come first (`bandPots`).
   */
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
  /** "Let {name} choose": the habit its species would pick. */
  suggested: string | null;
  /** Habits without a companion, in display order. */
  habitIds: string[];
}

const BLOCK_ORDER: readonly Exclude<TimeOfDay, 'anytime'>[] = ['morning', 'midday', 'evening'];

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

/**
 * Pets out on the Sill in band order: favourites first, then the closest friends, then who came
 * home first. A pet spending the day in another place (the Saucer Pond, the Quilt…) isn't on the
 * sill, so it doesn't take a pot as the nearest pet (a companion still sits in its own pot).
 */
export function sillResidents(s: Pick<AppState, 'pets' | 'shelf'>): string[] {
  return Object.values(s.pets)
    .filter((p) => p.inMeadow && petPlace(s, p) === 'sill')
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.xp - a.xp || a.obtainedAt - b.obtainedAt || (a.id < b.id ? -1 : 1))
    .map((p) => p.id);
}

export function todayVM(s: AppState, env: ViewEnv, date: DateKey = env.today): TodayVM {
  const today = env.today;
  const day = date > today ? today : date;
  const t = trackingOf(s);
  const clock = env.local(env.now);
  const hour = clock.hour;
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
      current: isToday && id === cur,
      collapsed: (earlier || !isToday) && done === cards.length,
      done,
      total: cards.length,
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
    flexibleCheckins: c.flexibleCheckins,
    perfect: s.ledger.once[`perfect|${day}`] !== undefined,
  };
  let paused: PausedSummaryVM | null = null;
  if (pausedHabits.length > 0) {
    const list = pausedHabits.map((h) => ({ id: h.id, name: h.name, back: pauseReturnDay(h.pauses, day) ?? null }));
    const backs = list.map((x) => x.back).filter((b): b is DateKey => b !== null).sort();
    const back = backs.length === list.length && backs.length > 0 ? backs[0]! : null;
    paused = { count: list.length, habits: list, back };
  }

  // The band: pots with their companions or whoever is nearest, the Cutting, today's found thing.
  // Pots follow the card order (current block first), so the band's first 6 are the ones in view.
  const ordered = [...blocks.flatMap((b) => b.cards), ...doneForPeriod, ...thisMonth, ...notToday];
  const showCompanions = s.settings.showCompanions !== false;
  // A companion lives in its pot only while it is out on the Shelf (a pet resting indoors isn't on the sill).
  const residentCompanion = (card: HabitCardVM) => (showCompanions && card.companion && s.pets[card.companion.petId]?.inMeadow ? card.companion : null);
  const companions = new Set(ordered.map((c) => residentCompanion(c)?.petId).filter((x): x is string => x !== undefined));
  const nearest = sillResidents(s).filter((id) => !companions.has(id));
  const cameHome = isToday ? cameHomeToday(s, today, env.local) : [];
  const bows = new Set(cameHome.map((c) => c.petId));
  let next = 0;
  const sill: SillPotVM[] = ordered.map((card) => {
    const own = residentCompanion(card);
    const petId = own?.petId ?? nearest[next++];
    return {
      habitId: card.id,
      icon: card.icon,
      name: card.name,
      note: card.after ? null : card.anchor,
      species: card.plant.species,
      pot: card.plant.pot,
      stage: card.plant.displayStage,
      progress: card.plant.progress,
      blooms: card.plant.blooms,
      pulse: card.waterings,
      done: card.done,
      damp: card.damp,
      resident: petId ? { petId, companion: own !== null } : null,
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
    shortDate: monthDayLabel(day),
    weekdayName: weekdayName(day),
    backdating: isToday ? null : { date: day, weekdayName: weekdayName(day), rewards: isInBackfillWindow(day, today) && canLogOn(day, today) },
    greeting: { period: greetingPeriod(hour), hour, name: s.profile.name.trim(), birthday },
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

/* ------------------------------------------------------------------ */
/* The windowsill band's inputs (WindowsillBand `pots` and `pets`)     */
/* ------------------------------------------------------------------ */

/** One pot on the band: the shape of the art's `SillPot` (src/art/scene/model.ts). */
export interface BandPot {
  habitId: string;
  name?: string;
  note?: string;
  species: PlantSpeciesId;
  stage: number;
  progress?: number;
  blooms?: number;
  pot: PotId;
  damp?: boolean;
  pulse?: number;
}

/** One pet on the band: the shape of the art's `ShelfPet`. */
export interface BandPet {
  key?: string;
  petId: string;
  name?: string;
  personality?: Personality;
  outfit?: Outfit;
  /** The habit whose pot it sits in (its companion's pot, or the nearest). */
  home?: string;
  place?: PlaceId;
}

/**
 * The band's pots, in the VM's card order (the current block first, then "Watered for the week",
 * "This month", "Other days"): the band shows the first 6, so the pot that is poured into on a
 * check-in in the current block is always on it. `blooms` is left out below Evergreen so the art
 * follows the stage.
 */
export function bandPots(vm: Pick<TodayVM, 'sill'>): BandPot[] {
  return vm.sill.map((p) => ({
    habitId: p.habitId,
    name: p.name,
    ...(p.note ? { note: p.note } : {}),
    species: p.species,
    stage: p.stage,
    progress: p.progress,
    ...(p.blooms !== undefined ? { blooms: p.blooms } : {}),
    pot: p.pot,
    damp: p.damp,
    pulse: p.pulse,
  }));
}

/**
 * The band's pets: each pot's resident that is out on the Shelf, once, in pot order, sitting in
 * that pot (`home`), with its name, personality and outfit.
 */
export function bandPets(vm: Pick<TodayVM, 'sill'>, s: Pick<AppState, 'pets'>): BandPet[] {
  const out: BandPet[] = [];
  const seen = new Set<string>();
  for (const p of vm.sill) {
    const id = p.resident?.petId;
    const pet = id ? s.pets[id] : undefined;
    if (!id || !pet || !pet.inMeadow || seen.has(id)) continue;
    seen.add(id);
    out.push({ key: id, petId: id, name: pet.name, personality: pet.personality, outfit: pet.outfit, home: p.habitId, place: 'sill' });
  }
  return out;
}
