import { describe, expect, it } from 'vitest';
import { MACHINES, getMachine } from '@/catalog/machines';
import { PETS, getCollectible } from '@/catalog/collectibles';
import { RARITIES } from '@/catalog/types';
import { contrast } from '@/art/machines/color';
import { pillFace } from '@/art/machines/theme';
import {
  collectedLabel,
  duplicateLine,
  finishLabel,
  insertLabel,
  landedLine,
  orderLine,
  revealLine,
  kindLabel,
  luckyLabel,
  monthDay,
  nudgeText,
  orderErrorText,
  paymentPhrase,
  pityLines,
  pullErrorNotice,
  revealSentence,
  SPECIES_NOUN,
  tierLabel,
} from './copy';
import { nextPayment, pullOptions } from './payment';
import { capsuleShell, isWhiteish } from './reveal';
import { nameIdeas } from './names';

/** DESIGN §12: never these (a Secret reveal may have one exclamation mark, and nothing else may). */
const BANNED = /\b(yay|cozy|bestie|purrfect|moo-tivation|missed|failed|lost|broken|behind|missing|pull|machine|crank|stardust|unlock|friendship)\b|you got this|'/i;
const EMOJI = /\p{Extended_Pictographic}/u;

function voiceOk(text: string) {
  expect(text, text).not.toMatch(BANNED);
  expect(text, text).not.toMatch(EMOJI);
  expect(text, text).not.toMatch(/!/);
}

