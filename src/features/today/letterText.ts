/**
 * The Sunday Note, the Herbarium page and the moving-in anniversary in words (VOICE §12), from the
 * ritual's data (`RitualVM`, src/state/views/pets.ts) and the templates in lines.ts. Pure, so the
 * Progress screen's memory shelf can use the same words (see NOTES-w2-today.md: this belongs in
 * src/catalog/format.ts). Never a percentage.
 */
import type { AppState, DateKey, SundayHighlight, SundayPS, TimeOfDay } from '@/state/types';
import type { RitualVM, SundayNoteVM, HerbariumPageVM, AnniversaryVM } from '@/state/selectors';
import {
  ARCHETYPE_BY_ICON,
  BLOOM_EVENTS,
  CAME_HOME,
  FOUND_THINGS,
  HERBARIUM,
  STAGE_EVENTS,
  SUNDAY_NOTE,
  SUNDAY_ROUTINES,
  SUNDAY_ROUTINES_BY_ICON,
  WATERINGS_MIN,
  capitalise,
  fillLine,
  numberWord,
  plantPhrase,
} from '@/catalog/lines';
import { plural, num, weekdayName } from '@/catalog/format';
import { MONTH_NAMES, monthDayLabel, weekday } from '@/domain/dates';
import type { PlantSpeciesId } from '@/catalog/types';

type World = Pick<AppState, 'habits' | 'pets'>;

/** One paragraph of a letter; `small` lines are set in the interface face (the footnote, the stamps). */
export interface LetterLine {
  text: string;
  small?: boolean;
}

export interface LetterText {
  title: string;
  lines: LetterLine[];
  /** A Herbarium page's pressings: species, the label, and its size (for `Pressing`). */
  pressings?: { habitId: string; species: PlantSpeciesId; label: string; share: number; rests: number }[];
}

const habitOf = (w: World, id: string) => w.habits.find((h) => h.id === id);
const petName = (w: World, id: string) => w.pets[id]?.name ?? '';

function plantSlots(w: World, habitId: string): { plant: string; Plant: string; habit: string } {
  const h = habitOf(w, habitId);
  const plant = h ? plantPhrase(h.name, h.plant) : 'the plant';
  return { plant, Plant: capitalise(plant), habit: h?.name ?? '' };
}

/** "four evenings", "every day", "one morning" (VOICE §12: spelled out inside the P.S.). */
export function timesWord(days: number, timeOfDay: TimeOfDay): string {
  if (days >= 7) return 'every day';
  const part = { morning: ['morning', 'mornings'], midday: ['afternoon', 'afternoons'], evening: ['evening', 'evenings'], anytime: ['day', 'days'] }[timeOfDay];
  return `${numberWord(days)} ${days === 1 ? part[0] : part[1]}`;
}

/** A stage-up in the past tense: "put down roots", or the species' Blooming ("trailed past the edge of the sill"). */
export function stageEvent(stage: number, species: PlantSpeciesId | undefined): string {
  if (stage === 5 && species) return BLOOM_EVENTS[species] ?? STAGE_EVENTS[5]!;
  return STAGE_EVENTS[Math.max(0, Math.min(7, stage))]!;
}

export function highlightLine(w: World, h: SundayHighlight): string | null {
  const H = SUNDAY_NOTE.highlights;
  switch (h.kind) {
    case 'stageUp': {
      const slots = plantSlots(w, h.habitId);
      const species = habitOf(w, h.habitId)?.plant;
      const base = { ...slots, stageEvent: stageEvent(h.stage, species), weekday: weekdayName(h.date) };
      if (!h.petId || !petName(w, h.petId)) return fillLine(H.stageUp, base);
      const day = weekday(h.date);
      const afternoons = h.stage >= 2 && day >= 1 && day <= 5;
      return fillLine(afternoons ? H.stageUpCompanion : H.stageUpCompanionShort, { ...base, name: petName(w, h.petId) });
    }
    case 'everyDay':
      return fillLine(H.everyDay, plantSlots(w, h.habitId));
    case 'topHabit':
      return fillLine(plural(h.days, H.topHabit), { ...plantSlots(w, h.habitId), count: num(h.days) });
    case 'newcomer': {
      const name = petName(w, h.petId);
      if (!name) return null;
      return h.habitId ? fillLine(H.newcomerMovedIn, { name, weekday: weekdayName(h.date), ...plantSlots(w, h.habitId) }) : fillLine(H.newcomer, { name, weekday: weekdayName(h.date) });
    }
    case 'newHabit':
      return fillLine(H.newHabit, { ...plantSlots(w, h.habitId), weekday: weekdayName(h.date) });
    case 'tiny':
      return fillLine(plural(h.days, H.tiny), { ...plantSlots(w, h.habitId), count: num(h.days) });
    case 'kept':
      return fillLine(plural(h.days, H.kept), { ...plantSlots(w, h.habitId), anchor: habitOf(w, h.anchorHabitId)?.name ?? '', count: num(h.days) });
  }
}

