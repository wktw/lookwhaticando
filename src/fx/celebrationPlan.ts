/**
 * Pure celebration planning: one batch of GameEvents (everything a single action emitted) →
 * at most one banner, a few calm toasts, and a wallet tally. Big moments win by priority and
 * absorb the smaller ones as "also" lines, so rapid or stacked rewards never spam.
 */
import type { GameEvent } from '@/state/api';
import type { PlantSpeciesId, PotId } from '@/catalog/types';
import type { BadgeDef } from '@/catalog/badges';
import type { Expression } from '@/art/pets/types';
import type { Tone } from '@/ui/tone';
import type { Intensity } from './particles';
import type { SfxName } from './sound';

export interface Tally {
  coins: number;
  stars: number;
  tickets: number;
  stardust: number;
}

export type CelebrationArt =
  | { type: 'pet'; petId: string; expression: Expression }
  | { type: 'badge'; badgeId: string }
  | { type: 'plant'; species: PlantSpeciesId; stage: number; pot: PotId }
  | { type: 'collectible'; id: string }
  | { type: 'currency'; kind: 'coins' | 'stars' };

export type BannerKind = 'exclusive' | 'milestone' | 'plant' | 'perfectDay' | 'badge' | 'bestFriends';

export interface BannerSpec {
  kind: BannerKind;
  priority: number;
  eyebrow: string;
  title: string;
  text: string;
  /** Secondary moments from the same batch, one short line each. */
  also: string[];
  rewards: Tally;
  art: CelebrationArt;
  tone: Tone;
  /** Full-screen moment with a button, instead of a dropping banner. */
  epic: boolean;
  confetti: Intensity;
  sound: SfxName;
}

export interface ToastSpec {
  key: string;
  message: string;
  tone: Tone;
  art: CelebrationArt;
  sound?: SfxName;
  /** The batch's rewards, when this toast is the only moment and carries them itself. */
  rewards?: Tally;
}

export interface CelebrationPlan {
  banner: BannerSpec | null;
  toasts: ToastSpec[];
  /** Small rewards for the rolling wallet toast (zero when a banner carries them). */
  wallet: Tally;
}

export interface CelebrationContext {
  habit(id: string): { name: string; plant: PlantSpeciesId; pot: PotId } | undefined;
  petName(id: string): string;
  itemName(id: string): string;
  itemFlavor(id: string): string;
  badge(id: string): BadgeDef | undefined;
  /** The Today buddy (pet id) who cheers in banners. */
  buddy: string;
  /** Habits whose check-in coins the screen already celebrated with its own flourish. */
  locallyCelebrated: ReadonlySet<string>;
}

export const EMPTY_TALLY: Tally = { coins: 0, stars: 0, tickets: 0, stardust: 0 };

export function addTally(a: Tally, b: Tally): Tally {
  return { coins: a.coins + b.coins, stars: a.stars + b.stars, tickets: a.tickets + b.tickets, stardust: a.stardust + b.stardust };
}

