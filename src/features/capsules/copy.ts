/**
 * Words and small formatters for the Capsules screen, in the plant-sitter's voice (DESIGN §12):
 * plain, kind, specific, sentence case. No emoji, no puns, no exclamation marks (the Secret
 * reveal may have one), and animals never get a pronoun.
 */
import type { Category, CollectibleDef, MachineDef, MachineId, Rarity, Species } from '@/catalog/types';
import { RARITY_FINISH, RARITY_LABEL as TIER } from '@/catalog/types';
import { seriesLabel } from '@/catalog/machines';
import type { PullError } from '@/state/api';
import type { Payment } from './payment';

/** Display tiers (internal ids stay common/uncommon/rare/ultra): Classic · Special · Rare · Super rare. */
export const RARITY_LABEL: Record<Rarity, string> = TIER;

/** The printed tier word, with the Secret named as itself. */
export function tierLabel(rarity: Rarity, secret = false): string {
  return secret ? 'Secret' : TIER[rarity];
}

/** "Special · two-colour print", "Secret · holographic". */
export function finishLabel(rarity: Rarity, secret = false): string {
  return `${tierLabel(rarity, secret)} · ${RARITY_FINISH[rarity]}`;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  pet: 'Animals',
  wearable: 'Wearables',
  treat: 'Treats',
  decor: 'Decor',
  plant: 'Plants',
  pot: 'Pots',
};

const SLOT_LABEL = { head: 'Head wear', face: 'Face wear', neck: 'Neckwear', body: 'Outfit' } as const;

/** The everyday noun for each species ("bunny" is only an internal id). */
export const SPECIES_NOUN: Record<Species, string> = {
  cat: 'Cat',
  cow: 'Cow',
  dog: 'Dog',
  bunny: 'Rabbit',
  frog: 'Frog',
  bear: 'Bear',
  hamster: 'Hamster',
  duck: 'Duck',
};

/** "Calico · Cat", "French Bulldog" (never the species twice), "Head wear", "Treat"… */
export function kindLabel(def: CollectibleDef): string {
  switch (def.category) {
    case 'pet':
      return def.name.toLowerCase().includes(SPECIES_NOUN[def.species].toLowerCase()) ? def.name : `${def.name} · ${SPECIES_NOUN[def.species]}`;
    case 'wearable':
      return SLOT_LABEL[def.slot];
    case 'treat':
      return 'Treat';
    case 'decor':
      return 'Decor';
    case 'plant':
      return 'A plant for one of your habits';
    case 'pot':
      return 'A pot for one of your habits';
  }
}

