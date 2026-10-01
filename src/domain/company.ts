/**
 * Keeping Company (DESIGN §14.1): residency is companionship.
 *
 * - **Pairing.** Any pet may keep one habit company, and each habit has at most one companion
 *   (`Habit.companionId`). Pairing a pet that keeps another habit company moves it; pairing a
 *   habit that has a companion replaces it. Archiving or deleting a habit frees its pet. Every
 *   pet × habit pairing there has been keeps its record (`company.pairs`), so a pet that comes
 *   back to a plant carries on where it left off. The record keeps the spans the pet kept the
 *   plant company (`stints`, WP-B6): a day belongs to the companion at its close (stints.ts).
 * - **The offer** ("Find {name} a plant", after naming at a reveal, in the Habit Editor, on the Pet
 *   Card) is shown at most once per app day, and never again after 3 declines. Pairing by hand
 *   is always possible.
 * - **Friendship grows through the habit**: each completing check-in on the reward path gives the
 *   companion `min(30, round(5 × 7/expectedPerWeek))` XP, once per occurrence (an un-check and
 *   re-check can't pay twice, and for a flexible rule an occurrence is one of the period's `times`,
 *   not a date, so moving a check-in to another day can't either) and at most 30 XP per
 *   pet per app day from habits. A count habit's day-end tiny grant pays it too.
 * - **Companion sunshine** is the habit's sunshine grown while paired, per pet × habit. It is kept
 *   occurrence by occurrence in the ledger entry (`LedgerEntry.co`), so it follows the day exactly
 *   like the plant's sunshine: an un-check inside the refund window takes the share back, and a
 *   rule edit re-prices it.
 * - **Three stories** unlock by companion sunshine only (petting can never unlock them), in order,
 *   at most one per check-in (only with an occurrence's first payment), and stay once unlocked.
 *   Thresholds in check-in-equivalents: one faithful week is 7 sunshine for every rhythm
 *   (growth.ts: 7 / expectedPerWeek per occurrence), so **The start** needs 7 (about a week), **Why it matters** 21 (about three weeks; Budding's
 *   threshold) and **Look at us** 42 (Blooming's threshold) with the plant at Blooming.
 * - **Keepsakes**: when a plant with a companion first reaches Rooting, Budding, Blooming or
 *   Evergreen, the companion leaves one dated keepsake by the pot (one per plant per stage, by
 *   id), captioned from her latest Moment. Keepsakes are placeable on the Shelf and never spent.
 * - **Routines** (routines.ts) are derived for views; nothing is stored.
 */
import { getCollectible } from '@/catalog/collectibles';
import type { GameEvent } from '@/state/api';
import type { AppState, Company, CompanyPair, DateKey, Habit, HabitRule, Keepsake, LedgerEntry, StoryId } from '@/state/types';
import { inLifetime, logStatus, showedUp } from './activity';
import { addDays, dayNumber } from './dates';
import { dailyFor, addXp } from './friendship';
import { BLOOMING, POTTED } from './growth';
import { evaluatePeriod, flexPeriodAt } from './periods';
import { addToTotal, reaches } from './precision';
import { ruleAt } from './rules';
import { KEEPSAKE_STAGES, SPECIES_ROUTINES, keepsakeKind, routineOf, routinePhase, type Routine, type RoutinePhase } from './routines';
import { expectedPerWeek } from './schedule';
import { stintsClosed, stintsOpened } from './stints';
import type { Tx } from './tx';
import { hasOnce, rewardsPaused, setOnce } from './wallet';

/** XP a companion earns per completing check-in, and the most its habits can give it a day. */
export const COMPANION_XP = { perWeekOfCheckins: 5, max: 30, perDay: 30 } as const;
/** The offer is never shown again after this many declines. */
export const OFFER_MAX_DECLINES = 3;
/** Companion sunshine each story needs (check-in-equivalents: 7 ≈ one faithful week). */
export const STORY_SUNSHINE: Readonly<Record<StoryId, number>> = { start: 7, why: 21, lookAtUs: 42 };
export const STORIES: readonly StoryId[] = ['start', 'why', 'lookAtUs'];
/** "Why it matters" is at most this long (§5.1). */
export const MAX_WHY = 140;
/** A keepsake's caption is at most this long. */
export const MAX_KEEPSAKE_NOTE = 140;

