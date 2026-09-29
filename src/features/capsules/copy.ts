/**
 * Words and small formatters for the Capsules screen, from the copy deck: templates from
 * src/catalog/lines.ts (REVEAL_LINES, SECRET_REVEAL, DUPLICATE_LINES) and docs/VOICE.md §10
 * verbatim where lines.ts has no constant yet. Plain, kind, specific, sentence case, curly
 * apostrophes. No emoji, no puns, and one exclamation mark in the whole app: the Secret reveal's.
 * Animals never get a pronoun. In the UI a pull is a "capsule" and a machine a "cabinet".
 */
import type { Category, CollectibleDef, MachineDef, MachineId, Rarity, Species } from '@/catalog/types';
import { RARITY_FINISH, RARITY_LABEL as TIER } from '@/catalog/types';
import { seriesLabel } from '@/catalog/machines';
import { DUPLICATE_LINES, REVEAL_LINES, SECRET_LINES, SECRET_REVEAL, capitalise, fillLine, withArticle } from '@/catalog/lines';
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

/** Categories as filter chips (VOICE §3: pets, never "friends"). */
export const CATEGORY_LABEL: Record<Category, string> = {
  pet: 'Pets',
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

/** "Sep 29" for a DateKey ('2026-09-29'). */
export function monthDayOfKey(key: string): string {
  const [, m, d] = key.split('-').map(Number) as [number, number, number];
  return monthDay({ month: m, day: d });
}

/** "Sep 29" for an epoch time. */
export function shortDate(epochMs: number): string {
  const d = new Date(epochMs);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Came home: today" · "Came home: Sep 29" (VOICE §10, on a new pet's insert). */
export function cameHomeLabel(epochMs: number, now = Date.now()): string {
  const a = new Date(epochMs);
  const b = new Date(now);
  const today = a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  return `Came home: ${today ? 'today' : shortDate(epochMs)}`;
}

/** "coins" / "stamps" (singular for a price of 1). */
export function currencyWord(m: Pick<MachineDef, 'currency' | 'price'>, n = m.price): string {
  return m.currency === 'coins' ? (n === 1 ? 'coin' : 'coins') : n === 1 ? 'stamp' : 'stamps';
}

/** "25 coins", "3 stamps" (VOICE §4 prices). */
export function priceLabel(m: Pick<MachineDef, 'currency' | 'price'>): string {
  return `${m.price} ${currencyWord(m)}`;
}

/** The pay step (VOICE §10): "Put a coin in" · Night "Put 3 stamps in" · "Use a ticket". */
export function insertLabel(m: Pick<MachineDef, 'currency' | 'price'>, pay: Payment = 'price'): string {
  if (pay === 'ticket') return 'Use a ticket';
  if (pay === 'free' || m.currency === 'coins') return 'Put a coin in';
  return `Put ${priceLabel(m)} in`;
}

/** "for 25 coins", "for 3 stamps", "with a ticket", "on the house" */
export function paymentPhrase(pay: Payment, m: MachineDef): string {
  return pay === 'ticket' ? 'with a ticket' : pay === 'free' ? 'on the house' : `for ${priceLabel(m)}`;
}

/** "7 of 19 in the Field Guide" (VOICE §10, the carousel card). */
export function collectedLabel(owned: number, total: number): string {
  return `${owned} of ${total} in the Field Guide`;
}

/**
 * The pity counters in plain words (VOICE §10); a counter hides once its tier is fully owned
 * (null): "A Rare within the next 10 capsules." · "The next capsule is a Rare or better." ·
 * "A Super rare within the next 40."
 */
export function pityLines(rareIn: number | null, ultraIn: number | null): string[] {
  const lines: string[] = [];
  if (rareIn !== null) lines.push(rareIn <= 1 ? 'The next capsule is a Rare or better.' : `A Rare within the next ${rareIn} capsules.`);
  if (ultraIn !== null) lines.push(ultraIn <= 1 ? 'The next capsule is a Super rare.' : `A Super rare within the next ${ultraIn}.`);
  return lines;
}

/** The lucky meter (VOICE §10): "Lucky meter · 3 of 4", and at 4, "The next one is new." */
export function luckyLabel(dupStreak: number): string {
  const n = Math.max(0, Math.min(4, dupStreak));
  return n >= 4 ? 'The next one is new.' : `Lucky meter · ${n} of 4`;
}

/** Said when the handle is tried before anything is paid (and shown, shorter, in a bubble). */
export function nudgeText(m: Pick<MachineDef, 'currency'>, short = false): string {
  const token = m.currency === 'stars' ? 'stamp' : 'coin';
  return short ? (token === 'stamp' ? 'A stamp first' : 'A coin first') : `A ${token} goes in first.`;
}

/** The capsule, landed (VOICE §10, for screen readers): "A capsule, Rare finish, in the tray." */
export function landedLine(rarity: Rarity, secret = false): string {
  return `A capsule, ${tierLabel(rarity, secret)} finish, in the tray.`;
}

export interface FriendlyNotice {
  text: string;
  /** Where to go to fix it. */
  link?: { href: string; label: string };
}

/**
 * Calm notices for a capsule that can't happen yet (VOICE §10), each with the way forward, and
 * never a count of 0. `have` is the balance in the cabinet's currency; `visited` says whether a
 * seasonal edition has been before (its lineup can be ordered at the counter).
 */
export function pullErrorNotice(error: PullError, m: MachineDef, have?: number, visited = false): FriendlyNotice {
  const series = seriesLabel(m);
  switch (error) {
    case 'not-enough-coins':
      return {
        text: `${series} is ${m.price} coins a capsule. ${have ? (have === 1 ? 'There’s 1 in the jar.' : `There are ${have} in the jar.`) : 'Watering fills the jar.'}`,
        link: { href: '#/today', label: 'Water something on Today' },
      };
    case 'not-enough-stars':
      return {
        text: `${series} is ${priceLabel(m)}. ${have ? (have === 1 ? 'There’s 1 on the card.' : `There are ${have} on the card.`) : 'The card fills from showing up.'}`,
        link: { href: '#/progress', label: 'Where stamps come from' },
      };
    case 'no-ticket':
      return { text: 'Tickets come from the Showing-up ladder, welcome-home days and your birthday.' };
    case 'machine-unavailable':
      return {
        text: m.seasonal
          ? `The ${m.name} is here from ${monthDay(m.seasonal.start)} to ${monthDay(m.seasonal.end)}.${visited ? ' Anything it has brought before can be ordered at the counter.' : ''}`
          : `${series} is resting for now.`,
      };
    case 'reveal-pending':
      return { text: 'There’s a capsule in the tray. Open that one first.' };
    case 'storage-full':
      return { text: 'This capsule couldn’t be saved, so it wasn’t opened. Nothing was spent.' };
  }
}

/** Calm notices for a Special Order that can't be placed (VOICE §10). */
export function orderErrorText(
  error: 'not-enough-stars' | 'already-owned' | 'not-wishable' | 'season-not-visited',
  item: { rarity: Rarity; price: number; machine?: Pick<MachineDef, 'name'> },
  stamps: number,
): string {
  switch (error) {
    case 'not-enough-stars':
      return `${withArticle(TIER[item.rarity], true)} is ${item.price} stamps at the counter. ${stamps ? (stamps === 1 ? 'There’s 1 on the card.' : `There are ${stamps} on the card.`) : 'The card fills from showing up.'}`;
    case 'already-owned':
      return 'Already in the Field Guide.';
    case 'season-not-visited':
      return item.machine ? `The ${item.machine.name} hasn’t visited yet. Its things can be ordered once it has.` : 'That season hasn’t visited yet. Its things can be ordered once it has.';
    case 'not-wishable':
      return 'This one isn’t sold at the counter. It comes from showing up.';
  }
}

/**
 * The line on the paper insert (lines.ts REVEAL_LINES, or SECRET_REVEAL for a series Secret, the
 * one exclamation mark catkin has): "No. 02 · Cows. A Belted Galloway, one of the Specials." ·
 * "No. 02 · Cows, the secret one! A Highland, about the size of your thumb, who would like somewhere soft."
 */
export function revealLine(def: Pick<CollectibleDef, 'id' | 'name'>, m: MachineDef | undefined, rarity: Rarity, secret: boolean): string {
  const series = m ? seriesLabel(m) : '';
  const A = withArticle(def.name, true);
  const secretLine = SECRET_LINES[def.id];
  if (secret && secretLine && series) return fillLine(SECRET_REVEAL, { series, A, secretLine });
  const template = REVEAL_LINES[rarity][0]!;
  return series ? fillLine(template, { series, A }) : fillLine(template.replace('{series}. ', ''), { A });
}

/** A Special Order arriving (VOICE §10): "Your order: a Siamese." */
export const orderLine = (def: Pick<CollectibleDef, 'name'>) => `Your order: ${withArticle(def.name)}.`;

/** A repeat (lines.ts DUPLICATE_LINES): "A Holstein, again. Onto the swap shelf · +2 swaps" (· "Pudding came over to look."). */
export function duplicateLine(def: Pick<CollectibleDef, 'name'>, swaps: number, petName?: string): string {
  const A = withArticle(def.name, true);
  return petName ? fillLine(DUPLICATE_LINES.pet, { A, swaps, name: petName }) : fillLine(DUPLICATE_LINES.item, { A, swaps });
}

/** Swaps becoming stamps during a reveal (lines.ts DUPLICATE_LINES). */
export const fusionLine = (stamps: number) => (stamps === 1 ? DUPLICATE_LINES.toStamp : fillLine(DUPLICATE_LINES.toStamps, { count: stamps }));

/**
 * The one sentence a screen reader hears when a capsule opens (VOICE §10): "No. 02 · Cows. A
 * Belted Galloway, one of the Specials. Two-colour print. New." A repeat ends with its swap line.
 */
export function revealSentence(def: CollectibleDef, m: MachineDef | undefined, rarity: Rarity, secret: boolean, isNew: boolean, swaps: number, petName?: string): string {
  const finish = `${capitalise(secret ? 'holographic' : RARITY_FINISH[rarity])}.`;
  const dupe = duplicateLine(def, swaps, def.category === 'pet' ? petName : undefined);
  const after = isNew ? 'New.' : dupe.endsWith('.') ? dupe : `${dupe}.`;
  return `${revealLine(def, m, rarity, secret)} ${finish} ${after}`;
}
