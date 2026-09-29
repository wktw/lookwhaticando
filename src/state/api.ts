/**
 * Store API contract: result & event types shared by the domain layer (which implements
 * them) and every UI feature (which consumes them). Changing these is a cross-team change.
 */
import type { MachineId, Rarity, WearableSlot, DecorSlot, PastelKey, PlantSpeciesId, PotId } from '@/catalog/types';
import type { DateKey, Effort, Schedule, PetState } from './types';

/* ------------------------------------------------------------------ */
/* Game events: emitted by actions, consumed by FX/celebration layers  */
/* ------------------------------------------------------------------ */

export type CoinReason = 'checkin' | 'perfect' | 'period' | 'welcome' | 'milestone' | 'letter' | 'badge' | 'gift' | 'refund';

export type GameEvent =
  | { type: 'coins'; amount: number; reason: CoinReason; habitId?: string }
  | { type: 'stars'; amount: number; reason: 'milestone' | 'letter' | 'badge' | 'fusion' | 'gift' }
  | { type: 'tickets'; amount: number }
  | { type: 'stardust'; amount: number; /** stars produced by fusion as a result */ fused: number }
  | { type: 'checkin'; habitId: string; date: DateKey; completed: boolean; count: number; target: number }
  | { type: 'uncheck'; habitId: string; date: DateKey; refunded: number }
  | { type: 'perfectDay'; date: DateKey; coins: number }
  | { type: 'periodGoal'; habitId: string; period: 'week' | 'month'; coins: number }
  | { type: 'welcomeBack'; habitId: string; coins: number }
  | { type: 'milestone'; habitId: string; rung: number; unit: 'days' | 'weeks' | 'months'; coins: number; stars: number; tickets: number; exclusive?: string }
  | { type: 'plantStage'; habitId: string; stage: number; stageName: string }
  | { type: 'badge'; badgeId: string; stars: number }
  | { type: 'exclusive'; collectibleId: string }
  | { type: 'petLevel'; petId: string; level: number }
  | { type: 'favoriteFound'; petId: string; treatId: string }
  | { type: 'letter'; letterId: string };

/* ------------------------------------------------------------------ */
/* Action inputs & results                                              */
/* ------------------------------------------------------------------ */

export interface HabitInput {
  name: string;
  emoji: string;
  color: PastelKey;
  plant: PlantSpeciesId;
  pot: PotId;
  schedule: Schedule;
  target: number;
  unit?: string;
  effort: Effort;
  reminder?: string;
  notes?: string;
}

export interface ActionResult {
  events: GameEvent[];
}

export interface CheckInResult extends ActionResult {
  /** Coins granted by this action in total (check-in + bonuses). */
  coins: number;
  /** Whether this action completed the occurrence (day target reached / flexible day checked). */
  completed: boolean;
  /** Whether rewards were earned (false for older-than-6-days history edits, or already-granted). */
  rewarded: boolean;
}

export type PullError = 'not-enough-coins' | 'not-enough-stars' | 'machine-unavailable' | 'no-ticket';

export interface PullResult extends ActionResult {
  ok: true;
  machineId: MachineId;
  itemId: string;
  rarity: Rarity;
  isNew: boolean;
  /** Stardust gained (duplicates only). */
  stardust: number;
  /** Stars created by stardust fusion during this pull. */
  fusedStars: number;
  /** For new pets: the freshly rolled pet state (personality etc.). */
  pet?: PetState;
  /** For duplicate pets: friendship XP gained. */
  friendshipXp?: number;
  /** Pity info after this pull. */
  pity: { rareIn: number; ultraIn: number };
  paidWith: 'coins' | 'stars' | 'ticket' | 'free';
}

export type PullOutcome = PullResult | { ok: false; error: PullError };

export type WishOutcome = ({ ok: true; itemId: string; stars: number; pet?: PetState } & ActionResult) | { ok: false; error: 'not-enough-stars' | 'already-owned' | 'not-wishable' };

export interface PetInteractionResult extends ActionResult {
  xpGained: number;
  level: number;
  leveledUp: boolean;
  /** 'full' when the daily treat cap is reached; 'love' when favorite treat; 'capped' when petting cap reached. */
  reaction: 'happy' | 'love' | 'full' | 'capped';
  line?: string;
}

export interface MachineStatus {
  id: MachineId;
  available: boolean;
  /** For seasonal machines: next availability window (month/day) and end date if active. */
  activeUntil?: DateKey;
  nextStart?: DateKey;
  owned: number;
  total: number;
  complete: boolean;
  rareIn: number;
  ultraIn: number;
  canAfford: boolean;
}

export type OutfitChange = { petId: string; slot: WearableSlot; itemId: string | null };
export type DecorChange = { slot: DecorSlot; itemId: string | null };
