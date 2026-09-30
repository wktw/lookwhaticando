/**
 * Habit management and onboarding (DESIGN §5.1–§5.3, §6 effort, §9.6 onboarding).
 *
 * - Create: validated input; `createdAt` = now and `createdOn` = today's app day (both immutable;
 *   no rewards before that day, however the day boundary moves later), and `startedOn` = the first
 *   rule's `from` = today. Plant species and pots must be owned (non-free ones come from capsules).
 *   At most 3 active *big* habits ("Big is for the heavy lifts"), restores included.
 * - Edit: cosmetic fields (name, icon, colour, plant, pot, unit, effort, time of day, anchor,
 *   polarity, due day, notes) apply at once; rule fields (schedule, target, step, tiny) append a
 *   versioned rule (rules.ts), so history never changes. Effort edits affect future pay only (and a
 *   re-check never pays more than the original, economy.ts). After a rule edit every rewardable
 *   day in the window is re-settled under the rule now governing it (economy.resettleHabit).
 *   Stage-3 decisions: a day-based edit made after today's occurrence was already rewarded applies
 *   from tomorrow (today's check-in is history; a raised target can't turn the next +1 into a
 *   refund, nor a lowered one turn an un-check into a payment), and a "this period" edit that
 *   lowers the current period's goal forfeits that period's goal bonus (economy.forfeitLoweredGoal).
 * - Archive keeps history; restore adds a pause over the archived stretch (as a steady habit when 3
 *   big habits are already active). Delete removes the habit and its logs and *un-checks* its
 *   rewardable days (refunds where affordable, like un-checking); the sunshine it grew before stays
 *   in the lifetime total (The Cutting never shrinks, §13). "Keep the plant on the balcony shelf?"
 *   (§9.2, default yes in the UI) keeps the habit archived instead.
 * - Pauses start today or later; resume ends the covering pause yesterday (today too, when today's
 *   perfect day was already paid with this habit excused); overlaps merge.
 * - "Start tracking from…" moves `startedOn` earlier (stats only; no rewards before `createdOn`).
 */
import { HABIT_ICON_IDS } from '@/catalog/habitIcons';
import { TEMPLATES } from '@/catalog/templates';
import { fillLine } from '@/catalog/lineKit';
import { HABIT_ISSUES } from '@/catalog/linesCore';
import type { HabitTemplate, PastelKey, PotId } from '@/catalog/types';
import { PASTELS } from '@/catalog/types';
import type { HabitInput } from '@/state/api';
import type { AppState, DateKey, Effort, Habit, HabitRule, TimeOfDay } from '@/state/types';
import { graduationOffer, trackingOf, logsFor, evalContext } from './consistency';
import { logStatus, showedUp } from './activity';
import { owns, ownedTreats } from './collection';
import { addDays, clampDayStartsAt, isDateKey } from './dates';
import { addPause, archivedStretchPause, isPausedOn, resumePauses } from './pauses';
import { addToTotal } from './precision';
import { forgetHabitPairs, freeCompanion } from './company';
import { anchorIssue, unstackFollowers } from './stacking';
import { inferHemisphere } from './hemisphere';
import { ensureRecipe } from './pantry';
import { ruleAt, withRuleEdit, withStartedOn, type RuleEditTiming } from './rules';
import { RULE_LIMITS, isBiggerRule, isDayBased, normalizeRuleContent, sameRuleContent, validateRuleContent, type RuleContent } from './schedule';
import { GROW_COOLDOWN_DAYS, forfeitLoweredGoal, isSettleableDay, ledgerKey, ledgerKeyDate, resettleHabit } from './economy';
import type { Tx } from './tx';
import { grantStars, hasOnce, refundCoins, setOnce } from './wallet';

export const MAX_BIG_HABITS = 3;
export const LIMITS = { name: 60, anchor: 80, unit: 20, notes: 500, why: 140 } as const;
/** Onboarding suggests starting small (DESIGN §9.6: pick up to 3 habits). */
export const ONBOARDING_MAX_HABITS = 3;
export const DEFAULT_POT: PotId = 'terracotta';

const EFFORTS: readonly Effort[] = ['light', 'steady', 'big'];
const TIMES: readonly TimeOfDay[] = ['morning', 'midday', 'evening', 'anytime'];

