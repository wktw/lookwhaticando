/**
 * Store API contract: result & event types shared by the domain layer (which implements
 * them) and every UI feature (which consumes them). Changing these is a cross-team change.
 */
import type { MachineId, Rarity, WearableSlot, PastelKey, PlantSpeciesId, PotId } from '@/catalog/types';
import type { DateKey, Effort, Schedule, PetState, TimeOfDay, MeadowZoneId } from './types';

/* ------------------------------------------------------------------ */
/* Game events: emitted by actions, consumed by FX/celebration layers  */
/* ------------------------------------------------------------------ */

export type CoinReason = 'checkin' | 'perfect' | 'period' | 'home' | 'rung' | 'letter' | 'badge' | 'gift' | 'refund' | 'exchange';

export type GameEvent =
  /** `amount` < 0 when coins leave the wallet by a refund (un-check) or the sparkle exchange. */
  | { type: 'coins'; amount: number; reason: CoinReason; habitId?: string }
  | { type: 'stars'; amount: number; reason: 'showup' | 'letter' | 'bloom' | 'badge' | 'fusion' | 'gift' }
  | { type: 'tickets'; amount: number }
  | { type: 'stardust'; amount: number; /** stars produced by fusion as a result */ fused: number }
  | { type: 'checkin'; habitId: string; date: DateKey; completed: boolean; tiny: boolean; count: number; target: number }
  | { type: 'uncheck'; habitId: string; date: DateKey; refunded: number }
  | { type: 'perfectDay'; date: DateKey; coins: number }
  | { type: 'periodGoal'; habitId: string; period: 'week' | 'month'; coins: number }
  /** App-level gift after ≥3 quiet days (never mentions the gap). */
  | { type: 'welcomeHome'; coins: number; tickets: number }
  /** Per-habit streak rung (coins only). */
  | { type: 'rung'; habitId: string; streak: number; unit: 'days' | 'times' | 'weeks' | 'months'; tierDays: number; coins: number }
  /** Account-level Showing-up ladder (stars/tickets/exclusives). */
  | { type: 'showUp'; days: number; stars: number; tickets: number; exclusive?: string }
  | { type: 'plantStage'; habitId: string; stage: number; stageName: string }
  | { type: 'badge'; badgeId: string; stars: number }
  | { type: 'exclusive'; collectibleId: string }
  | { type: 'petLevel'; petId: string; level: number }
  | { type: 'favoriteFound'; petId: string; treatId: string }
  | { type: 'letter'; letterId: string }
  | { type: 'restock'; treats: number }
  /** Stage 2: a check-in on a Blooming+ plant dropped a harvest treat into the basket (DESIGN §13.10). */
  | { type: 'harvest'; habitId: string; treatId: string; firstTime: boolean }
  /** Stage 2: a species album was completed. `stars` = paid by the album itself (the first album's come via its badge). */
  | { type: 'album'; albumId: string; stars: number; exclusive?: string };

/* ------------------------------------------------------------------ */
/* Action inputs & results                                              */
/* ------------------------------------------------------------------ */

export interface HabitInput {
  name: string;
  icon: string;
  color: PastelKey;
  plant: PlantSpeciesId;
  pot: PotId;
  schedule: Schedule;
  target: number;
  step: number;
  tiny?: { label: string; count?: number };
  unit?: string;
  effort: Effort;
  timeOfDay: TimeOfDay;
  anchor?: string;
  polarity: 'build' | 'avoid';
  dueDay?: number | 'last';
  notes?: string;
}

export interface ActionResult {
  events: GameEvent[];
}

export interface CheckInResult extends ActionResult {
  /** Coins granted by this action in total (check-in + bonuses). */
  coins: number;
  /** Whether this action completed the occurrence (target reached / flexible day checked / tiny logged). */
  completed: boolean;
  /** Partial progress on a count habit (no celebration; ring tick only). */
  partial: boolean;
  /** Whether rewards were earned (false for history edits outside the 6-day window, or already paid). */
  rewarded: boolean;
}

export type PullError = 'not-enough-coins' | 'not-enough-stars' | 'machine-unavailable' | 'no-ticket' | 'reveal-pending';

export interface PullResult extends ActionResult {
  ok: true;
  machineId: MachineId;
  itemId: string;
  rarity: Rarity;
  isNew: boolean;
  /** True when the item is the machine's series Secret. */
  secret: boolean;
  /** Stardust gained (duplicates only). */
  stardust: number;
  /** Stars created by stardust fusion during this pull. */
  fusedStars: number;
  /** For new pets: the freshly rolled pet state (personality etc.). */
  pet?: PetState;
  /** For duplicate pets: friendship XP gained. */
  friendshipXp?: number;
  /** Pity after this pull; null when that tier is fully owned (counter hidden). */
  pity: { rareIn: number | null; ultraIn: number | null };
  /** Lucky meter: consecutive duplicates (0–4); at 4 the next pull is guaranteed new. */
  dupStreak: number;
  paidWith: 'coins' | 'stars' | 'ticket' | 'free';
}

export type PullOutcome = PullResult | { ok: false; error: PullError };

export type WishOutcome =
  | ({ ok: true; itemId: string; stars: number; pet?: PetState } & ActionResult)
  | { ok: false; error: 'not-enough-stars' | 'already-owned' | 'not-wishable' | 'season-not-visited' };

export interface PetInteractionResult extends ActionResult {
  xpGained: number;
  level: number;
  leveledUp: boolean;
  /** 'full' = treat cap reached; 'love' = favorite treat; 'capped' = petting XP capped (reaction still plays); 'none' = no servings left. */
  reaction: 'happy' | 'love' | 'full' | 'capped' | 'none';
  line?: string;
}

export interface MachineStatus {
  id: MachineId;
  available: boolean;
  /** For seasonal machines: end of the current window, or the next start. */
  activeUntil?: DateKey;
  nextStart?: DateKey;
  owned: number;
  total: number;
  complete: boolean;
  /** Pulls until guaranteed rare / ultra; null when hidden (tier fully owned). */
  rareIn: number | null;
  ultraIn: number | null;
  /** Lucky meter 0–4. */
  dupStreak: number;
  /** The series Secret item id. */
  secretId: string;
  canAfford: boolean;
  price: number;
  currency: 'coins' | 'stars';
}

export type OutfitChange = { petId: string; slot: WearableSlot; itemId: string | null };

export interface ImportPreview {
  ok: true;
  habits: number;
  checkins: number;
  friends: number;
  savedAt: number;
  device?: string;
}

export type ZonePurchase = { ok: true; zone: MeadowZoneId } | { ok: false; error: 'not-enough-coins' | 'owned' };
