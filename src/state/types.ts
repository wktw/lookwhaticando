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
  /**
   * WP-B5 (P-history-01): the day a backdated flexible first rule's period grid is anchored on, when
   * that is not its `from`. "Start tracking from…" moves `from` (with `startedOn`) to the exact
   * day and keeps the grid the rule had, so no existing period regroups. Set only on the first rule
   * of an `every > 1` schedule. Optional and additive: older builds anchor on `from` instead.
   */
  gridFrom?: DateKey;
  /**
   * WP-B5 (HM1, review): when this rule cut the previous rule's period short (it starts inside that
   * period), how many of the days it took from it were already paused or taken off when the edit
   * was made. The cut period reads those days as it stood then (inactive) and the rest as active,
   * whatever happens to the habit later. Absent means none (and on saves from before it existed).
   * Optional and additive: older builds read the pauses as they are now instead.
   */
  cutInactive?: number;
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
  /**
   * WP-B5 (domain-d6): retired before its first day was over with nothing to show for it (Finish
   * with nothing watered on the day it was created, or an archive before `startedOn`). Its lifetime
   * is empty: no day is in it, so its first day is never a missed day. Always set with
   * `archivedOn === startedOn`, which older builds accept (they read that one day as its lifetime).
   * Restoring clears it. Honoured only while that holds (`isUnstarted`): an older build's Restore or
   * backdate keeps the field, and the habit then reads by its dates. Optional and additive.
   */
  unstarted?: true;
  pauses: Pause[];
  order: number;
  notes?: string;
  /**
   * Keeping Company (DESIGN §14.1): the pet who keeps this habit company and lives in its plant.
   * At most one habit per pet and one pet per habit (company.ts keeps both sides in step).
   */
  companionId?: string;
  /** "Why it matters" (≤ 140 characters, §14.1): editable from day 0, asked once by the story. */
  why?: string;
  /** Habit stacking (§14.2): this habit follows that one ("After Walk") and sorts right after it. */
  anchorHabitId?: string;
  /** "Just this season" (§14.3): the last day it runs; after it the habit retires with a ribbon. */
  endsOn?: DateKey;
  /** Retired with a ribbon ("Finish" in the Season Review, or a "just this season" habit ended): its last day. */
  ribbon?: DateKey;
  /**
   * The "Move it to Evening?" nudge (§14.2) was answered: 'moved' (accepted) or 'left' ("Leave it
   * in Morning"). Offered once, so either answer closes it for good.
   */
  timeNudge?: 'moved' | 'left';
}

/** A day's record for one habit. A day is either logged or rested, never both. */
export type DayLog =
  | {
      kind: 'log';
      /** Day-based: progress toward target. Flexible: 0 or 1. */
      count: number;
      /** Logged as the tiny version (counts as showing up; half rewards). */
      level?: 'tiny';
      /**
       * Epoch ms of each LIVE check-in on the day itself (max 24, the latest kept; dropped after 120
       * days). Never written by backfill/history edits.
       */
      at?: number[];
      /**
       * Epoch ms of the day's first LIVE check-in (WP-B4). Unlike `at`, never capped: habit
       * stacking compares it. Kept, like `at`, for 120 days. Absent: never live, or an older build's
       * day (then the earliest stamp stands in). Optional and additive; older builds carry it along.
       */
      first?: number;
      /**
       * Epoch ms of the LIVE check-in that made the day count as showing up (the completing tap or
       * the tiny version; later over-target taps don't move it). Blooms Like You reads it as the
       * day's time. Kept for 120 days. Absent: unknown (see `domain/provenance.ts`).
       */
      done?: number;
      /**
       * Written when the day's stamps are compacted (WP-B4): this habit followed that anchor (its id)
       * and was first checked in live before it that day, so the day was not kept together.
       */
      beforeAnchor?: string;
      /** A short reflection, max 280 chars. */
      note?: string;
      /** The note is starred: only starred notes are quoted in a Sunday Note (a note is private by default). */
      starred?: true;
    }
  | {
      kind: 'rest';
      note?: string;
      starred?: true;
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
  /** WP-B6: the app day its favourite treat was found (absent on older saves: the day is unknown). */
  favoriteKnownOn?: DateKey;
  /** Friendship XP; levels 1–10 then cosmetic bond levels 11–15. Never decays. */
  xp: number;
  outfit: Outfit;
  /** Out on the Shelf (at most `petsOutCapacity` pets are out; the rest rest indoors). */
  inMeadow: boolean;
  /** Marked as a favourite pet (sorted first; the featured pet when a view needs one). */
  favorite: boolean;
  obtainedAt: number;
  /**
   * WP-B6 (domain-d4): the app day it came home, fixed when it came home, so a later `dayStartsAt`
   * change or a move to another time zone can't move its came-home day. Older saves get it once,
   * worked out from `obtainedAt` with the settings they have then (DEC-P12f).
   */
  arrivedOn?: DateKey;
  /**
   * The place it spends the day in when out on the Shelf (DESIGN §8.4). Absent: the Sill, and it
   * has never been placed, so opening a place it loves can move it there; 'sill' is a choice.
   * The place must be open. A companion still sits in its pot in the Today band.
   */
  place?: PlaceId;
  /**
   * Its favourite spot, claimed at friendship level 4 (§8.2 L4) and kept: the pot of the habit it
   * keeps company, else the place it spends the day in, else its species' favourite open place.
   */
  spot?: PetSpotClaim;
  /** Its best friend on the Shelf, from level 8 (§8.2 L8, "naps next to {friend}"), kept once chosen. */
  bestFriend?: string;
  /** The app day it reached level 10, best friends with you (the first Memory's date). */
  bestFriendsOn?: DateKey;
  /** Dated Memories (§8.2), one per 150 XP after level 10, oldest first. */
  memories?: PetMemory[];
  /**
   * Per-day XP caps; reset when `date` changes. `favorites` counts favorite treats fed that day:
   * only the first pays the +12 (DESIGN §8.2). `company` is the XP its habit's check-ins paid that
   * day (at most 30, §14.1).
   */
  daily: { date: DateKey; pets: number; treats: number; favorites?: number; company?: number };
}