/** Short series names for filter chips. */
export const MACHINE_SHORT: Record<MachineId, string> = {
  cats: 'Cats',
  cows: 'Cows',
  dogs: 'Dogs',
  pond: 'Pond',
  garden: 'Garden',
  pantry: 'Pantry',
  night: 'Night',
  autumn: 'Autumn',
  winter: 'Winter',
  valentine: 'Valentine',
  spring: 'Spring',
  summer: 'Summer',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthDay(md: { month: number; day: number }): string {
  return `${MONTHS[md.month - 1] ?? ''} ${md.day}`;
}

/** "Sep 29" for an epoch time. */
export function shortDate(epochMs: number): string {
  const d = new Date(epochMs);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "coins" / "stamps" (singular for a price of 1). */
export function currencyWord(m: MachineDef, n = m.price): string {
  return m.currency === 'coins' ? (n === 1 ? 'coin' : 'coins') : n === 1 ? 'stamp' : 'stamps';
}

export function priceLabel(m: MachineDef): string {
  return `${m.price} ${currencyWord(m)}`;
}

/** "for 25 coins", "for 3 stamps", "with a ticket", "on the house" */
export function paymentPhrase(pay: Payment, m: MachineDef): string {
  return pay === 'ticket' ? 'with a ticket' : pay === 'free' ? 'on the house' : `for ${priceLabel(m)}`;
}

/** "7 of 19 collected" */
export function collectedLabel(owned: number, total: number): string {
  return `${owned} of ${total} collected`;
}

/**
 * The pity counters in plain words; a counter hides once its tier is fully owned (null). The
 * rare counter forces the Rare tier only (DESIGN §7.1), so it never promises "or better".
 */
export function pityLines(rareIn: number | null, ultraIn: number | null): string[] {
  const lines: string[] = [];
  if (rareIn !== null) lines.push(rareIn <= 1 ? 'The next one is a Rare' : `A Rare within ${rareIn}`);
  if (ultraIn !== null) lines.push(ultraIn <= 1 ? 'The next one is Super rare' : `Super rare within ${ultraIn}`);
  return lines;
}

/** The lucky meter (§7.1): after four repeats in a row, the next capsule is new. */
export function luckyLabel(dupStreak: number): string {
  return dupStreak >= 4 ? 'The next one is new' : 'Four repeats, then a new one';
}

/** Said when the handle is tried before anything is paid (and shown, shorter, in a bubble). */
export function nudgeText(m: MachineDef, short = false): string {
  const token = m.currency === 'stars' ? 'stamp' : 'coin';
  return short ? (token === 'stamp' ? 'A stamp first' : 'A coin first') : `A ${token} goes in first.`;
}

export interface FriendlyNotice {
  text: string;
  /** Where to go to fix it. */
  link?: { href: string; label: string };
}

/** Kind notices for a pull that can't happen yet. `have` is the balance in the machine's currency. */
export function pullErrorNotice(error: PullError, m: MachineDef, have?: number): FriendlyNotice {
  const series = m.number ?? m.name;
  switch (error) {
    case 'not-enough-coins':
      return {
        text: `${series} takes ${m.price} coins.${have !== undefined ? ` You have ${have}.` : ''} Coins come from watering your plants.`,
        link: { href: '#/today', label: 'Back to Today' },
      };
    case 'not-enough-stars':
      return {
        text: `${series} takes ${m.price} stamps.${have !== undefined ? ` You have ${have}.` : ''} Stamps come from showing up, Sunday Notes and pins.`,
        link: { href: '#/progress', label: 'See your stamps' },
      };
    case 'no-ticket':
      return { text: 'No tickets right now. Tickets come from the Showing-up ladder.' };
    case 'machine-unavailable':
      return {
        text: m.seasonal
          ? `${m.name} is away until ${monthDay(m.seasonal.start)}. Once its season has visited, its lineup can be ordered at the counter.`
          : `${seriesLabel(m)} is resting for now.`,
      };
    case 'reveal-pending':
      return { text: 'One capsule is still waiting to be opened.' };
  }
}

/** Kind notices for a Special Order that can't be placed. */
export function orderErrorText(error: 'not-enough-stars' | 'already-owned' | 'not-wishable' | 'season-not-visited', price: number, stamps: number): string {
  switch (error) {
    case 'not-enough-stars':
      return `This one takes ${price} stamps. You have ${stamps}. Stamps come from showing up, Sunday Notes and pins.`;
    case 'already-owned':
      return 'This one is already in your collection.';
    case 'season-not-visited':
      return 'That season hasn’t visited yet. Its lineup can be ordered once it has.';
    case 'not-wishable':
      return 'This one comes another way, so it can’t be ordered.';
  }
}

/** The sentence a screen reader hears when a capsule opens. */
export function revealSentence(def: CollectibleDef, m: MachineDef | undefined, rarity: Rarity, secret: boolean, isNew: boolean, swaps: number): string {
  const series = m ? seriesLabel(m) : '';
  const head = secret ? `${series}, the secret one!` : `${series}.`;
  const what = `${def.name}, ${tierLabel(rarity, secret)}.`;
  const after = isNew ? 'New to your collection.' : `Already yours, so onto the swap shelf: plus ${swaps} swaps.`;
  return `${head} ${what} ${after}`.trim();
}
