/**
 * Keeping Company (DESIGN §14.1): pairing, the offer, companion XP, companion sunshine, the three
 * stories, keepsakes and routines.
 */
import { describe, expect, it, vi } from 'vitest';
import type { AppState } from '@/state/types';
import { validateState } from '@/state/validate';
import { HABIT_ICONS } from '@/catalog/habitIcons';
import * as company from '@/domain/company';
import { addDays } from '@/domain/dates';
import { newPetState, petPet } from '@/domain/friendship';
import { BLOOMING, BUDDING, EVERGREEN, ROOTING } from '@/domain/growth';
import * as habits from '@/domain/habits';
import * as logging from '@/domain/logging';
import { FAMILY_BY_ROUTINE, KEEPSAKE_FAMILIES, ROUTINES, keepsakeKind, routineOf, routinePhase } from '@/domain/routines';
import * as shelf from '@/domain/shelf';
import { Game } from './game';

vi.setConfig({ testTimeout: 30_000 });

/** Adds a pet to the save (test setup: as if it came from a capsule). */
function addPet(g: Game, id: string): string {
  g.state = { ...g.state, pets: { ...g.state.pets, [id]: newPetState(id, g.rng, g.now, g.today, true) } };
  return id;
}

const pair = (g: Game, habitId: string, petId: string) => g.run((tx) => company.setCompanion(tx, habitId, petId));
const pairOf = (s: AppState, petId: string, habitId: string) => company.pairOf(s, petId, habitId)!;
const valid = (s: AppState) => {
  const v = validateState(s);
  return v.ok ? [] : v.errors;
};

describe('pairing (§14.1: one habit per pet, one pet per habit)', () => {
  it('pairs, moves a pet between habits, replaces a companion, and frees on archive and delete', () => {
    const g = new Game();
    const a = g.addHabit({ name: 'Walk' });
    const b = g.addHabit({ name: 'Read', icon: 'book' });
    const cat = addPet(g, 'pet-cat-tortie');
    const cow = addPet(g, 'pet-cow-jersey');
    expect(pair(g, a, cat)).toBe(true);
    expect(g.lastOf('companion')).toEqual([{ type: 'companion', petId: cat, habitId: a }]);
    expect(pairOf(g.state, cat, a)).toMatchObject({ since: g.today, sunshine: 0, waterings: 0 });
    // Moving the cat to Read frees Walk.
    pair(g, b, cat);
    expect(g.state.habits.find((h) => h.id === a)!.companionId).toBeUndefined();
    expect(g.state.habits.find((h) => h.id === b)!.companionId).toBe(cat);
    // A cow replaces the cat on Read; the cat keeps its record.
    pair(g, b, cow);
    expect(company.habitOfPet(g.state, cat)).toBeNull();
    expect(company.pairOf(g.state, cat, b)).not.toBeNull();
    expect(valid(g.state)).toEqual([]);
    // Freeing, refusing unknown pets and archived habits.
    expect(g.run((tx) => company.setCompanion(tx, b, null))).toBe(true);
    expect(g.run((tx) => company.setCompanion(tx, b, 'pet-nobody'))).toBe(false);
    pair(g, a, cat);
    g.run((tx) => habits.archiveHabit(tx, a));
    expect(g.state.habits.find((h) => h.id === a)!.companionId).toBeUndefined();
    expect(g.run((tx) => company.setCompanion(tx, a, cat))).toBe(false);
    // Deleting a habit forgets its pairings (keepsakes would stay).
    pair(g, b, cat);
    g.run((tx) => habits.deleteHabit(tx, b));
    expect(Object.values(g.state.company!.pairs).some((p) => p.habitId === b)).toBe(false);
    expect(valid(g.state)).toEqual([]);
  });

  it('"Let them choose": the species decides (a cat picks the book), then the most watered plant', () => {
    const g = new Game();
    const walk = g.addHabit({ name: 'Walk', icon: 'walk' });
    const read = g.addHabit({ name: 'Read', icon: 'book' });
    const water = g.addHabit({ name: 'Water', icon: 'water' });
    const cat = addPet(g, 'pet-cat-tortie');
    const frog = addPet(g, 'pet-frog-peeper');
    expect(company.suggestHabitFor(g.state, cat)).toBe(read);
    expect(company.suggestHabitFor(g.state, frog)).toBe(water);
    expect(company.suggestHabitFor(g.state, 'moonlit:pet-cat-tortie')).toBe(read);
    pair(g, read, cat);
    const cow = addPet(g, 'pet-cow-jersey');
    expect(company.suggestHabitFor(g.state, cow)).toBe(walk);
  });
});

