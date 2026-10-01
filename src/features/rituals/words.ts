/**
 * The rituals in words (DESIGN §13, VOICE.md §12): a Sunday Note, a Herbarium page, the moving-in
 * anniversary note and a filed season, each worded from its frozen data with the templates in
 * src/catalog/lines.ts (`SUNDAY_NOTE`, `HERBARIUM`, `CAME_HOME`, `SEASON_REVIEW`). Never a
 * percentage, never a 0: a sentence that would say one is left out.
 *
 * WP-B6 (domain-w2-d3): what happened is read from the letter, never from the habit as it is now.
 * The P.S.'s routine comes from the icon frozen in it, and a plant's Blooming and its species name
 * from the plant frozen in it. Names follow renames on purpose, and "Quote my notes" stays live. A
 * letter written before WP-B6 kept neither, so its P.S. says only that the pet kept the plant
 * company, and its Blooming is "reached Blooming" (its plant's name, where one is needed, is today's).
 */
import {
  ARCHETYPE_BY_ICON,
  BLOOM_EVENTS,
  CAME_HOME,
  FOUND_THINGS,
  HERBARIUM,
  SEASON_REVIEW,
  STAGE_EVENTS,
  STAGE_NAMES,
  SUNDAY_NOTE,
  SUNDAY_ROUTINES,
  SUNDAY_ROUTINES_BY_ICON,
  WATERINGS_MIN,
  capitalise,
  fillLine,
  numberWord,
  plantPhrase,
} from '@/catalog/lines';
import { plural } from '@/catalog/format';
import type { PlantSpeciesId } from '@/catalog/types';
import { MONTH_NAMES, WEEKDAY_NAMES, diffDays, monthDayLabel, monthIndex, weekday } from '@/domain/dates';
import type { AnniversaryVM, HerbariumPageVM, SundayNoteVM } from '@/state/views/pets';
import type { DateKey, HerbariumPressing, SeasonName, SeasonRecord, SundayHighlight, SundayPS, TimeOfDay } from '@/state/types';

/** What the words need to know about habits and pets (a deleted habit or a rehomed pet reads as null). */
export interface RitualLookup {
  habit(id: string): { name: string; plant: PlantSpeciesId; icon: string } | null;
  pet(id: string): { name: string } | null;
  /** 0 = Sunday, 1 = Monday. */
  weekStart: 0 | 1;
  /** "Quote my notes in the Sunday Note" (absent = on). */
  quoteNotes?: boolean;
}

/** A plant stage as a past-tense event: "showed a first bud", at Blooming the species' own ("grew thick enough to lie in"). */
export function stageEvent(stage: number, plant: PlantSpeciesId | undefined): string {
  if (stage === 5 && plant && BLOOM_EVENTS[plant]) return BLOOM_EVENTS[plant];
  return STAGE_EVENTS[Math.max(0, Math.min(7, stage))]!;
}

const weekdayOf = (date: DateKey) => WEEKDAY_NAMES[weekday(date)]!;

/** The day falls on Friday or earlier in her week (so there were afternoons since, VOICE §12). */
function byFriday(date: DateKey, weekStart: DateKey): boolean {
  return diffDays(weekStart, date) <= (5 - weekday(weekStart) + 7) % 7;
}

function highlightLine(h: SundayHighlight, weekStart: DateKey, look: RitualLookup): string | null {
  const H = SUNDAY_NOTE.highlights;
  const habit = 'habitId' in h && h.habitId ? look.habit(h.habitId) : null;
  const frozen = 'plant' in h ? h.plant : undefined;
  const plant = habit ? plantPhrase(habit.name, frozen ?? habit.plant) : null;
  switch (h.kind) {
    case 'stageUp': {
      if (!habit || !plant) return null;
      const slots = { Plant: capitalise(plant), plant, stageEvent: stageEvent(h.stage, frozen), weekday: weekdayOf(h.date) };
      const pet = h.petId ? look.pet(h.petId) : null;
      if (!pet) return fillLine(H.stageUp, slots);
      const napped = h.stage >= 2 && byFriday(h.date, weekStart);
      return fillLine(napped ? H.stageUpCompanion : H.stageUpCompanionShort, { ...slots, name: pet.name });
    }
    case 'newcomer': {
      const pet = look.pet(h.petId);
      if (!pet) return null;
      return habit && plant ? fillLine(H.newcomerMovedIn, { name: pet.name, weekday: weekdayOf(h.date), plant }) : fillLine(H.newcomer, { name: pet.name, weekday: weekdayOf(h.date) });
    }
    case 'everyDay':
      return habit ? fillLine(H.everyDay, { habit: habit.name }) : null;
    case 'topHabit':
      return habit && h.days > 0 ? fillLine(plural(h.days, H.topHabit), { habit: habit.name, count: h.days }) : null;
    case 'newHabit':
      return habit && plant ? fillLine(H.newHabit, { Plant: capitalise(plant), weekday: weekdayOf(h.date) }) : null;
    case 'tiny':
      return habit && h.days > 0 ? fillLine(plural(h.days, H.tiny), { habit: habit.name, count: h.days }) : null;
    case 'kept': {
      const anchor = look.habit(h.anchorHabitId);
      return habit && anchor && h.days > 0 ? fillLine(plural(h.days, H.kept), { habit: habit.name, anchor: anchor.name, count: h.days }) : null;
    }
  }
}