const EMPTY_COMPANY: Company = { pairs: {}, offer: { declines: 0 } };

export const pairKey = (petId: string, habitId: string): string => `${petId}|${habitId}`;

export function companyOf(s: Pick<AppState, 'company'>): Company {
  return s.company ?? EMPTY_COMPANY;
}

export function pairOf(s: Pick<AppState, 'company'>, petId: string, habitId: string): CompanyPair | null {
  return companyOf(s).pairs[pairKey(petId, habitId)] ?? null;
}

/** XP per completing check-in under `rule`: min(30, round(5 × 7 / expectedPerWeek)). */
export function companionXpFor(rule: Pick<HabitRule, 'schedule'>): number {
  return Math.min(COMPANION_XP.max, Math.round((COMPANION_XP.perWeekOfCheckins * 7) / expectedPerWeek(rule)));
}

/** The habit's companion, if it has one and the pet exists. */
export function companionOf(s: Pick<AppState, 'pets'>, habit: Pick<Habit, 'companionId'>): string | null {
  const id = habit.companionId;
  return id !== undefined && s.pets[id] ? id : null;
}

/** The habit a pet keeps company, if any. */
export function habitOfPet(s: Pick<AppState, 'habits'>, petId: string): Habit | null {
  return s.habits.find((h) => h.companionId === petId) ?? null;
}

/** A live habit (not archived) that could take a companion. */
const liveHabit = (h: Habit): boolean => h.archivedOn === undefined;

/* ------------------------------------------------------------------ */
/* Pairing                                                             */
/* ------------------------------------------------------------------ */

/** A fresh, writable copy of the company section, set on the state (copy-on-write). */
function writableCompany(tx: Tx): Company {
  const cur = companyOf(tx.s);
  const next: Company = { pairs: cur.pairs, offer: cur.offer };
  tx.set('company', next);
  return next;
}

function ensurePair(tx: Tx, petId: string, habitId: string): CompanyPair {
  const c = writableCompany(tx);
  const key = pairKey(petId, habitId);
  c.pairs = { ...c.pairs };
  const pair: CompanyPair = { ...(c.pairs[key] ?? { petId, habitId, since: tx.env.today, sunshine: 0, waterings: 0 }) };
  c.pairs[key] = pair;
  return pair;
}

/**
 * The habit's companion is freed, and its span closes (WP-B6): moved or freed, its last day is
 * yesterday (today belongs to whoever keeps the habit company at its close); with the habit
 * retired, today.
 */
function endCompany(tx: Tx, habitId: string, retired = false): void {
  const petId = tx.s.habits.find((h) => h.id === habitId)?.companionId;
  if (petId === undefined) return;
  const pair = pairOf(tx.s, petId, habitId);
  const stints = pair ? stintsClosed(pair, retired ? tx.env.today : addDays(tx.env.today, -1)) : null;
  if (stints) ensurePair(tx, petId, habitId).stints = stints;
  delete tx.habit(habitId).companionId;
}

/**
 * Pairs a pet with a habit, or frees the habit (`petId` null). The pet leaves any other habit it
 * kept company; the habit's previous companion is freed. False (nothing changes) for an unknown or
 * archived habit or an unknown pet. Pairing also counts as the day's offer. Each change closes or
 * opens the pairing records' spans (WP-B6).
 */