export function isEmptyTally(t: Tally): boolean {
  return t.coins <= 0 && t.stars <= 0 && t.tickets <= 0 && t.stardust <= 0;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "+18 coins · +1 star · +2 ✦" */
export function formatTally(t: Tally): string {
  const parts: string[] = [];
  if (t.coins > 0) parts.push(`+${plural(t.coins, 'coin')}`);
  if (t.stars > 0) parts.push(`+${plural(t.stars, 'star')}`);
  if (t.tickets > 0) parts.push(`+${plural(t.tickets, 'ticket')}`);
  if (t.stardust > 0) parts.push(`+${t.stardust} stardust`);
  return parts.join(' · ');
}

/** Stages that get a banner (DESIGN §5.5: Blooming and Evergreen are celebrations). */
export const isMajorStage = (stage: number) => stage === 5 || stage >= 7;
/** Friendship level that makes best friends (a banner and a crown). */
export const BEST_FRIENDS_LEVEL = 10;

/** How the in-between growth stages read: "Your Yoga plant is getting leafy 🌿". */
const STAGE_PHRASE: Record<number, [phrase: string, emoji: string]> = {
  1: ['sprouted', '🌱'],
  2: ['is a little seedling now', '🌱'],
  3: ['is getting leafy', '🌿'],
  4: ['has its first bud', '🌷'],
  6: ['is flourishing', '✨'],
};

const plantOf = (name: string | undefined) => (name ? `Your ${name} plant` : 'Your plant');

/** The coins/stars an event adds that should fly into the wallet (reserved the moment it arrives). */
export function walletDelta(e: GameEvent): { kind: 'coins' | 'stars'; amount: number } | null {
  if (e.type === 'coins' && e.reason !== 'refund' && e.amount > 0) return { kind: 'coins', amount: e.amount };
  if (e.type === 'stars' && e.reason !== 'fusion' && e.amount > 0) return { kind: 'stars', amount: e.amount };
  return null;
}

/** How strongly a moment is felt: 'big' ones get a banner (and a success haptic), 'small' ones a toast. */
export function eventWeight(e: GameEvent): 'big' | 'small' | null {
  switch (e.type) {
    case 'exclusive':
    case 'showUp':
    case 'perfectDay':
    case 'badge':
      return 'big';
    case 'plantStage':
      return isMajorStage(e.stage) ? 'big' : 'small';
    case 'petLevel':
      return e.level >= BEST_FRIENDS_LEVEL ? 'big' : 'small';
    case 'stars':
      return e.reason === 'fusion' ? 'small' : null;
    case 'favoriteFound':
    case 'welcomeHome':
    case 'rung':
    case 'periodGoal':
    case 'letter':
      return 'small';
    default:
      return null;
  }
}

const UNIT_LABEL = { days: ['day', 'days'], times: ['time in a row', 'in a row'], weeks: ['week', 'weeks'], months: ['month', 'months'] } as const;
const MILESTONE_LINES = ['Look at you go!', 'That is real, lovely consistency.', 'Your plant is beaming.', 'Your future self says thank you.', 'Tiny steps, big bloom.'];

/** Rung → day-equivalent, for sizing the party (DESIGN §5.4). */
function dayEquivalent(rung: number, unit: 'days' | 'weeks' | 'months'): number {
  return unit === 'days' ? rung : unit === 'weeks' ? rung * 7 : rung * 30;
}

interface Moment {
  priority: number;
  line: string;
  banner?: Omit<BannerSpec, 'also' | 'rewards' | 'priority'>;
  toast?: ToastSpec;
}

export function planCelebration(events: readonly GameEvent[], ctx: CelebrationContext): CelebrationPlan {
  const bonus: Tally = { ...EMPTY_TALLY };
  const moments: Moment[] = [];
  const habitName = (id: string) => ctx.habit(id)?.name ?? 'your habit';
  const exclusives = new Set<string>();

  for (const e of events) {
    switch (e.type) {
      case 'coins':
        if (e.reason === 'refund') break;
        if (e.reason === 'checkin' && e.habitId && ctx.locallyCelebrated.has(e.habitId)) break;
        bonus.coins += e.amount;
        break;
      case 'stars':
        if (e.reason === 'fusion') {
          moments.push({
            priority: 15,
            line: `Stardust became ${plural(e.amount, 'star')} ✦`,
            toast: { key: 'fusion', message: `Your stardust fused into ${plural(e.amount, 'star')} ✦`, tone: 'lavender', art: { type: 'currency', kind: 'stars' }, sound: 'sparkle' },
          });
        } else bonus.stars += e.amount;
        break;
      case 'tickets':
        bonus.tickets += e.amount;
        break;
      case 'stardust':
        bonus.stardust += e.amount;
        break;
      case 'exclusive':
        exclusives.add(e.collectibleId);
        break;
      case 'rung': {
        const [one, many] = UNIT_LABEL[e.unit];
        const name = habitName(e.habitId);
        moments.push({
          priority: 40,
          line: `${e.streak} ${e.streak === 1 ? one : many} of ${name}`,
          toast: { key: `rung-${e.habitId}`, message: `${name}: ${e.streak} ${e.streak === 1 ? one : many}.`, tone: 'sage', art: { type: 'currency', kind: 'coins' }, sound: 'chime' },
        });
        break;
      }
      case 'showUp': {
        if (e.exclusive) exclusives.add(e.exclusive);
        moments.push({
          priority: 80,
          line: `${e.days} days of showing up`,
          banner: {
            kind: 'milestone',
            eyebrow: 'Showing up',
            title: `${e.days} days with a check-in`,
            text: MILESTONE_LINES[e.days % MILESTONE_LINES.length]!,
            art: { type: 'pet', petId: ctx.buddy, expression: 'love' },
            tone: 'blush',
            epic: false,
            confetti: dayEquivalent(e.days, 'days') >= 30 ? 'big' : 'medium',
            sound: 'fanfare',
          },
        });
        break;
      }
      case 'plantStage': {
        const h = ctx.habit(e.habitId);
        const plant = plantOf(h?.name);
        if (isMajorStage(e.stage) && h) {
          const evergreen = e.stage >= 7;
          const firstBloom = !evergreen && events.some((x) => x.type === 'badge' && x.badgeId === 'first-bloom');
          moments.push({
            priority: 70,
            line: `${plant} is ${evergreen ? 'Evergreen' : 'blooming'}`,
            banner: {
              kind: 'plant',
              eyebrow: evergreen ? 'Evergreen' : firstBloom ? 'First bloom' : 'In bloom',
              title: `${plant} is ${evergreen ? 'Evergreen' : 'blooming'}!`,
              text: evergreen ? 'Months of gentle care, and now it shines. A tiny golden watering can is yours.' : 'All that gentle care is showing. It’s so proud of you.',
              art: { type: 'plant', species: h.plant, stage: e.stage, pot: h.pot },
              tone: 'sage',
              epic: false,
              confetti: evergreen ? 'big' : 'medium',
              sound: evergreen ? 'fanfare' : 'reveal-rare',
            },
          });
        } else {
          const [phrase, emoji] = STAGE_PHRASE[e.stage] ?? ['is growing', '🌱'];
          moments.push({
            priority: 25,
            line: `${plant} ${phrase}`,
            toast: {
              key: `plant-${e.habitId}`,
              message: `${plant} ${phrase} ${emoji}`,
              tone: 'sage',
              art: h ? { type: 'plant', species: h.plant, stage: e.stage, pot: h.pot } : { type: 'pet', petId: ctx.buddy, expression: 'happy' },
              sound: 'sparkle',
            },
          });
        }
        break;
      }
      case 'perfectDay':
        moments.push({
          priority: 65,
          line: 'Perfect day',
          banner: {
            kind: 'perfectDay',
            eyebrow: 'Perfect day',
            title: 'Every habit, done!',
            text: `${ctx.petName(ctx.buddy)} is doing a little happy dance.`,
            art: { type: 'pet', petId: ctx.buddy, expression: 'happy' },
            tone: 'butter',
            epic: false,
            confetti: 'big',
            sound: 'fanfare',
          },
        });
        break;
      case 'badge': {
        const b = ctx.badge(e.badgeId);
        moments.push({
          priority: 60,
          line: `${b?.name ?? 'New'} badge`,
          banner: {
            kind: 'badge',
            eyebrow: 'New badge',
            title: b?.name ?? 'A new badge!',
            text: b?.description ?? 'Something lovely happened.',
            art: { type: 'badge', badgeId: e.badgeId },
            tone: b?.color ?? 'lavender',
            epic: false,
            confetti: 'medium',
            sound: 'reveal-uncommon',
          },
        });
        break;
      }
      case 'petLevel': {
        const name = ctx.petName(e.petId);
        if (e.level >= BEST_FRIENDS_LEVEL) {
          moments.push({
            priority: 55,
            line: `${name} is your best friend`,
            banner: {
              kind: 'bestFriends',
              eyebrow: 'Best friends',
              title: `You and ${name}`,
              text: 'Friendship level 10. A sparkly crown for the best of friends.',
              art: { type: 'pet', petId: e.petId, expression: 'love' },
              tone: 'blush',
              epic: false,
              confetti: 'medium',
              sound: 'fanfare',
            },
          });
        } else {
          moments.push({
            priority: 20,
            line: `${name} reached friendship level ${e.level}`,
            toast: { key: `pet-${e.petId}`, message: `${name} reached friendship level ${e.level} 💕`, tone: 'blush', art: { type: 'pet', petId: e.petId, expression: 'love' }, sound: 'sparkle' },
          });
        }
        break;
      }
      case 'favoriteFound': {
        const name = ctx.petName(e.petId);
        moments.push({
          priority: 22,
          line: `${name} loves ${ctx.itemName(e.treatId)}`,
          toast: { key: `fav-${e.petId}`, message: `${name} loves ${ctx.itemName(e.treatId)}! 💕`, tone: 'blush', art: { type: 'pet', petId: e.petId, expression: 'love' }, sound: 'sparkle' },
        });
        break;
      }
      case 'welcomeHome':
        moments.push({
          priority: 30,
          line: 'Everything kept',
          toast: { key: 'welcome-home', message: 'Everything kept. There’s a ticket on the sill.', tone: 'blush', art: { type: 'pet', petId: ctx.buddy, expression: 'happy' }, sound: 'chime' },
        });
        break;
      case 'periodGoal':
        moments.push({
          priority: 28,
          line: `${habitName(e.habitId)}: ${e.period === 'week' ? 'weekly' : 'monthly'} goal met`,
          toast: {
            key: `period-${e.habitId}`,
            message: `${habitName(e.habitId)}: ${e.period === 'week' ? 'weekly' : 'monthly'} goal met! 🌿`,
            tone: 'sage',
            art: { type: 'currency', kind: 'coins' },
            sound: 'chime',
          },
        });
        break;
      case 'letter':
        moments.push({
          priority: 10,
          line: 'A letter arrived',
          toast: { key: 'letter', message: 'A little letter arrived for you 💌', tone: 'lilac', art: { type: 'pet', petId: ctx.buddy, expression: 'happy' }, sound: 'pop' },
        });
        break;
      case 'checkin':
      case 'uncheck':
        break;
    }
  }

  for (const id of exclusives) {
    moments.push({
      priority: 100,
      line: ctx.itemName(id),
      banner: {
        kind: 'exclusive',
        eyebrow: 'Something special',
        title: ctx.itemName(id),
        text: ctx.itemFlavor(id),
        art: { type: 'collectible', id },
        tone: 'butter',
        epic: true,
        confetti: 'epic',
        sound: 'reveal-ultra',
      },
    });
  }

  const ranked = moments.sort((a, b) => b.priority - a.priority);
  const lead = ranked.find((m) => m.banner);
  if (!lead?.banner) {
    const toasts = ranked.flatMap((m) => (m.toast ? [m.toast] : []));
    // One small moment carries its own bonus ("Welcome back to Walk! 🌷 +3"): one toast, not two.
    if (toasts.length === 1 && !isEmptyTally(bonus)) return { banner: null, toasts: [{ ...toasts[0]!, rewards: bonus }], wallet: { ...EMPTY_TALLY } };
    return { banner: null, toasts, wallet: bonus };
  }
  // The lead banner carries every reward and folds the other moments into short lines.
  // Letters still toast: they point somewhere (the inbox), not just at a feeling.
  const others = ranked.filter((m) => m !== lead);
  return {
    banner: {
      ...lead.banner,
      priority: lead.priority,
      also: others
        .filter((m) => m.toast?.key !== 'letter')
        .slice(0, 2)
        .map((m) => m.line),
      rewards: bonus,
    },
    toasts: others.flatMap((m) => (m.toast?.key === 'letter' ? [m.toast] : [])),
    wallet: { ...EMPTY_TALLY },
  };
}

/**
 * Queue a banner behind the one showing. A long queue merges the newcomer into the last
 * waiting banner, so a burst of achievements becomes one or two calm cards.
 */
export function enqueueBanner<T extends BannerSpec>(queue: readonly T[], next: T, maxQueued = 2): T[] {
  if (queue.length <= maxQueued || next.epic) return [...queue, next];
  const last = queue[queue.length - 1]!;
  const merged: T = {
    ...last,
    also: [...last.also, next.title].slice(0, 3),
    rewards: addTally(last.rewards, next.rewards),
  };
  return [...queue.slice(0, -1), merged];
}