export interface HabitIssue {
  field: keyof HabitInput;
  code: string;
  message: string;
}

export class HabitInputError extends Error {
  readonly issues: HabitIssue[];
  constructor(issues: HabitIssue[]) {
    super(`Invalid habit: ${issues.map((i) => `${i.field}:${i.code}`).join(', ')}`);
    this.name = 'HabitInputError';
    this.issues = issues;
  }
}

const RULE_FIELD: Record<string, keyof HabitInput> = {
  'target-range': 'target',
  'flexible-target': 'target',
  'step-range': 'step',
  'tiny-label': 'tiny',
  'tiny-count-range': 'tiny',
};

/** The editor's words for an issue code (HABIT_ISSUES), with its limit filled in. */
export function habitIssueMessage(code: string, max?: number): string {
  const tmpl = (HABIT_ISSUES as Record<string, string>)[code];
  return tmpl ? fillLine(tmpl, { max: max === undefined ? '' : max.toLocaleString('en-GB') }) : code;
}

/** Active (not archived) big habits, optionally ignoring the one being edited. */
export function bigHabitCount(s: Pick<AppState, 'habits'>, exceptId?: string): number {
  return s.habits.filter((h) => h.effort === 'big' && h.archivedOn === undefined && h.id !== exceptId).length;
}

/**
 * Every problem with a habit's input (empty = valid). `editingId` excludes that habit from the
 * big-habit limit (and is the habit an anchor must not lead back to). `today` bounds `endsOn`.
 */
export function validateHabitInput(s: AppState, input: HabitInput, editingId?: string, today?: DateKey): HabitIssue[] {
  const issues: HabitIssue[] = [];
  /** The message is the editor's field note (HABIT_ISSUES in lines.ts, VOICE.md §22). */
  const add = (field: keyof HabitInput, code: string, max?: number) => issues.push({ field, code, message: habitIssueMessage(code, max) });
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (name.length === 0 || name.length > LIMITS.name) add('name', 'name', LIMITS.name);
  if (!HABIT_ICON_IDS.has(input.icon)) add('icon', 'icon');
  if (!(PASTELS as readonly string[]).includes(input.color)) add('color', 'color');
  if (!owns(s.collection, `plant-${input.plant}`)) add('plant', 'plant-locked');
  if (!owns(s.collection, `pot-${input.pot}`)) add('pot', 'pot-locked');
  if (!EFFORTS.includes(input.effort)) add('effort', 'effort');
  else if (input.effort === 'big' && bigHabitCount(s, editingId) >= MAX_BIG_HABITS) add('effort', 'too-many-big', MAX_BIG_HABITS);
  if (!TIMES.includes(input.timeOfDay)) add('timeOfDay', 'time-of-day');
  if (input.polarity !== 'build' && input.polarity !== 'avoid') add('polarity', 'polarity');
  if (input.dueDay !== undefined && input.dueDay !== 'last' && !(Number.isInteger(input.dueDay) && input.dueDay >= 1 && input.dueDay <= 31)) add('dueDay', 'due-day');
  if (input.anchor !== undefined && input.anchor.length > LIMITS.anchor) add('anchor', 'anchor', LIMITS.anchor);
  if (input.unit !== undefined && input.unit.length > LIMITS.unit) add('unit', 'unit', LIMITS.unit);
  if (input.notes !== undefined && input.notes.length > LIMITS.notes) add('notes', 'notes', LIMITS.notes);
  if (input.why !== undefined && (typeof input.why !== 'string' || Array.from(input.why.trim()).length > LIMITS.why)) add('why', 'why', LIMITS.why);
  if (input.anchorHabitId !== undefined) {
    const issue = typeof input.anchorHabitId === 'string' ? anchorIssue(s, editingId, input.anchorHabitId) : 'unknown';
    if (issue) add('anchorHabitId', `anchor-${issue}`);
  }
  if (input.endsOn !== undefined && (!isDateKey(input.endsOn) || (today !== undefined && input.endsOn < today))) add('endsOn', 'ends-on');
  const content = ruleContentOf(input);
  for (const issue of validateRuleContent(content)) add(RULE_FIELD[issue.code] ?? 'schedule', issue.code, issue.code === 'target-range' ? RULE_LIMITS.targetMax : undefined);
  return issues;
}