export function setCompanion(tx: Tx, habitId: string, petId: string | null): boolean {
  const habit = tx.s.habits.find((h) => h.id === habitId);
  if (!habit) return false;
  if (petId === null) {
    if (habit.companionId === undefined) return false;
    endCompany(tx, habitId);
    return true;
  }
  if (!liveHabit(habit) || !tx.s.pets[petId]) return false;
  if (habit.companionId === petId) return true;
  for (const other of tx.s.habits) if (other.id !== habitId && other.companionId === petId) endCompany(tx, other.id);
  endCompany(tx, habitId);
  tx.habit(habitId).companionId = petId;
  const pair = ensurePair(tx, petId, habitId);
  pair.stints = stintsOpened(pair, tx.env.today);
  writableCompany(tx).offer = { ...companyOf(tx.s).offer, shownOn: tx.env.today };
  tx.emit({ type: 'companion', petId, habitId });
  return true;
}

/* ------------------------------------------------------------------ */
/* The offer                                                           */
/* ------------------------------------------------------------------ */

/** Pets with no habit to keep company, newest first. */
export function petsWithoutHabit(s: Pick<AppState, 'pets' | 'habits'>): string[] {
  const busy = new Set(s.habits.filter(liveHabit).map((h) => h.companionId));
  return Object.values(s.pets)
    .filter((p) => !busy.has(p.id))
    .sort((a, b) => b.obtainedAt - a.obtainedAt || (a.id < b.id ? -1 : 1))
    .map((p) => p.id);
}

/** Live habits without a companion, in display order. */
export function habitsWithoutCompanion(s: Pick<AppState, 'pets' | 'habits'>): Habit[] {
  return s.habits.filter((h) => liveHabit(h) && companionOf(s, h) === null).sort((a, b) => a.order - b.order);
}

/**
 * Whether the offer may be shown today: fewer than 3 declines, not shown yet this app day, and
 * there is both a pet without a habit and a habit without a companion.
 */
export function companionOfferOpen(s: Pick<AppState, 'company' | 'pets' | 'habits'>, today: DateKey): boolean {
  const offer = companyOf(s).offer;
  if (offer.declines >= OFFER_MAX_DECLINES || offer.shownOn === today) return false;
  return petsWithoutHabit(s).length > 0 && habitsWithoutCompanion(s).length > 0;
}

/** The offer was shown (it won't be shown again today). */
export function noteCompanionOffer(tx: Tx): void {
  const c = writableCompany(tx);
  c.offer = { ...c.offer, shownOn: tx.env.today };
}

/** "Not now": one decline (after 3 the offer never comes back). */
export function declineCompanionOffer(tx: Tx): void {
  const c = writableCompany(tx);
  c.offer = { declines: Math.min(OFFER_MAX_DECLINES, c.offer.declines + 1), shownOn: tx.env.today };
}

/**
 * "Let them choose" (§7.2: species preferences decide): the habit without a companion whose routine
 * the pet's species likes best; ties go to the more-watered plant, then display order.
 */
export function suggestHabitFor(s: AppState, petId: string): string | null {
  const def = getCollectible(petId.replace(/^moonlit:/, ''));
  const loves = def?.category === 'pet' ? SPECIES_ROUTINES[def.species] : [];
  const free = habitsWithoutCompanion(s);
  if (free.length === 0) return null;
  const rank = (h: Habit): number => {
    const i = loves.indexOf(routineOf(h.icon));
    return i < 0 ? loves.length : i;
  };
  const sun = (h: Habit): number => s.ledger.sunshine[h.id] ?? 0;
  return [...free].sort((a, b) => rank(a) - rank(b) || sun(b) - sun(a) || a.order - b.order)[0]!.id;
}

/* ------------------------------------------------------------------ */
/* Companion sunshine (called by economy.settleTo)                     */
/* ------------------------------------------------------------------ */

/**
 * The companion's share of one occurrence after a settlement moved its sunshine from `held` to
 * `nextSun` (and its level from `prevShown` to `nextShown`, as showing up or not). Growth goes to
 * the habit's companion while it is the pet already sharing the day (or starts a share); a fall
 * takes the share back first. Updates the pair's totals and returns the entry's new `co`.
 */