export interface OwnedItem {
  count: number;
  firstAt: number;
  /**
   * The only copy came from a Special Order, not a capsule: the collect-N pins ("Collect 10
   * different things from the capsules") don't count it. A later capsule copy clears it.
   */
  ordered?: true;
}

/** A pet's favourite spot (§8.2 L4): a habit's pot on the sill, or a place. */
export type PetSpotClaim = { kind: 'pot'; habitId: string } | { kind: 'place'; place: PlaceId };

/**
 * A dated Memory on the Pet Card (§8.2), like a date in a diary (MEMORIES in lines.ts): best
 * friends, the day it came home, a plant it keeps company blooming, moving into a plant, the day
 * its favourite treat was found, or a quiet day on the sill.
 */
export interface PetMemory {
  kind: 'best-friends' | 'came-home' | 'bloomed' | 'moved-in' | 'favourite' | 'day';
  date: DateKey;
  habitId?: string;
  treatId?: string;
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
  /** "Show companions" (§9.5): who keeps each habit company, on its card. Absent = on. */
  showCompanions?: boolean;
  /**
   * "Where's your summer?" (§14.3): the hemisphere the Season Review follows. Absent = inferred
   * from the device time zone (seasons.ts `inferHemisphere`); onboarding stores the inference.
   */
  hemisphere?: Hemisphere;
  /** "Compact Today" (§9.5): smaller cards. Absent = off. */
  compactToday?: boolean;
  /** "Quote my notes in the Sunday Note" (only starred notes are ever quoted). Absent = on. */
  quoteNotes?: boolean;
  /**
   * You › Accessibility "Keyboard shortcuts: 1–5 switch tabs, N plants a habit". Absent = the
   * device default (on with a mouse or trackpad, off on touch; src/app/shortcuts.ts).
   */
  keyboardShortcuts?: boolean;
}

export type Hemisphere = 'north' | 'south';

export interface Profile {
  name: string;
  onboarded: boolean;
  createdAt: number;
  /**
   * WP-B6 (domain-d4): the profile's first app day (moving in), fixed at onboarding, so the
   * moving-in anniversary and the Memories rule don't move with a later `dayStartsAt` change or a
   * time-zone move. Older saves get it once, from `createdAt` with the settings they have then.
   */
  createdOn?: DateKey;
  /** Optional 'MM-DD' for the birthday ritual (DESIGN §13). */
  birthday?: string;
  /**
   * Onboarding's late steps while they are under way (DESIGN §9.6; WP-C5, DEC-E3): set by the
   * flow's own Plant and each step after it, removed when onboarding ends. Absent on a save that
   * isn't mid-onboarding. Part of the save, so it follows the writer lock, import, reset and demo.
   */
  onboardingStep?: OnboardingStep;
}