describe('the offer: at most once a day, never again after 3 declines', () => {
  it('opens with a free pet and a free habit, once per app day, and closes for good after 3 declines', () => {
    const g = new Game();
    const a = g.addHabit();
    expect(company.companionOfferOpen(g.state, g.today)).toBe(false); // no pet yet
    addPet(g, 'pet-cat-tortie');
    expect(company.companionOfferOpen(g.state, g.today)).toBe(true);
    g.run((tx) => company.noteCompanionOffer(tx));
    expect(company.companionOfferOpen(g.state, g.today)).toBe(false);
    for (let i = 0; i < 3; i++) {
      g.advance(1);
      expect(company.companionOfferOpen(g.state, g.today)).toBe(true);
      g.run((tx) => company.declineCompanionOffer(tx));
      expect(company.companionOfferOpen(g.state, g.today)).toBe(false);
    }
    g.advance(5);
    expect(company.companionOfferOpen(g.state, g.today)).toBe(false);
    // Pairing by hand still works after the declines.
    expect(pair(g, a, 'pet-cat-tortie')).toBe(true);
  });

  it('pairing counts as the day’s offer, and nothing is offered when every pet or habit is paired', () => {
    const g = new Game();
    const a = g.addHabit();
    addPet(g, 'pet-cat-tortie');
    pair(g, a, 'pet-cat-tortie');
    g.advance(1);
    expect(company.companionOfferOpen(g.state, g.today)).toBe(false); // the only pet is paired
    addPet(g, 'pet-cow-jersey');
    expect(company.companionOfferOpen(g.state, g.today)).toBe(false); // the only habit has a companion
  });
});

describe('friendship grows through the habit: min(30, round(5 × 7/expectedPerWeek)) per completing check-in', () => {
  it.each([
    [{ kind: 'daily' } as const, 5],
    [{ kind: 'days', days: [1, 3, 5] } as const, 12],
    [{ kind: 'weekly', times: 2, every: 1 } as const, 18],
    [{ kind: 'weekly', times: 1, every: 1 } as const, 30],
    [{ kind: 'monthly', times: 1, every: 1 } as const, 30],
  ])('%o → %i XP', (schedule, xp) => {
    expect(company.companionXpFor({ schedule: schedule as never })).toBe(xp);
  });

  it('pays once per occurrence (un-check and re-check pay nothing more), the tiny version too, never history', () => {
    const g = new Game({ start: '2026-03-02' }); // Monday
    const a = g.addHabit({ tiny: { label: 'Shoes on' } });
    const cat = addPet(g, 'pet-cat-tortie');
    pair(g, a, cat);
    g.checkIn(a);
    expect(g.lastOf('companionXp')).toEqual([{ type: 'companionXp', petId: cat, habitId: a, date: '2026-03-02', xp: 5 }]);
    expect(g.state.pets[cat]!.xp).toBe(5);
    g.undo(a);
    g.checkIn(a);
    expect(g.state.pets[cat]!.xp).toBe(5); // XP never decays, and never pays twice
    g.advance(1);
    g.tiny(a);
    expect(g.state.pets[cat]!.xp).toBe(10);
    g.advance(20);
    g.run((tx) => logging.editHistory(tx, a, '2026-03-10', true)); // history: no XP
    expect(g.state.pets[cat]!.xp).toBe(10);
  });

  it('at most 30 XP a day from habits (a week of backfill in one sitting)', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit();
    const cat = addPet(g, 'pet-cat-tortie');
    g.advance(7);
    pair(g, a, cat);
    for (let d = 6; d >= 0; d--) g.checkIn(a, addDays(g.today, -d));
    expect(g.allOf('companionXp').reduce((n, e) => n + e.xp, 0)).toBe(30);
    expect(g.state.pets[cat]!.xp).toBe(30);
    expect(g.state.pets[cat]!.daily.company).toBe(30);
    g.advance(1);
    g.checkIn(a);
    expect(g.state.pets[cat]!.xp).toBe(35);
  });

  it('no XP without a companion, and none for a check-in beyond a flexible goal', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit({ schedule: { kind: 'weekly', times: 1, every: 1 } });
    const cat = addPet(g, 'pet-cat-tortie');
    g.checkIn(a);
    expect(g.allOf('companionXp')).toEqual([]);
    pair(g, a, cat);
    g.advance(1);
    g.checkIn(a); // beyond times: 1 coin, no sunshine, no XP
    expect(g.allOf('companionXp')).toEqual([]);
  });
});