export function shareWithCompanion(
  tx: Tx,
  habit: Habit,
  held: LedgerEntry | undefined,
  nextSun: number,
  shownBefore: boolean,
  shownAfter: boolean,
): LedgerEntry['co'] {
  const heldSun = held?.sunshine ?? 0;
  const delta = nextSun - heldSun;
  const current = companionOf(tx.s, habit);
  let share = held?.co ? { ...held.co } : undefined;
  if (!share && current && (delta > 0 || (shownAfter && !shownBefore))) share = { pet: current, sun: 0 };
  if (!share) return undefined;
  const before = { sun: share.sun, watered: share.watered === true };
  if (delta > 0) {
    if (share.pet === current) share.sun = addToTotal(share.sun, delta);
  } else if (delta < 0) share.sun = addToTotal(share.sun, delta);
  share.sun = Math.min(share.sun, nextSun);
  if (shownAfter && !shownBefore && share.pet === current) share.watered = true;
  if (!shownAfter && share.watered) delete share.watered;
  const dSun = share.sun - before.sun;
  const dWater = (share.watered ? 1 : 0) - (before.watered ? 1 : 0);
  if (dSun !== 0 || dWater !== 0) {
    const pair = ensurePair(tx, share.pet, habit.id);
    pair.sunshine = addToTotal(pair.sunshine, dSun);
    pair.waterings = Math.max(0, pair.waterings + dWater);
  }
  return share.sun > 0 || share.watered ? share : undefined;
}

/* ------------------------------------------------------------------ */
/* After a completing check-in (called by logging.rewardPass)          */
/* ------------------------------------------------------------------ */

/**
 * The once-key of the occurrence a completing check-in on `date` brings, or null when it was
 * already paid.
 * - Day-based rules: the date is the occurrence (`company|<habitId>|<date>`).
 * - Flexible rules: a period holds `times` occurrences, whichever days they land on. The check-in
 *   pays only while the period's achieved occurrences exceed the paid check-in dates inside it
 *   (any companion key of the habit dated within the period's days counts, day-based ones
 *   included), and its key is `company|<habitId>|<periodKey>|<date>`, valued with the period's
 *   last day number for compaction. Moving a weekly habit's one check-in to the next day therefore
 *   pays nothing new, and a week-start change that regroups the days can't either: the paid date
 *   still lies in whichever period now holds it.
 */
function occurrenceKey(tx: Tx, habit: Habit, date: DateKey): { key: string; value: number | true } | null {
  const p = flexPeriodAt(habit, date, tx.s.settings.weekStart);
  const prefix = `company|${habit.id}|`;
  if (!p) {
    const key = `${prefix}${date}`;
    return hasOnce(tx.s, key) ? null : { key, value: true };
  }
  const paid = new Set<DateKey>();
  for (const k of Object.keys(tx.s.ledger.once)) {
    if (!k.startsWith(prefix)) continue;
    const parts = k.slice(prefix.length).split('|');
    const d = parts[parts.length - 1]!;
    if (parts.length <= 2 && d >= p.from && d <= p.to) paid.add(d);
  }
  const achieved = evaluatePeriod(habit, tx.s.logs[habit.id] ?? {}, p, { today: tx.env.today, weekStart: tx.s.settings.weekStart, offDays: tx.s.offDays }).achieved;
  const key = `${prefix}${p.key}|${date}`;
  if (achieved <= paid.size || hasOnce(tx.s, key)) return null;
  return { key, value: dayNumber(p.end) };
}

/**
 * A completing check-in on the reward path: the companion's XP (once per occurrence, ≤ 30 a day),
 * then the next story if its companion sunshine is reached. Both come only with an occurrence not
 * paid before: an Undo and re-check, or tiny then full, of the same occurrence brings neither
 * (§14.1 "one story per check-in"; §5.2 Undo restores the day exactly). Returns the XP paid.
 */
