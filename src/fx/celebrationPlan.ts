/**
 * Pure celebration planning: one batch of GameEvents (everything a single action emitted) →
 * at most one banner, a few paper notes, and a wallet tally. Big moments win by priority and
 * absorb the smaller ones as "also" lines, so rapid or stacked rewards never spam.
 * Every word comes from ./copy (the catkin voice, DESIGN §12).
 */
import type { GameEvent } from '@/state/api';
import type { PlantSpeciesId, PotId } from '@/catalog/types';
import type { BadgeDef } from '@/catalog/badges';
import type { Expression } from '@/art/pets/types';
import type { Tone } from '@/ui/tone';
import type { Intensity } from './particles';
import type { SfxName } from './sound';
import {
  BEST_FRIENDS,
  bloomLine,
  CURRENCY,
  enclosedLine,
  EVERGREEN_LINE,
  EXCLUSIVE,
  favouriteLine,
  friendshipLine,
  isMajorStage,
  majorStageTitle,
  NOTE_ON_SILL,
  PERFECT_DAY,
  periodGoalLine,
  PIN,
  pinLine,
  rungLine,
  SHOWING_UP,
  showUpTitle,
  stageLine,
  swapsLine,
  welcomeHomeLine,
} from './copy';

export { isMajorStage } from './copy';

export interface Tally {
  coins: number;
  /** Stamps (internal id: stars). */
  stars: number;
  tickets: number;
  /** Swaps (internal id: stardust). */
  stardust: number;
}

/** Small drawings the ui kit owns (src/ui/art). */
export type ObjectArt = 'watering-can' | 'note' | 'drop' | 'cutting' | 'pot';

export type CelebrationArt =
  | { type: 'pet'; petId: string; expression: Expression }
  | { type: 'badge'; badgeId: string }
  | { type: 'plant'; species: PlantSpeciesId; stage: number; pot: PotId }
  | { type: 'collectible'; id: string }
  | { type: 'currency'; kind: 'coins' | 'stars' | 'tickets' }
  | { type: 'object'; name: ObjectArt };

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
  /** The calm full-screen moment (exclusives), instead of a note in the band. */
  epic: boolean;
  /** How many petals fall (the field keeps its older name). */
  confetti: Intensity;
  sound: SfxName;
}

export interface ToastSpec {
  key: string;
  message: string;
  tone: Tone;
  art: CelebrationArt;
  sound?: SfxName;
  /** The batch's rewards, when this note is the only moment and carries them itself. */
  rewards?: Tally;
}

export interface CelebrationPlan {
  banner: BannerSpec | null;
  toasts: ToastSpec[];
  /** Small rewards for the rolling wallet note (zero when a banner carries them). */
  wallet: Tally;
}

