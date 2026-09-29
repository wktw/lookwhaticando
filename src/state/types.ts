/**
 * Persisted application state. Everything the user owns lives here, is serializable
 * as JSON, and is versioned (see SCHEMA_VERSION + state/migrate.ts).
 * Semantics: docs/DESIGN.md (catkin, v2) §5–§8 and §13; the logic team's readings are in NOTES-domain.md.
 *
 * Internal names that differ from what the screens say (DESIGN §6): `stars` are **stamps**,
 * `stardust` are **swaps**, a `wish` is a **Special Order**, and a pet with `inMeadow` is **out on
 * the Shelf** (the rest are resting indoors, off the Shelf).
 */
import type { MachineId, PastelKey, Personality, PlaceId, PlantSpeciesId, PotId, WearableSlot } from '@/catalog/types';

export const SCHEMA_VERSION = 1;

/** Local calendar date 'YYYY-MM-DD' in the user's *app day* (day starts at settings.dayStartsAt). */
export type DateKey = string;
/** 0 = Sunday … 6 = Saturday */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
/** Chosen via "About how long?": light < 5 min · steady 5–30 min · big 30+ min (max 3 active big habits). */
export type Effort = 'light' | 'steady' | 'big';
export type TimeOfDay = 'morning' | 'midday' | 'evening' | 'anytime';

export type Schedule =
  | { kind: 'daily' }
  /** On certain days of the week. */
  | { kind: 'days'; days: Weekday[] }
  /** Flexible: `times` check-in days per period of `every` weeks (every 2 = biweekly). */
  | { kind: 'weekly'; times: number; every: 1 | 2 | 3 | 4 }
  /** Flexible: `times` check-in days per period of `every` months (every 3 = quarterly). */
  | { kind: 'monthly'; times: number; every: 1 | 2 | 3 | 6 | 12 };

/**
 * A versioned rule. Editing a habit's schedule/target/step/tiny appends a new rule with
 * `from` = the day it starts applying; every day is evaluated with the rule in effect then,
 * so edits never rewrite history (DESIGN v1 §13.2).
 */
export interface HabitRule {
  from: DateKey;
  schedule: Schedule;
  /** Day-based: amount needed per scheduled day (1..100000). Flexible: always 1. */
  target: number;
  /** Amount added per tap for count habits (default 1). */
  step: number;
  /** The "tiny version" that still counts as showing up (e.g. "Shoes on, step outside"). */
  tiny?: { label: string; count?: number };
}

export interface Pause {
  start: DateKey;
  /** Inclusive. Undefined = open-ended. */
  end?: DateKey;
}

export interface Habit {
  id: string;
  name: string;
  /** HabitIconId from catalog/habitIcons.ts. */
  icon: string;
  color: PastelKey;
  plant: PlantSpeciesId;
  pot: PotId;
  /** Sorted by `from`; rules[0].from === startedOn. */
  rules: HabitRule[];
  unit?: string;
  effort: Effort;
  timeOfDay: TimeOfDay;
  /** Implementation-intention anchor shown on the card, e.g. "After I pour my coffee". */
  anchor?: string;
  /** 'avoid' changes copy only ("Kept it up" instead of "Done"). */
  polarity: 'build' | 'avoid';
  /** Monthly habits: display-only hint "due around the 1st". */
  dueDay?: number | 'last';
  /** Immutable creation time (epoch ms). Rewards are never paid for app days before its date. */
  createdAt: number;
  /**
   * Stage 3 (additive): the app day of creation, fixed when the habit is created, so a later
   * `dayStartsAt` change can't move it. Rewards never pay for earlier days. Older saves without it
   * derive it from `createdAt`.
   */
  createdOn?: DateKey;
  /** First day that counts for stats (editable earlier via "Start tracking from…", without rewards). */
  startedOn: DateKey;
  archivedOn?: DateKey;
  pauses: Pause[];
  order: number;
  notes?: string;
}

/** A day's record for one habit. A day is either logged or rested, never both. */
export type DayLog =
  | {
      kind: 'log';
      /** Day-based: progress toward target. Flexible: 0 or 1. */
      count: number;
      /** Logged as the tiny version (counts as showing up; half rewards). */
      level?: 'tiny';
      /** Epoch ms of each LIVE check-in on the day itself (max 24). Never written by backfill/history edits. */
      at?: number[];
      /** A short reflection, max 280 chars. */
      note?: string;
    }
  | {
      kind: 'rest';
      note?: string;
    };

export interface Wallet {
  coins: number;
  stars: number;
  /** 0..9; every 10 fuses into a star. */
  stardust: number;
  tickets: number;
}

