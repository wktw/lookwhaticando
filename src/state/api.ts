/**
 * Store API contract: result & event types shared by the domain layer (which implements
 * them) and every UI feature (which consumes them). Changing these is a cross-team change.
 */
import type { MachineId, PlaceId, Rarity, WearableSlot, PastelKey, PlantSpeciesId, PotId } from '@/catalog/types';
import type { BloomColour, BloomShape, DateKey, Effort, KeepsakeKind, Schedule, PetState, SeasonName, StoryId, TimeOfDay } from './types';

/* ------------------------------------------------------------------ */
/* Game events: emitted by actions, consumed by FX/celebration layers  */
/* ------------------------------------------------------------------ */

export type CoinReason = 'checkin' | 'perfect' | 'period' | 'home' | 'rung' | 'letter' | 'badge' | 'gift' | 'refund' | 'exchange' | 'spend';

/**
 * Why stamps (internally stars) moved: 'showup' the Showing-up ladder · 'letter' a Sunday Note ·
 * 'herbarium' a Herbarium page · 'badge' a pin · 'fusion' 10 swaps · 'grow' accepting "A bigger pot?"
 * (or Grow in the Season Review) · 'album' a full Field Guide page · 'spend' a No. 07 Night capsule
 * or a Special Order (amount < 0).
 */
export type StarReason = 'showup' | 'letter' | 'herbarium' | 'badge' | 'fusion' | 'grow' | 'album' | 'spend';

/** The rituals by their screen names (internally a weekly letter, a monthly bouquet, an anniversary note). */
export type RitualKind = 'sundayNote' | 'herbarium' | 'anniversary';

/**
 * Internal names (DESIGN §6): `stars` are stamps, `stardust` are swaps. The screens word every event
 * from its data (src/catalog/lines.ts); no event carries display text.
 */
export type GameEvent =
  /**
   * `amount` < 0 when coins leave the wallet: a refund (un-check), the swap-in ('exchange'), the
   * onboarding capsule spending First Sprout's top-up ('gift'), or a capsule paid with coins
   * ('spend'). Celebrations count only amount > 0.
   */
  | { type: 'coins'; amount: number; reason: CoinReason; habitId?: string }
  /** `amount` < 0 for 'spend' (a Night capsule, a Special Order). */
  | { type: 'stars'; amount: number; reason: StarReason }
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
  /** A plant reached a stage: word it from `stage` (STAGE_NAMES / STAGE_LINES in lines.ts). */
  | { type: 'plantStage'; habitId: string; stage: number }
  | { type: 'badge'; badgeId: string; stars: number }
  | { type: 'exclusive'; collectibleId: string }
  | { type: 'petLevel'; petId: string; level: number }
  | { type: 'favoriteFound'; petId: string; treatId: string }
  /** A ritual arrived on the sill: "There’s a note on the sill." / "There’s a page on the sill." */
  | { type: 'letter'; letterId: string; kind: RitualKind }
  | { type: 'restock'; treats: number }
  /** A check-in on a Blooming+ edible plant dropped a harvest treat into the basket (DESIGN §8.2). */
  | { type: 'harvest'; habitId: string; treatId: string; firstTime: boolean }
  /** A Field Guide page was completed. `stars` = paid by the page itself (the first page's come via its pin). */
  | { type: 'album'; albumId: string; stars: number; exclusive?: string }
  /**
   * An L6+ pet left a found thing on the sill (DESIGN §8.2): once a day on a day with a check-in,
   * worth `swaps` (a `stardust` event follows). `seed` picks the thing (a button, a leaf, a bead…).
   */
  | { type: 'foundThing'; petId: string; date: DateKey; seed: number; swaps: number }
  /** Keeping Company (§14.1): a pet moved into a habit's plant ("{name} moved into {plant}."). */
  | { type: 'companion'; petId: string; habitId: string }
  /** A companion's friendship grew through its habit's check-in (a `petLevel` may follow). */
  | { type: 'companionXp'; petId: string; habitId: string; date: DateKey; xp: number }
  /** A story unlocked on the plant tag ("There's a story on the plant tag for {habit}."). */
  | { type: 'story'; petId: string; habitId: string; story: StoryId }
  /** A companion left a keepsake by the pot (Rooting, Budding, Blooming, Evergreen). */
  | { type: 'keepsake'; keepsakeId: string; petId: string; habitId: string; stage: number; kind: KeepsakeKind }
  /** Blooms Like You (§14.2): the plant earned a new look ("A new look for {plant}: Twilight."). */
  | { type: 'look'; habitId: string; colour: BloomColour; shape: BloomShape; read: 'bloom' | 'evergreen' }
  /** A new season began and the one just ended waits as a Season Review card on Today (§14.3). */
  | { type: 'seasonReview'; season: SeasonName; key: DateKey }
  /** A habit retired to the balcony shelf with a ribbon (Finish, or a "just this season" habit ended). */
  | { type: 'retired'; habitId: string; ribbon: boolean };

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
  /** "Why it matters" (≤ 140 characters, §14.1). */
  why?: string;
  /** Habit stacking (§14.2): the habit this one follows ("After Walk"). */
  anchorHabitId?: string;
  /** "Just this season" (§14.3): its last day (normally the season's end, seasonReview.justThisSeasonEnd). */
  endsOn?: DateKey;
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