/** Where onboarding stands after planting: 3 "Anything already done today?", 4 "Who comes home first?", 5 "Find {name} a plant". */
export type LateStep = 'today' | 'first' | 'place';

export interface OnboardingStep {
  step: LateStep;
  /** The habits planted at the end of step 2 (at most 3), for step 3's water buttons and step 5's plants. */
  habitIds: string[];
  /** The pet from the first capsule (step 5). */
  petId?: string;
}

/** Commit-before-animate: a decided pull the UI is still revealing (survives reloads). */
export interface PendingReveal {
  machineId: MachineId;
  itemId: string;
  isNew: boolean;
  stardust: number;
  fusedStars: number;
  friendshipXp?: number;
  /** A Special Order, not a capsule: the reveal says "Your order: a Siamese." */
  order?: true;
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
   *   'company|<habitId>|<date>' (the companion's XP was paid for that occurrence, §14.1) ·
   *   'anniversary|<YYYY>' (that year's moving-in anniversary note was written, §13) ·
   *   'grow|<habitId>|<date>' (the accept day; the offer stays closed 28 days) ·
   *   'rest|<habitId>|<date>' (stage 3: an allowed rest that completed a paid perfect day; it keeps
   *   using the week's rest allowance for perfect days) · 'flourish|<habitId>' (stage 3: the most
   *   Flourishes the plant has had; they are permanent visitors) · 'settle|universal' (day number: the
   *   save's never-placed pets had their one-time settling in the places everyone loves, DEC-P10) ·
   *   'settled|<petId>' (day number: that settling moved the pet, until Today says so, 14 days at
   *   most). Badges live in `badges`; plant
   *   stages in `bestStage`.
   *   Keys that can no longer be earned are pruned by compaction (domain/economy.ts).
   * - daily: coins paid by check-ins per WALL-CLOCK action day (the 40-coin full-rate budget).
   */
  ledger: {
    /**
     * `coins`/`sunshine`: currently held for the occurrence. `cap` (stage 2): the full-rate value of
     * the first in-target grant, so a re-check never pays more than the original. `lvl` (stage 2):
     * the level currently granted ('over' = a flexible check-in beyond `times`); absent = none.
     * `co` (Keeping Company): the companion's share of the occurrence (LedgerEntry).
     */
    recent: Record<string, LedgerEntry>;
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
  /** Keeping Company (§14.1): every pet × habit pairing there has been, and the offer's counters. */
  company?: Company;
  /** Keepsakes companions left by the pots (§14.1), oldest first. Placeable on the Shelf, never spent. */
  keepsakes?: Keepsake[];
  /** Blooms Like You (§14.2): the looks each plant has earned (only ever added) and the one shown. */
  plantLooks?: Record<string, PlantLooks>;
  /** The app day each plant first reached each stage (habitId → stage → day), for rituals. */
  stageDates?: Record<string, Partial<Record<number, DateKey>>>;
  /** Season Review (§14.3): the pending card, and every season filed on the memory shelf. */
  seasons?: SeasonShelf;
  pendingReveal?: PendingReveal;
  /** Clock guard: the latest app day / time ever observed (device clock rollback protection). */
  clock: { maxDateKey: DateKey; maxEpochMs: number; lastCheckinAt: number };
  /** Epoch ms of the last export/backup (for gentle backup nudges). */
  lastBackupAt?: number;
}

/** A per-occurrence ledger entry (see AppState.ledger.recent). */
export interface LedgerEntry {
  coins: number;
  sunshine: number;
  cap?: number;
  lvl?: 'tiny' | 'full' | 'over';
  /**
   * Keeping Company (§14.1): the companion's share of this occurrence. `sun` is the part of its
   * sunshine grown while `pet` kept the habit company (it follows the day, like the sunshine);
   * `watered` marks the occurrence as one of the pair's waterings.
   */
  co?: { pet: string; sun: number; watered?: true };
}

/* ------------------------------------------------------------------ */
/* Keeping Company (§14.1)                                             */
/* ------------------------------------------------------------------ */

export type StoryId = 'start' | 'why' | 'lookAtUs';

/** One pet × habit pairing, kept after they part (the history of who kept what company). */
export interface CompanyPair {
  petId: string;
  habitId: string;
  /** The first day they kept company. */
  since: DateKey;
  /**
   * Companion sunshine: the habit's sunshine grown while this pet kept it company. A ledger like
   * sunshine: an un-check inside the refund window takes its share back.
   */
  sunshine: number;
  /** Completing check-ins while paired ("{Count} waterings later"), a ledger like `sunshine`. */
  waterings: number;
  /** Stories unlocked (only ever added): the day, and when the story was opened. */
  stories?: Partial<Record<StoryId, { on: DateKey; readAt?: number }>>;
  /** "Why it matters" asked its question (answered or not): it is asked once. */
  whyAsked?: true;
  /**
   * The first day the companion's routine showed (a completing watering with the plant at Potted
   * or later): from then on the Pet Card's "Known for" line stays, whatever today holds.
   */
  knownForSince?: DateKey;
  /**
   * WP-B6 (domain-d3): the spans the pet kept the habit company, oldest first. A day belongs to the
   * pet that keeps the habit company at its close (or now, today): `from` is the day it was paired,
   * `to` the last day it still was at the day's close (absent while it still keeps the habit
   * company; only the last span can be open). Absent on a pairing from before WP-B6: then the
   * habit's current companion counts from `since`, and any other pet not at all.
   */
  stints?: PairStint[];
}

export interface PairStint {
  from: DateKey;
  to?: DateKey;
}

export interface Company {
  /** '<petId>|<habitId>' → pairing. */
  pairs: Record<string, CompanyPair>;
  /** The offer ("Find {name} a plant"): at most once a day, never again after 3 declines. */
  offer: { shownOn?: DateKey; declines: number };
}

export type KeepsakeFamily = 'move' | 'read' | 'hydrate' | 'rest' | 'mind' | 'create' | 'tidy' | 'cook' | 'care' | 'garden' | 'connect' | 'plan';
export type KeepsakeKind = KeepsakeFamily | 'brass-seed';

/** A small dated keepsake a companion left by the pot at Rooting, Budding, Blooming or Evergreen. */
export interface Keepsake {
  /** 'k-<habitId>-<stage>': one per plant per stage, by construction. */
  id: string;
  habitId: string;
  petId: string;
  stage: number;
  kind: KeepsakeKind;
  date: DateKey;
  /** The caption, prefilled from her latest Moment (editable; absent = the family's caption). */
  note?: { date: DateKey; text: string };
}

/* ------------------------------------------------------------------ */
/* Blooms Like You (§14.2)                                             */
/* ------------------------------------------------------------------ */

export type BloomColour = 'dawn' | 'sunlit' | 'twilight' | 'wildflower';
export type BloomShape = 'classic' | 'petite' | 'paired';
/** When she usually waters it: before 9, the middle of the day, after 6 pm, or all sorts of times. */
export type TimeBand = 'dawn' | 'sunlit' | 'twilight' | 'all-sorts';

/** One look, with the facts it was read from (the plant tag says them in plain words). */
export interface PlantLook {
  colour: BloomColour;
  shape: BloomShape;
  /** Read at the first Blooming or re-read at Evergreen. */
  read: 'bloom' | 'evergreen';
  on: DateKey;
  evidence: {
    band: TimeBand;
    /** Eligible live check-in days the colour was read from, and how many fell in `band`. */
    eligibleDays: number;
    bandDays: number;
    /** Median check-in time, minutes after midnight (rounded to 15). */
    usualMinute: number;
    tinyDays: number;
    doneDays: number;
    /** Kept-together days with the anchor habit (Paired), when stacked. */
    keptTogether?: { habitId: string; days: number };
  };
}

/** An explicit colour choice, never evidence of a watering time. Shape is read from real history. */
export interface ConfirmedPlantLook {
  colour: BloomColour;
  shape: BloomShape;
  on: DateKey;
  shown: boolean;
  /** Fixed earning partner for a Paired shape; a later unstack does not borrow another plant. */
  partnerId?: string;
}

export interface PlantLooks {
  looks: PlantLook[];
  /** Index into `looks` of the look shown; null = Classic (always available). */
  shown: number | null;
  /** She picked `shown` herself: a later look is added without switching to it. */
  chosen?: true;
  /** Optional and additive: older saves have no explicit colour choice. */
  confirmed?: ConfirmedPlantLook;
  /**
   * The reads made (the day of each). A read that is due but not made yet (fewer than 10 eligible
   * live check-in days) is retried on each later check-in.
   */
  reads: { bloom?: DateKey; evergreen?: DateKey };
}

/* ------------------------------------------------------------------ */
/* Season Review (§14.3)                                               */
/* ------------------------------------------------------------------ */

export type SeasonName = 'spring' | 'summer' | 'autumn' | 'winter';

/** One plant in a season's time-lapse (counts only). */
export interface SeasonPlant {
  habitId: string;
  plant: PlantSpeciesId;
  fromStage: number;
  toStage: number;
  waterings: number;
  /** Its companion at the end of the season, if any. */
  petId?: string;
}

/** A season filed on the memory shelf ("Summer, on the sill"). */
export interface SeasonRecord {
  /** The season's first day. */
  key: DateKey;
  name: SeasonName;
  start: DateKey;
  end: DateKey;
  hemisphere: Hemisphere;
  /** Up to 8 plants, most watered first. */
  plants: SeasonPlant[];
  waterings: number;
  /** How it was filed: reviewed (choices made or "Keep everything"), skipped ("Later"), or silently (it passed unopened). */
  filed?: 'reviewed' | 'skipped' | 'silent';
}

export interface SeasonShelf {
  /** The Season Review card waiting on Today (the season just ended), if any. */
  pending?: SeasonRecord;
  /** Filed seasons, oldest first. */
  filed: SeasonRecord[];
}

/* ------------------------------------------------------------------ */
/* Rituals (§13)                                                       */
/* ------------------------------------------------------------------ */

/** A Sunday Note highlight (data; the voice layer words it). */
export type SundayHighlight =
  | { kind: 'stageUp'; habitId: string; stage: number; date: DateKey; petId?: string; plant?: PlantSpeciesId }
  | { kind: 'newcomer'; petId: string; date: DateKey; habitId?: string; plant?: PlantSpeciesId }
  | { kind: 'everyDay'; habitId: string }
  | { kind: 'topHabit'; habitId: string; days: number }
  | { kind: 'newHabit'; habitId: string; date: DateKey; plant?: PlantSpeciesId }
  | { kind: 'tiny'; habitId: string; days: number }
  | { kind: 'kept'; habitId: string; anchorHabitId: string; days: number };

/**
 * The Sunday Note's P.S.: a companion's routine, or a found thing. WP-B6 (domain-w2-d3): `icon` is
 * the habit's icon when the note was written, which chooses the routine; the highlights' and
 * margins' `plant` is the plant species then. Both are frozen with the letter (names still follow
 * renames); a letter written before WP-B6 has neither and is worded generically.
 */
export type SundayPS =
  | { kind: 'companion'; petId: string; habitId: string; days: number; timeOfDay: TimeOfDay; icon?: string }
  | { kind: 'found'; petId: string; date: DateKey; seed: number };

/** One habit's pressing on a Herbarium page: sized by waterings; rest days press as small flowers. */
export interface HerbariumPressing {
  habitId: string;
  plant: PlantSpeciesId;
  waterings: number;
  rests: number;
  /** 0–7: clamp(round(waterings / 4), 1, 7), or 0 with only rest days. */
  size: number;
}

/** A Herbarium page's margin note (one, if true). */
export type HerbariumMargin =
  | { kind: 'bloomed'; habitId: string; date: DateKey; plant?: PlantSpeciesId }
  | { kind: 'cameHome'; petId: string; date: DateKey }
  | { kind: 'planted'; habitId: string; date: DateKey; plant?: PlantSpeciesId };

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
      /** Check-ins that week, across habits ("Nineteen waterings."). */
      waterings?: number;
      /** Up to two highlights, most specific first. */
      highlights?: SundayHighlight[];
      ps?: SundayPS;
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
      /** The Herbarium page (§13): every habit watered or rested that month, pressed. */
      pressings?: HerbariumPressing[];
      margin?: HerbariumMargin;
      /** The very first page. */
      firstPage?: boolean;
      readAt?: number;
    }
  | {
      /** The moving-in anniversary note (§13): a year (or more) on this sill. */
      kind: 'anniversary';
      id: string;
      /** The anniversary day. */
      date: DateKey;
      years: number;
      /** The first habit planted (the first cutting), if it is still here. */
      firstHabitId?: string;
      /** Check-ins since the first one. */
      waterings: number;
      stars: number;
      readAt?: number;
    };

/** One habit's stems in a Monthly Bouquet: clamp(round(checkIns / 4), 1, 7) of its plant species. */
export interface BouquetStem {
  habitId: string;
  plant: PlantSpeciesId;
  count: number;
}
