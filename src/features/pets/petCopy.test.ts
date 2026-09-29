import { describe, expect, it } from 'vitest';
import { lint, PET_PRONOUN } from '../../../tests/unit/voiceLint';
import { resetCaptions, captionFor, idleContext, touchContext } from '../shelf/captions';
import { decorLabel, emptyPageLine, openedLine, shortLine, variantLine } from '../shelf/copy';
import { boopLabel, keepsakeCaption, knownForLine, levelLine, levelName, likesLine, memoryLine, servingsLine, spotLine } from './petCopy';

const habits = [
  { id: 'read', name: 'Read', plant: 'begonia' as const },
  { id: 'long', name: 'Practise the cello for twenty minutes', plant: 'monstera' as const },
];

/** Everything the card and the Shelf say passes the voice lint, pets without pronouns. */
function voiced(text: string): string {
  expect(lint(text, { pronouns: PET_PRONOUN }), text).toEqual([]);
  return text;
}

describe('the Pet Card’s words', () => {
  it('friendship says what the pet does now, true to its species', () => {
    expect(levelName(3)).toBe('Knows you');
    expect(voiced(levelLine('Pudding', 3, 'cow', null))).toBe('Pudding does a nose-lick when you say hello now.');
    expect(voiced(levelLine('Pudding', 3, 'cat', null))).toBe('Pudding slow-blinks back at you now.');
    expect(voiced(levelLine('Pudding', 8, 'cat', null))).toBe('Pudding naps in the same spot every afternoon now.');
    expect(voiced(levelLine('Pudding', 8, 'cat', 'Juniper'))).toBe('Pudding naps next to Juniper now, most afternoons.');
    expect(levelName(13)).toBe('Has a routine');
  });

  it('"Likes" is the hint until the favourite is found', () => {
    expect(voiced(likesLine({ kind: 'tag', tag: 'sweet' })!)).toBe('Perks up at anything sweet');
    expect(voiced(likesLine({ kind: 'treat', treatId: 'treat-strawberry' })!)).toBe('Strawberry, most of all');
    expect(likesLine(null)).toBeNull();
  });

  it('"Favourite spot" names the plant or the place', () => {
    expect(spotLine({ kind: 'pot', habitId: 'read' }, habits)).toBe('The Read plant');
    expect(spotLine({ kind: 'pot', habitId: 'long' }, habits)).toBe('The monstera');
    expect(spotLine({ kind: 'place', place: 'pond' }, habits)).toBe('The Saucer Pond');
    expect(spotLine(null, habits)).toBeNull();
  });

  it('"Known for" keeps the same line for a pet, visit after visit', () => {
    const company = { habitId: 'read', since: '2026-09-01', knownFor: { icon: 'book', routine: { petId: 'p', routine: 'read' as const, phase: 'settled' as const }, since: '2026-09-01' }, history: [] };
    const a = knownForLine(company, 'cat', 'pet-cat-calico');
    expect(a).toBe(knownForLine(company, 'cat', 'pet-cat-calico'));
    expect(voiced(a!)).toMatch(/book/);
    expect(knownForLine({ ...company, knownFor: null }, 'cat', 'x')).toBeNull();
  });

  it('Memories read like dates in a diary', () => {
    expect(memoryLine({ kind: 'came-home', date: '2026-09-29' }, habits)).toBe('Came home Sep 29');
    expect(memoryLine({ kind: 'bloomed', date: '2026-09-29', habitId: 'read' }, habits)).toBe('The day Read bloomed');
    expect(memoryLine({ kind: 'moved-in', date: '2026-09-29', habitId: 'read' }, habits)).toBe('Moved into the Read plant, Sep 29');
    expect(memoryLine({ kind: 'favourite', date: '2026-09-29', treatId: 'treat-strawberry' }, habits)).toBe('The day the strawberry turned out to be the favourite');
  });

  it('a keepsake keeps her Moment, else its family’s line', () => {
    expect(voiced(keepsakeCaption({ kind: 'read', date: '2026-09-03' }))).toBe('Sep 3 · Left by the pot: a paper bookmark.');
    expect(keepsakeCaption({ kind: 'move', date: '2026-09-03', note: { date: '2026-09-02', text: 'Rainy, but did it anyway.' } })).toBe('Sep 2 · ‘Rainy, but did it anyway.’');
  });

  it('the boop button names the right part, and a pantry never says 0', () => {
    expect(boopLabel('cat')).toBe('Touch nose');
    expect(boopLabel('duck')).toBe('Touch beak');
    expect(boopLabel('frog')).toBe('Touch head');
    expect(servingsLine(0)).toBe('More in the morning');
    expect(servingsLine(1)).toBe('1 serving');
    expect(servingsLine(5)).toBe('5 servings');
  });
});

describe('the Shelf’s words', () => {
  it('opening a place: with the pet who moved in, or without', () => {
    expect(voiced(openedLine('pond', 'Fern'))).toBe('The Saucer Pond is open. Fern went straight to the lily pad.');
    expect(voiced(openedLine('bookshelf', null))).toBe('The Bookshelf is open: two shelves of paperbacks and a reading lamp.');
  });

  it('not enough coins says what it costs and what is in the jar, never a 0', () => {
    expect(voiced(shortLine('pond', 400, 142))).toBe('The Saucer Pond is 400 coins. There are 142 in the jar.');
    expect(voiced(shortLine('quilt', 2500, 1))).toBe('The Quilt is 2,500 coins. There’s 1 in the jar.');
    expect(voiced(shortLine('grass', 700, 0))).toBe('The Cat-grass Tray is 700 coins. Watering fills the jar.');
  });

  it('names: species once, keepsakes by what they are, the empty page by its cabinet', () => {
    expect(variantLine('Calico', 'cat')).toBe('Calico · Cat');
    expect(variantLine('Black Cat', 'cat')).toBe('Black Cat');
    expect(decorLabel({ name: 'read', keepsake: { kind: 'read' } })).toBe('A paper bookmark');
    expect(decorLabel({ name: 'Yarn Ball' })).toBe('Yarn Ball');
    expect(voiced(emptyPageLine('Cows', 'No. 02'))).toBe('Cows come from the No. 02 cabinet.');
  });

  it('captions follow the hour, fill the name, and don’t repeat the last 5', () => {
    expect(touchContext(10)).toBe('tap');
    expect(touchContext(21)).toBe('evening');
    expect(touchContext(2)).toBe('night');
    expect(idleContext(8)).toBe('morning');
    expect(idleContext(15)).toBe('afternoon');
    resetCaptions(1);
    const pet = { name: 'Pudding', personality: 'curious' as const, species: 'cow' as const, level: 2 };
    const seen = Array.from({ length: 5 }, () => voiced(captionFor(pet, 'tap', 10)));
    expect(new Set(seen).size).toBe(5);
    for (const line of seen) expect(line).toContain('Pudding');
  });
});
