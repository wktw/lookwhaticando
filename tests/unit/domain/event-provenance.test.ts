/**
 * WP-B6 event provenance (domain-d3, domain-d4, domain-w2-d3, P-history-09, and the event-day half
 * of P-history-04): an event's app day is kept as it was when it happened, a Sunday Note credits a
 * companion only with the days it actually kept the plant company (and its routine had started),
 * a written letter keeps the routine and plant it was written with, and a pet's Memories are dated
 * by the events themselves.
 *
 * Written first, against the code before WP-B6; every test goes through public reducers, readers
 * and words, so this file loads on that code and each case fails or passes on its own.
 */
import { describe, expect, it, vi } from 'vitest';
import { preserveFacts } from './metamorphic';
import type { AppState, CompanyPair, DateKey, Letter, PetState, SundayHighlight, SundayPS } from '@/state/types';
import { SCHEMA_VERSION } from '@/state/types';
import { validateState } from '@/state/validate';
import { encodeEnvelope, parseEnvelope } from '@/state/persist';
import * as company from '@/domain/company';
import { addDays, diffDays, eachDay, type LocalTimeReader } from '@/domain/dates';
import { addXp, feedPet, newPetState } from '@/domain/friendship';
import * as gacha from '@/domain/gacha';
import { BLOOMING, POTTED } from '@/domain/growth';
import * as habits from '@/domain/habits';
import { habitCreatedOn } from '@/domain/economy';
import { weeklyFacts } from '@/domain/letters';
import { LEVEL_XP, XP_PER_MEMORY } from '@/domain/levels';
import * as profile from '@/domain/profile';
import { mulberry32 } from '@/domain/rng';
import { transact } from '@/domain/tx';
import { cameHomeToday, herbariumFacts, movedInOn, sundayNoteFacts } from '@/domain/rituals';
import { retireWithRibbon } from '@/domain/seasonReview';
import { inLifetime, logStatus, showedUp } from '@/domain/activity';
import { ruleAt } from '@/domain/rules';
import { ritualLookup } from '@/features/rituals/lookup';
import { herbariumWords, sundayNoteText, sundayNoteWords } from '@/features/rituals/words';
import { petVM, ritualVM, type SundayNoteVM } from '@/state/views/pets';
import { Game, UTC, at } from './game';

vi.setConfig({ testTimeout: 60_000 });

const CAT = 'pet-cat-tortie';
const DOG = 'pet-dog-samoyed';
const COW = 'pet-cow-highland';
/** The week the Sunday Note cases report: Monday 2 March to Sunday 8 March 2026. */
const W = '2026-03-02';
const SUN = '2026-03-08';

const valid = (s: AppState) => {
  const v = validateState(s);
  return v.ok ? [] : v.errors;
};

function addPet(g: Game, id: string, over: Partial<PetState> = {}): string {
  g.state = {
    ...g.state,
    pets: { ...g.state.pets, [id]: { ...newPetState(id, g.rng, g.now, g.today, true), ...over } },
    collection: { ...g.state.collection, [id]: { count: 1, firstAt: g.now } },
  };
  return id;
}
const own = (g: Game, id: string) => {
  g.state = { ...g.state, collection: { ...g.state.collection, [id]: { count: 1, firstAt: g.now } } };
};
const pair = (g: Game, habitId: string, petId: string | null) => g.run((tx) => company.setCompanion(tx, habitId, petId));
const psOf = (g: Game, weekStart = W): SundayPS | undefined => sundayNoteFacts(g.state, weekStart, g.today, UTC).ps;
const weekly = (s: AppState, weekStart: DateKey) => s.inbox.find((l) => l.id === `weekly-${weekStart}`) as Extract<Letter, { kind: 'weekly' }> | undefined;
const noteText = (s: AppState, l: Extract<Letter, { kind: 'weekly' }>) => sundayNoteText(sundayNoteWords(ritualVM(l) as SundayNoteVM, ritualLookup(s)));
const withSettings = (g: Game, patch: Parameters<typeof profile.updateSettings>[1]) => g.run((tx) => profile.updateSettings(tx, patch));
const plusHours =
  (h: number): LocalTimeReader =>
  (ms) =>
    UTC(ms + h * 3_600_000);

/**
 * Read (a book, evenings) and Walk (mornings), both planted two weeks before W and watered every
 * day since, so both are well past Potted (their routines have started) when the week begins.
 * The clock stands at W, 07:00.
 */
function garden(): { g: Game; read: string; walk: string } {
  const g = new Game({ start: '2026-02-16' });
  const read = g.addHabit({ name: 'Read', icon: 'book', timeOfDay: 'evening', plant: 'pothos' });
  const walk = g.addHabit({ name: 'Walk', icon: 'walk', timeOfDay: 'morning', plant: 'pilea' });
  for (const d of eachDay('2026-02-16', '2026-03-01')) {
    g.goTo(d, 12);
    g.checkIn(read);
    g.checkIn(walk);
  }
  g.goTo(W, 7);
  expect(g.state.ledger.bestStage[read]).toBeGreaterThanOrEqual(POTTED);
  return { g, read, walk };
}

/** Waters `ids` at noon on each day in [from, to]; `before(d)` runs first that morning. */
function waterDays(g: Game, ids: string[], from: DateKey, to: DateKey, before?: (d: DateKey) => void): void {
  for (const d of eachDay(from, to)) {
    g.goTo(d, 8);
    before?.(d);
    g.goTo(d, 12);
    for (const id of ids) g.checkIn(id);
  }
}

/* ------------------------------------------------------------------ */
/* domain-d3: the P.S. counts only days the pair really shared         */
/* ------------------------------------------------------------------ */

