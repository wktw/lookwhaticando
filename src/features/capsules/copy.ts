/** Words and small formatters for the capsules screens (DESIGN §1 voice: warm, brief, never guilt). */
import type { Category, CollectibleDef, MachineDef, MachineId, Rarity, Species } from '@/catalog/types';
import type { PullError } from '@/state/api';
import type { CandyColors } from './ui/CandyButton';
import type { Payment } from './payment';
import { mix, shade } from '@/art/machines/color';
import { machineHue } from '@/art/machines/theme';

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  ultra: 'Secret',
};

/** Rarity pill on the reveal card: the ultra item is the series Secret. */
export const RARITY_REVEAL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare ✨',
  ultra: 'Secret!',
};

export const CATEGORY_LABEL: Record<Category, string> = {
  pet: 'Friends',
  wearable: 'Wearables',
  treat: 'Treats',
  decor: 'Decor',
  plant: 'Plants',
  pot: 'Pots',
};

const SLOT_LABEL = { head: 'Head wear', face: 'Face wear', neck: 'Neckwear', body: 'Outfit' } as const;

/** The everyday noun for each species ("bunny" is only an internal id). */
export const SPECIES_NOUN: Record<Species, string> = { cat: 'Cat', cow: 'Cow', dog: 'Dog', bunny: 'Rabbit', frog: 'Frog', bear: 'Bear', hamster: 'Hamster', duck: 'Duck' };

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
      return 'New plant for your habits';
    case 'pot':
      return 'Plant pot';
  }
}

/** Short machine names for filter chips. */
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

export function wishErrorText(
  error: 'not-enough-stars' | 'already-owned' | 'not-wishable' | 'season-not-visited',
  price: number,
  stars: number,
): string {
  switch (error) {
    case 'not-enough-stars':
      return `This wish takes ${price} stars and you have ${stars}. Stars come from milestones, weekly letters and badges ⭐`;
    case 'already-owned':
      return 'Good news: this one is already yours!';
    case 'season-not-visited':
      return 'That series hasn’t visited yet. It becomes wishable after its first visit.';
    case 'not-wishable':
      return 'This one is earned another way, so the well can’t grant it.';
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthDay(md: { month: number; day: number }): string {
  return `${MONTHS[md.month - 1] ?? ''} ${md.day}`;
}

export function priceLabel(m: MachineDef): string {
  return `${m.price} ${currencyWord(m)}`;
}

/** "coins" / "stars" (singular for a price of 1). */
export function currencyWord(m: MachineDef): string {
  return m.currency === 'coins' ? (m.price === 1 ? 'coin' : 'coins') : m.price === 1 ? 'star' : 'stars';
}

/** "for 25 coins", "for 3 stars", "with a ticket" */
export function paymentPhrase(pay: Payment, m: MachineDef): string {
  return pay === 'ticket' ? 'with a ticket' : `for ${priceLabel(m)}`;
}

export function pityHint(rareIn: number | null): string {
  if (rareIn === null) return 'Every Rare collected ✨';
  if (rareIn <= 1) return 'Next pull is Rare or better ✨';
  return `Rare+ within ${rareIn} pulls ✨`;
}

/** Said when the crank is tapped before anything is paid (and shown, shorter, in a bubble). */
export function nudgeText(m: MachineDef, short = false): string {
  const token = m.currency === 'stars' ? 'star' : 'coin';
  return short ? `${token === 'star' ? 'Star' : 'Coin'} first!` : `Pop a ${token} in first!`;
}

export interface FriendlyNotice {
  text: string;
  /** Where to go to fix it. */
  link?: { href: string; label: string };
}

export function pullErrorNotice(error: PullError, m: MachineDef): FriendlyNotice {
  switch (error) {
    case 'not-enough-coins':
      return {
        text: `Almost! ${m.name} takes ${m.price} coins. Every check-in earns a few 🌱`,
        link: { href: '#/today', label: 'Earn coins on Today' },
      };
    case 'not-enough-stars':
      return {
        text: `${m.name} takes ${m.price} stars. Stars come from milestones, weekly letters and badges ⭐`,
        link: { href: '#/progress', label: 'See your milestones' },
      };
    case 'no-ticket':
      return { text: 'No tickets right now. They come from 21-day (and longer) milestones 🎟️' };
    case 'machine-unavailable':
      return { text: `${m.name} is resting until its season comes back. Its friends are in the Wishing Well anytime 💫` };
    case 'reveal-pending':
      return { text: 'One capsule is still waiting to be opened.' };
    case 'storage-full':
      return { text: 'This capsule couldn’t be saved, so it wasn’t opened. Nothing was spent.' };
  }
}

/** Candy-button colors for a machine: a soft face in its signature hue, text in the theme's AA ink. */
export function machineCandy(m: MachineDef): CandyColors {
  const base = machineHue(m);
  return { face: mix(base, '#FFFFFF', 0.45), lip: shade(base, 0.18), ink: m.theme.ink };
}
