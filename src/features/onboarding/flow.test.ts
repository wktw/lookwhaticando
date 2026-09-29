import { describe, expect, it } from 'vitest';
import { HABIT_ICON_IDS } from '@/catalog/habitIcons';
import { MAX_PICKS, MORE_TEMPLATES, STARTER_TEMPLATES, addCustom, customHabit, isFull, nextPhase, pickCount, removeCustom, stepIndex, togglePick, unitFor, type Picks } from './flow';
import { parseProgress } from './progress';

const none: Picks = { templateIds: [], custom: [] };

describe('the picks (DESIGN §9.6 step 2)', () => {
  it('offers the eight starters in VOICE order, and every other template as "More ideas"', () => {
    expect(STARTER_TEMPLATES.map((t) => t.name)).toEqual(['Drink water', 'Walk', 'Read', 'Stretch', 'Journal', 'Tidy for 10 minutes', 'Take vitamins', 'Skincare']);
    expect(MORE_TEMPLATES.length).toBeGreaterThan(10);
    expect(MORE_TEMPLATES.some((t) => STARTER_TEMPLATES.includes(t))).toBe(false);
  });
  it('holds at most 3 across chips and "Make my own"', () => {
    let p = togglePick(none, 'water');
    p = togglePick(p, 'walk');
    p = addCustom(p, 'Practise piano');
    expect(pickCount(p)).toBe(MAX_PICKS);
    expect(isFull(p)).toBe(true);
    expect(togglePick(p, 'read')).toBe(p);
    expect(addCustom(p, 'Another')).toBe(p);
    // Taking one off makes room again.
    p = togglePick(p, 'walk');
    expect(p.templateIds).toEqual(['water']);
    p = removeCustom(p, 'Practise piano');
    expect(pickCount(p)).toBe(1);
  });
  it('ignores a blank or repeated "Make my own"', () => {
    const p = addCustom(none, 'Piano');
    expect(addCustom(p, '  ')).toBe(p);
    expect(addCustom(p, 'piano')).toBe(p);
  });
  it('makes a gentle habit from just a name, with an icon guessed from it', () => {
    const h = customHabit('  Call mum  ', 0);
    expect(h.name).toBe('Call mum');
    expect(h.schedule).toEqual({ kind: 'daily' });
    expect(h.timeOfDay).toBe('anytime');
    expect(HABIT_ICON_IDS.has(h.icon)).toBe(true);
    // Nothing to go on: the watering can suits anything.
    expect(customHabit('Xyzzy', 1).icon).toBe('watering-can');
  });
});

describe('the steps', () => {
  it('goes gate → sill → pick → today → first → Today, skipping step 3 with nothing planted', () => {
    expect(nextPhase('gate')).toBe('sill');
    expect(nextPhase('sill')).toBe('pick');
    expect(nextPhase('pick', 2)).toBe('today');
    expect(nextPhase('pick', 0)).toBe('first');
    expect(nextPhase('today')).toBe('first');
    expect(nextPhase('first')).toBe('done');
    expect(nextPhase('place')).toBe('done');
    expect(stepIndex('gate')).toBe(-1);
    expect(stepIndex('place')).toBe(4);
  });
  it('reads back only well-formed progress', () => {
    expect(parseProgress(JSON.stringify({ step: 'first', habitIds: ['a', 'b'] }))).toEqual({ step: 'first', habitIds: ['a', 'b'] });
    expect(parseProgress(JSON.stringify({ step: 'place', habitIds: ['a'], petId: 'pet-cow-beltie' }))?.petId).toBe('pet-cow-beltie');
    expect(parseProgress(JSON.stringify({ step: 'sill', habitIds: [] }))).toBeNull();
    expect(parseProgress('{oops')).toBeNull();
    expect(parseProgress(null)).toBeNull();
  });
  it('words a single step of a count habit in the singular', () => {
    expect(unitFor('glasses', 1)).toBe('glass');
    expect(unitFor('glasses', 2)).toBe('glasses');
    expect(unitFor('pages', 1)).toBe('page');
    expect(unitFor('minutes', 1)).toBe('minute');
    expect(unitFor('', 1)).toBe('');
  });
});