describe('the Sunday Note credits a companion only with the days it kept the plant company (domain-d3)', () => {
  it('a pet that comes home and moves in on Sunday, before any watering together, gets no P.S. (the audit’s case)', () => {
    const { g, read } = garden();
    waterDays(g, [read], W, '2026-03-07');
    g.goTo(SUN, 10);
    addPet(g, CAT);
    pair(g, read, CAT);
    // Before: { kind: 'companion', petId: CAT, days: 6 } — six waterings it never shared.
    expect(psOf(g)?.kind).not.toBe('companion');
    g.goTo('2026-03-09', 9);
    const note = weekly(g.state, W)!;
    expect(note.ps?.kind).not.toBe('companion');
    expect(noteText(g.state, note)).not.toMatch(/slept on the book/);
  });

  it('the same newcomer watered with on Sunday evening is credited with that one evening', () => {
    const { g, read } = garden();
    waterDays(g, [read], W, '2026-03-07');
    g.goTo(SUN, 10);
    addPet(g, CAT);
    pair(g, read, CAT);
    g.goTo(SUN, 17); // before the note is written, from 18:00
    g.checkIn(read);
    expect(psOf(g)).toMatchObject({ kind: 'companion', petId: CAT, habitId: read, days: 1 });
    g.goTo('2026-03-09', 9);
    const note = weekly(g.state, W)!;
    const name = g.state.pets[CAT]!.name;
    expect(noteText(g.state, note)).toContain(`P.S. ${name} slept on the book one evening.`);
  });

  it('midweek pairing: a pet paired on Thursday is credited with Thursday to Sunday', () => {
    const { g, read } = garden();
    addPet(g, CAT);
    waterDays(g, [read], W, SUN, (d) => d === '2026-03-05' && pair(g, read, CAT));
    // Before: 7.
    expect(psOf(g)).toMatchObject({ kind: 'companion', petId: CAT, habitId: read, days: 4 });
  });

  it('a swap: the pet that left keeps its days and wins when it had more', () => {
    const { g, read } = garden();
    addPet(g, CAT);
    addPet(g, DOG);
    pair(g, read, CAT);
    // Thursday the dog takes over: the cat had Mon–Wed (3), the dog Thu–Sun (4).
    waterDays(g, [read], W, SUN, (d) => d === '2026-03-05' && pair(g, read, DOG));
    expect(psOf(g)).toMatchObject({ kind: 'companion', petId: DOG, days: 4 });
  });

  it('a late swap: on Saturday the dog takes over; the cat’s five days win the P.S.', () => {
    const { g, read } = garden();
    addPet(g, CAT);
    addPet(g, DOG);
    pair(g, read, CAT);
    waterDays(g, [read], W, SUN, (d) => d === '2026-03-07' && pair(g, read, DOG));
    // Before: the dog, 7.
    expect(psOf(g)).toMatchObject({ kind: 'companion', petId: CAT, habitId: read, days: 5 });
  });

  it('returning to an old pairing: only the days of each stint count', () => {
    const { g, read, walk } = garden();
    addPet(g, CAT);
    pair(g, read, CAT);
    const since = g.state.company!.pairs[`${CAT}|${read}`]!.since;
    waterDays(g, [read, walk], W, SUN, (d) => {
      if (d === '2026-03-04') pair(g, walk, CAT); // Wed: to Walk
      if (d === '2026-03-07') pair(g, read, CAT); // Sat: back to Read
    });
    // Read: Mon, Tue, Sat, Sun (4); Walk: Wed, Thu, Fri (3). Before: Read, 7.
    expect(psOf(g)).toMatchObject({ kind: 'companion', petId: CAT, habitId: read, days: 4 });
    // The pairing record carries on where it left off: its first day is unchanged.
    expect(g.state.company!.pairs[`${CAT}|${read}`]!.since).toBe(since);
    expect(g.state.company!.pairs[`${CAT}|${read}`]!.stints).toEqual([
      { from: W, to: '2026-03-03' },
      { from: '2026-03-07' },
    ]);
    // Moved away and back on the same day, it keeps one unbroken span.
    g.goTo('2026-03-09', 8);
    pair(g, walk, CAT);
    pair(g, read, CAT);
    expect(g.state.company!.pairs[`${CAT}|${read}`]!.stints).toEqual([
      { from: W, to: '2026-03-03' },
      { from: '2026-03-07' },
    ]);
    expect(g.state.company!.pairs[`${CAT}|${walk}`]!.stints).toEqual([{ from: '2026-03-04', to: '2026-03-06' }]);
    expect(valid(g.state)).toEqual([]);
  });

  it('a late backfill: days before the pairing do not become shared days', () => {
    const { g, read } = garden();
    addPet(g, CAT);
    waterDays(g, [read], '2026-03-05', '2026-03-07', (d) => d === '2026-03-05' && pair(g, read, CAT));
    // Saturday: Mon–Wed are filled in afterwards.
    for (const d of eachDay(W, '2026-03-04')) g.checkIn(read, d);
    waterDays(g, [read], SUN, SUN);
    // Before: 7.
    expect(psOf(g)).toMatchObject({ kind: 'companion', petId: CAT, days: 4 });
  });

  it('a habit finished on Saturday still gets its companion’s P.S. for the days they shared', () => {
    const { g, read } = garden();
    addPet(g, CAT);
    pair(g, read, CAT);
    waterDays(g, [read], W, '2026-03-06');
    g.goTo('2026-03-07', 9);
    g.run((tx) => retireWithRibbon(tx, read));
    expect(g.state.habits.find((h) => h.id === read)!.companionId).toBeUndefined();
    g.goTo(SUN, 12);
    // Before: no companion, so no P.S. (Finish erased the week they had).
    expect(psOf(g)).toMatchObject({ kind: 'companion', petId: CAT, habitId: read, days: 5 });
  });

  it('finished on Saturday after its watering, the habit keeps its companion through Saturday', () => {
    const { g, read } = garden();
    addPet(g, CAT);
    pair(g, read, CAT);
    waterDays(g, [read], W, '2026-03-07');
    g.goTo('2026-03-07', 20);
    g.run((tx) => retireWithRibbon(tx, read));
    g.goTo(SUN, 12);
    // Before: no companion P.S. at all.
    expect(psOf(g)).toMatchObject({ kind: 'companion', petId: CAT, habitId: read, days: 6 });
    expect(g.state.company!.pairs[`${CAT}|${read}`]!.stints!.at(-1)).toEqual({ from: W, to: '2026-03-07' });
  });

  it('pairing and unpairing on the same day shares nothing (a guard)', () => {
    const { g, read } = garden();
    addPet(g, CAT);
    waterDays(g, [read], W, SUN, (d) => {
      if (d === '2026-03-04') {
        pair(g, read, CAT);
        pair(g, read, null);
      }
    });
    expect(psOf(g)?.kind).not.toBe('companion');
  });

  it('the routine starting midweek: only days from Potted on count', () => {
    const g = new Game({ start: W });
    const read = g.addHabit({ name: 'Read', icon: 'book', timeOfDay: 'evening' });
    addPet(g, CAT);
    pair(g, read, CAT);
    waterDays(g, [read], W, SUN);
    const potted = g.state.stageDates![read]![POTTED]!;
    expect(potted > W && potted <= SUN).toBe(true);
    // Before: 7 (the whole week, though the routine starts at Potted).
    expect(psOf(g)).toMatchObject({ kind: 'companion', petId: CAT, days: diffDays(potted, SUN) + 1 });
  });

  it('a stage-up before the pairing names no companion; one after it does', () => {
    const g = new Game({ start: W });
    const read = g.addHabit({ name: 'Read', icon: 'book', timeOfDay: 'evening' });
    addPet(g, CAT);
    waterDays(g, [read], W, '2026-03-07');
    const up = sundayNoteFacts(g.state, W, g.today, UTC).highlights[0] as Extract<SundayHighlight, { kind: 'stageUp' }>;
    expect(up.kind).toBe('stageUp');
    expect(up.date < '2026-03-07').toBe(true);
    pair(g, read, CAT); // Saturday, after the stage-up
    // Before: petId CAT ("… and Tortie has napped in it every afternoon since").
    expect(sundayNoteFacts(g.state, W, g.today, UTC).highlights[0]).not.toHaveProperty('petId');

    const g2 = new Game({ start: W });
    const read2 = g2.addHabit({ name: 'Read', icon: 'book', timeOfDay: 'evening' });
    addPet(g2, CAT);
    pair(g2, read2, CAT);
    waterDays(g2, [read2], W, '2026-03-07');
    expect(sundayNoteFacts(g2.state, W, g2.today, UTC).highlights[0]).toMatchObject({ kind: 'stageUp', petId: CAT });
  });

  it('an older save’s pairing (no stints): the current companion counts from its first day only', () => {
    const { g, read } = garden();
    addPet(g, CAT);
    pair(g, read, CAT);
    // As an older build left it: the record says only that they first kept company on Wednesday.
    const key = `${CAT}|${read}`;
    const legacy: CompanyPair = { petId: CAT, habitId: read, since: '2026-03-04', sunshine: 0, waterings: 0 };
    g.state = { ...g.state, company: { ...g.state.company!, pairs: { ...g.state.company!.pairs, [key]: legacy } } };
    waterDays(g, [read], W, SUN);
    // Before: 7.
    expect(psOf(g)).toMatchObject({ kind: 'companion', petId: CAT, days: 5 });
    // Freed on Saturday next week, it keeps the days it had (Mon–Fri).
    waterDays(g, [read], '2026-03-09', '2026-03-15', (d) => d === '2026-03-14' && pair(g, read, null));
    expect(psOf(g, '2026-03-09')).toMatchObject({ kind: 'companion', petId: CAT, days: 5 });
    expect(valid(g.state)).toEqual([]);
  });

  it('a span an older build left open, after it freed the pet, counts on no day', () => {
    const { g, read } = garden();
    addPet(g, CAT);
    pair(g, read, CAT);
    waterDays(g, [read], W, SUN);
    expect(psOf(g)).toMatchObject({ kind: 'companion', petId: CAT, days: 7 });
    // An older build freed it without closing the span (it keeps the unknown field as it was).
    g.state = { ...g.state, habits: g.state.habits.map((h) => (h.id === read ? (({ companionId: _c, ...rest }) => rest)(h) : h)) };
    expect(g.state.company!.pairs[`${CAT}|${read}`]!.stints).toEqual([{ from: W }]);
    expect(psOf(g)?.kind).not.toBe('companion');
  });

  it('a pet an older build paired again with a plant whose span this build closed keeps it company from the next open', () => {
    // As an older build pairs: the habit's companion set, the pet's other habit freed, the spans left as they were.
    const olderBuildPairs = (g: Game, habitId: string, petId: string) => {
      g.state = {
        ...g.state,
        habits: g.state.habits.map((h) =>
          h.id === habitId ? { ...h, companionId: petId } : h.companionId === petId ? (({ companionId: _c, ...rest }) => rest)(h) : h,
        ),
      };
    };
    // Back the morning after this build moved it away: one unbroken span, as a same-day return keeps.
    const { g, read, walk } = garden();
    addPet(g, CAT);
    waterDays(g, [read, walk], W, SUN, (d) => {
      if (d === W) pair(g, read, CAT);
      if (d === '2026-03-03') {
        pair(g, walk, CAT); // Tue 08:00: to Walk (Read's span closes on Monday)
        olderBuildPairs(g, read, CAT); // Tue, in an older build: back to Read
        expect(valid(g.state)).toEqual([]);
      }
    });
    // Before: Read's span stayed closed on Monday, so the cat, Read's companion all week, had one day.
    expect(g.state.company!.pairs[`${CAT}|${read}`]!.stints).toEqual([{ from: W }]);
    expect(psOf(g)).toMatchObject({ kind: 'companion', petId: CAT, habitId: read, days: 7 });
    expect(valid(g.state)).toEqual([]);

    // Back days later: from the first open that sees it (when it came back is not known, so nothing earlier is made up).
    const g2 = garden();
    addPet(g2.g, CAT);
    waterDays(g2.g, [g2.read, g2.walk], W, SUN, (d) => {
      if (d === W) pair(g2.g, g2.read, CAT);
      if (d === '2026-03-03') pair(g2.g, g2.walk, CAT);
      if (d === '2026-03-05') olderBuildPairs(g2.g, g2.read, CAT); // Thu, in an older build
    });
    const spans = g2.g.state.company!.pairs[`${CAT}|${g2.read}`]!.stints;
    expect(spans).toEqual([{ from: W, to: W }, { from: '2026-03-05' }]);
    // Mon, Thu–Sun. (Walk's span, left open by the older build's move, counts on no day.)
    expect(psOf(g2.g)).toMatchObject({ kind: 'companion', petId: CAT, habitId: g2.read, days: 5 });
    // Once is enough: the next open writes nothing.
    const before = g2.g.state.company;
    g2.g.goTo('2026-03-09', 9);
    expect(g2.g.state.company).toBe(before);
    expect(valid(g2.g.state)).toEqual([]);

    // Paired and freed the same day (no span left), then paired by an older build the next day.
    const g3 = garden();
    addPet(g3.g, CAT);
    pair(g3.g, g3.read, CAT);
    pair(g3.g, g3.read, null);
    expect(g3.g.state.company!.pairs[`${CAT}|${g3.read}`]!.stints).toEqual([]);
    g3.g.goTo('2026-03-03', 8);
    olderBuildPairs(g3.g, g3.read, CAT);
    g3.g.goTo('2026-03-03', 9);
    expect(g3.g.state.company!.pairs[`${CAT}|${g3.read}`]!.stints).toEqual([{ from: '2026-03-03' }]);
  });

  it('a plant Potted before stage days were recorded counts as started; one not yet Potted does not', () => {
    const { g, read } = garden();
    addPet(g, CAT);
    pair(g, read, CAT);
    waterDays(g, [read], W, SUN);
    // As an older save left it: past Potted (bestStage), with no day recorded for Potted.
    const { [POTTED]: _p, ...rest } = g.state.stageDates![read]!;
    g.state = { ...g.state, stageDates: { ...g.state.stageDates, [read]: rest } };
    expect(g.state.ledger.bestStage[read]).toBeGreaterThanOrEqual(POTTED);
    expect(psOf(g)).toMatchObject({ kind: 'companion', petId: CAT, habitId: read, days: 7 });

    // A plant planted on Monday and watered once is not Potted: its routine has not started.
    const g2 = new Game({ start: W });
    const read2 = g2.addHabit({ name: 'Read', icon: 'book', timeOfDay: 'evening' });
    addPet(g2, CAT);
    pair(g2, read2, CAT);
    g2.checkIn(read2);
    g2.goTo(SUN, 10);
    expect(g2.state.stageDates?.[read2]?.[POTTED]).toBeUndefined();
    expect(g2.state.ledger.bestStage[read2] ?? 0).toBeLessThan(POTTED);
    expect(psOf(g2)?.kind).not.toBe('companion');
  });

  it('an older save’s pairing (no stints) names its companion on a stage-up from its first day on', () => {
    const run = (since: (upDate: DateKey) => DateKey) => {
      const g = new Game({ start: W });
      const read = g.addHabit({ name: 'Read', icon: 'book', timeOfDay: 'evening' });
      addPet(g, CAT);
      pair(g, read, CAT);
      waterDays(g, [read], W, '2026-03-07');
      const up = sundayNoteFacts(g.state, W, g.today, UTC).highlights[0] as Extract<SundayHighlight, { kind: 'stageUp' }>;
      expect(up.kind).toBe('stageUp');
      expect(up.date > W).toBe(true);
      // As an older build left it: no spans, only the day they first kept company.
      const key = `${CAT}|${read}`;
      const legacy: CompanyPair = { petId: CAT, habitId: read, since: since(up.date), sunshine: 0, waterings: 0 };
      g.state = { ...g.state, company: { ...g.state.company!, pairs: { ...g.state.company!.pairs, [key]: legacy } } };
      return sundayNoteFacts(g.state, W, g.today, UTC).highlights[0];
    };
    expect(run((d) => d)).toMatchObject({ kind: 'stageUp', petId: CAT });
    expect(run((d) => addDays(d, 1))).not.toHaveProperty('petId');
  });

  it('a tie between the pet that left and the current companion goes to the current companion', () => {
    const { g, read } = garden();
    addPet(g, CAT);
    addPet(g, DOG);
    // The cat Mon–Wed, the dog Thu–Sat: three days each (Sunday not watered).
    waterDays(g, [read], W, '2026-03-07', (d) => {
      if (d === W) pair(g, read, CAT);
      if (d === '2026-03-05') pair(g, read, DOG);
    });
    g.goTo(SUN, 10);
    // The pet ids alone would pick the cat ('pet-cat…' < 'pet-dog…').
    expect(psOf(g)).toMatchObject({ kind: 'companion', petId: DOG, habitId: read, days: 3 });
  });

  it('property: over random pairings, moves, swaps and frees, the P.S. is the pair with the most shared days (day-end rule)', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const { g, read, walk } = garden();
      const tea = g.addHabit({ name: 'Tea', icon: 'tea', timeOfDay: 'midday' });
      // Tea is new: its routine starts when it reaches Potted, part way through.
      const rng = mulberry32(seed);
      const ids = [read, walk, tea];
      const pets = [CAT, DOG, COW];
      for (const p of pets) addPet(g, p);
      /** Who keeps each habit company at the end of each day (the truth the stints must tell). */
      const truth = new Map<DateKey, Map<string, string>>();
      const end = addDays(W, 20); // three weeks
      for (const d of eachDay(W, end)) {
        for (const hour of [8, 12, 16, 20]) {
          g.goTo(d, hour);
          const r = rng();
          const h = ids[Math.floor(rng() * ids.length)]!;
          if (r < 0.25) pair(g, h, pets[Math.floor(rng() * pets.length)]!);
          else if (r < 0.32) pair(g, h, null);
          if (rng() < 0.6) g.checkIn(ids[Math.floor(rng() * ids.length)]!);
        }
        const map = new Map<string, string>();
        for (const h of g.state.habits) if (h.companionId) map.set(h.id, h.companionId);
        truth.set(d, map);
      }
      for (let w = 0; w < 3; w++) {
        const ws = addDays(W, w * 7);
        const days = new Map<string, number>();
        for (const d of eachDay(ws, addDays(ws, 6))) {
          for (const h of g.state.habits) {
            const petId = truth.get(d)!.get(h.id);
            if (!petId) continue;
            const potted = g.state.stageDates?.[h.id]?.[POTTED];
            if (potted === undefined || potted > d) continue;
            if (!inLifetime(h, d) || !showedUp(logStatus(g.state.logs[h.id]?.[d], ruleAt(h, d), d < g.today))) continue;
            days.set(`${petId}|${h.id}`, (days.get(`${petId}|${h.id}`) ?? 0) + 1);
          }
        }
        const best = Math.max(0, ...days.values());
        const ps = psOf(g, ws);
        const where = `seed ${seed}, week ${ws}`;
        if (best === 0) expect(ps?.kind, where).not.toBe('companion');
        else {
          expect(ps?.kind, where).toBe('companion');
          const c = ps as Extract<SundayPS, { kind: 'companion' }>;
          expect(c.days, where).toBe(best);
          expect(days.get(`${c.petId}|${c.habitId}`), where).toBe(best);
        }
      }
      expect(valid(g.state), `seed ${seed}`).toEqual([]);
    }
  });
});