function ruleContentOf(input: Pick<HabitInput, 'schedule' | 'target' | 'step' | 'tiny'>): RuleContent {
  return normalizeRuleContent({
    schedule: input.schedule,
    target: input.schedule.kind === 'weekly' || input.schedule.kind === 'monthly' ? 1 : input.target,
    step: input.step,
    ...(input.tiny ? { tiny: input.tiny } : {}),
  });
}

/** Optional habit fields a patch can clear by passing `undefined`. */
const OPTIONAL_FIELDS = ['unit', 'anchor', 'dueDay', 'notes', 'why', 'anchorHabitId', 'endsOn'] as const;

function cosmetic(
  input: HabitInput,
): Pick<Habit, 'name' | 'icon' | 'color' | 'plant' | 'pot' | 'unit' | 'effort' | 'timeOfDay' | 'anchor' | 'polarity' | 'dueDay' | 'notes' | 'why' | 'anchorHabitId' | 'endsOn'> {
  const out: ReturnType<typeof cosmetic> = {
    name: input.name.trim(),
    icon: input.icon,
    color: input.color,
    plant: input.plant,
    pot: input.pot,
    effort: input.effort,
    timeOfDay: input.timeOfDay,
    polarity: input.polarity,
  };
  if (input.unit?.trim()) out.unit = input.unit.trim();
  if (input.anchor?.trim()) out.anchor = input.anchor.trim();
  if (input.dueDay !== undefined) out.dueDay = input.dueDay;
  if (input.notes?.trim()) out.notes = input.notes.trim();
  if (input.why?.trim()) out.why = input.why.trim();
  if (input.anchorHabitId !== undefined) out.anchorHabitId = input.anchorHabitId;
  if (input.endsOn !== undefined) out.endsOn = input.endsOn;
  return out;
}

function newHabitId(tx: Tx): string {
  const taken = new Set(tx.s.habits.map((h) => h.id));
  for (;;) {
    const id = `h-${Math.floor(tx.env.rng() * 36 ** 8).toString(36).padStart(8, '0')}`;
    // A deleted habit's sunshine stays in the ledger (The Cutting's lifetime gauge): never reuse its id.
    if (!taken.has(id) && !tx.s.logs[id] && tx.s.ledger.sunshine[id] === undefined) return id;
  }
}

/** Creates a habit from validated input; throws HabitInputError otherwise. Returns its id. */
export function createHabit(tx: Tx, input: HabitInput): string {
  const issues = validateHabitInput(tx.s, input, undefined, tx.env.today);
  if (issues.length > 0) throw new HabitInputError(issues);
  const id = newHabitId(tx);
  const today = tx.env.today;
  const rule: HabitRule = { from: today, ...ruleContentOf(input) };
  const order = tx.s.habits.reduce((m, h) => Math.max(m, h.order), -1) + 1;
  const habit: Habit = { id, ...cosmetic(input), rules: [rule], createdAt: tx.env.now, createdOn: today, startedOn: today, pauses: [], order };
  const habits = tx.section('habits');
  habits.push(habit);
  return id;
}

/** The HabitInput a habit currently stands for (its rule in effect today). */
export function habitInputOf(habit: Habit, today: DateKey): HabitInput {
  const rule = ruleAt(habit, today);
  return {
    name: habit.name,
    icon: habit.icon,
    color: habit.color,
    plant: habit.plant,
    pot: habit.pot,
    schedule: rule.schedule,
    target: rule.target,
    step: rule.step,
    ...(rule.tiny ? { tiny: rule.tiny } : {}),
    ...(habit.unit !== undefined ? { unit: habit.unit } : {}),
    effort: habit.effort,
    timeOfDay: habit.timeOfDay,
    ...(habit.anchor !== undefined ? { anchor: habit.anchor } : {}),
    polarity: habit.polarity,
    ...(habit.dueDay !== undefined ? { dueDay: habit.dueDay } : {}),
    ...(habit.notes !== undefined ? { notes: habit.notes } : {}),
    ...(habit.why !== undefined ? { why: habit.why } : {}),
    ...(habit.anchorHabitId !== undefined ? { anchorHabitId: habit.anchorHabitId } : {}),
    ...(habit.endsOn !== undefined ? { endsOn: habit.endsOn } : {}),
  };
}

const RULE_KEYS = ['schedule', 'target', 'step', 'tiny'] as const;

