/**
 * Words for the Progress screen and Habit Detail (DESIGN §9.2, VOICE.md §6, §7, §14, §15, §23).
 * Templates come from src/catalog/lines.ts and the formatters in src/catalog/format.ts; the few
 * lines the deck has no constant for yet sit in `PROGRESS_UI` below, verbatim from VOICE.md where
 * it has them (a request to move them into lines.ts is in NOTES-w2-progress.md).
 *
 * The rules: numerals, sentence case, curly apostrophes, no 0 and no count of what's undone (a
 * line that would say one is null and the screen shows nothing), "watered" for done.
 */
import { COUNTS, GARDEN_JOURNAL, LOOKS, STAGE_NAMES, STORIES, TIME_NUDGE, TODAY_LINES, capitalise, fillLine, numberWord, plantPhrase } from '@/catalog/lines';
import { counted, longDateLabel, num, plural, weekDayAria } from '@/catalog/format';
import type { PlantSpeciesId } from '@/catalog/types';
import { MONTH_NAMES, WEEKDAY_NAMES, monthDayLabel, monthIndex } from '@/domain/dates';
import type { JournalEntry } from '@/domain/journal';
import type { TimeNudge } from '@/domain/signature';
import type { BloomColour, BloomShape, PlantLook, TimeBand } from '@/state/types';
import type { CalendarCell, DayState } from '@/state/views/calendar';
import type { StoryVM } from '@/state/views/company';

/** The screen's own words: section names, buttons and labels (VOICE.md where it has them). */
export const PROGRESS_UI = {
  title: 'Progress',
  sections: {
    months: 'Recent months',
    plants: 'Plants',
    balcony: 'Balcony shelf',
    calendar: 'Calendar',
    year: 'The year',
    records: 'Records',
    insights: 'Insights',
    pins: 'Pins',
    memory: 'Memory shelf',
  },
  /** Under the month's ring: what the percentage is a share of. */
  hero: { ringCaption: 'of this month’s waterings' },
  soFarMark: 'so far',
  calendar: {
    prev: 'Previous month',
    next: 'Next month',
    filter: 'Show habit',
    all: 'All habits',
    water: 'Water it for {date}',
    unwater: 'Not watered after all',
    windowNote: 'The last 6 days are watered from the week strip on Today.',
    openToday: 'Open Today',
    refused: 'That day is watered from the week strip on Today.',
    watered: 'watered',
    tiny: 'the tiny version',
    rest: 'resting',
    off: 'a day off',
    paused: 'resting',
    note: 'a note',
    part: '{count} of {target}',
    partUnit: '{count} of {target} {unit}',
  },
  year: { prev: 'Previous year', next: 'Next year' },
  plants: { open: '{habit}, {stage}', retired: '{habit}, on the balcony shelf' },
  pins: { notYet: 'not yet', earned: 'Earned {date}', progress: '{have} of {need}', stamps: { one: '+1 stamp', other: '+{count} stamps' }, pinLabel: '{name}, not yet', more: { one: '1 more pin', other: '{count} more pins' } },
  memory: { new: 'New', balcony: { one: '1 plant on the balcony shelf', other: '{count} plants on the balcony shelf' } },
} as const;

/** Habit Detail's own words (VOICE.md §7, §12, §13, §14, §21 where it has them). */
export const DETAIL_UI = {
  forecastEvergreen: 'Evergreen',
  sections: {
    tag: 'The plant tag',
    journal: 'Garden Journal',
    stats: 'How it’s going',
    why: STORIES.titles.why,
    moments: 'Moments',
    history: 'History',
    ladder: 'In a row',
    company: 'Keeping company',
    actions: 'Look after it',
  },
  ladder: { reached: 'Rungs reached: {count} of {total}' },
  stats: { lately: 'Lately', now: 'Now', longest: 'Longest run', longestLine: 'Longest run: {run}', waterings: 'Waterings', newRhythm: 'New rhythm', since: 'Since {date}', tiny: 'Tiny versions: {count}' },
  star: 'Star this note',
  starred: 'Starred for the Sunday Note',
  quoteHelp: 'Only notes you’ve starred are quoted in the Sunday Note.',
  /** VOICE §7, graduation. */
  grow: { title: 'A bigger pot?', text: '{habit} has been steady for 4 weeks. Make it a little bigger? +1 stamp', textQuiet: '{habit} has been steady for 4 weeks. Make it a little bigger?', yes: 'Grow it', no: 'Keep it as it is' },
  tinier: { title: 'Make it tinier?', text: 'A smaller version still counts, and still waters the plant.', yes: 'Make it tinier', no: 'Keep it as it is', done: '{habit} is tinier now.' },
  story: { new: 'New', remaining: { one: 'About 1 more watering together.', other: 'About {count} more waterings together.' }, waits: 'After the one before it.' },
  actions: {
    edit: 'Edit',
    pause: 'Pause {habit}',
    pauseShort: 'Pause',
    backOn: 'Back on…',
    backOnLabel: 'Back on',
    pauseOpen: 'Until you bring it back',
    bringBack: 'Bring it back',
    startFrom: 'Start tracking from…',
    startFromLabel: 'Start tracking from',
    archive: 'Archive',
    restore: 'Bring it back to the sill',
    delete: 'Delete',
    tune: 'Tune my habits',
    cancel: 'Not now',
    confirmArchive: 'Archive',
  },
  pausedUntil: 'Resting until {date}',
  pausedOpen: 'Resting until you bring it back',
  pauseFrom: 'Resting from {date}',
  archivedOn: 'On the balcony shelf since {date}',
  ribbon: 'Finished {date}, with a ribbon',
  looks: { label: 'Which look', stake: 'Classic' },
  close: 'Close',
} as const;