export interface Lifetime {
  coinsEarned: number;
  starsEarned: number;
  checkins: number;
  pulls: number;
  perfectDays: number;
  /** Distinct app days with ≥1 rewarded check-in (drives the Showing-up ladder). Only goes up. */
  showUpDays: number;
  lastShowUpDay?: DateKey;
}

export interface Outfit {
  head?: string;
  face?: string;
  neck?: string;
  body?: string;
}
export type OutfitSlot = WearableSlot;

export interface PetState {
  /** Collectible id, e.g. 'pet-cat-calico', or a variant id 'moonlit:pet-cat-calico'. */
  id: string;
  name: string;
  personality: Personality;
  favoriteTreat: string;
  favoriteKnown: boolean;
  /** Friendship XP; levels 1–10 then cosmetic bond levels 11–15. Never decays. */
  xp: number;
  outfit: Outfit;
  /** Out on the Shelf (at most `petsOutCapacity` pets are out; the rest rest indoors). */
  inMeadow: boolean;
  /** Marked as a favourite pet (sorted first; the featured pet when a view needs one). */
  favorite: boolean;
  obtainedAt: number;
  /**
   * Per-day XP caps; reset when `date` changes. `favorites` counts favorite treats fed that day:
   * only the first pays the +12 (DESIGN §8.2).
   */
  daily: { date: DateKey; pets: number; treats: number; favorites?: number };
}

export interface OwnedItem {
  count: number;
  firstAt: number;
}

export interface PityCounter {
  /** Pulls since last rare-or-better. */
  sinceRare: number;
  /** Pulls since last ultra. */
  sinceUltra: number;
  /** Consecutive duplicate pulls (lucky meter; 4 → next is guaranteed new). */
  dupStreak: number;
  pulls: number;
}

/** A decor item placed freely in a place on the Shelf (coordinates 0..1 within the place). */
export interface PlacedDecor {
  /** Unique placement id (the same item may be placed once per owned copy). */
  id: string;
  itemId: string;
  place: PlaceId;
  x: number;
  y: number;
  flip?: boolean;
}

export type { PlaceId };

/**
 * A small found thing an L6+ pet left on the sill (DESIGN §8.2): one a day on days with a
 * check-in, worth 1 swap. `seed` picks which thing (a button, a leaf, a bead…) in the voice layer.
 */
export interface FoundThing {
  date: DateKey;
  petId: string;
  seed: number;
}

export interface Settings {
  /** 0 = Sunday, 1 = Monday. Changes apply from the next week. */
  weekStart: 0 | 1;
  /** Minutes after midnight when a new app day begins (0–360, default 180 = 3:00 am). */
  dayStartsAt: number;
  theme: 'auto' | 'light' | 'night';
  sound: boolean;
  /** 0..1 */
  volume: number;
  haptics: boolean;
  reduceMotion: 'auto' | 'on' | 'off';
  quickOpen: boolean;
  /** Hide coin chips, wallet and capsule prompts: the tracker on its own (principle 4). */
  quietRewards: boolean;
  /** Optional time-block reminders ('HH:MM', 15-minute slots) exported as calendar events. */
  reminders: Partial<Record<Exclude<TimeOfDay, 'anytime'>, string>>;
}

export interface Profile {
  name: string;
  onboarded: boolean;
  createdAt: number;
  /** Optional 'MM-DD' for the birthday ritual (DESIGN §13). */
  birthday?: string;
}

/** Commit-before-animate: a decided pull the UI is still revealing (survives reloads). */
export interface PendingReveal {
  machineId: MachineId;
  itemId: string;
  isNew: boolean;
  stardust: number;
  fusedStars: number;
  friendshipXp?: number;
  at: number;
}

