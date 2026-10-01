/**
 * Rituals (DESIGN §13): the Sunday Note's contents, the Herbarium page, birthday cards, came-home
 * days and the moving-in anniversary. Data only; never a percentage; nothing here pays beyond §6.
 */
import { describe, expect, it, vi } from 'vitest';
import type { AppState, Letter } from '@/state/types';
import { validateState } from '@/state/validate';
import * as company from '@/domain/company';
import { newPetState } from '@/domain/friendship';
import { LEVEL_XP } from '@/domain/levels';
import * as logging from '@/domain/logging';
import * as profile from '@/domain/profile';
import { anniversaryOf, birthdayCards, cameHomeToday, herbariumFacts, pressingSize, sundayNoteFacts } from '@/domain/rituals';
import { Game, UTC, at } from './game';

vi.setConfig({ testTimeout: 30_000 });

const weekly = (s: AppState, weekStart: string) => s.inbox.find((l) => l.id === `weekly-${weekStart}`) as Extract<Letter, { kind: 'weekly' }>;
const valid = (s: AppState) => {
  const v = validateState(s);
  return v.ok ? [] : v.errors;
};

describe('the Sunday Note', () => {
  it('waterings, up to two highlights (a stage-up with its companion first), and the companion’s routine as the P.S.', () => {
    const g = new Game({ start: '2026-03-02' }); // Monday
    const read = g.addHabit({ name: 'Read', icon: 'book', timeOfDay: 'evening' });
    const walk = g.addHabit({ name: 'Walk' });
    const cat = 'pet-cat-tortie';
    g.state = { ...g.state, pets: { [cat]: newPetState(cat, g.rng, g.now, g.today, true) } };
    g.run((tx) => company.setCompanion(tx, read, cat));
    for (let d = 0; d < 14; d++) {
      g.checkIn(read);
      if (d % 2 === 0) g.checkIn(walk);
      g.advance(1);
    }
    const note = weekly(g.state, '2026-03-09');
    expect(note.waterings).toBe(7 + 3);
    // Read reached Leafy on Mar 11 (10 sunshine), and was watered every day.
    expect(note.highlights).toEqual([
      { kind: 'stageUp', habitId: read, stage: 3, date: '2026-03-11', petId: cat, plant: 'pothos' },
      { kind: 'everyDay', habitId: read },
    ]);
    // The first week's note: the cat came home and moved into Read.
    expect(weekly(g.state, '2026-03-02').highlights?.[1]).toEqual({ kind: 'newcomer', petId: cat, date: '2026-03-02', habitId: read, plant: 'pothos' });
    expect(note.ps).toEqual({ kind: 'companion', petId: cat, habitId: read, days: 7, timeOfDay: 'evening', icon: 'book' });
    expect(valid(g.state)).toEqual([]);
  });

  it('a newcomer comes before the habits; without a companion the P.S. is a found thing', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit();
    g.advance(3);
    const cat = 'pet-cat-tortie';
    g.state = { ...g.state, pets: { [cat]: { ...newPetState(cat, g.rng, g.now, g.today, true), xp: LEVEL_XP[5]! } } };
    g.checkIn(a); // Thursday: its first watering → Rooting; the L6 cat leaves a found thing
    g.goTo('2026-03-09');
    const note = weekly(g.state, '2026-03-02');
    expect(note.highlights).toEqual([
      { kind: 'stageUp', habitId: a, stage: 1, date: '2026-03-05', plant: 'pothos' },
      { kind: 'newcomer', petId: cat, date: '2026-03-05' },
    ]);
    expect(note.ps).toMatchObject({ kind: 'found', petId: cat, date: '2026-03-05' });
  });

  it('tiny days (≥ 2) and a stack kept together (≥ 3) are highlights too; nothing is a percentage', () => {
    const g = new Game({ start: '2026-02-23' });
    const walk = g.addHabit({ name: 'Walk' });
    const str = g.addHabit({ name: 'Stretch', tiny: { label: 'one' }, anchorHabitId: walk });
    g.goTo('2026-03-02');
    for (let d = 0; d < 7; d++) {
      g.now = at(g.today, 8);
      if (d < 4) g.checkIn(walk);
      g.now = at(g.today, 9);
      if (d < 3) g.tiny(str);
      g.advance(1);
    }
    const facts = sundayNoteFacts(g.state, '2026-03-02', g.today, UTC);
    expect(facts.highlights.map((h) => h.kind)).toEqual(['stageUp', 'topHabit']);
    // Without the stage-ups, the next ones show.
    const noStages = { ...g.state, stageDates: {} };
    expect(sundayNoteFacts(noStages, '2026-03-02', g.today, UTC).highlights).toEqual([
      { kind: 'topHabit', habitId: walk, days: 4 },
      { kind: 'tiny', habitId: str, days: 3 },
    ]);
    const noTop = sundayNoteFacts({ ...noStages, logs: { ...noStages.logs, [walk]: {} } }, '2026-03-02', g.today, UTC);
    expect(noTop.highlights[0]).toEqual({ kind: 'topHabit', habitId: str, days: 3 });
    expect(JSON.stringify(facts)).not.toMatch(/pct|percent|expected/);
  });

  it('quotes only a starred note, and never when "Quote my notes" is off', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit();
    g.checkIn(a);
    g.run((tx) => logging.setNote(tx, a, g.today, 'Kept for me'));
    expect(g.run((tx) => ({ ok: logging.starNote(tx, a, '2026-03-03', true) })).ok).toBe(false); // no note that day
    g.run((tx) => logging.starNote(tx, a, g.today, true));
    expect(g.state.logs[a]![g.today]).toMatchObject({ note: 'Kept for me', starred: true });
    g.run((tx) => profile.updateSettings(tx, { quoteNotes: false }));
    g.goTo('2026-03-09');
    expect(weekly(g.state, '2026-03-02').quote).toBeUndefined();
    // Clearing a note clears its star.
    g.run((tx) => logging.setNote(tx, a, '2026-03-02', ''));
    expect(g.state.logs[a]?.['2026-03-02']?.starred).toBeUndefined();
    expect(valid(g.state)).toEqual([]);
  });
});