export function companionCheckin(tx: Tx, habitId: string, date: DateKey): number {
  const habit = tx.s.habits.find((h) => h.id === habitId);
  if (!habit || rewardsPaused(tx.s, tx.env.now)) return 0;
  const petId = companionOf(tx.s, habit);
  if (!petId) return 0;
  const occ = occurrenceKey(tx, habit, date);
  if (!occ) return 0;
  setOnce(tx, occ.key, occ.value);
  const daily = dailyFor(tx.s.pets[petId]!, tx.env.today);
  const paid = Math.max(0, Math.min(companionXpFor(ruleAt(habit, date)), COMPANION_XP.perDay - daily.company));
  if (paid > 0) {
    tx.pet(petId).daily = { ...daily, company: daily.company + paid };
    tx.emit({ type: 'companionXp', petId, habitId, date, xp: paid });
    addXp(tx, petId, paid);
  }
  // "Known for" (§14.1): the routine first shows on a watered day from Potted on; from then on the
  // Pet Card keeps the line, whatever a later day holds.
  const pair = pairOf(tx.s, petId, habitId);
  if (pair && pair.knownForSince === undefined && (tx.s.ledger.bestStage[habitId] ?? 0) >= POTTED) ensurePair(tx, petId, habitId).knownForSince = date < pair.since ? pair.since : date;
  unlockNextStory(tx, habit, petId);
  return paid;
}

/** The story the pair has earned next, if any (in order; Look at us also needs the plant at Blooming). */
export function nextStory(s: Pick<AppState, 'company' | 'ledger'>, habitId: string, petId: string): StoryId | null {
  const pair = pairOf(s, petId, habitId);
  if (!pair) return null;
  for (const id of STORIES) {
    if (pair.stories?.[id]) continue;
    if (!reaches(pair.sunshine, STORY_SUNSHINE[id])) return null;
    if (id === 'lookAtUs' && (s.ledger.bestStage[habitId] ?? 0) < BLOOMING) return null;
    return id;
  }
  return null;
}

/** Unlocks at most one story (each check-in brings at most one). */
function unlockNextStory(tx: Tx, habit: Habit, petId: string): void {
  const id = nextStory(tx.s, habit.id, petId);
  if (!id) return;
  const pair = ensurePair(tx, petId, habit.id);
  pair.stories = { ...pair.stories, [id]: { on: tx.env.today } };
  tx.emit({ type: 'story', petId, habitId: habit.id, story: id });
}

/** Marks a story as opened ("There's a story on the plant tag"). */
export function readStory(tx: Tx, habitId: string, story: StoryId): boolean {
  const habit = tx.s.habits.find((h) => h.id === habitId);
  const petId = habit?.companionId;
  const entry = petId ? pairOf(tx.s, petId, habitId)?.stories?.[story] : undefined;
  if (!petId || !entry || entry.readAt !== undefined) return false;
  const pair = ensurePair(tx, petId, habitId);
  pair.stories = { ...pair.stories, [story]: { ...entry, readAt: tx.env.now } };
  return true;
}

/**
 * "Why it matters" answered (or "Not now": `why` empty). It is asked once; the answer becomes
 * `Habit.why` (also editable in the Habit Editor from day 0).
 */
export function answerWhy(tx: Tx, habitId: string, why: string | null): boolean {
  const habit = tx.s.habits.find((h) => h.id === habitId);
  const petId = habit?.companionId;
  if (!habit || !petId || !pairOf(tx.s, petId, habitId)?.stories?.why) return false;
  const pair = ensurePair(tx, petId, habitId);
  pair.whyAsked = true;
  const text = cleanText(why ?? '', MAX_WHY);
  if (text) tx.habit(habitId).why = text;
  return true;
}

export function cleanText(text: string, max: number): string {
  return Array.from(text.trim()).slice(0, max).join('');
}

/* ------------------------------------------------------------------ */
/* Keepsakes (called by economy.updatePlantStage)                      */
/* ------------------------------------------------------------------ */

export const keepsakeId = (habitId: string, stage: number): string => `k-${habitId}-${stage}`;

/** Her latest Moment (a note) on the habit, up to `upTo`. */
export function latestMoment(s: Pick<AppState, 'logs'>, habitId: string, upTo: DateKey): { date: DateKey; text: string } | null {
  let best: { date: DateKey; text: string } | null = null;
  for (const [date, log] of Object.entries(s.logs[habitId] ?? {})) {
    const text = log.note?.trim();
    if (text && date <= upTo && (!best || date > best.date)) best = { date, text };
  }
  return best;
}