describe('companion sunshine: the sunshine grown while paired, per pet × habit', () => {
  it('counts only while paired, follows an un-check, and splits a tiny day upgraded after pairing', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit({ tiny: { label: 'tiny' } });
    const cat = addPet(g, 'pet-cat-tortie');
    for (let i = 0; i < 3; i++) {
      g.checkIn(a);
      g.advance(1);
    }
    g.tiny(a); // 0.5 before pairing
    pair(g, a, cat);
    g.checkIn(a); // tiny → full: +0.5 while paired
    expect(pairOf(g.state, cat, a)).toMatchObject({ sunshine: 0.5, waterings: 0 });
    g.advance(1);
    g.checkIn(a);
    expect(pairOf(g.state, cat, a)).toMatchObject({ sunshine: 1.5, waterings: 1 });
    g.undo(a);
    expect(pairOf(g.state, cat, a)).toMatchObject({ sunshine: 0.5, waterings: 0 });
    g.checkIn(a);
    expect(g.state.ledger.sunshine[a]).toBe(5);
    expect(pairOf(g.state, cat, a)).toMatchObject({ sunshine: 1.5, waterings: 1 });
    expect(valid(g.state)).toEqual([]);
  });

  it('a day checked in with one companion is taken back from that companion, even after a move', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit();
    const cat = addPet(g, 'pet-cat-tortie');
    const cow = addPet(g, 'pet-cow-jersey');
    pair(g, a, cat);
    g.checkIn(a);
    pair(g, a, cow);
    expect(pairOf(g.state, cat, a).sunshine).toBe(1);
    g.undo(a);
    expect(pairOf(g.state, cat, a)).toMatchObject({ sunshine: 0, waterings: 0 });
    g.checkIn(a);
    expect(pairOf(g.state, cow, a)).toMatchObject({ sunshine: 1, waterings: 1 });
    expect(pairOf(g.state, cat, a).sunshine).toBe(0);
  });

  it('a rule edit re-prices the companion’s share with the day’s sunshine', () => {
    const g = new Game({ start: '2026-03-02' }); // Monday
    const a = g.addHabit({ schedule: { kind: 'weekly', times: 7, every: 1 } });
    const cat = addPet(g, 'pet-cat-tortie');
    pair(g, a, cat);
    g.checkIn(a);
    expect(pairOf(g.state, cat, a).sunshine).toBe(1);
    g.run((tx) => habits.updateHabit(tx, a, { schedule: { kind: 'weekly', times: 3, every: 1 } }, 'today'));
    expect(g.state.ledger.sunshine[a]).toBeCloseTo(7 / 3, 6);
    expect(pairOf(g.state, cat, a).sunshine).toBeCloseTo(7 / 3, 6);
  });
});