/**
 * The save didn't go through, so a commit-before-reveal command was rolled back rather than shown
 * (v1 §13.6; audit FS4, FS10):
 * storage is full or unavailable, the browser keeps nothing ('volatile'), or this window is still
 * getting the writer lock ('acquiring'; try again in a moment).
 */
export type NotSavedError = 'storage-full' | 'unavailable' | 'volatile' | 'acquiring';

export type PullError = 'not-enough-coins' | 'not-enough-stars' | 'machine-unavailable' | 'no-ticket' | 'reveal-pending' | NotSavedError;

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
  | { ok: false; error: 'not-enough-stars' | 'already-owned' | 'not-wishable' | 'season-not-visited' | NotSavedError };

/**
 * What a gesture or a treat did. The caption is the screen's to pick (lines.ts, by the pet's
 * personality and species): the domain returns no words.
 */
export interface PetInteractionResult extends ActionResult {
  xpGained: number;
  level: number;
  leveledUp: boolean;
  /** 'full' = treat cap reached; 'love' = favorite treat; 'capped' = petting XP capped (reaction still plays); 'none' = no servings left. */
  reaction: 'happy' | 'love' | 'full' | 'capped' | 'none';
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
  /** Live habits (archived ones are not counted, as on the You screen). */
  habits: number;
  checkins: number;
  friends: number;
  savedAt: number;
  device?: string;
}

/** `movedIn`: the pets who went straight to the new place (the ones who love it most, up to its room). */
export type PlacePurchase = { ok: true; place: PlaceId; movedIn: string[] } | { ok: false; error: 'not-enough-coins' | 'owned' };

/** Why a backup can't be imported at all (handoff.ts `parseBackupText`). */
export type BackupError = 'not-a-backup' | 'made-by-newer-version' | 'damaged-backup' | 'not-a-payload' | 'damaged-payload' | 'cannot-decompress-here';

/**
 * Why a replacement of the whole save (an import, an Undo, a restore: WP-A3) changed nothing.
 * - 'not-saved': the save couldn't be written, so the state, the disk and any undo stay as they were.
 * - 'no-undo': no lasting copy of what's here could be kept; ask, then go ahead `withoutUndo`.
 * - 'superseded': the save changed while it was under way (Start over, the demo, another window,
 *   the writer lock lost); 'aborted': the caller let it go (the sheet closed).
 * - 'busy': another replacement is under way (they are one at a time).
 * - 'read-only' / 'demo-mode': this window can't replace the save now.
 * - 'unavailable': the daily copies can't be read right now; 'not-found': that copy is gone;
 *   'damaged-copy': it no longer reads as a save; 'newer-copy': a newer catkin kept it (WP-A4).
 * - 'expired': there is no Undo to take (none, over 24 hours old, or for another save).
 */
export type ReplaceError = 'not-saved' | 'no-undo' | 'superseded' | 'aborted' | 'busy' | 'read-only' | 'demo-mode' | 'unavailable' | 'not-found' | 'damaged-copy' | 'newer-copy' | 'expired' | BackupError;

/**
 * What a replacement did. `undo` is the Undo it promises (until when), or null when there is none:
 * no lasting copy, a confirmed import without one, or the Undo itself.
 */
export type ReplaceResult = { ok: true; undo: { until: number } | null } | { ok: false; error: ReplaceError };

/** The daily copies, or that they can't be read right now. */
export type SnapshotList =
  | { ok: true; snapshots: { id: string; savedAt: number; habits: number; checkins: number; kind: string; day: DateKey }[] }
  | { ok: false; error: 'unavailable' };