describe('capsules copy', () => {
  it('pill labels on each series colour are graphite, AA on every face', () => {
    for (const m of MACHINES) {
      expect(contrast('#3B3236', m.theme.body), m.id).toBeGreaterThanOrEqual(4.5);
      expect(contrast('#3B3236', pillFace(m)), m.id).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('names the tiers Classic, Special, Rare, Super rare and the Secret, with their print', () => {
    expect(RARITIES.map((r) => tierLabel(r))).toEqual(['Classic', 'Special', 'Rare', 'Super rare']);
    expect(tierLabel('ultra', true)).toBe('Secret');
    expect(finishLabel('uncommon')).toBe('Special · two-colour print');
  });

  it('formats dates, counts, pity and the lucky meter plainly', () => {
    expect(monthDay({ month: 11, day: 10 })).toBe('Nov 10');
    expect(collectedLabel(7, 19)).toBe('7 of 19 in the Field Guide');
    expect(pityLines(10, 40)).toEqual(['A Rare within the next 10 capsules.', 'A Super rare within the next 40.']);
    expect(pityLines(1, null)).toEqual(['The next capsule is a Rare or better.']);
    expect(pityLines(null, null)).toEqual([]);
    expect(luckyLabel(3)).toBe('Lucky meter · 3 of 4');
    expect(luckyLabel(4)).toBe('The next one is new.');
    for (const n of [0, 1, 2, 3, 4]) voiceOk(luckyLabel(n));
  });

  it('says what a pull costs, in stamps for No. 07', () => {
    expect(paymentPhrase('price', getMachine('cats'))).toBe('for 25 coins');
    expect(paymentPhrase('price', getMachine('night'))).toBe('for 3 stamps');
    expect(paymentPhrase('ticket', getMachine('night'))).toBe('with a ticket');
    expect(nudgeText(getMachine('night'))).toBe('A stamp goes in first.');
    expect(insertLabel(getMachine('cats'))).toBe('Put a coin in');
    expect(insertLabel(getMachine('night'))).toBe('Put 3 stamps in');
    expect(insertLabel(getMachine('night'), 'ticket')).toBe('Use a ticket');
    expect(landedLine('rare')).toBe('A capsule, Rare finish, in the tray.');
  });

  it('pull notices are kind and specific, and never scold', () => {
    const night = getMachine('night');
    const cats = getMachine('cats');
    expect(pullErrorNotice('not-enough-stars', night, 1).text).toBe('No. 07 · Night is 3 stamps. There’s 1 on the card.');
    expect(pullErrorNotice('not-enough-stars', night, 0).text).toBe('No. 07 · Night is 3 stamps. The card fills from showing up.');
    expect(pullErrorNotice('not-enough-coins', cats, 18)).toEqual({ text: 'No. 01 · Cats is 25 coins a capsule. There are 18 in the jar.', link: { href: '#/today', label: 'Water something on Today' } });
    // Never a count of 0: an empty jar says where coins come from instead.
    expect(pullErrorNotice('not-enough-coins', cats, 0).text).toBe('No. 01 · Cats is 25 coins a capsule. Watering fills the jar.');
    expect(pullErrorNotice('machine-unavailable', getMachine('winter')).text).toBe('The Winter Edition is here from Nov 11 to Jan 14.');
    expect(pullErrorNotice('reveal-pending', cats).text).toBe('There’s a capsule in the tray. Open that one first.');
    expect(orderErrorText('not-enough-stars', { rarity: 'rare', price: 8 }, 5)).toBe('A Rare is 8 stamps at the counter. There are 5 on the card.');
    expect(orderErrorText('not-enough-stars', { rarity: 'rare', price: 8 }, 0)).toBe('A Rare is 8 stamps at the counter. The card fills from showing up.');
    expect(orderErrorText('season-not-visited', { rarity: 'rare', price: 8, machine: getMachine('winter') }, 0)).toBe('The Winter Edition hasn’t visited yet. Its things can be ordered once it has.');
    for (const m of MACHINES) {
      for (const e of ['not-enough-coins', 'not-enough-stars', 'no-ticket', 'machine-unavailable', 'reveal-pending'] as const) {
        const n = pullErrorNotice(e, m, 3);
        expect(n.text.length).toBeGreaterThan(10);
        voiceOk(n.text);
      }
    }
    for (const e of ['not-enough-stars', 'already-owned', 'not-wishable', 'season-not-visited'] as const) voiceOk(orderErrorText(e, { rarity: 'uncommon', price: 4 }, 2));
  });

  it('announces a reveal as a sentence; only the Secret may exclaim', () => {
    const cows = getMachine('cows');
    const beltie = getCollectible('pet-cow-beltie')!;
    expect(revealSentence(beltie, cows, 'uncommon', false, true, 0)).toBe('No. 02 · Cows. A Belted Galloway, one of the Specials. Two-colour print. New.');
    expect(revealSentence(beltie, cows, 'uncommon', false, false, 4, 'Clover')).toBe('No. 02 · Cows. A Belted Galloway, one of the Specials. Two-colour print. A Belted Galloway, again. Onto the swap shelf · +4 swaps · Clover came over to look.');
    voiceOk(revealSentence(beltie, cows, 'uncommon', false, false, 4));
    const highland = getCollectible('pet-cow-highland')!;
    // The Secret reveal is built from lines.ts SECRET_REVEAL: the one exclamation mark catkin has.
    expect(revealLine(highland, cows, 'ultra', true)).toBe('No. 02 · Cows, the secret one! A Highland, about the size of your thumb, who would like somewhere soft.');
    expect(revealSentence(highland, cows, 'ultra', true, true, 0)).toBe('No. 02 · Cows, the secret one! A Highland, about the size of your thumb, who would like somewhere soft. Holographic. New.');
    expect(duplicateLine(getCollectible('treat-blueberries') ?? beltie, 2)).toMatch(/, again\. Onto the swap shelf · \+2 swaps$/);
    expect(orderLine(getCollectible('pet-cat-siamese')!)).toBe('Your order: a Siamese.');
    // Every non-secret reveal line and repeat line keeps the voice.
    for (const m of MACHINES) for (const r of RARITIES) voiceOk(revealLine(beltie, m, r, false));
  });

  it('pet subtitles never say the species twice', () => {
    for (const p of PETS) {
      const label = kindLabel(p);
      expect(label.toLowerCase().split(SPECIES_NOUN[p.species].toLowerCase()).length - 1, label).toBe(1);
    }
    expect(kindLabel(PETS.find((p) => p.id === 'pet-cat-calico')!)).toBe('Calico · Cat');
    expect(kindLabel(PETS.find((p) => p.id === 'pet-frog-tree')!)).toBe('Tree Frog');
    expect(kindLabel(PETS.find((p) => p.id === 'pet-bunny-dutch')!)).toBe('Dutch Rabbit');
  });

  it('offers five real names at a time, and a different five on a reroll', () => {
    const a = nameIdeas('cow', 0);
    const b = nameIdeas('cow', 1);
    expect(a).toHaveLength(5);
    expect(new Set(a).size).toBe(5);
    expect(a).not.toEqual(b);
    expect(nameIdeas('cat', 0, 'Pudding')).not.toContain('Pudding');
  });
});

describe('paying', () => {
  it('pull again pays the same way as last time when it can, otherwise the other way, never silently', () => {
    expect(nextPayment('price', true, 0)).toBe('price');
    expect(nextPayment('ticket', true, 1)).toBe('ticket');
    expect(nextPayment('ticket', true, 0)).toBe('price');
    expect(nextPayment('price', false, 2)).toBe('ticket');
    expect(nextPayment('price', false, 0)).toBeNull();
  });

  it('maps each way of paying onto the store pull', () => {
    expect(pullOptions('price')).toEqual({});
    expect(pullOptions('ticket')).toEqual({ useTicket: true });
    expect(pullOptions('free')).toEqual({ free: true });
  });
});

describe('capsule shells', () => {
  it('a reveal shell is never white on white, for any series and tint', () => {
    for (const m of MACHINES) {
      m.theme.capsules.forEach((_, tint) => {
        const shell = capsuleShell(m.theme.capsules, tint);
        expect(isWhiteish(shell.color), `${m.id} ${tint}`).toBe(false);
        expect(isWhiteish(shell.color2), `${m.id} ${tint}`).toBe(false);
      });
    }
  });
});