describe('the Herbarium page', () => {
  it('presses every habit watered or rested, sized by waterings; one margin note; the first page is marked', () => {
    const g = new Game({ start: '2026-03-01' });
    const a = g.addHabit({ name: 'Walk' });
    const b = g.addHabit({ name: 'Yoga', plant: 'pilea' });
    const c = g.addHabit({ name: 'Rest only' });
    for (let d = 0; d < 31; d++) {
      g.checkIn(a);
      if (d === 3) g.checkIn(b);
      if (d === 5) g.rest(b, g.today);
      if (d === 6) g.rest(c, g.today);
      g.advance(1);
    }
    const page = g.state.inbox.find((l) => l.id === 'bouquet-2026-03') as Extract<Letter, { kind: 'monthly' }>;
    expect(page.pressings).toEqual([
      { habitId: a, plant: 'pothos', waterings: 31, rests: 0, size: 7 },
      { habitId: b, plant: 'pilea', waterings: 1, rests: 1, size: 1 },
      { habitId: c, plant: 'pothos', waterings: 0, rests: 1, size: 0 },
    ]);
    expect(page.margin).toEqual({ kind: 'planted', habitId: a, plant: 'pothos', date: '2026-03-01' });
    expect(page.firstPage).toBe(true);
    expect(pressingSize(0)).toBe(0);
    expect(pressingSize(1)).toBe(1);
    expect(pressingSize(10)).toBe(3);
    expect(pressingSize(40)).toBe(7);
  });

  it('prefers a bloom, then a pet coming home, then a new plant', () => {
    const g = new Game({ start: '2026-01-05' });
    const a = g.addHabit();
    for (let d = 0; d < 60; d++) {
      g.checkIn(a);
      g.advance(1);
    }
    const bloomed = g.state.stageDates![a]![5]!;
    expect(bloomed.slice(0, 7)).toBe('2026-02');
    const cat = 'pet-cat-tortie';
    const s = { ...g.state, pets: { [cat]: { ...newPetState(cat, g.rng, at('2026-02-03'), '2026-02-03', true) } } };
    expect(herbariumFacts(s, '2026-02', g.today, UTC).margin).toEqual({ kind: 'bloomed', habitId: a, date: bloomed, plant: 'pothos' });
    expect(herbariumFacts({ ...s, stageDates: {} }, '2026-02', g.today, UTC).margin).toEqual({ kind: 'cameHome', petId: cat, date: '2026-02-03' });
    expect(herbariumFacts({ ...s, stageDates: {} }, '2026-02', g.today, UTC).firstPage).toBe(false);
  });
});

describe('birthday, came-home days and the moving-in anniversary', () => {
  it('came-home days come round each year (a Feb 29 arrival on Feb 28); pets out leave birthday cards', () => {
    expect(anniversaryOf('2024-02-29', '2025-02-28')).toBe(1);
    expect(anniversaryOf('2024-02-29', '2028-02-29')).toBe(4);
    expect(anniversaryOf('2024-02-29', '2028-02-28')).toBeNull();
    expect(anniversaryOf('2026-09-29', '2026-09-29')).toBeNull();
    const g = new Game({ start: '2027-09-29' });
    const cat = 'pet-cat-tortie';
    const cow = 'pet-cow-jersey';
    g.state = {
      ...g.state,
      pets: {
        [cat]: newPetState(cat, g.rng, at('2025-09-29', 9), '2025-09-29', true),
        [cow]: { ...newPetState(cow, g.rng, at('2026-03-01', 9), '2026-03-01', false) },
      },
    };
    expect(cameHomeToday(g.state, '2027-09-29', UTC)).toEqual([{ petId: cat, years: 2 }]);
    // §13: each pet leaves a card, indoors too (by who came home first).
    expect(birthdayCards(g.state)).toEqual([cat, cow]);
  });

  it('the anniversary note: once a year, on the first open within a week of it, paying nothing', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit({ name: 'Walk' });
    g.checkIn(a);
    g.goTo('2027-03-04');
    const note = g.state.inbox.find((l) => l.kind === 'anniversary');
    expect(note).toEqual({ kind: 'anniversary', id: 'anniversary-2027-03-02', date: '2027-03-02', years: 1, firstHabitId: a, waterings: 1, stars: 0 });
    expect(g.allOf('letter').map((e) => e.letterId)).toContain('anniversary-2027-03-02');
    expect(g.allOf('stars').filter((e) => e.reason === 'letter' && e.amount === 0)).toEqual([]);
    g.advance(1);
    expect(g.state.inbox.filter((l) => l.kind === 'anniversary')).toHaveLength(1);
    // Too late (more than a week after): no note that year.
    g.goTo('2028-03-10');
    expect(g.state.inbox.filter((l) => l.kind === 'anniversary')).toHaveLength(1);
    expect(valid(g.state)).toEqual([]);
  });
});
