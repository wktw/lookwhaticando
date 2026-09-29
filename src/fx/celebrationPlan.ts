/**
 * Pure celebration planning: one batch of GameEvents (everything a single action emitted) →
 * at most one banner, a few paper notes, and a wallet tally. Big moments win by priority and
 * absorb the smaller ones as "also" lines, so rapid or stacked rewards never spam.
 * Every word comes from ./copy (lines.ts and docs/VOICE.md).
 */
import type { GameEvent } from '@/state/api';
import type { PlantSpeciesId, PotId, Species } from '@/catalog/types';
import type { BadgeDef } from '@/catalog/badges';
import type { Expression } from '@/art/pets/types';
import type { Tone } from '@/ui/tone';
import type { Intensity } from './particles';
import { petalMix, type PetalMix } from './petalColours';
import type { SfxName } from './sound';
import {
  albumTitle,
  asAlso,
  BEST_FRIENDS,
  bloomLine,
  companionLine,
  CURRENCY,
  EVERGREEN_LINE,
  EXCLUSIVE,
  exclusiveLine,
  favouriteLine,
  FIELD_GUIDE,
  foundLine,
  friendshipLine,
  harvestLine,
  isMajorStage,
  keepsakeLine,
  longDate,
  lookLine,
  majorStageTitle,
  NOTE_ON_SILL,
  PERFECT_DAY,
  periodGoalLine,
  PIN,
  pinLine,
  rungLine,
  seasonReviewLine,
  SHOWING_UP,
  showUpLine,
  showUpText,
  showUpTitle,
  stageLine,
  storyLine,
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
  | { type: 'currency'; kind: 'coins' | 'stars' | 'tickets' | 'stardust' }
  | { type: 'object'; name: ObjectArt };

export type BannerKind = 'exclusive' | 'milestone' | 'plant' | 'perfectDay' | 'badge' | 'album' | 'bestFriends';

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
  /** What they are: the plants' own flowers and leaves (DESIGN §10.5). */
  petals?: PetalMix;
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

export interface HabitInfo {
  name: string;
  plant: PlantSpeciesId;
  pot: PotId;
  /** The plant's stage now (art for a look, a harvest). */
  stage?: number;
  /** An avoid habit: its rungs read "held off 14 days". */
  avoid?: boolean;
}

export interface CelebrationContext {
  habit(id: string): HabitInfo | undefined;
  petName(id: string): string;
  /** The pet's species (friendship lines are species-true). Defaults to the cat's lines. */
  petSpecies?(id: string): Species | undefined;
  /** The pet it naps next to at level 8 ('' while it has no friend on the sill). */
  petFriend?(id: string): string;
  itemName(id: string): string;
  /** Kept for callers; exclusives now use lines.ts EXCLUSIVE_LINES. */
  itemFlavor(id: string): string;
  badge(id: string): BadgeDef | undefined;
  /** A Field Guide page's name ("Cats", "Pond Club"). */
  albumName?(id: string): string;
  /** The pet who keeps Today company (may be empty). */
  buddy: string;
  /** Habits whose check-in coins the screen already celebrated with its own flourish. */
  locallyCelebrated: ReadonlySet<string>;
  /** The plants on today's sill (a perfect day's petals are theirs). */
  sill?(): readonly PlantSpeciesId[];
  /** From 8 pm, or under the lamp: a perfect day's sill is in the lamplight. */
  lamplight?(): boolean;
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

/** Friendship level that makes best friends (a note in the band and a brass tag); the bond levels after it are notes. */
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
    case 'album':
      return 'big';
    case 'plantStage':
      return isMajorStage(e.stage) ? 'big' : 'small';
    case 'petLevel':
      return e.level === BEST_FRIENDS_LEVEL ? 'big' : 'small';
    case 'stars':
      return e.reason === 'fusion' ? 'small' : null;
    case 'harvest':
      return e.firstTime ? 'small' : null;
    case 'favoriteFound':
    case 'welcomeHome':
    case 'rung':
    case 'periodGoal':
    case 'letter':
    case 'keepsake':
    case 'look':
    case 'companion':
    case 'foundThing':
    case 'story':
    case 'seasonReview':
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
  /** A note that points somewhere (the sill, the plant tag, Today): it keeps its own toast beside a banner. */
  points?: boolean;
}

/**
 * Priorities follow DESIGN §9.1, extended to every event the domain emits: exclusive > plant
 * Blooming/Evergreen (with its new look and keepsake as the first "also" lines) > Showing-up rung
 * > perfect day > streak rung > pin > Field Guide page > best friends > companion > story > welcome
 * home > period goal > small stage > favourite > friendship > found thing > harvest > swaps >
 * season review > note on the sill. A retired habit, a pantry restock and companion friendship are
 * silent here (the check-in note carries the companion's aside).
 */
export const PRIORITY = {
  exclusive: 100,
  plant: 80,
  look: 79,
  keepsake: 78,
  showUp: 75,
  perfectDay: 65,
  rung: 62,
  pin: 60,
  album: 58,
  bestFriends: 55,
  companion: 45,
  story: 35,
  welcome: 30,
  period: 28,
  stage: 25,
  favourite: 22,
  friendship: 20,
  found: 18,
  harvest: 16,
  swaps: 15,
  season: 12,
  note: 10,
} as const;

export function planCelebration(events: readonly GameEvent[], ctx: CelebrationContext): CelebrationPlan {
  const bonus: Tally = { ...EMPTY_TALLY };
  const moments: Moment[] = [];
  const habitName = (id: string) => ctx.habit(id)?.name ?? 'A habit';
  const petArt = (petId: string, expression: Expression = 'happy'): CelebrationArt => ({ type: 'pet', petId, expression });
  /** Exclusive item → what it was for (its eyebrow). */
  const exclusives = new Map<string, string>();
  const evergreenInBatch = events.some((e) => e.type === 'plantStage' && e.stage >= 7);
  /** Swaps a found-thing note already shows as its own "+1 swap". */
  let foundSwaps = 0;

  for (const e of events) {
    switch (e.type) {
      case 'coins':
        // Spending (the swap-in, the onboarding capsule's top-up, a paid pull) and refunds are the
        // wallet counter's to show: they never shrink or cancel a "+25 coins" note.
        if (e.amount <= 0 || e.reason === 'refund') break;
        if (e.reason === 'checkin' && e.habitId && ctx.locallyCelebrated.has(e.habitId)) break;
        bonus.coins += e.amount;
        break;
      case 'stars':
        if (e.amount <= 0) break;
        if (e.reason === 'fusion') {
          const line = swapsLine(e.amount);
          moments.push({ priority: PRIORITY.swaps, line: asAlso(line), toast: { key: 'swaps', message: line, tone: 'lavender', art: { type: 'currency', kind: 'stars' }, sound: 'sparkle' } });
        } else bonus.stars += e.amount;
        break;
      case 'tickets':
        if (e.amount > 0) bonus.tickets += e.amount;
        break;
      case 'stardust':
        if (e.amount > 0) bonus.stardust += e.amount;
        break;
      case 'exclusive':
        if (!exclusives.has(e.collectibleId)) exclusives.set(e.collectibleId, evergreenInBatch ? EXCLUSIVE.forEvergreen : EXCLUSIVE.kept);
        break;
      case 'rung': {
        const line = rungLine(habitName(e.habitId), e.streak, e.unit, ctx.habit(e.habitId)?.avoid);
        moments.push({ priority: PRIORITY.rung, line: asAlso(line), toast: { key: `rung-${e.habitId}`, message: line, tone: 'sage', art: { type: 'currency', kind: 'coins' }, sound: 'chime' } });
        break;
      }
      case 'showUp': {
        if (e.exclusive) exclusives.set(e.exclusive, EXCLUSIVE.forShowingUp(e.days));
        moments.push({
          priority: PRIORITY.showUp,
          line: showUpLine(e.days),
          banner: {
            kind: 'milestone',
            eyebrow: SHOWING_UP.eyebrow,
            title: showUpTitle(e.days),
            text: showUpText({ stamps: e.stars, tickets: e.tickets }),
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
          const title = majorStageTitle(h, e.stage);
          moments.push({
            priority: PRIORITY.plant,
            line: title,
            banner: {
              kind: 'plant',
              eyebrow: evergreen ? 'Evergreen' : 'Blooming',
              title,
              text: evergreen ? EVERGREEN_LINE : bloomLine(h),
              art: { type: 'plant', species: h.plant, stage: e.stage, pot: h.pot },
              tone: 'sage',
              epic: false,
              confetti: evergreen ? 'big' : 'medium',
              petals: petalMix([h.plant]),
              sound: evergreen ? 'fanfare' : 'reveal-rare',
            },
          });
        } else {
          const line = stageLine(h, e.stage);
          moments.push({
            priority: PRIORITY.stage,
            line: asAlso(line),
            toast: { key: `plant-${e.habitId}`, message: line, tone: 'sage', art: h ? { type: 'plant', species: h.plant, stage: e.stage, pot: h.pot } : { type: 'object', name: e.stage >= 2 ? 'pot' : 'cutting' }, sound: 'sparkle' },
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
            eyebrow: /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? longDate(e.date) : PERFECT_DAY.line,
            title: PERFECT_DAY.title,
            text: ctx.lamplight?.() ? PERFECT_DAY.lampText : PERFECT_DAY.text,
            art: ctx.buddy ? petArt(ctx.buddy, 'sleep') : { type: 'object', name: 'watering-can' },
            tone: 'butter',
            epic: false,
            confetti: 'big',
            petals: petalMix(ctx.sill?.() ?? []),
            sound: 'fanfare',
          },
        });
        break;
      case 'badge': {
        const b = ctx.badge(e.badgeId);
        const name = b?.name ?? PIN.eyebrow;
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
      case 'album': {
        // A page with a keepsake is the calm epic moment, whose line already says the page is full.
        if (e.exclusive) {
          exclusives.set(e.exclusive, EXCLUSIVE.forAlbum);
          break;
        }
        const title = albumTitle(ctx.albumName?.(e.albumId) ?? e.albumId);
        moments.push({
          priority: PRIORITY.album,
          line: title,
          banner: {
            kind: 'album',
            eyebrow: FIELD_GUIDE.eyebrow,
            title,
            text: showUpText({ stamps: e.stars }),
            art: { type: 'currency', kind: 'stars' },
            tone: 'lavender',
            epic: false,
            confetti: 'medium',
            sound: 'reveal-uncommon',
          },
        });
        break;
      }
      case 'petLevel': {
        const name = ctx.petName(e.petId);
        if (e.level === BEST_FRIENDS_LEVEL) {
          moments.push({
            priority: PRIORITY.bestFriends,
            line: BEST_FRIENDS.line(name),
            banner: {
              kind: 'bestFriends',
              eyebrow: BEST_FRIENDS.eyebrow,
              title: BEST_FRIENDS.title(name),
              text: BEST_FRIENDS.text,
              art: petArt(e.petId),
              tone: 'blush',
              epic: false,
              confetti: 'medium',
              sound: 'fanfare',
            },
          });
        } else {
          const line = friendshipLine(name, e.level, ctx.petSpecies?.(e.petId), ctx.petFriend?.(e.petId));
          moments.push({ priority: PRIORITY.friendship, line: asAlso(line), toast: { key: `pet-${e.petId}`, message: line, tone: 'blush', art: petArt(e.petId), sound: 'sparkle' } });
        }
        break;
      }
      case 'favoriteFound': {
        const line = favouriteLine(ctx.petName(e.petId), ctx.itemName(e.treatId));
        moments.push({ priority: PRIORITY.favourite, line: line.slice(0, line.indexOf('.')), toast: { key: `fav-${e.petId}`, message: line, tone: 'blush', art: petArt(e.petId), sound: 'sparkle' } });
        break;
      }
      case 'welcomeHome': {
        const line = welcomeHomeLine(e.tickets);
        moments.push({ priority: PRIORITY.welcome, line: 'Everything kept', toast: { key: 'welcome-home', message: line, tone: 'blush', art: { type: 'currency', kind: 'tickets' }, sound: 'chime' } });
        break;
      }
      case 'periodGoal': {
        const line = periodGoalLine(habitName(e.habitId), e.period);
        moments.push({ priority: PRIORITY.period, line: asAlso(line), toast: { key: `period-${e.habitId}`, message: line, tone: 'sage', art: { type: 'currency', kind: 'coins' }, sound: 'chime' } });
        break;
      }
      case 'letter':
        moments.push({ priority: PRIORITY.note, line: asAlso(NOTE_ON_SILL), points: true, toast: { key: 'letter', message: NOTE_ON_SILL, tone: 'lilac', art: { type: 'object', name: 'note' }, sound: 'pop' } });
        break;
      case 'keepsake': {
        const line = keepsakeLine(ctx.petName(e.petId), e.kind);
        moments.push({ priority: PRIORITY.keepsake, line: asAlso(line), toast: { key: `keepsake-${e.keepsakeId}`, message: line, tone: 'butter', art: petArt(e.petId), sound: 'sparkle' } });
        break;
      }
      case 'look': {
        const h = ctx.habit(e.habitId);
        const line = lookLine(h, e.colour, e.shape);
        const stage = e.read === 'evergreen' ? 7 : Math.max(5, h?.stage ?? 5);
        moments.push({
          priority: PRIORITY.look,
          line: asAlso(line),
          toast: { key: `look-${e.habitId}`, message: line, tone: 'lavender', art: h ? { type: 'plant', species: h.plant, stage, pot: h.pot } : { type: 'object', name: 'pot' }, sound: 'sparkle' },
        });
        break;
      }
      case 'harvest': {
        // The first serving is news; after that it is the check-in note's aside (showCheckInNote).
        if (!e.firstTime) break;
        const h = ctx.habit(e.habitId);
        const line = harvestLine(h?.plant);
        if (!line) break;
        moments.push({
          priority: PRIORITY.harvest,
          line: asAlso(line),
          toast: { key: `harvest-${e.habitId}`, message: line, tone: 'sage', art: h ? { type: 'plant', species: h.plant, stage: Math.max(5, h.stage ?? 5), pot: h.pot } : { type: 'collectible', id: e.treatId }, sound: 'pop' },
        });
        break;
      }
      case 'companion': {
        const line = companionLine(ctx.petName(e.petId), ctx.habit(e.habitId));
        moments.push({ priority: PRIORITY.companion, line: asAlso(line), toast: { key: `companion-${e.petId}`, message: line, tone: 'blush', art: petArt(e.petId), sound: 'chime' } });
        break;
      }
      case 'foundThing': {
        foundSwaps += Math.max(0, e.swaps);
        const line = foundLine(ctx.petName(e.petId), e.seed);
        const rewards = { ...EMPTY_TALLY, stardust: Math.max(0, e.swaps) };
        moments.push({ priority: PRIORITY.found, line: asAlso(line), points: true, toast: { key: `found-${e.date}`, message: line, tone: 'lilac', art: petArt(e.petId), sound: 'pop', rewards } });
        break;
      }
      case 'story': {
        const line = storyLine(habitName(e.habitId));
        moments.push({ priority: PRIORITY.story, line: asAlso(line), points: true, toast: { key: `story-${e.habitId}`, message: line, tone: 'lilac', art: { type: 'object', name: 'note' }, sound: 'pop' } });
        break;
      }
      case 'seasonReview': {
        const line = seasonReviewLine(e.season);
        moments.push({ priority: PRIORITY.season, line: line.slice(0, line.indexOf('.')), points: true, toast: { key: 'season-review', message: line, tone: 'lilac', art: { type: 'object', name: 'note' }, sound: 'pop' } });
        break;
      }
      case 'companionXp':
      case 'retired':
      case 'restock':
      case 'checkin':
      case 'uncheck':
        break;
    }
  }

  // A found thing's swap is on its own note ("… on the sill. +1 {swap}"), not the tally again.
  bonus.stardust = Math.max(0, bonus.stardust - foundSwaps);

  for (const [id, eyebrow] of exclusives) {
    const title = ctx.itemName(id);
    moments.push({
      priority: PRIORITY.exclusive,
      line: title,
      banner: {
        kind: 'exclusive',
        eyebrow,
        title,
        text: exclusiveLine(id, title),
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
    if (toasts.length === 1 && !isEmptyTally(bonus)) {
      const own = toasts[0]!;
      return { banner: null, toasts: [{ ...own, rewards: addTally(own.rewards ?? EMPTY_TALLY, bonus) }], wallet: { ...EMPTY_TALLY } };
    }
    return { banner: null, toasts, wallet: bonus };
  }
  // The lead banner carries every reward and folds the other moments into short lines.
  // A note that points somewhere (the sill, the tag, Today) still gets its own toast.
  const others = ranked.filter((m) => m !== lead);
  const eyebrow = lead.banner.eyebrow.toLowerCase();
  const text = lead.banner.text.toLowerCase();
  return {
    banner: {
      ...lead.banner,
      priority: lead.priority,
      also: others
        // A line the eyebrow or the text already says ("Showing up: 365 days") isn't repeated.
        .filter((m) => !m.points && !eyebrow.includes(m.line.toLowerCase()) && !text.includes(m.line.toLowerCase()))
        .slice(0, 2)
        .map((m) => m.line),
      rewards: bonus,
    },
    toasts: others.flatMap((m) => (m.points && m.toast ? [m.toast] : [])),
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