/** How often, in a P.S.: "four evenings", "five mornings", "every day". */
export function psTimes(days: number, timeOfDay: TimeOfDay): string {
  if (days >= 7) return 'every day';
  const n = numberWord(Math.max(1, days));
  const noun: Record<TimeOfDay, [string, string]> = {
    morning: ['morning', 'mornings'],
    midday: ['afternoon', 'afternoons'],
    evening: ['evening', 'evenings'],
    anytime: ['day', 'days'],
  };
  const [one, other] = noun[timeOfDay];
  return `${n} ${days === 1 ? one : other}`;
}

function psLine(ps: SundayPS, look: RitualLookup): string | null {
  const pet = look.pet(ps.petId);
  if (!pet) return null;
  if (ps.kind === 'companion') {
    const habit = look.habit(ps.habitId);
    if (!habit || ps.days < 1) return null;
    const times = psTimes(ps.days, ps.timeOfDay);
    if (ps.icon === undefined) return fillLine(SUNDAY_NOTE.ps.companionPlain, { name: pet.name, plant: plantPhrase(habit.name, habit.plant), times });
    const routine = SUNDAY_ROUTINES_BY_ICON[ps.icon] ?? SUNDAY_ROUTINES[ARCHETYPE_BY_ICON[ps.icon] ?? 'garden'];
    return fillLine(SUNDAY_NOTE.ps.companion, { name: pet.name, routine, times });
  }
  const found = FOUND_THINGS[Math.abs(Math.trunc(ps.seed)) % FOUND_THINGS.length]!;
  return fillLine(SUNDAY_NOTE.ps.sill[0]!, { weekday: weekdayOf(ps.date), name: pet.name, found });
}

const stampsLine = (n: number, t: { one: string; other: string }): string | null => (n > 0 ? fillLine(plural(n, t), { Count: numberWord(n, true) }) : null);

export interface SundayNoteWords {
  /** "Week of Sep 22." */
  opener: string;
  /** The count ("Nineteen waterings.") from 5 up, then the highlights. */
  body: string[];
  /** "On Tuesday you wrote: ‘slow start, good walk’." (only a note she starred). */
  quote: string | null;
  /** "P.S. Juniper slept on the book four evenings." */
  ps: string | null;
  /** "Three stamps, enclosed." */
  stamps: string | null;
}

/** The Sunday Note (VOICE §12), in its order. */
export function sundayNoteWords(n: Pick<SundayNoteVM, 'weekStart' | 'waterings' | 'highlights' | 'quote' | 'ps' | 'stamps'>, look: RitualLookup): SundayNoteWords {
  const body: string[] = [];
  if (n.waterings >= WATERINGS_MIN) body.push(fillLine(SUNDAY_NOTE.waterings, { Count: numberWord(n.waterings, true) }));
  for (const h of n.highlights) {
    const line = highlightLine(h, n.weekStart, look);
    if (line) body.push(line);
  }
  const quote = n.quote && look.quoteNotes !== false && n.quote.text.trim() ? fillLine(SUNDAY_NOTE.quote, { weekday: weekdayOf(n.quote.date), quote: n.quote.text.trim() }) : null;
  return {
    opener: fillLine(SUNDAY_NOTE.opener, { weekOf: monthDayLabel(n.weekStart) }),
    body,
    quote,
    ps: n.ps ? psLine(n.ps, look) : null,
    stamps: stampsLine(n.stamps, SUNDAY_NOTE.stamps),
  };
}

/** The whole note as one paragraph (the shelf's accessible summary, tests). */
export function sundayNoteText(w: SundayNoteWords): string {
  return [w.opener, ...w.body, w.quote, w.ps, w.stamps].filter(Boolean).join(' ');
}

/** "{Month}" for a 'YYYY-MM'. */
export const monthName = (month: string): string => MONTH_NAMES[monthIndex(month) % 12]!;

export interface PressingWords {
  habitId: string;
  plant: PlantSpeciesId;
  /** "Walk · 24", "Yoga · 7 · 2 rests" (a page with only rests: "Yoga · 2 rests"). */
  label: string;
  /** How big the pressing is drawn, 0..1 (its size of 7). */
  share: number;
  rests: number;
}