export interface CelebrationContext {
  habit(id: string): { name: string; plant: PlantSpeciesId; pot: PotId } | undefined;
  petName(id: string): string;
  itemName(id: string): string;
  itemFlavor(id: string): string;
  badge(id: string): BadgeDef | undefined;
  /** The pet who keeps Today company (may be empty). */
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

const count = (n: number, [one, many]: readonly [string, string]) => `${n} ${n === 1 ? one : many}`;

/** "+18 coins · +1 stamp · +2 tickets · +4 swaps" (display names, DESIGN §6). */
export function formatTally(t: Tally): string {
  const parts: string[] = [];
  if (t.coins > 0) parts.push(`+${count(t.coins, CURRENCY.coins)}`);
  if (t.stars > 0) parts.push(`+${count(t.stars, CURRENCY.stars)}`);
  if (t.tickets > 0) parts.push(`+${count(t.tickets, CURRENCY.tickets)}`);
  if (t.stardust > 0) parts.push(`+${count(t.stardust, CURRENCY.stardust)}`);
  return parts.join(' · ');
}

/** Friendship level that makes best friends (a note in the band and a brass tag). */
export const BEST_FRIENDS_LEVEL = 10;

/** The coins/stamps an event adds that should fly into the wallet (reserved the moment it arrives). */
export function walletDelta(e: GameEvent): { kind: 'coins' | 'stars'; amount: number } | null {
  if (e.type === 'coins' && e.reason !== 'refund' && e.amount > 0) return { kind: 'coins', amount: e.amount };
  if (e.type === 'stars' && e.reason !== 'fusion' && e.amount > 0) return { kind: 'stars', amount: e.amount };
  return null;
}

/** How strongly a moment is felt: 'big' ones get a note in the band (and a success haptic), 'small' ones a toast. */
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

interface Moment {
  priority: number;
  line: string;
  banner?: Omit<BannerSpec, 'also' | 'rewards' | 'priority'>;
  toast?: ToastSpec;
}

/** Priorities follow DESIGN §9.1: bloom/evergreen > showing up > perfect day > streak rung > pin > friendship > period goal. */
const PRIORITY = { exclusive: 100, plant: 80, showUp: 75, perfectDay: 65, pin: 60, bestFriends: 55, rung: 40, welcome: 30, period: 28, favourite: 22, stage: 25, friendship: 20, swaps: 15, note: 10 } as const;

export function planCelebration(events: readonly GameEvent[], ctx: CelebrationContext): CelebrationPlan {
  const bonus: Tally = { ...EMPTY_TALLY };
  const moments: Moment[] = [];
  const habitName = (id: string) => ctx.habit(id)?.name ?? 'Your habit';
  /** Exclusive item → what it was for (its eyebrow). */
  const exclusives = new Map<string, string>();
  const evergreenInBatch = events.some((e) => e.type === 'plantStage' && e.stage >= 7);

  for (const e of events) {
    switch (e.type) {
      case 'coins':
        if (e.reason === 'refund') break;
        if (e.reason === 'checkin' && e.habitId && ctx.locallyCelebrated.has(e.habitId)) break;
        bonus.coins += e.amount;
        break;
      case 'stars':
        if (e.reason === 'fusion') {
          const line = swapsLine(e.amount);
          moments.push({ priority: PRIORITY.swaps, line, toast: { key: 'swaps', message: line, tone: 'lavender', art: { type: 'currency', kind: 'stars' }, sound: 'sparkle' } });
        } else bonus.stars += e.amount;
        break;
      case 'tickets':
        bonus.tickets += e.amount;
        break;
      case 'stardust':
        bonus.stardust += e.amount;
        break;
      case 'exclusive':
        if (!exclusives.has(e.collectibleId)) exclusives.set(e.collectibleId, evergreenInBatch ? EXCLUSIVE.forEvergreen : EXCLUSIVE.kept);
        break;
      case 'rung': {
        const line = rungLine(habitName(e.habitId), e.streak, e.unit);
        moments.push({ priority: PRIORITY.rung, line: line.slice(0, -1), toast: { key: `rung-${e.habitId}`, message: line, tone: 'sage', art: { type: 'currency', kind: 'coins' }, sound: 'chime' } });
        break;
      }
      case 'showUp': {
        if (e.exclusive) exclusives.set(e.exclusive, EXCLUSIVE.forShowingUp(e.days));
        const title = showUpTitle(e.days);
        moments.push({
          priority: PRIORITY.showUp,
          line: title,
          banner: {
            kind: 'milestone',
            eyebrow: SHOWING_UP.eyebrow,
            title,
            text: enclosedLine({ stamps: e.stars, tickets: e.tickets }),
            art: { type: 'currency', kind: 'stars' },
            tone: 'blush',
            epic: false,
            confetti: e.days >= 30 ? 'big' : 'medium',
            sound: 'fanfare',
          },
        });
        break;
      }
      case 'plantStage': {
        const h = ctx.habit(e.habitId);
        if (isMajorStage(e.stage) && h) {
          const evergreen = e.stage >= 7;
          const title = majorStageTitle(h.name, e.stage);
          moments.push({
            priority: PRIORITY.plant,
            line: title,
            banner: {
              kind: 'plant',
              eyebrow: evergreen ? 'Evergreen' : 'Blooming',
              title,
              text: evergreen ? EVERGREEN_LINE : bloomLine(h.plant),
              art: { type: 'plant', species: h.plant, stage: e.stage, pot: h.pot },
              tone: 'sage',
              epic: false,
              confetti: evergreen ? 'big' : 'medium',
              sound: evergreen ? 'fanfare' : 'reveal-rare',
            },
          });
        } else {
          const line = stageLine(h?.name, e.stage);
          moments.push({
            priority: PRIORITY.stage,
            line: line.slice(0, -1),
            toast: { key: `plant-${e.habitId}`, message: line, tone: 'sage', art: h ? { type: 'plant', species: h.plant, stage: e.stage, pot: h.pot } : { type: 'object', name: 'cutting' }, sound: 'sparkle' },
          });
        }
        break;
      }
      case 'perfectDay':
        moments.push({
          priority: PRIORITY.perfectDay,
          line: PERFECT_DAY.line,
          banner: {
            kind: 'perfectDay',
            eyebrow: PERFECT_DAY.eyebrow,
            title: PERFECT_DAY.title,
            text: PERFECT_DAY.text,
            art: ctx.buddy ? { type: 'pet', petId: ctx.buddy, expression: 'sleep' } : { type: 'object', name: 'watering-can' },
            tone: 'butter',
            epic: false,
            confetti: 'big',
            sound: 'fanfare',
          },
        });
        break;
      case 'badge': {
        const b = ctx.badge(e.badgeId);
        const name = b?.name ?? 'A new pin';
        moments.push({
          priority: PRIORITY.pin,
          line: pinLine(name),
          banner: {
            kind: 'badge',
            eyebrow: PIN.eyebrow,
            title: name,
            text: b?.description ?? '',
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
            priority: PRIORITY.bestFriends,
            line: BEST_FRIENDS.line(name),
            banner: {
              kind: 'bestFriends',
              eyebrow: BEST_FRIENDS.eyebrow,
              title: BEST_FRIENDS.title(name),
              text: BEST_FRIENDS.text,
              art: { type: 'pet', petId: e.petId, expression: 'happy' },
              tone: 'blush',
              epic: false,
              confetti: 'medium',
              sound: 'fanfare',
            },
          });
        } else {
          const line = friendshipLine(name, e.level);
          moments.push({ priority: PRIORITY.friendship, line: line.slice(0, -1), toast: { key: `pet-${e.petId}`, message: line, tone: 'blush', art: { type: 'pet', petId: e.petId, expression: 'happy' }, sound: 'sparkle' } });
        }
        break;
      }
      case 'favoriteFound': {
        const line = favouriteLine(ctx.petName(e.petId), ctx.itemName(e.treatId));
        moments.push({ priority: PRIORITY.favourite, line: line.slice(0, -1), toast: { key: `fav-${e.petId}`, message: line, tone: 'blush', art: { type: 'pet', petId: e.petId, expression: 'happy' }, sound: 'sparkle' } });
        break;
      }
      case 'welcomeHome': {
        const line = welcomeHomeLine(e.tickets);
        moments.push({ priority: PRIORITY.welcome, line: 'Everything kept', toast: { key: 'welcome-home', message: line, tone: 'blush', art: { type: 'currency', kind: 'tickets' }, sound: 'chime' } });
        break;
      }
      case 'periodGoal': {
        const line = periodGoalLine(habitName(e.habitId), e.period);
        moments.push({ priority: PRIORITY.period, line: line.slice(0, -1), toast: { key: `period-${e.habitId}`, message: line, tone: 'sage', art: { type: 'currency', kind: 'coins' }, sound: 'chime' } });
        break;
      }
      case 'letter':
        moments.push({ priority: PRIORITY.note, line: 'A note on the sill', toast: { key: 'letter', message: NOTE_ON_SILL, tone: 'lilac', art: { type: 'object', name: 'note' }, sound: 'pop' } });
        break;
      case 'checkin':
      case 'uncheck':
        break;
    }
  }

  for (const [id, eyebrow] of exclusives) {
    moments.push({
      priority: PRIORITY.exclusive,
      line: ctx.itemName(id),
      banner: {
        kind: 'exclusive',
        eyebrow,
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
    // One small moment carries its own rewards ("Everything kept. +20"): one note, not two.
    if (toasts.length === 1 && !isEmptyTally(bonus)) return { banner: null, toasts: [{ ...toasts[0]!, rewards: bonus }], wallet: { ...EMPTY_TALLY } };
    return { banner: null, toasts, wallet: bonus };
  }
  // The lead banner carries every reward and folds the other moments into short lines.
  // A note on the sill still gets its own toast: it points somewhere, not just at a feeling.
  const others = ranked.filter((m) => m !== lead);
  const eyebrow = lead.banner.eyebrow.toLowerCase();
  return {
    banner: {
      ...lead.banner,
      priority: lead.priority,
      also: others
        // A line the eyebrow already says ("For 365 days of showing up") isn't repeated.
        .filter((m) => m.toast?.key !== 'letter' && !eyebrow.includes(m.line.toLowerCase()))
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
 * waiting banner, so a burst of achievements becomes one or two calm notes.
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