/**
 * Applies a patch: cosmetic fields at once, rule fields as a new rule from `timing`
 * ('today' = this period for flexible habits, 'next-period', or 'tomorrow'), then re-settles the
 * window (see module doc). Throws HabitInputError on invalid input.
 */
export function updateHabit(tx: Tx, id: string, patch: Partial<HabitInput>, timing: RuleEditTiming = 'today'): void {
  const current = tx.s.habits.find((h) => h.id === id);
  if (!current) return;
  const today = tx.env.today;
  const merged: HabitInput = { ...habitInputOf(current, today), ...patch };
  if (Object.prototype.hasOwnProperty.call(patch, 'tiny') && patch.tiny === undefined) delete merged.tiny;
  for (const k of OPTIONAL_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(patch, k) && patch[k] === undefined) delete merged[k];
  }
  // An unchanged `endsOn` already in the past (a restored habit) is not re-validated against today.
  const issues = validateHabitInput(tx.s, merged, id, merged.endsOn === current.endsOn ? undefined : tx.env.today);
  if (issues.length > 0) throw new HabitInputError(issues);
  let next: Habit = { ...current, ...cosmetic(merged) };
  for (const k of OPTIONAL_FIELDS) if (merged[k] === undefined) delete next[k];
  const ruleEdit = RULE_KEYS.some((k) => Object.prototype.hasOwnProperty.call(patch, k));
  if (ruleEdit) {
    const content = ruleContentOf(merged);
    const pinned = timing !== 'tomorrow' && isDayBased(ruleAt(current, today)) && !sameRuleContent(ruleAt(current, today), content) && todayRewarded(tx, id);
    next = withRuleEdit(next, content, today, pinned ? 'tomorrow' : timing, tx.s.settings.weekStart);
  }
  const h = tx.habit(id);
  Object.assign(h, next);
  for (const k of OPTIONAL_FIELDS) if (next[k] === undefined) delete h[k];
  if (ruleEdit && next.rules !== current.rules) {
    forfeitLoweredGoal(tx, current, next);
    resettleHabit(tx, id);
  }
}

/** Today's occurrence already holds a grant (it was rewarded, possibly with blocked refunds). */
function todayRewarded(tx: Tx, id: string): boolean {
  const e = tx.s.ledger.recent[ledgerKey(id, tx.env.today)];
  return e !== undefined && (e.lvl !== undefined || e.coins > 0);
}

export function archiveHabit(tx: Tx, id: string): void {
  const h = tx.s.habits.find((x) => x.id === id);
  if (!h || h.archivedOn !== undefined) return;
  freeCompanion(tx, id);
  unstackFollowers(tx, id);
  tx.habit(id).archivedOn = tx.env.today < h.startedOn ? h.startedOn : tx.env.today;
}

/**
 * Restores an archived habit; the archived stretch becomes a pause (v1 §13.2). A big habit comes back
 * as steady when 3 big habits are already active (v1 §13.5 "at most 3 big habits active"; archiving,
 * creating new big habits and restoring the old ones can't exceed it).
 * Like Resume (§6): when the habit was already archived before today (Finish archives an unwatered
 * habit as of yesterday) and today's perfect day was paid while it wasn't done, the pause covers
 * today too and the habit is back tomorrow, so Finish → collect → restore can't mint a bonus.
 */
export function restoreHabit(tx: Tx, id: string): void {
  const h = tx.s.habits.find((x) => x.id === id);
  if (!h || h.archivedOn === undefined) return;
  const w = tx.habit(id);
  const today = tx.env.today;
  const log = tx.s.logs[id]?.[today];
  const doneToday = log?.kind === 'log' && showedUp(logStatus(log, ruleAt(h, today), false));
  const keepToday = h.archivedOn < today && hasOnce(tx.s, `perfect|${today}`) && !doneToday;
  const stretch = archivedStretchPause(h.archivedOn, keepToday ? addDays(today, 1) : today);
  if (stretch) w.pauses = addPause(h.pauses, stretch.start, stretch.end);
  delete w.archivedOn;
  // Back from the balcony shelf: the ribbon comes off, and a finished "just this season" runs on.
  delete w.ribbon;
  if (w.endsOn !== undefined && w.endsOn < tx.env.today) delete w.endsOn;
  if (h.effort === 'big' && bigHabitCount(tx.s, id) >= MAX_BIG_HABITS) w.effort = 'steady';
}