export function psLine(w: World, ps: SundayPS): string | null {
  const name = petName(w, ps.petId);
  if (!name) return null;
  if (ps.kind === 'found') return fillLine(SUNDAY_NOTE.ps.sill[0]!, { weekday: weekdayName(ps.date), name, found: FOUND_THINGS[Math.abs(ps.seed) % FOUND_THINGS.length]! });
  const icon = habitOf(w, ps.habitId)?.icon ?? 'watering-can';
  const routine = SUNDAY_ROUTINES_BY_ICON[icon] ?? SUNDAY_ROUTINES[ARCHETYPE_BY_ICON[icon] ?? 'garden'];
  return fillLine(SUNDAY_NOTE.ps.companion, { name, routine, times: timesWord(ps.days, ps.timeOfDay) });
}

const stampsLine = (n: number, forms: { one: string; other: string }): LetterLine | null => (n > 0 ? { text: fillLine(plural(n, forms), { Count: numberWord(n, true) }), small: true } : null);

export function sundayNoteText(w: World, v: SundayNoteVM): LetterText {
  const lines: (LetterLine | null)[] = [];
  const head = [fillLine(SUNDAY_NOTE.opener, { weekOf: monthDayLabel(v.weekStart) })];
  if (v.waterings >= WATERINGS_MIN) head.push(fillLine(SUNDAY_NOTE.waterings, { Count: numberWord(v.waterings, true) }));
  lines.push({ text: head.join(' ') });
  for (const h of v.highlights.slice(0, 2)) {
    const t = highlightLine(w, h);
    if (t) lines.push({ text: t });
  }
  if (v.quote) lines.push({ text: fillLine(SUNDAY_NOTE.quote, { weekday: weekdayName(v.quote.date), quote: v.quote.text }) });
  const ps = v.ps ? psLine(w, v.ps) : null;
  if (ps) lines.push({ text: ps });
  lines.push(stampsLine(v.stamps, SUNDAY_NOTE.stamps));
  return { title: fillLine(SUNDAY_NOTE.opener, { weekOf: monthDayLabel(v.weekStart) }).replace(/\.$/, ''), lines: lines.filter((l): l is LetterLine => l !== null) };
}

export function herbariumText(w: World, v: HerbariumPageVM): LetterText {
  const Month = MONTH_NAMES[Number(v.month.slice(5, 7)) - 1]!;
  const lines: (LetterLine | null)[] = [];
  const pressings = v.pressings.map((p) => {
    const habit = habitOf(w, p.habitId)?.name ?? '';
    const label = p.rests > 0 ? fillLine(plural(p.rests, HERBARIUM.labelRests), { habit, count: num(p.waterings), rests: num(p.rests) }) : fillLine(HERBARIUM.label, { habit, count: num(p.waterings) });
    return { habitId: p.habitId, species: p.plant, label, share: Math.max(0.15, p.size / 7), rests: p.rests };
  });
  if (v.pressings.some((p) => p.rests > 0)) lines.push({ text: HERBARIUM.restNote, small: true });
  if (v.margin) {
    const m = v.margin;
    const t =
      m.kind === 'bloomed'
        ? fillLine(HERBARIUM.margin[0]!, plantSlots(w, m.habitId))
        : m.kind === 'cameHome'
          ? petName(w, m.petId)
            ? fillLine(HERBARIUM.margin[1]!, { name: petName(w, m.petId), date: monthDayLabel(m.date) })
            : null
          : fillLine(HERBARIUM.margin[2]!, plantSlots(w, m.habitId));
    if (t) lines.push({ text: t });
  }
  if (v.firstPage) lines.push({ text: HERBARIUM.firstPage });
  lines.push(stampsLine(v.stamps, HERBARIUM.stamps));
  return { title: fillLine(HERBARIUM.title, { Month }), lines: lines.filter((l): l is LetterLine => l !== null), pressings };
}

export function anniversaryText(w: World, v: AnniversaryVM): LetterText {
  const first = v.firstHabitId ? habitOf(w, v.firstHabitId)?.name : undefined;
  const text = v.years <= 1 && first ? fillLine(CAME_HOME.anniversary.first, { habit: first }) : fillLine(CAME_HOME.anniversary.later, { Years: numberWord(Math.max(1, v.years), true), Count: numberWord(v.waterings, true) });
  const title = text.slice(0, text.indexOf('.'));
  return { title, lines: [{ text }] };
}

export function letterText(w: World, v: RitualVM): LetterText {
  return v.kind === 'sundayNote' ? sundayNoteText(w, v) : v.kind === 'herbarium' ? herbariumText(w, v) : anniversaryText(w, v);
}

/** The day a letter is for, for sorting and the reader's date line. */
export function letterDay(v: RitualVM): DateKey {
  return v.kind === 'sundayNote' ? v.weekStart : v.kind === 'herbarium' ? `${v.month}-01` : v.date;
}