export interface AppState {
  version: number;
  profile: Profile;
  settings: Settings;
  habits: Habit[];
  /** logs[habitId][dateKey] */
  logs: Record<string, Record<DateKey, DayLog>>;
  /** Global "Take today off" days (max 4 per calendar month): transparent for every habit. */
  offDays: Record<DateKey, true>;
  wallet: Wallet;
  lifetime: Lifetime;
  /**
   * Reward ledger (DESIGN v1 §13.3 "Reward integrity").
   * - recent: per (habitId|date) grant for the refundable window only (today−7 … today);
   *   older entries are folded into totals by compaction.
   * - sunshine: per-habit lifetime sunshine total (monotone except refunds inside the window). A
   *   deleted habit's total stays (minus its in-window refunds): The Cutting is a lifetime gauge.
   *   Keys are habit ids, including deleted habits' ids (never reused).
   * - bestStage: per-habit highest plant stage ever reached (plants never shrink).
   * - once: once-only grant keys → value (true, or a number noted below). Key formats:
   *   'perfect|<date>' (coins paid) · 'period|<habitId>|<periodStart>' (day number of its last day) · 'rung|<habitId>|<tierDays>' ·
   *   'showup|<n>' · 'weekly|<weekStart>' (stars paid) · 'bloom|<YYYY-MM>' (stars paid) ·
   *   'home|<gapStart>' (day number of the grant, for the 14-day cooldown) · 'exclusive|<collectibleId>' ·
   *   'birthday|<YYYY>' · 'album|<albumId>' · 'harvest|<habitId>|<date>' · 'gift|first-sprout' (coins) ·
   *   'gift|first-capsule' (the onboarding capsule was pulled) · 'found|<date>' (an L6 found thing) ·
   *   'cutting' (The Cutting's best stage: it never shrinks) ·
   *   'grow|<habitId>|<date>' (the accept day; the offer stays closed 28 days) ·
   *   'rest|<habitId>|<date>' (stage 3: an allowed rest that completed a paid perfect day; it keeps
   *   using the week's rest allowance for perfect days) · 'flourish|<habitId>' (stage 3: the most
   *   Flourishes the plant has had; they are permanent visitors). Badges live in `badges`; plant
   *   stages in `bestStage`.
   *   Keys that can no longer be earned are pruned by compaction (domain/economy.ts).
   * - daily: coins paid by check-ins per WALL-CLOCK action day (the 40-coin full-rate budget).
   */
  ledger: {
    /**
     * `coins`/`sunshine`: currently held for the occurrence. `cap` (stage 2): the full-rate value of
     * the first in-target grant, so a re-check never pays more than the original. `lvl` (stage 2):
     * the level currently granted ('over' = a flexible check-in beyond `times`); absent = none.
     */
    recent: Record<string, { coins: number; sunshine: number; cap?: number; lvl?: 'tiny' | 'full' | 'over' }>;
    sunshine: Record<string, number>;
    bestStage: Record<string, number>;
    once: Record<string, number | true>;
    daily: Record<DateKey, number>;
  };
  /** collection[collectibleId] (incl. 'moonlit:<petId>' variants) */
  collection: Record<string, OwnedItem>;
  pity: Partial<Record<MachineId, PityCounter>>;
  pets: Record<string, PetState>;
  /** Treat servings. Each owned recipe restocks 2 free servings per morning (bank up to 5; DESIGN §8.2). */
  pantry: Record<string, { servings: number; restockedOn: DateKey }>;
  /** The home (DESIGN §8.4): the places opened (the Sill is always first) and the decor placed in them. */
  shelf: {
    places: PlaceId[];
    decor: PlacedDecor[];
  };
  /** badges[badgeId] = epoch ms when earned */
  badges: Record<string, number>;
  /** Rituals (Sunday Notes, Herbarium pages), kept forever on the memory shelf; unread until `readAt`. */
  inbox: Letter[];
  /** Found things left on the sill by L6+ pets, the last 14 app days (oldest first; DESIGN §8.2). */
  found?: FoundThing[];
  pendingReveal?: PendingReveal;
  /** Clock guard: the latest app day / time ever observed (device clock rollback protection). */
  clock: { maxDateKey: DateKey; maxEpochMs: number; lastCheckinAt: number };
  /** Epoch ms of the last export/backup (for gentle backup nudges). */
  lastBackupAt?: number;
}

export type Letter =
  | {
      kind: 'weekly';
      id: string;
      /** First day of the reported week. */
      weekStart: DateKey;
      achieved: number;
      expected: number;
      stars: number;
      showUpDays: number;
      bestHabitId?: string;
      /** A note the user wrote that week, quoted back warmly. */
      quote?: { habitId: string; date: DateKey; text: string };
      newFriends: string[];
      plantsGrown: string[];
      /** Epoch ms when opened: rituals stay on the memory shelf forever (DESIGN §9.2). */
      readAt?: number;
    }
  | {
      kind: 'monthly';
      id: string;
      /** 'YYYY-MM' of the reported month. */
      month: string;
      achieved: number;
      expected: number;
      stars: number;
      previousPct?: number;
      growingBonus: boolean;
      /** The Monthly Bouquet (stage 2): stems per habit with ≥ 1 check-in (DESIGN v1 §13.10). */
      stems?: BouquetStem[];
      readAt?: number;
    };

/** One habit's stems in a Monthly Bouquet: clamp(round(checkIns / 4), 1, 7) of its plant species. */
export interface BouquetStem {
  habitId: string;
  plant: PlantSpeciesId;
  count: number;
}