describe('the three stories unlock by companion sunshine only (7 · 21 · 42 at Blooming), one per check-in', () => {
  it('a weekly habit: The start at the first check-in together, Why it matters at the third, Look at us at Blooming', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit({ schedule: { kind: 'weekly', times: 1, every: 1 } });
    const cat = addPet(g, 'pet-cat-tortie');
    pair(g, a, cat);
    // Petting never unlocks a story.
    for (let i = 0; i < 20; i++) g.run((tx) => petPet(tx, cat));
    expect(pairOf(g.state, cat, a).stories).toBeUndefined();
    const unlockedAt: Record<string, number> = {};
    for (let week = 1; week <= 8; week++) {
      g.checkIn(a);
      for (const e of g.lastOf('story')) unlockedAt[e.story] = week;
      g.advance(7);
    }
    expect(unlockedAt).toEqual({ start: 1, why: 3, lookAtUs: 6 });
    expect(g.state.ledger.bestStage[a]).toBeGreaterThanOrEqual(BLOOMING);
  });

  it('a monthly habit that jumps past two thresholds still gets one story per check-in', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit({ schedule: { kind: 'monthly', times: 1, every: 1 } });
    const cat = addPet(g, 'pet-cat-tortie');
    pair(g, a, cat);
    g.checkIn(a); // ~30 companion sunshine: over both 7 and 21
    expect(Object.keys(pairOf(g.state, cat, a).stories ?? {})).toEqual(['start']);
    g.goTo('2026-04-06');
    g.checkIn(a);
    expect(Object.keys(pairOf(g.state, cat, a).stories ?? {})).toEqual(['start', 'why']);
  });

  it('stories stay after an un-check; reading them and "Why it matters" (asked once) are recorded', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit({ schedule: { kind: 'weekly', times: 1, every: 1 } });
    const cat = addPet(g, 'pet-cat-tortie');
    pair(g, a, cat);
    g.checkIn(a);
    g.undo(a);
    expect(pairOf(g.state, cat, a).stories?.start).toEqual({ on: '2026-03-02' });
    expect(g.run((tx) => company.readStory(tx, a, 'start'))).toBe(true);
    expect(pairOf(g.state, cat, a).stories?.start?.readAt).toBe(g.now);
    expect(g.run((tx) => company.answerWhy(tx, a, 'For my back.'))).toBe(false); // not unlocked yet
    for (let w = 0; w < 3; w++) {
      g.advance(7);
      g.checkIn(a);
    }
    expect(pairOf(g.state, cat, a).stories?.why).toBeDefined();
    expect(g.run((tx) => company.answerWhy(tx, a, `  ${'x'.repeat(200)}  `))).toBe(true);
    expect(g.state.habits.find((h) => h.id === a)!.why).toHaveLength(company.MAX_WHY);
    expect(pairOf(g.state, cat, a).whyAsked).toBe(true);
    expect(valid(g.state)).toEqual([]);
  });
});