/** The companion leaves a keepsake for each keepsake stage the plant just reached (once per stage). */
export function leaveKeepsakes(tx: Tx, habitId: string, stages: readonly number[]): void {
  const habit = tx.s.habits.find((h) => h.id === habitId);
  if (!habit) return;
  const petId = companionOf(tx.s, habit);
  if (!petId) return;
  for (const stage of stages) {
    if (!KEEPSAKE_STAGES.includes(stage)) continue;
    const id = keepsakeId(habitId, stage);
    if ((tx.s.keepsakes ?? []).some((k) => k.id === id)) continue;
    const moment = latestMoment(tx.s, habitId, tx.env.today);
    const keepsake: Keepsake = { id, habitId, petId, stage, kind: keepsakeKind(habit.icon, stage), date: tx.env.today, ...(moment ? { note: moment } : {}) };
    tx.set('keepsakes', [...(tx.s.keepsakes ?? []), keepsake]);
    tx.emit({ type: 'keepsake', keepsakeId: id, petId, habitId, stage, kind: keepsake.kind });
  }
}

/** Edits a keepsake's caption (empty → the family's own caption). */
export function setKeepsakeNote(tx: Tx, id: string, text: string): boolean {
  const list = tx.s.keepsakes ?? [];
  const i = list.findIndex((k) => k.id === id);
  if (i < 0) return false;
  const clean = cleanText(text, MAX_KEEPSAKE_NOTE);
  const next: Keepsake = { ...list[i]! };
  if (clean) next.note = { date: next.note?.date ?? next.date, text: clean };
  else delete next.note;
  tx.set('keepsakes', list.map((k, j) => (j === i ? next : k)));
  return true;
}

/** Decor placements of keepsakes use this item id prefix: 'keepsake:<id>'. */
export const KEEPSAKE_ITEM_PREFIX = 'keepsake:';
export const keepsakeOfItem = (s: Pick<AppState, 'keepsakes'>, itemId: string): Keepsake | null =>
  itemId.startsWith(KEEPSAKE_ITEM_PREFIX) ? ((s.keepsakes ?? []).find((k) => k.id === itemId.slice(KEEPSAKE_ITEM_PREFIX.length)) ?? null) : null;

/* ------------------------------------------------------------------ */
/* Routines (derived)                                                  */
/* ------------------------------------------------------------------ */

export interface RoutineOn {
  petId: string;
  routine: Routine;
  phase: RoutinePhase;
}

/**
 * The companion's routine for a habit on a day (routines.ts): from Potted on days the habit was
 * done, every day from Blooming. Null otherwise: a day without it looks like any ordinary day.
 */
export function routineOn(s: Pick<AppState, 'pets' | 'logs'>, habit: Habit, date: DateKey, displayStage: number, today: DateKey): RoutineOn | null {
  const petId = companionOf(s, habit);
  if (!petId) return null;
  const done = inLifetime(habit, date) && showedUp(logStatus(s.logs[habit.id]?.[date], ruleAt(habit, date), date < today));
  const phase = routinePhase(displayStage, done);
  return phase ? { petId, routine: routineOf(habit.icon), phase } : null;
}

/** Frees a retiring habit's companion (archive, delete, retire); its span runs through today. */
export function freeCompanion(tx: Tx, habitId: string): void {
  endCompany(tx, habitId, true);
}

/** Drops every trace of a deleted habit's pairings (the keepsakes stay: they are hers). */
export function forgetHabitPairs(tx: Tx, habitId: string): void {
  const pairs = companyOf(tx.s).pairs;
  const keys = Object.keys(pairs).filter((k) => pairs[k]!.habitId === habitId);
  if (keys.length === 0) return;
  const c = writableCompany(tx);
  c.pairs = { ...c.pairs };
  for (const k of keys) delete c.pairs[k];
}

export type CompanyEvent = Extract<GameEvent, { type: 'companion' | 'companionXp' | 'story' | 'keepsake' }>;