export interface DeleteOptions {
  /**
   * "Keep the plant on the balcony shelf?" (§9.2; the UI defaults to yes): the habit is archived
   * instead, so its plant stays on the balcony shelf with its history.
   */
  keepPlant?: boolean;
}

/**
 * Deletes a habit with its logs. Its grants that an un-check could still reverse (`isSettleableDay`:
 * inside the refund window, clock trusted) are un-checked first: coins refunded where the balance
 * allows (all or nothing per day), their sunshine and check-in counts removed. Older ledger entries
 * the ledger still retains (it keeps one day more than the window) are dropped without reversal,
 * so the outcome never depends on whether compaction has run yet (HM2). The sunshine it grew
 * before the window stays in `ledger.sunshine` (The Cutting is a lifetime gauge across all habits,
 * deleted ones included, §13; growth only adds, §3.1). Bonuses stay.
 */
export function deleteHabit(tx: Tx, id: string, opts: DeleteOptions = {}): void {
  if (!tx.s.habits.some((h) => h.id === id)) return;
  if (opts.keepPlant) {
    archiveHabit(tx, id);
    return;
  }
  const prefix = `${id}|`;
  const keys = Object.keys(tx.s.ledger.recent).filter((k) => k.startsWith(prefix));
  let refundedSunshine = 0;
  if (keys.length > 0) {
    for (const k of keys) {
      const e = tx.s.ledger.recent[k]!;
      if (!isSettleableDay(tx.s, ledgerKeyDate(k), tx.env)) continue;
      if (e.coins > 0 && refundCoins(tx, e.coins, id)) {
        const daily = tx.ledger('daily');
        const today = tx.env.today;
        daily[today] = Math.max(0, (daily[today] ?? 0) - e.coins);
      }
      refundedSunshine += e.sunshine;
      if (e.lvl) {
        const life = tx.section('lifetime');
        life.checkins = Math.max(0, life.checkins - 1);
      }
    }
    const recent = tx.ledger('recent');
    for (const k of keys) delete recent[k];
  }
  const habits = tx.section('habits');
  habits.splice(
    habits.findIndex((h) => h.id === id),
    1,
  );
  if (tx.s.logs[id]) delete tx.section('logs')[id];
  const sun = tx.s.ledger.sunshine[id];
  if (sun !== undefined && refundedSunshine > 0) {
    const left = addToTotal(sun, -refundedSunshine);
    if (left > 0) tx.ledger('sunshine')[id] = left;
    else delete tx.ledger('sunshine')[id];
  }
  if (tx.s.ledger.bestStage[id] !== undefined) delete tx.ledger('bestStage')[id];
  // Followers no longer follow it; its pairings, looks and stage days go with it (keepsakes stay: they are hers).
  unstackFollowers(tx, id);
  forgetHabitPairs(tx, id);
  if (tx.s.plantLooks?.[id]) {
    const { [id]: _looks, ...rest } = tx.s.plantLooks;
    tx.set('plantLooks', Object.keys(rest).length > 0 ? rest : undefined);
  }
  if (tx.s.stageDates?.[id]) {
    const { [id]: _days, ...rest } = tx.s.stageDates;
    tx.set('stageDates', Object.keys(rest).length > 0 ? rest : undefined);
  }
  const staleOnce = Object.keys(tx.s.ledger.once).filter((k) => k.split('|')[1] === id && /^(period|rung|harvest|grow|rest|flourish|company)\|/.test(k));
  if (staleOnce.length > 0) {
    const once = tx.ledger('once');
    for (const k of staleOnce) delete once[k];
  }
}

/** Sets the display order: listed ids first in that order, the rest after in their old order. */
export function reorderHabits(tx: Tx, ids: string[]): void {
  const rank = new Map(ids.map((id, i) => [id, i]));
  const sorted = [...tx.s.habits].sort((a, b) => {
    const ra = rank.get(a.id) ?? ids.length + a.order;
    const rb = rank.get(b.id) ?? ids.length + b.order;
    return ra - rb;
  });
  sorted.forEach((h, i) => {
    if (h.order !== i) tx.habit(h.id).order = i;
  });
}