/** One pressing's label and size (VOICE §12 Herbarium page). */
export function pressingWords(p: HerbariumPressing, look: RitualLookup): PressingWords | null {
  const habit = look.habit(p.habitId);
  if (!habit) return null;
  let label: string;
  if (p.rests > 0) {
    const forms = p.waterings > 0 ? HERBARIUM.labelRests : { one: HERBARIUM.labelRests.one.replace(' · {count}', ''), other: HERBARIUM.labelRests.other.replace(' · {count}', '') };
    label = fillLine(plural(p.rests, forms), { habit: habit.name, count: p.waterings, rests: p.rests });
  } else label = fillLine(HERBARIUM.label, { habit: habit.name, count: p.waterings });
  return { habitId: p.habitId, plant: p.plant, label, share: Math.max(0.14, Math.min(1, (p.size || 1) / 7)), rests: p.rests };
}

export interface HerbariumWords {
  /** "September, pressed." */
  title: string;
  pressings: PressingWords[];
  /** "Rest days are pressed as the small flowers." (only when a pressing has rests). */
  restNote: string | null;
  /** One margin note, if true, and "The first page." */
  margin: string[];
  stamps: string | null;
}

export function herbariumWords(p: Pick<HerbariumPageVM, 'month' | 'pressings' | 'margin' | 'firstPage' | 'stamps'>, look: RitualLookup): HerbariumWords {
  const pressings = p.pressings.map((x) => pressingWords(x, look)).filter((x): x is PressingWords => x !== null);
  const margin: string[] = [];
  const m = p.margin;
  if (m) {
    if (m.kind === 'cameHome') {
      const pet = look.pet(m.petId);
      if (pet) margin.push(fillLine(HERBARIUM.margin[1]!, { name: pet.name, date: monthDayLabel(m.date) }));
    } else {
      const habit = look.habit(m.habitId);
      if (habit) margin.push(fillLine(HERBARIUM.margin[m.kind === 'bloomed' ? 0 : 2]!, { Plant: capitalise(plantPhrase(habit.name, m.plant ?? habit.plant)) }));
    }
  }
  if (p.firstPage) margin.push(HERBARIUM.firstPage);
  return {
    title: fillLine(HERBARIUM.title, { Month: monthName(p.month) }),
    pressings,
    restNote: pressings.some((x) => x.rests > 0) ? HERBARIUM.restNote : null,
    margin,
    stamps: stampsLine(p.stamps, HERBARIUM.stamps),
  };
}

/** The moving-in anniversary (VOICE §12): "A year on this sill. The first cutting was Walk." */
export function anniversaryWords(a: Pick<AnniversaryVM, 'years' | 'firstHabitId' | 'waterings'>, look: RitualLookup): string {
  const first = a.firstHabitId ? look.habit(a.firstHabitId) : null;
  if (a.years <= 1) {
    if (first) return fillLine(CAME_HOME.anniversary.first, { habit: first.name });
    const t = CAME_HOME.anniversary.first;
    return t.slice(0, t.indexOf('.') + 1);
  }
  const head = fillLine(CAME_HOME.anniversary.later, { Years: numberWord(a.years, true), Count: numberWord(a.waterings, true) });
  // Never a count of nothing: without a watering, the note is its first sentence.
  return a.waterings > 0 ? head : head.slice(0, head.indexOf('.') + 1);
}

export const SEASON_LABEL: Record<SeasonName, string> = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };

export interface SeasonWords {
  /** "Summer, on the sill." */
  title: string;
  /** "Walk · Cutting to Blooming · 71 waterings". */
  plants: { habitId: string; plant: PlantSpeciesId; stage: number; line: string; petId?: string }[];
}

export function seasonWords(r: Pick<SeasonRecord, 'name' | 'plants'>, look: RitualLookup): SeasonWords {
  return {
    title: fillLine(SEASON_REVIEW.title, { Season: SEASON_LABEL[r.name] }),
    plants: r.plants
      .map((p) => {
        const habit = look.habit(p.habitId);
        if (!habit || p.waterings < 1) return null;
        const from = STAGE_NAMES[Math.max(0, Math.min(7, p.fromStage))]!;
        const to = STAGE_NAMES[Math.max(0, Math.min(7, p.toStage))]!;
        const forms = p.fromStage === p.toStage ? SEASON_REVIEW.plantSame : SEASON_REVIEW.plant;
        return { habitId: p.habitId, plant: p.plant, stage: p.toStage, line: fillLine(plural(p.waterings, forms), { habit: habit.name, from, to, count: p.waterings }), ...(p.petId ? { petId: p.petId } : {}) };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
  };
}
