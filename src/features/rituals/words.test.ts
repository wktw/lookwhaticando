import { describe, expect, it } from 'vitest';
import type { PlantSpeciesId } from '@/catalog/types';
import { anniversaryWords, herbariumWords, psTimes, seasonWords, sundayNoteText, sundayNoteWords, type RitualLookup } from './words';

const habits: Record<string, { name: string; plant: PlantSpeciesId; icon: string }> = {
  read: { name: 'Read', plant: 'begonia', icon: 'book' },
  walk: { name: 'Walk', plant: 'catgrass', icon: 'walk' },
  tidy: { name: 'Tidy for 10 minutes', plant: 'snakeplant', icon: 'sparkle-clean' },
};
const look: RitualLookup = {
  habit: (id) => habits[id] ?? null,
  pet: (id) => (id === 'juniper' ? { name: 'Juniper' } : id === 'pudding' ? { name: 'Pudding' } : null),
  weekStart: 1,
};

describe('the Sunday Note (VOICE §12)', () => {
  const note = {
    weekStart: '2025-09-22',
    waterings: 19,
    highlights: [{ kind: 'stageUp' as const, habitId: 'read', stage: 4, date: '2025-09-25', petId: 'juniper' }],
    quote: null,
    ps: { kind: 'companion' as const, petId: 'juniper', habitId: 'read', days: 4, timeOfDay: 'evening' as const },
    stamps: 3,
  };

  it('reads like the deck’s example, in order', () => {
    expect(sundayNoteText(sundayNoteWords(note, look))).toBe(
      'Week of Sep 22. Nineteen waterings. The Read plant showed a first bud on Thursday, and Juniper has napped in it every afternoon since. P.S. Juniper slept on the book four evenings. Three stamps, enclosed.',
    );
  });

  it('skips the count below 5 waterings, and never prints a percentage or a 0', () => {
    const w = sundayNoteWords({ ...note, waterings: 2, highlights: [], ps: null, stamps: 0 }, look);
    expect(w.body).toEqual([]);
    expect(w.stamps).toBeNull();
    expect(sundayNoteText(w)).toBe('Week of Sep 22.');
  });

  it('a stage-up on Saturday says “kept it company”, and a cutting (stage 0) never “naps in it”', () => {
    const sat = sundayNoteWords({ ...note, highlights: [{ ...note.highlights[0]!, date: '2025-09-27' }] }, look);
    expect(sat.body[1]).toMatch(/Juniper has kept it company since\.$/);
    const cutting = sundayNoteWords({ ...note, highlights: [{ ...note.highlights[0]!, stage: 1 }] }, look);
    expect(cutting.body[1]).toMatch(/put down roots on Thursday, and Juniper has kept it company since\./);
  });

  it('quotes a starred note unless “Quote my notes” is off', () => {
    const quoted = { ...note, quote: { habitId: 'walk', date: '2025-09-23', text: 'slow start, good walk' } };
    expect(sundayNoteWords(quoted, look).quote).toBe('On Tuesday you wrote: ‘slow start, good walk’.');
    expect(sundayNoteWords(quoted, { ...look, quoteNotes: false }).quote).toBeNull();
  });

  it('says one stamp in words, and a found thing in the P.S.', () => {
    const w = sundayNoteWords({ ...note, stamps: 1, ps: { kind: 'found', petId: 'pudding', date: '2025-09-24', seed: 0 } }, look);
    expect(w.stamps).toBe('One stamp, enclosed.');
    expect(w.ps).toBe('P.S. On Wednesday, Pudding left a button on the sill.');
  });

  it('leaves out a line about a habit or pet that is gone', () => {
    const w = sundayNoteWords({ ...note, highlights: [{ kind: 'everyDay', habitId: 'gone' }], ps: { ...note.ps, petId: 'gone' } }, look);
    expect(w.body).toEqual(['Nineteen waterings.']);
    expect(w.ps).toBeNull();
  });

  it('counts a P.S. in words', () => {
    expect(psTimes(5, 'morning')).toBe('five mornings');
    expect(psTimes(1, 'evening')).toBe('one evening');
    expect(psTimes(7, 'anytime')).toBe('every day');
  });
});

describe('the Herbarium page (VOICE §12)', () => {
  const page = {
    month: '2025-09',
    pressings: [
      { habitId: 'walk', plant: 'catgrass' as const, waterings: 24, rests: 0, size: 6 },
      { habitId: 'read', plant: 'begonia' as const, waterings: 7, rests: 2, size: 2 },
      { habitId: 'tidy', plant: 'snakeplant' as const, waterings: 0, rests: 1, size: 0 },
    ],
    margin: { kind: 'bloomed' as const, habitId: 'read', date: '2025-09-12' },
    firstPage: true,
    stamps: 2,
  };
  const w = herbariumWords(page, look);

  it('titles the month and labels each pressing in small type', () => {
    expect(w.title).toBe('September, pressed.');
    expect(w.pressings.map((p) => p.label)).toEqual(['Walk · 24', 'Read · 7 · 2 rests', 'Tidy for 10 minutes · 1 rest']);
  });

  it('never says a 0 or a percentage, and sizes pressings by waterings', () => {
    for (const p of w.pressings) expect(p.label).not.toMatch(/\b0\b|%/);
    expect(w.pressings[0]!.share).toBeGreaterThan(w.pressings[1]!.share);
    expect(w.pressings[2]!.share).toBeGreaterThan(0);
  });

  it('has the rest footnote, one margin note, the first page and the stamps', () => {
    expect(w.restNote).toBe('Rest days are pressed as the small flowers.');
    expect(w.margin).toEqual(['The Read plant reached Blooming this month.', 'The first page.']);
    expect(w.stamps).toBe('Two stamps, enclosed.');
  });

  it('a long habit name reads as the plant’s own name in the margin', () => {
    const m = herbariumWords({ ...page, margin: { kind: 'planted', habitId: 'tidy', date: '2025-09-02' }, firstPage: false }, look);
    expect(m.margin).toEqual(['The snake plant was planted this month.']);
  });
});

describe('the anniversary note and a filed season', () => {
  it('a first year names the first cutting; later years count in words', () => {
    expect(anniversaryWords({ years: 1, firstHabitId: 'walk', waterings: 300 }, look)).toBe('A year on this sill. The first cutting was Walk.');
    expect(anniversaryWords({ years: 2, firstHabitId: null, waterings: 12 }, look)).toBe('Two years on this sill. Twelve waterings since the first one.');
    expect(anniversaryWords({ years: 1, firstHabitId: 'gone', waterings: 3 }, look)).toBe('A year on this sill.');
  });

  it('a season lists each plant in counts only', () => {
    const w = seasonWords({ name: 'summer', plants: [{ habitId: 'walk', plant: 'catgrass', fromStage: 0, toStage: 5, waterings: 71 }, { habitId: 'read', plant: 'begonia', fromStage: 3, toStage: 3, waterings: 1 }] }, look);
    expect(w.title).toBe('Summer, on the sill.');
    expect(w.plants.map((p) => p.line)).toEqual(['Walk · Cutting to Blooming · 71 waterings', 'Read · Leafy · 1 watering']);
  });
});