/** Pause from `start` (today or later) until `end` (inclusive, optional). */
export function pauseHabit(tx: Tx, id: string, start: DateKey, end?: DateKey): boolean {
  const h = tx.s.habits.find((x) => x.id === id);
  if (!h || !isDateKey(start) || (end !== undefined && !isDateKey(end))) return false;
  const from = start < tx.env.today ? tx.env.today : start;
  if (end !== undefined && end < from) return false;
  tx.habit(id).pauses = addPause(h.pauses, from, end);
  return true;
}

/**
 * Resume: the covering pause ends yesterday (v1 §13.2). Stage-3 decision: when today's perfect day was
 * already paid while this habit was paused and not done, today stays paused (the pause ends today)
 * and the habit is back tomorrow, so the bonus never outlives the pause it relied on (bonuses are
 * never clawed back, so pausing the undone habits, collecting and resuming can't mint one).
 */
export function resumeHabit(tx: Tx, id: string): void {
  const h = tx.s.habits.find((x) => x.id === id);
  if (!h) return;
  const today = tx.env.today;
  const log = tx.s.logs[id]?.[today];
  const doneToday = log?.kind === 'log' && showedUp(logStatus(log, ruleAt(h, today), false));
  const keepToday = hasOnce(tx.s, `perfect|${today}`) && isPausedOn(h.pauses, today) && !doneToday;
  tx.habit(id).pauses = resumePauses(h.pauses, keepToday ? addDays(today, 1) : today);
}

/** "Start tracking Walk from Mon, Sep 22?": earlier `startedOn` (stats only). */
export function setStartedOn(tx: Tx, id: string, date: DateKey): boolean {
  const h = tx.s.habits.find((x) => x.id === id);
  if (!h || !isDateKey(date) || date > tx.env.today || date >= h.startedOn) return false;
  Object.assign(tx.habit(id), withStartedOn(h, date));
  return true;
}

/** Accepting "Ready to grow?" pays +1 stamp (§5.2 graduation). */
export const GROW_STARS = 1;

/** A rule edit already scheduled to start after today (e.g. an accepted offer, or a next-period edit). */
export function hasPendingRule(habit: Pick<Habit, 'rules'>, today: DateKey): boolean {
  return habit.rules.some((r) => r.from > today);
}

/** The day "Ready to grow?" was last accepted for this habit within the cooldown, if any. */
function recentGrowAccept(s: AppState, habitId: string, today: DateKey): DateKey | null {
  return recentOnce(s, `grow|${habitId}|`, today);
}

/** The latest day recorded under `prefix` (`<prefix><day>` keys in ledger.once) within the cooldown, if any. */
function recentOnce(s: AppState, prefix: string, today: DateKey): DateKey | null {
  const since = addDays(today, -(GROW_COOLDOWN_DAYS - 1));
  let last: DateKey | null = null;
  for (const k of Object.keys(s.ledger.once)) {
    if (!k.startsWith(prefix)) continue;
    const d = k.slice(prefix.length);
    if (d >= since && (last === null || d > last)) last = d;
  }
  return last;
}

/**
 * The graduation offer to show today: none while an edit is already pending, none for 28 days after
 * she declined that offer, and no "Ready to grow?" for 28 days after one was accepted, even if the
 * new rule was then withdrawn (v1 §13.2; one star per real graduation).
 */
export function currentOffer(s: AppState, habit: Habit, today: DateKey): 'grow' | 'tinier' | null {
  if (hasPendingRule(habit, today)) return null;
  const t = trackingOf(s);
  const offer = graduationOffer(habit, logsFor(t, habit.id), evalContext(t, today));
  if (offer && recentOnce(s, `decline-${offer}|${habit.id}|`, today) !== null) return null;
  return offer === 'grow' && recentGrowAccept(s, habit.id, today) !== null ? null : offer;
}

/**
 * "Keep it as it is" on "A bigger pot?" or "Make it tinier?": that offer stays closed for its 28-day
 * look-back, so it only comes back once the habit has earned it afresh. The
 * day is recorded as `decline-<kind>|<id>|<day>`. False when that offer isn't standing.
 */
export function declineOffer(tx: Tx, id: string, kind: 'grow' | 'tinier'): boolean {
  const h = tx.s.habits.find((x) => x.id === id);
  if (!h || currentOffer(tx.s, h, tx.env.today) !== kind) return false;
  setOnce(tx, `decline-${kind}|${id}|${tx.env.today}`);
  return true;
}