describe('keepsakes at Rooting, Budding, Blooming and Evergreen (once per plant per stage)', () => {
  it('a companion from day one leaves four dated keepsakes, the last a brass seed, captioned from the latest Moment', () => {
    const g = new Game({ start: '2026-01-05' });
    const a = g.addHabit({ icon: 'walk' });
    const cat = addPet(g, 'pet-cat-tortie');
    pair(g, a, cat);
    g.run((tx) => logging.setNote(tx, a, g.today, 'First day'));
    for (let i = 0; i < 185; i++) {
      g.checkIn(a);
      g.advance(1);
    }
    const ks = g.state.keepsakes!;
    expect(ks.map((k) => [k.stage, k.kind])).toEqual([
      [ROOTING, 'move'],
      [BUDDING, 'move'],
      [BLOOMING, 'move'],
      [EVERGREEN, 'brass-seed'],
    ]);
    expect(ks[0]).toMatchObject({ id: `k-${a}-1`, habitId: a, petId: cat, date: '2026-01-05', note: { date: '2026-01-05', text: 'First day' } });
    expect(g.allOf('keepsake')).toHaveLength(4);
    expect(valid(g.state)).toEqual([]);
  });

  it('none without a companion, and pairing later brings none for stages already reached', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit();
    g.checkIn(a); // Rooting, alone
    const cat = addPet(g, 'pet-cat-tortie');
    pair(g, a, cat);
    g.advance(1);
    g.checkIn(a);
    expect(g.state.keepsakes ?? []).toEqual([]);
  });

  it('a keepsake places on the Shelf once, takes a caption, and is never spent', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit();
    const cat = addPet(g, 'pet-cat-tortie');
    pair(g, a, cat);
    g.checkIn(a);
    const item = `keepsake:k-${a}-1`;
    const id = g.run((tx) => ({ id: shelf.placeDecor(tx, item, 'sill', 0.4, 0.8) })).id;
    expect(id).not.toBeNull();
    expect(g.run((tx) => ({ id: shelf.placeDecor(tx, item, 'sill', 0.5, 0.8) })).id).toBeNull();
    expect(g.run((tx) => ({ id: shelf.placeDecor(tx, 'keepsake:k-nope-1', 'sill', 0.5, 0.8) })).id).toBeNull();
    g.run((tx) => company.setKeepsakeNote(tx, `k-${a}-1`, 'Our first root'));
    expect(g.state.keepsakes![0]!.note).toEqual({ date: '2026-03-02', text: 'Our first root' });
    g.run((tx) => company.setKeepsakeNote(tx, `k-${a}-1`, ''));
    expect(g.state.keepsakes![0]!.note).toBeUndefined();
    g.run((tx) => shelf.removeDecor(tx, id!));
    expect(shelf.unplacedCopies(g.state, item)).toBe(1);
    expect(valid(g.state)).toEqual([]);
  });
});

describe('routines: 14 archetypes from the habit icon; a missed day looks like any ordinary day', () => {
  it('maps every drawn habit icon, and 14 routines onto the 12 keepsake families', () => {
    expect(ROUTINES).toHaveLength(14);
    for (const icon of HABIT_ICONS) expect(ROUTINES, icon.id).toContain(routineOf(icon.id));
    expect(new Set(Object.values(FAMILY_BY_ROUTINE))).toEqual(new Set(KEEPSAKE_FAMILIES));
    expect(KEEPSAKE_FAMILIES).toHaveLength(12);
    expect(routineOf('not-an-icon')).toBe('garden');
    expect(keepsakeKind('book', EVERGREEN)).toBe('brass-seed');
    expect(keepsakeKind('laptop', BUDDING)).toBe('read');
  });

  it('shows from Potted on days it was done, every day from Blooming, and never as "missed"', () => {
    expect(routinePhase(1, true)).toBeNull();
    expect(routinePhase(2, true)).toBe('starting');
    expect(routinePhase(4, false)).toBeNull();
    expect(routinePhase(5, false)).toBe('settled');
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit({ icon: 'book' });
    const cat = addPet(g, 'pet-cat-tortie');
    pair(g, a, cat);
    for (let i = 0; i < 4; i++) {
      g.checkIn(a);
      g.advance(1);
    }
    const habit = g.state.habits.find((h) => h.id === a)!;
    const stage = g.state.ledger.bestStage[a]!;
    expect(company.routineOn(g.state, habit, g.today, stage, g.today)).toBeNull(); // not done yet today
    g.checkIn(a);
    expect(company.routineOn(g.state, habit, g.today, stage, g.today)).toEqual({ petId: cat, routine: 'read', phase: 'starting' });
  });
});