/* ------------------------------------------------------------------ */
/* Small formatters                                                    */
/* ------------------------------------------------------------------ */

/** "7:30 am", "6 pm", "12:15 pm" (VOICE §1 style: no ":00"). */
export function clockText(minute: number): string {
  const m = ((Math.round(minute) % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const mm = m % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}${mm ? `:${String(mm).padStart(2, '0')}` : ''} ${h24 < 12 ? 'am' : 'pm'}`;
}

/** "September" for a 'YYYY-MM'. */
export const monthName = (month: string): string => MONTH_NAMES[monthIndex(month) % 12]!;

/** A stage name ("Blooming"). */
export const stageName = (stage: number): string => STAGE_NAMES[Math.max(0, Math.min(7, Math.floor(stage)))]!;

/** A calendar day for screen readers: "Saturday, September 27, 3 of 5 watered" · "…, watered" · "…, resting". */
export function dayAria(cell: Pick<CalendarCell, 'date' | 'state' | 'count' | 'target'> & { note?: string | boolean }, agg?: { done: number; due: number } | null, unit?: string | null): string {
  const note = cell.note ? `, ${PROGRESS_UI.calendar.note}` : '';
  if (agg) return weekDayAria({ date: cell.date, done: agg.done, due: agg.due }) + note;
  const date = longDateLabel(cell.date);
  const word = stateWord(cell.state, cell.count ?? 0, cell.target ?? 1, unit ?? null);
  return (word ? `${date}, ${word}` : date) + note;
}

/** One habit's day in a word (null when there is nothing to say: an empty day is just its date). */
export function stateWord(state: DayState, count: number, target: number, unit: string | null): string | null {
  const C = PROGRESS_UI.calendar;
  switch (state) {
    case 'done':
      return C.watered;
    case 'tiny':
      return C.tiny;
    case 'rest':
      return C.rest;
    case 'off':
      return C.off;
    case 'paused':
      return C.paused;
    case 'partial':
      return count > 0 ? fillLine(unit ? C.partUnit : C.part, { count: num(count), target: num(target), unit: unit ?? '' }) : null;
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Blooms Like You, the Garden Journal, the nudge, the stories          */
/* ------------------------------------------------------------------ */

const COLOUR: Record<BloomColour, string> = LOOKS.colours;
const SHAPE: Record<BloomShape, string> = LOOKS.shapes;

/** "Dawn · Paired", "Twilight" (Classic shape says nothing more). */
export function lookName(l: Pick<PlantLook, 'colour' | 'shape'>): string {
  return l.shape === 'classic' ? COLOUR[l.colour] : `${COLOUR[l.colour]} · ${SHAPE[l.shape]}`;
}

/** The plant tag in plain words (VOICE §14): "Dawn · Paired: you usually water it before 9, and on 18 days it came right after Walk." */
export function lookTag(l: PlantLook, anchorName: (id: string) => string | null): string {
  const why = LOOKS.colourWhy[l.colour];
  const look = lookName(l);
  if (l.shape === 'petite' && l.evidence.tinyDays > 0) {
    return fillLine(LOOKS.tagBoth, { look, why, shapeWhy: fillLine(plural(l.evidence.tinyDays, LOOKS.shapeWhy.petite), { count: num(l.evidence.tinyDays) }) });
  }
  const kept = l.evidence.keptTogether;
  const anchor = kept ? anchorName(kept.habitId) : null;
  if (l.shape === 'paired' && kept && kept.days > 0 && anchor) {
    return fillLine(LOOKS.tagBoth, { look, why, shapeWhy: fillLine(plural(kept.days, LOOKS.shapeWhy.paired), { count: num(kept.days), anchor }) });
  }
  return fillLine(LOOKS.tag, { look, why });
}

const WHEN: Record<TimeBand, (minute: number) => string> = {
  dawn: () => 'before 9 am, usually',
  sunlit: () => 'in the middle of the day, usually',
  twilight: () => 'after 6 pm, usually',
  'all-sorts': () => 'at all sorts of times',
};

/** A Garden Journal sentence (VOICE §15), inked or in pencil. */
export function journalLine(e: JournalEntry, anchorName: (id: string) => string | null): string | null {
  const J = GARDEN_JOURNAL;
  if (!e.inked) {
    switch (e.kind) {
      case 'usualTime':
        return fillLine(plural(Math.max(1, e.remaining ?? 1), J.usualTime.pencil), { count: num(Math.max(1, e.remaining ?? 1)) });
      case 'steadiestDay':
        return J.steadiestDay.pencil;
      case 'tinyDays':
        return J.tinyDays.pencil;
      case 'keptTogether':
        return J.keptTogether.pencil;
      case 'whyItLooks':
        return J.whyItLooks.pencil;
    }
  }
  switch (e.kind) {
    case 'usualTime':
      return fillLine(J.usualTime.ink, { time: clockText(e.minute) });
    case 'steadiestDay':
      return fillLine(J.steadiestDay.ink, { weekday: WEEKDAY_NAMES[e.weekday]! });
    case 'tinyDays':
      return e.days > 0 ? fillLine(plural(e.days, J.tinyDays.ink), { count: num(e.days) }) : null;
    case 'keptTogether': {
      const anchor = anchorName(e.anchorHabitId);
      return anchor && e.days > 0 ? fillLine(plural(e.days, J.keptTogether.ink), { anchor, count: num(e.days) }) : null;
    }
    case 'whyItLooks':
      return fillLine(J.whyItLooks.ink, { look: COLOUR[e.colour], when: WHEN[e.band](e.usualMinute) });
  }
}

/** "You set Walk for mornings but usually water it after 6 pm. Move it to Evening?" with its two buttons. */
export function nudgeWords(habit: string, n: TimeNudge): { ask: string; move: string; leave: string } {
  const Block = TODAY_LINES.blocks[n.to];
  const Set = TODAY_LINES.blocks[n.from];
  return {
    ask: fillLine(TIME_NUDGE.ask, { habit, set: TIME_NUDGE.set[n.from], usual: TIME_NUDGE.usual[n.to], Block }),
    move: fillLine(TIME_NUDGE.move, { Block }),
    leave: fillLine(TIME_NUDGE.leave, { Set }),
  };
}

export interface StoryInput {
  story: StoryVM;
  name: string;
  habit: string;
  plant: PlantSpeciesId;
  since: string;
  waterings: number;
  moment: { date: string; text: string } | null;
  why: string | null;
}

/** A story's text on the plant tag (VOICE §13), or null while it waits. */
export function storyText(i: StoryInput): string | null {
  if (!i.story.unlocked) return null;
  const plant = plantPhrase(i.habit, i.plant);
  switch (i.story.id) {
    case 'start':
      return fillLine(STORIES.start, { name: i.name, plant, date: monthDayLabel(i.since), Count: numberWord(Math.max(1, i.waterings), true) });
    case 'why':
      return i.why ? fillLine(STORIES.why.kept, { why: i.why }) : fillLine(STORIES.why.ask, { name: i.name, habit: i.habit, date: monthDayLabel(i.since) });
    case 'lookAtUs':
      return i.moment
        ? fillLine(STORIES.lookAtUs.withMoment, { Plant: capitalise(plant), name: i.name, momentDate: monthDayLabel(i.moment.date), moment: i.moment.text })
        : fillLine(STORIES.lookAtUs.withoutMoment, { Plant: capitalise(plant), name: i.name, Count: numberWord(Math.max(1, i.waterings), true) });
  }
}

/** "About 3 more waterings together." (a story still waiting). */
export const storyRemaining = (n: number): string => fillLine(plural(Math.max(1, n), DETAIL_UI.story.remaining), { count: num(Math.max(1, n)) });

/** "84 waterings". */
export const wateringsText = (n: number): string => counted(n, COUNTS.waterings);