/**
 * Accepting "Ready to grow?" (v1 §13.2): applies a *bigger* rule (more occurrences a week or a bigger
 * target, nothing smaller) from tomorrow and pays +1 stamp, only while the offer stands. False, with
 * nothing changed, when no offer stands or the patch is not a bigger rule (use `updateHabit` for
 * other edits). The accept day is recorded (`grow|<id>|<day>`), which keeps the offer closed for 28
 * days whatever happens to the pending rule.
 */
export function acceptGrowOffer(tx: Tx, id: string, patch: Partial<HabitInput>): boolean {
  const h = tx.s.habits.find((x) => x.id === id);
  const today = tx.env.today;
  if (!h || currentOffer(tx.s, h, today) !== 'grow') return false;
  const merged: HabitInput = { ...habitInputOf(h, today), ...patch };
  if (!isBiggerRule(ruleAt(h, today), ruleContentOf(merged))) return false;
  updateHabit(tx, id, patch, 'tomorrow');
  setOnce(tx, `grow|${id}|${today}`);
  grantStars(tx, GROW_STARS, 'grow');
  return true;
}

/* ------------------------------------------------------------------ */
/* Templates & onboarding                                              */
/* ------------------------------------------------------------------ */

/**
 * The HabitInput for a template. Every template grows a free starter plant (pothos, pilea, begonia,
 * snake plant or cat grass, §5.5) in the free terracotta pot, so the preview is what gets planted.
 */
export function habitInputFromTemplate(template: HabitTemplate): HabitInput {
  return {
    name: template.name,
    icon: template.icon,
    color: template.color as PastelKey,
    plant: template.plant,
    pot: DEFAULT_POT,
    schedule: template.schedule,
    target: template.target,
    step: template.step ?? 1,
    ...(template.tiny ? { tiny: template.tiny } : {}),
    ...(template.unit ? { unit: template.unit } : {}),
    effort: template.effort,
    timeOfDay: template.timeOfDay,
    polarity: template.polarity ?? 'build',
  };
}

export interface OnboardingInput {
  name: string;
  templateIds: string[];
  /** "Make my own" habits from the same step, planted after the chosen starters (3 in all at most). */
  customHabits?: HabitInput[];
  dayStartsAt?: number;
  birthday?: string;
}

/**
 * Finishes onboarding (§9.6): the name, the day start and birthday when given, the starter recipes
 * in the pantry, and up to 3 habits: the chosen starters, then any "Make my own" habits (one
 * transaction, one limit). Returns the new habit ids in that order, for "Find {name} a plant".
 * There is no pet and no coin gift here: the first pet comes from the "Who comes home first?"
 * capsule (`pull(…, { free: true })`, gacha.ts), and the first check-in tops the jar up to one
 * capsule (First Sprout, economy.ts). Idempotent once onboarded (returns []).
 */
export function completeOnboarding(tx: Tx, opts: OnboardingInput): string[] {
  if (tx.s.profile.onboarded) return [];
  const profile = tx.section('profile');
  profile.name = (opts.name ?? '').trim().slice(0, 40);
  profile.onboarded = true;
  if (opts.birthday && /^\d{2}-\d{2}$/.test(opts.birthday)) profile.birthday = opts.birthday;
  if (opts.dayStartsAt !== undefined) tx.section('settings').dayStartsAt = clampDayStartsAt(opts.dayStartsAt);
  // "Where's your summer?" starts from the device's time zone, and stays put when she travels.
  if (tx.s.settings.hemisphere === undefined && tx.env.timeZone) tx.section('settings').hemisphere = inferHemisphere(tx.env.timeZone);
  for (const t of ownedTreats(tx.s.collection)) ensureRecipe(tx, t.id);
  const ids: string[] = [];
  const inputs = [
    ...opts.templateIds.map((templateId) => TEMPLATES.find((t) => t.id === templateId)).filter((t): t is HabitTemplate => t !== undefined).map(habitInputFromTemplate),
    ...(opts.customHabits ?? []),
  ];
  for (const input of inputs) {
    if (ids.length >= ONBOARDING_MAX_HABITS) break;
    if (validateHabitInput(tx.s, input).length > 0) continue;
    ids.push(createHabit(tx, input));
  }
  return ids;
}