/* ------------------------------------------------------------------ */
/* domain-d4 and P-history-04: event days are kept as they happened     */
/* ------------------------------------------------------------------ */

describe('arrival and moving-in days stay where they fell (domain-d4, DEC-P12f)', () => {
  /** A save started, and a pet brought home, on 29 Sep 2026 at 04:00 (UTC), with the 03:00 day start. */
  function early(): Game {
    const g = new Game({ start: '2026-09-29', hour: 4 });
    expect(g.today).toBe('2026-09-29');
    addPet(g, CAT);
    return g;
  }

  it('the audit’s case: a day start moved from 03:00 to 06:00 leaves the arrival on 29 Sep', () => {
    const g = early();
    withSettings(g, { dayStartsAt: 360 });
    const env = { today: g.today, now: g.now, local: UTC };
    // Before: 28 Sep everywhere.
    expect(petVM(g.state, env, CAT)!.arrivedOn).toBe('2026-09-29');
    expect(cameHomeToday(g.state, '2027-09-29', UTC)).toEqual([{ petId: CAT, years: 1 }]);
    expect(cameHomeToday(g.state, '2027-09-28', UTC)).toEqual([]);
    expect(sundayNoteFacts(g.state, '2026-09-28', '2026-10-04', UTC).highlights.find((h) => h.kind === 'newcomer')).toMatchObject({ date: '2026-09-29' });
    expect(herbariumFacts(g.state, '2026-09', '2026-10-01', UTC).margin).toMatchObject({ kind: 'cameHome', date: '2026-09-29' });
    expect(weeklyFacts(g.state, '2026-09-28', '2026-10-04', UTC).newFriends).toEqual([CAT]);
    expect(g.state.pets[CAT]!.arrivedOn).toBe('2026-09-29');
  });

  it('a pet brought home by a real capsule pull keeps its day too', () => {
    const g = new Game({ start: '2026-09-29', hour: 4 });
    const r = g.run((tx) => gacha.pull(tx, gacha.FIRST_CAPSULE_MACHINES[0]!, { free: true }));
    expect(r.ok).toBe(true);
    const id = (r as { itemId: string }).itemId;
    withSettings(g, { dayStartsAt: 360 });
    expect(petVM(g.state, { today: g.today, now: g.now, local: UTC }, id)!.arrivedOn).toBe('2026-09-29');
  });

  it('the moving-in day, its anniversary note and the Memories rule’s first day stay put', () => {
    const g = early();
    withSettings(g, { dayStartsAt: 360 });
    expect(movedInOn(g.state, UTC)).toBe('2026-09-29');
    expect(gacha.profileCreatedOn(g.state, UTC)).toBe('2026-09-29');
    g.goTo('2027-09-28', 12);
    // Before: the note came a day early, on the 28th.
    expect(g.state.inbox.some((l) => l.kind === 'anniversary')).toBe(false);
    g.goTo('2027-09-29', 12);
    expect(g.state.inbox.filter((l) => l.kind === 'anniversary').map((l) => l.id)).toEqual(['anniversary-2027-09-29']);
  });

  it('events either side of the old and new boundaries do not move', () => {
    const g = new Game({ start: '2026-09-28', hour: 12 });
    g.now = at('2026-09-29', 2, 30); // before 03:00: still the 28th
    addPet(g, CAT);
    g.now = at('2026-09-29', 5); // after 03:00: the 29th
    addPet(g, DOG);
    const arrivals = () => {
      const env = { today: g.today, now: g.now, local: UTC };
      return [petVM(g.state, env, CAT)!.arrivedOn, petVM(g.state, env, DOG)!.arrivedOn];
    };
    expect(arrivals()).toEqual(['2026-09-28', '2026-09-29']);
    preserveFacts('earlier day start', arrivals, () => withSettings(g, { dayStartsAt: 0 }));
    expect(arrivals()).toEqual(['2026-09-28', '2026-09-29']); // before: 29, 29
    preserveFacts('later day start', arrivals, () => withSettings(g, { dayStartsAt: 360 }));
    expect(arrivals()).toEqual(['2026-09-28', '2026-09-29']); // before: 28, 28
  });

  it('a move across time zones does not move them either (the event-day half of P-history-04)', () => {
    const g = new Game({ start: '2026-09-29', hour: 22 });
    g.now = at('2026-09-29', 22, 30);
    addPet(g, CAT);
    preserveFacts('travel to Sydney', () => ({
      arrived: petVM(g.state, { today: g.today, now: g.now, local: g.local }, CAT)!.arrivedOn,
      movedIn: movedInOn(g.state, g.local),
    }), () => {
      g.local = plusHours(10); // to Sydney: 08:30 the next morning
      g.goTo('2026-09-30', 2); // 12:00 in Sydney
    });
    const env = { today: g.today, now: g.now, local: g.local };
    // Before: 30 Sep.
    expect(petVM(g.state, env, CAT)!.arrivedOn).toBe('2026-09-29');
    expect(movedInOn(g.state, g.local)).toBe('2026-09-29');
  });

  it('events after a change follow the new day start (a guard)', () => {
    const g = early();
    withSettings(g, { dayStartsAt: 360 });
    g.goTo('2026-10-05', 4); // 04:00, before the new 06:00 start: still the 4th
    expect(g.today).toBe('2026-10-04');
    addPet(g, DOG);
    expect(petVM(g.state, { today: g.today, now: g.now, local: UTC }, DOG)!.arrivedOn).toBe('2026-10-04');
  });

  it('an older save is frozen once, with the settings it has, and then stays put', () => {
    const g = early();
    const h = g.addHabit({ name: 'Walk' });
    // As an older build saved it: no event days stored.
    const { arrivedOn: _a, ...pet } = g.state.pets[CAT]!;
    const { createdOn: _c, ...prof } = g.state.profile;
    const { createdOn: _h, ...habit } = g.state.habits[0]!;
    g.state = { ...g.state, pets: { [CAT]: pet as PetState }, profile: prof, habits: [habit] };
    g.goTo('2026-09-29', 5); // the next open freezes them with today's settings (03:00)
    expect([g.state.pets[CAT]!.arrivedOn, g.state.profile.createdOn, g.state.habits[0]!.createdOn]).toEqual(['2026-09-29', '2026-09-29', '2026-09-29']);
    const frozen = g.state;
    g.goTo('2026-09-29', 6);
    // Idempotent: nothing is written again.
    expect(g.state.pets).toBe(frozen.pets);
    expect(g.state.profile).toBe(frozen.profile);
    expect(g.state.habits).toBe(frozen.habits);
    withSettings(g, { dayStartsAt: 360 });
    // Before: all three moved to 28 Sep.
    expect(petVM(g.state, { today: g.today, now: g.now, local: UTC }, CAT)!.arrivedOn).toBe('2026-09-29');
    expect(movedInOn(g.state, UTC)).toBe('2026-09-29');
    expect(habitCreatedOn(g.state.habits.find((x) => x.id === h)!, g.state.settings.dayStartsAt, UTC)).toBe('2026-09-29');
    expect(g.state.pets[CAT]!.arrivedOn).toBe('2026-09-29');
    expect(g.state.profile.createdOn).toBe('2026-09-29');
    expect(g.state.habits[0]!.createdOn).toBe('2026-09-29');
    expect(valid(g.state)).toEqual([]);
  });

  it('an older save frozen on open keeps its days through a later move across time zones', () => {
    const g = new Game({ start: '2026-09-29', hour: 22 });
    g.now = at('2026-09-29', 22, 30);
    addPet(g, CAT);
    const { arrivedOn: _a, ...pet } = g.state.pets[CAT]!;
    const { createdOn: _c, ...prof } = g.state.profile;
    g.state = { ...g.state, pets: { [CAT]: pet as PetState }, profile: prof };
    g.goTo('2026-09-29', 23); // opened in London (UTC): frozen as 29 Sep
    g.local = plusHours(10);
    g.goTo('2026-09-30', 2);
    // Before: 30 Sep, read again in Sydney.
    expect(petVM(g.state, { today: g.today, now: g.now, local: g.local }, CAT)!.arrivedOn).toBe('2026-09-29');
    expect(movedInOn(g.state, g.local)).toBe('2026-09-29');
  });

  it('a day-start change in a transaction that has not opened the day still freezes first', () => {
    const g = early();
    const { arrivedOn: _a, ...pet } = g.state.pets[CAT]!;
    const legacy = { ...g.state, pets: { [CAT]: pet as PetState } };
    const out = transact(legacy, g.env(), (tx) => {
      profile.updateSettings(tx, { dayStartsAt: 360 });
      return {};
    });
    // Before: 28 Sep (the instant read with the new day start).
    expect(petVM(out.state, { today: g.today, now: g.now, local: UTC }, CAT)!.arrivedOn).toBe('2026-09-29');
  });

  it('a pet that came home at 04:00 on a Monday stays among that week’s new friends after a later day start', () => {
    const g = new Game({ start: '2026-09-28', hour: 4 });
    addPet(g, CAT);
    withSettings(g, { dayStartsAt: 360 });
    // Before: read again with 06:00, the arrival fell on Sunday 27 Sep, the week before.
    expect(weeklyFacts(g.state, '2026-09-28', '2026-10-04', UTC).newFriends).toEqual([CAT]);
    expect(weeklyFacts(g.state, '2026-09-21', '2026-10-04', UTC).newFriends).toEqual([]);
    const read = g.addHabit({ name: 'Read' });
    g.goTo('2026-09-30', 12);
    g.checkIn(read);
    g.goTo('2026-10-05', 9);
    expect(weekly(g.state, '2026-09-28')!.newFriends).toEqual([CAT]);
  });

  it('the letters’ first-week guard keeps the moving-in day: no note for the week before it, after a later day start', () => {
    const g = new Game({ start: '2026-09-28', hour: 4 }); // moved in on Monday 28 Sep (03:00 start)
    const read = g.addHabit({ name: 'Read' });
    expect(g.run((tx) => habits.setStartedOn(tx, read, '2026-09-21'))).toBe(true);
    g.checkIn(read, '2026-09-25');
    expect(weeklyFacts(g.state, '2026-09-21', g.today, UTC).showUpDays).toBeGreaterThanOrEqual(1);
    withSettings(g, { dayStartsAt: 360 });
    expect(movedInOn(g.state, UTC)).toBe('2026-09-28');
    g.goTo('2026-09-29', 9); // the next open tries last week's note again
    // Before: moving in read again as Sunday 27 Sep, so a note for 21–27 Sep, a week before she came.
    expect(weekly(g.state, '2026-09-21')).toBeUndefined();
  });

  it('onboarding fixes the moving-in day with the day start chosen there, and freezes older days first', () => {
    const g = new Game({ start: '2026-09-29', hour: 4, onboard: false });
    g.goTo('2026-09-29', 5);
    // Not onboarded yet: opening the app fixes no moving-in day.
    expect(g.state.profile.createdOn).toBeUndefined();
    // An older save, not onboarded, with a pet whose day was never stored (it came home at 05:00).
    addPet(g, CAT);
    const { arrivedOn: _a, ...pet } = g.state.pets[CAT]!;
    const legacy = { ...g.state, pets: { [CAT]: pet as PetState } };
    const out = transact(legacy, g.env(), (tx) => {
      habits.completeOnboarding(tx, { name: 'Sam', templateIds: [], dayStartsAt: 360 });
      return {};
    });
    // Frozen with the 03:00 start it had before onboarding moved it to 06:00 (else 28 Sep).
    expect(petVM(out.state, { today: g.today, now: g.now, local: UTC }, CAT)!.arrivedOn).toBe('2026-09-29');
    expect(out.state.pets[CAT]!.arrivedOn).toBe('2026-09-29');
    // The moving-in day, from 04:00 with the 06:00 start chosen there.
    expect(out.state.profile.createdOn).toBe('2026-09-28');
  });

  it('leap-day arrivals: Feb 29 comes round on Feb 28; Mar 1 at 04:00 stays Mar 1 after a later start', () => {
    const g = new Game({ start: '2028-02-29', hour: 12 });
    addPet(g, CAT);
    expect(cameHomeToday(g.state, '2029-02-28', UTC)).toEqual([{ petId: CAT, years: 1 }]);
    g.goTo('2028-03-01', 4);
    addPet(g, DOG);
    withSettings(g, { dayStartsAt: 360 });
    // Before: the dog's arrival became Feb 29, and came round on Feb 28.
    expect(cameHomeToday(g.state, '2029-03-01', UTC)).toEqual([{ petId: DOG, years: 1 }]);
    expect(cameHomeToday(g.state, '2029-02-28', UTC)).toEqual([{ petId: CAT, years: 1 }]);
  });

  it('the Pet Card’s moments and its Memories agree on the came-home day', () => {
    const g = early();
    g.run((tx) => addXp(tx, CAT, LEVEL_XP[9]! + 2 * XP_PER_MEMORY)); // best friends, then came home
    withSettings(g, { dayStartsAt: 360 });
    const vm = petVM(g.state, { today: g.today, now: g.now, local: UTC }, CAT)!;
    const memory = g.state.pets[CAT]!.memories!.find((m) => m.kind === 'came-home')!;
    // Before: the memory says 29 Sep, the moments 28 Sep.
    expect(vm.moments.find((m) => m.kind === 'came-home')!.date).toBe(memory.date);
    expect(memory.date).toBe('2026-09-29');
  });
});

/* ------------------------------------------------------------------ */
/* domain-w2-d3: a written letter keeps its routine and plant           */
/* ------------------------------------------------------------------ */

describe('a written Sunday Note reads the same after an icon or plant edit (domain-w2-d3)', () => {
  function weekWithCat(): { g: Game; read: string; note: Extract<Letter, { kind: 'weekly' }> } {
    const { g, read } = garden();
    addPet(g, CAT);
    pair(g, read, CAT);
    waterDays(g, [read], W, SUN);
    g.goTo('2026-03-09', 9);
    return { g, read, note: weekly(g.state, W)! };
  }

  it('an icon edit does not change what the companion did that week', () => {
    const { g, read, note } = weekWithCat();
    const before = noteText(g.state, note);
    expect(before).toContain('slept on the book every day');
    preserveFacts('icon edit', () => noteText(g.state, note), () => g.run((tx) => habits.updateHabit(tx, read, { icon: 'walk' })));
    // Before: "… waited by the door every day."
    expect(noteText(g.state, note)).toBe(before);
  });

  it('deleting an unrelated habit does not rewrite a remembered companion week', () => {
    const { g, note } = weekWithCat();
    const unrelated = g.addHabit({ name: 'Unrelated' });
    preserveFacts('unrelated delete', () => noteText(g.state, note), () => g.run((tx) => habits.deleteHabit(tx, unrelated)));
    expect(g.state.habits.some((h) => h.id === unrelated)).toBe(false);
  });

  it('a plant edit does not change what the plant did at Blooming', () => {
    const g = new Game({ start: '2026-01-05' });
    const read = g.addHabit({ name: 'Read', icon: 'book', timeOfDay: 'evening', plant: 'pothos' });
    let note: Extract<Letter, { kind: 'weekly' }> | undefined;
    for (let i = 0; i < 120 && !note; i++) {
      g.goTo(addDays('2026-01-05', i), 12);
      g.checkIn(read);
      note = g.state.inbox.find((l): l is Extract<Letter, { kind: 'weekly' }> => l.kind === 'weekly' && (l.highlights ?? []).some((h) => h.kind === 'stageUp' && h.stage === BLOOMING));
    }
    expect(note).toBeDefined();
    const before = noteText(g.state, note!);
    expect(before).toContain('trailed past the edge of the sill');
    own(g, 'plant-tulip');
    preserveFacts('plant edit', () => noteText(g.state, note!), () => g.run((tx) => habits.updateHabit(tx, read, { plant: 'tulip' })));
    // Before: "… opened a single cup …".
    expect(noteText(g.state, note!)).toBe(before);
  });

  it('a long-named habit’s plant keeps its name in a written note and page', () => {
    const g = new Game({ start: W });
    const id = g.addHabit({ name: 'Tidy for 10 minutes', icon: 'broom', plant: 'snakeplant' });
    waterDays(g, [id], W, SUN);
    g.goTo('2026-03-09', 9);
    g.goTo('2026-04-01', 9);
    const note = weekly(g.state, W)!;
    const page = g.state.inbox.find((l): l is Extract<Letter, { kind: 'monthly' }> => l.kind === 'monthly' && l.month === '2026-03')!;
    const pageText = () => herbariumWords(ritualVM(page) as never, ritualLookup(g.state)).margin.join(' ');
    const before = [noteText(g.state, note), pageText()];
    expect(before[0]).toContain('The snake plant');
    expect(before[1]).toContain('The snake plant was planted this month.');
    own(g, 'plant-monstera');
    g.run((tx) => habits.updateHabit(tx, id, { plant: 'monstera' }));
    // Before: "The monstera …" in both.
    expect([noteText(g.state, note), pageText()]).toEqual(before);
  });

  it('a long-named habit planted that week keeps its plant’s name in the new-plant line', () => {
    const g = new Game({ start: '2026-02-23' });
    const read = g.addHabit({ name: 'Read', icon: 'book', timeOfDay: 'evening', plant: 'pothos' });
    waterDays(g, [read], '2026-02-23', W);
    g.goTo(SUN, 10);
    const id = g.addHabit({ name: 'Tidy for 10 minutes', icon: 'broom', plant: 'snakeplant' });
    g.goTo('2026-03-09', 9);
    const note = weekly(g.state, W)!;
    expect(note.highlights).toContainEqual({ kind: 'newHabit', habitId: id, date: SUN, plant: 'snakeplant' });
    const before = noteText(g.state, note);
    expect(before).toContain('The snake plant was planted on Sunday');
    own(g, 'plant-monstera');
    g.run((tx) => habits.updateHabit(tx, id, { plant: 'monstera' }));
    // Before: "The monstera was planted on Sunday …".
    expect(noteText(g.state, note)).toBe(before);
  });

  it('a note written before WP-B6 (no routine or plant kept) uses generic wording, not today’s icon', () => {
    const { g, read, note } = weekWithCat();
    const legacyPs = { ...(note.ps as Extract<SundayPS, { kind: 'companion' }>) } as Record<string, unknown>;
    delete legacyPs.icon;
    const legacy = { ...note, ps: legacyPs as SundayPS, highlights: (note.highlights ?? []).map((h) => ({ ...h, plant: undefined })) };
    const name = g.state.pets[CAT]!.name;
    // Before: the live icon's routine ("slept on the book"), as if it had always been that.
    expect(noteText(g.state, legacy)).toContain(`P.S. ${name} kept the Read plant company every day.`);
    const bloom: Extract<Letter, { kind: 'weekly' }> = { ...note, highlights: [{ kind: 'stageUp', habitId: read, stage: BLOOMING, date: '2026-03-04' }], ps: undefined };
    expect(noteText(g.state, bloom)).toContain('reached Blooming on Wednesday');
  });

  it('names still follow a rename, and "Quote my notes" stays live (guards)', () => {
    const { g, read, note } = weekWithCat();
    g.run((tx) => habits.updateHabit(tx, read, { name: 'Books' }));
    expect(noteText(g.state, note)).toContain('Books');
    withSettings(g, { quoteNotes: false });
    expect(sundayNoteWords({ ...(ritualVM(note) as SundayNoteVM), quote: { habitId: read, date: W, text: 'a good chapter' } }, ritualLookup(g.state)).quote).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* P-history-09: Memories dated by their events                         */
/* ------------------------------------------------------------------ */

describe('a pet’s Memories carry the day the thing happened (P-history-09)', () => {
  function feedable(g: Game, petId: string): void {
    const treat = 'treat-fish-crackers';
    g.state = {
      ...g.state,
      pets: { ...g.state.pets, [petId]: { ...g.state.pets[petId]!, favoriteTreat: treat } },
      collection: { ...g.state.collection, [treat]: { count: 1, firstAt: g.now } },
      pantry: { ...g.state.pantry, [treat]: { servings: 5, restockedOn: g.today } },
    };
  }

  it('a favourite found weeks before the Memory is dated the day it was found', () => {
    const g = new Game({ start: '2026-03-02' });
    addPet(g, CAT);
    feedable(g, CAT);
    g.goTo('2026-03-04');
    g.run((tx) => feedPet(tx, CAT, 'treat-fish-crackers'));
    g.goTo('2026-04-20');
    g.run((tx) => addXp(tx, CAT, LEVEL_XP[9]! + 3 * XP_PER_MEMORY));
    const memories = g.state.pets[CAT]!.memories!;
    // Before: dated 20 Apr, the day the Memory was written.
    expect(memories.find((m) => m.kind === 'favourite')).toMatchObject({ date: '2026-03-04' });
    expect(g.state.pets[CAT]!.favoriteKnownOn).toBe('2026-03-04');
    expect(valid(g.state)).toEqual([]);
  });

  it('an older save’s favourite (found on an unknown day) leaves no made-up date', () => {
    const g = new Game({ start: '2026-03-02' });
    addPet(g, CAT, { favoriteKnown: true });
    g.goTo('2026-04-20');
    g.run((tx) => addXp(tx, CAT, LEVEL_XP[9]! + 3 * XP_PER_MEMORY));
    // Before: a 'favourite' Memory dated 20 Apr.
    expect(g.state.pets[CAT]!.memories!.map((m) => m.kind)).toEqual(['best-friends', 'came-home', 'day']);
  });

  /** Read watered every day from 5 Jan; `pairOn` pairs the cat that morning. Runs until "Look at us" is told. */
  function bloomStory(pairOn: DateKey): { g: Game; read: string; bloomed: DateKey; story: DateKey } {
    const g = new Game({ start: '2026-01-05' });
    const read = g.addHabit({ name: 'Read', icon: 'book', plant: 'pothos' });
    addPet(g, CAT);
    for (let i = 0; i < 200; i++) {
      const d = addDays('2026-01-05', i);
      g.goTo(d, 9);
      if (d === pairOn) pair(g, read, CAT);
      g.goTo(d, 12);
      g.checkIn(read);
      if (g.state.company?.pairs[`${CAT}|${read}`]?.stories?.lookAtUs) break;
    }
    const story = g.state.company!.pairs[`${CAT}|${read}`]!.stories!.lookAtUs!.on;
    return { g, read, bloomed: g.state.stageDates![read]![BLOOMING]!, story };
  }
  const memoriesAfterXp = (g: Game) => {
    g.run((tx) => addXp(tx, CAT, LEVEL_XP[9]! + 4 * XP_PER_MEMORY));
    return g.state.pets[CAT]!.memories!;
  };

  it('a companion there when the plant bloomed remembers the day it bloomed, not the day the story came', () => {
    const { g, read, bloomed, story } = bloomStory('2026-01-08');
    expect(story > bloomed).toBe(true);
    const vm = petVM(g.state, { today: g.today, now: g.now, local: UTC }, CAT)!;
    // Before: the story's day.
    expect(vm.moments.find((m) => m.kind === 'bloomed')).toEqual({ kind: 'bloomed', date: bloomed, habitId: read });
    expect(memoriesAfterXp(g).find((m) => m.kind === 'bloomed')).toEqual({ kind: 'bloomed', date: bloomed, habitId: read });
  });

  it('a companion that arrived after the bloom has no "The day Read bloomed"', () => {
    const g0 = new Game({ start: '2026-01-05' });
    const r0 = g0.addHabit({ name: 'Read', icon: 'book', plant: 'pothos' });
    for (let i = 0; i < 120 && g0.state.stageDates?.[r0]?.[BLOOMING] === undefined; i++) {
      g0.goTo(addDays('2026-01-05', i), 12);
      g0.checkIn(r0);
    }
    const bloomDay = g0.state.stageDates![r0]![BLOOMING]!;
    const { g, bloomed } = bloomStory(addDays(bloomDay, 3));
    expect(bloomed).toBe(bloomDay);
    const vm = petVM(g.state, { today: g.today, now: g.now, local: UTC }, CAT)!;
    // Before: a 'bloomed' moment and Memory dated the story's day, weeks after the bloom.
    expect(vm.moments.some((m) => m.kind === 'bloomed')).toBe(false);
    expect(memoriesAfterXp(g).some((m) => m.kind === 'bloomed')).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* The new fields: optional, validated, and kept by a save round trip   */
/* ------------------------------------------------------------------ */

describe('no schema change: the new fields validate and survive a save round trip', () => {
  function everything(): Game {
    const { g, read, walk } = garden();
    addPet(g, CAT);
    g.state = {
      ...g.state,
      pets: { ...g.state.pets, [CAT]: { ...g.state.pets[CAT]!, favoriteTreat: 'treat-fish-crackers' } },
      collection: { ...g.state.collection, 'treat-fish-crackers': { count: 1, firstAt: g.now } },
      pantry: { ...g.state.pantry, 'treat-fish-crackers': { servings: 5, restockedOn: g.today } },
    };
    g.run((tx) => feedPet(tx, CAT, 'treat-fish-crackers'));
    waterDays(g, [read, walk], W, SUN, (d) => {
      if (d === W) pair(g, read, CAT);
      if (d === '2026-03-05') pair(g, walk, CAT);
    });
    g.goTo('2026-03-09', 9);
    g.goTo('2026-04-01', 9);
    return g;
  }

  it('every new field is written, the save validates, and it comes back equal', () => {
    const g = everything();
    expect(g.state.version).toBe(SCHEMA_VERSION);
    expect(g.state.pets[CAT]).toMatchObject({ arrivedOn: '2026-03-02', favoriteKnownOn: '2026-03-02' });
    expect(g.state.profile.createdOn).toBe('2026-02-16');
    expect(g.state.company!.pairs[`${CAT}|${g.state.habits[0]!.id}`]!.stints).toEqual([{ from: '2026-03-02', to: '2026-03-04' }]);
    expect(g.state.company!.pairs[`${CAT}|${g.state.habits[1]!.id}`]!.stints).toEqual([{ from: '2026-03-05' }]);
    const note = weekly(g.state, W)!;
    // Walk shared four days (Thu–Sun), Read three (Mon–Wed): the P.S. is Walk's, with its icon.
    expect(note.ps).toMatchObject({ kind: 'companion', habitId: g.state.habits[1]!.id, days: 4, icon: 'walk' });
    expect(note.highlights!.filter((h) => h.kind === 'stageUp').every((h) => 'plant' in h)).toBe(true);
    expect(valid(g.state)).toEqual([]);
    const loaded = parseEnvelope(encodeEnvelope(g.state, 3, g.now, 'test'));
    expect(loaded.kind).toBe('ok');
    expect((loaded as { state: AppState }).state).toEqual(g.state);
  });

  it('the validator rejects a malformed value in each of them', () => {
    const g = everything();
    const s = g.state;
    const readId = s.habits[0]!.id;
    const key = `${CAT}|${readId}`;
    const pet = (o: Partial<PetState>) => ({ ...s, pets: { ...s.pets, [CAT]: { ...s.pets[CAT]!, ...o } } });
    const stints = (v: unknown) => ({ ...s, company: { ...s.company!, pairs: { ...s.company!.pairs, [key]: { ...s.company!.pairs[key]!, stints: v } } } });
    const note = weekly(s, W)!;
    const letter = (l: Record<string, unknown>) => ({ ...s, inbox: s.inbox.map((x) => (x.id === note.id ? { ...x, ...l } : x)) });
    const bad: [string, unknown][] = [
      ['arrivedOn', pet({ arrivedOn: 'soon' })],
      ['favoriteKnownOn', pet({ favoriteKnownOn: 20260302 as never })],
      ['profile.createdOn', { ...s, profile: { ...s.profile, createdOn: 'once' } }],
      ['stints: not a list', stints({ from: '2026-03-02' })],
      ['stints: bad from', stints([{ from: 'monday' }])],
      ['stints: to before from', stints([{ from: '2026-03-05', to: '2026-03-04' }])],
      ['stints: an open stint before the last', stints([{ from: '2026-03-01' }, { from: '2026-03-05' }])],
      ['stints: overlapping (a span starting on the day the last one ended)', stints([{ from: '2026-03-05', to: '2026-03-06' }, { from: '2026-03-06' }])],
      ['stints: out of order', stints([{ from: '2026-03-05', to: '2026-03-06' }, { from: '2026-03-01', to: '2026-03-02' }])],
      ['ps.icon', letter({ ps: { ...note.ps!, icon: 7 } })],
      ['highlight plant', letter({ highlights: [{ kind: 'stageUp', habitId: readId, stage: 2, date: W, plant: 4 }] })],
    ];
    // A Herbarium margin's plant (the March page, as written, then with a species and with a number).
    const page = s.inbox.find((l) => l.kind === 'monthly' && l.month === '2026-03')!;
    const margin = (m: Record<string, unknown>) => ({ ...s, inbox: s.inbox.map((x) => (x.id === page.id ? { ...x, margin: m } : x)) });
    expect(validateState(margin({ kind: 'planted', habitId: readId, date: W, plant: 'pothos' })).ok).toBe(true);
    expect(validateState(stints([{ from: '2026-03-01', to: '2026-03-02' }, { from: '2026-03-04', to: '2026-03-05' }, { from: '2026-03-07' }])).ok).toBe(true);
    bad.push(['margin plant', margin({ kind: 'planted', habitId: readId, date: W, plant: 4 })]);
    for (const [what, state] of bad) expect(validateState(state).ok, what).toBe(false);
  });
});
