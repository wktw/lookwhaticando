/**
 * Habit management and onboarding (DESIGN §5.1, §13.2, §13.5 effort, §13.10 onboarding).
 *
 * - Create: validated input; `createdAt` = now (immutable; no rewards before its app day), and
 *   `startedOn` = the first rule's `from` = today. Plant species and pots must be owned (non-free
 *   ones come from capsules). At most 3 active *big* habits ("Big is for the heavy lifts").
 * - Edit: cosmetic fields (name, icon, colour, plant, pot, unit, effort, time of day, anchor,
 *   polarity, due day, notes) apply at once; rule fields (schedule, target, step, tiny) append a
 *   versioned rule (rules.ts), so history never changes. Effort edits affect future pay only (and a
 *   re-check never pays more than the original, economy.ts).
 * - Archive keeps history; restore adds a pause over the archived stretch. Delete removes the habit
 *   and its logs and *un-checks* its rewardable days (refunds where affordable, like un-checking),
 *   so delete-and-recreate can never double-pay; bonuses are never clawed back.
 * - Pauses start today or later; resume ends the covering pause yesterday; overlaps merge.
 * - "Start tracking from…" moves `startedOn` earlier (stats only; no rewards before `createdAt`).
 */
import { HABIT_ICON_IDS } from '@/catalog/habitIcons';
import { TEMPLATES } from '@/catalog/templates';
import type { HabitTemplate, PastelKey, PlantSpeciesId, PotId } from '@/catalog/types';
import { PASTELS } from '@/catalog/types';
import { MOCHI_ID } from '@/catalog/collectibles';
import type { HabitInput } from '@/state/api';
import type { AppState, DateKey, Effort, Habit, HabitRule, TimeOfDay } from '@/state/types';
import { graduationOffer, trackingOf, logsFor, evalContext } from './consistency';
import { owns, ownedTreats } from './collection';
import { clampDayStartsAt, isDateKey } from './dates';
import { mochiPetState } from './friendship';
import { addPause, archivedStretchPause, resumePauses } from './pauses';
import { ensureRecipe } from './pantry';
import { ruleAt, withRuleEdit, withStartedOn, type RuleEditTiming } from './rules';
import { normalizeRuleContent, validateRuleContent, type RuleContent } from './schedule';
import type { Tx } from './tx';
import { addToCollection, grantStars, hasOnce, refundCoins, setOnce } from './wallet';

export const MAX_BIG_HABITS = 3;
export const LIMITS = { name: 60, anchor: 80, unit: 20, notes: 500 } as const;
/** Onboarding suggests starting small (DESIGN §13.11: max 3 starter habits). */
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

/** Active (not archived) big habits, optionally ignoring the one being edited. */
export function bigHabitCount(s: Pick<AppState, 'habits'>, exceptId?: string): number {
  return s.habits.filter((h) => h.effort === 'big' && h.archivedOn === undefined && h.id !== exceptId).length;
}

/** Every problem with a habit's input (empty = valid). `editingId` excludes that habit from the big-habit limit. */
export function validateHabitInput(s: AppState, input: HabitInput, editingId?: string): HabitIssue[] {
  const issues: HabitIssue[] = [];
  const add = (field: keyof HabitInput, code: string, message: string) => issues.push({ field, code, message });
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (name.length === 0 || name.length > LIMITS.name) add('name', 'name', `Give it a name (up to ${LIMITS.name} characters).`);
  if (!HABIT_ICON_IDS.has(input.icon)) add('icon', 'icon', 'Pick an icon.');
  if (!(PASTELS as readonly string[]).includes(input.color)) add('color', 'color', 'Pick a colour.');
  if (!owns(s.collection, `plant-${input.plant}`)) add('plant', 'plant-locked', 'That plant is still in a capsule.');
  if (!owns(s.collection, `pot-${input.pot}`)) add('pot', 'pot-locked', 'That pot is still in a capsule.');
  if (!EFFORTS.includes(input.effort)) add('effort', 'effort', 'Pick how long it takes.');
  else if (input.effort === 'big' && bigHabitCount(s, editingId) >= MAX_BIG_HABITS) {
    add('effort', 'too-many-big', 'Big is for the heavy lifts. You have 3 already.');
  }
  if (!TIMES.includes(input.timeOfDay)) add('timeOfDay', 'time-of-day', 'Pick a time of day.');
  if (input.polarity !== 'build' && input.polarity !== 'avoid') add('polarity', 'polarity', 'Build or avoid?');
  if (input.dueDay !== undefined && input.dueDay !== 'last' && !(Number.isInteger(input.dueDay) && input.dueDay >= 1 && input.dueDay <= 31)) {
    add('dueDay', 'due-day', 'Due day is 1–31 or "last".');
  }
  if (input.anchor !== undefined && input.anchor.length > LIMITS.anchor) add('anchor', 'anchor', `Keep the anchor under ${LIMITS.anchor} characters.`);
  if (input.unit !== undefined && input.unit.length > LIMITS.unit) add('unit', 'unit', `Keep the unit under ${LIMITS.unit} characters.`);
  if (input.notes !== undefined && input.notes.length > LIMITS.notes) add('notes', 'notes', `Keep notes under ${LIMITS.notes} characters.`);
  const content = ruleContentOf(input);
  for (const issue of validateRuleContent(content)) add(RULE_FIELD[issue.code] ?? 'schedule', issue.code, issue.message);
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

function cosmetic(input: HabitInput): Pick<Habit, 'name' | 'icon' | 'color' | 'plant' | 'pot' | 'unit' | 'effort' | 'timeOfDay' | 'anchor' | 'polarity' | 'dueDay' | 'notes'> {
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
  return out;
}

function newHabitId(tx: Tx): string {
  const taken = new Set(tx.s.habits.map((h) => h.id));
  for (;;) {
    const id = `h-${Math.floor(tx.env.rng() * 36 ** 8).toString(36).padStart(8, '0')}`;
    if (!taken.has(id) && !tx.s.logs[id]) return id;
  }
}

/** Creates a habit from validated input; throws HabitInputError otherwise. Returns its id. */
export function createHabit(tx: Tx, input: HabitInput): string {
  const issues = validateHabitInput(tx.s, input);
  if (issues.length > 0) throw new HabitInputError(issues);
  const id = newHabitId(tx);
  const today = tx.env.today;
  const rule: HabitRule = { from: today, ...ruleContentOf(input) };
  const order = tx.s.habits.reduce((m, h) => Math.max(m, h.order), -1) + 1;
  const habit: Habit = { id, ...cosmetic(input), rules: [rule], createdAt: tx.env.now, startedOn: today, pauses: [], order };
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
  };
}

const RULE_KEYS = ['schedule', 'target', 'step', 'tiny'] as const;

/**
 * Applies a patch: cosmetic fields at once, rule fields as a new rule from `timing`
 * ('today' = this period for flexible habits, 'next-period', or 'tomorrow'). Throws
 * HabitInputError on invalid input.
 */
export function updateHabit(tx: Tx, id: string, patch: Partial<HabitInput>, timing: RuleEditTiming = 'today'): void {
  const current = tx.s.habits.find((h) => h.id === id);
  if (!current) return;
  const today = tx.env.today;
  const merged: HabitInput = { ...habitInputOf(current, today), ...patch };
  if (Object.prototype.hasOwnProperty.call(patch, 'tiny') && patch.tiny === undefined) delete merged.tiny;
  for (const k of ['unit', 'anchor', 'dueDay', 'notes'] as const) {
    if (Object.prototype.hasOwnProperty.call(patch, k) && patch[k] === undefined) delete merged[k];
  }
  const issues = validateHabitInput(tx.s, merged, id);
  if (issues.length > 0) throw new HabitInputError(issues);
  let next: Habit = { ...current, ...cosmetic(merged) };
  for (const k of ['unit', 'anchor', 'dueDay', 'notes'] as const) if (merged[k] === undefined) delete next[k];
  if (RULE_KEYS.some((k) => Object.prototype.hasOwnProperty.call(patch, k))) {
    next = withRuleEdit(next, ruleContentOf(merged), today, timing, tx.s.settings.weekStart);
  }
  const h = tx.habit(id);
  Object.assign(h, next);
  for (const k of ['unit', 'anchor', 'dueDay', 'notes'] as const) if (next[k] === undefined) delete h[k];
}

export function archiveHabit(tx: Tx, id: string): void {
  const h = tx.s.habits.find((x) => x.id === id);
  if (!h || h.archivedOn !== undefined) return;
  tx.habit(id).archivedOn = tx.env.today < h.startedOn ? h.startedOn : tx.env.today;
}

/** Restores an archived habit; the archived stretch becomes a pause (§13.2). */
export function restoreHabit(tx: Tx, id: string): void {
  const h = tx.s.habits.find((x) => x.id === id);
  if (!h || h.archivedOn === undefined) return;
  const w = tx.habit(id);
  const stretch = archivedStretchPause(h.archivedOn, tx.env.today);
  if (stretch) w.pauses = addPause(h.pauses, stretch.start, stretch.end);
  delete w.archivedOn;
}

/**
 * Deletes a habit with its logs. Its rewardable grants are un-checked first: coins refunded where
 * the balance allows (all or nothing per day), sunshine and check-in counts removed. Bonuses stay.
 */
export function deleteHabit(tx: Tx, id: string): void {
  if (!tx.s.habits.some((h) => h.id === id)) return;
  const prefix = `${id}|`;
  const keys = Object.keys(tx.s.ledger.recent).filter((k) => k.startsWith(prefix));
  if (keys.length > 0) {
    for (const k of keys) {
      const e = tx.s.ledger.recent[k]!;
      if (e.coins > 0 && refundCoins(tx, e.coins, id)) {
        const daily = tx.ledger('daily');
        const today = tx.env.today;
        daily[today] = Math.max(0, (daily[today] ?? 0) - e.coins);
      }
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
  if (tx.s.ledger.sunshine[id] !== undefined) delete tx.ledger('sunshine')[id];
  if (tx.s.ledger.bestStage[id] !== undefined) delete tx.ledger('bestStage')[id];
  const staleOnce = Object.keys(tx.s.ledger.once).filter((k) => k.split('|')[1] === id && /^(period|rung|harvest|grow)\|/.test(k));
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

export function resumeHabit(tx: Tx, id: string): void {
  const h = tx.s.habits.find((x) => x.id === id);
  if (!h) return;
  tx.habit(id).pauses = resumePauses(h.pauses, tx.env.today);
}

/** "Start tracking Walk from Mon, Sep 22?": earlier `startedOn` (stats only). */
export function setStartedOn(tx: Tx, id: string, date: DateKey): boolean {
  const h = tx.s.habits.find((x) => x.id === id);
  if (!h || !isDateKey(date) || date > tx.env.today || date >= h.startedOn) return false;
  Object.assign(tx.habit(id), withStartedOn(h, date));
  return true;
}

/**
 * Accepting "Ready to grow?" (§13.2): applies the bigger rule from tomorrow and pays +1★, only while
 * the offer stands (so at most once per 28 days per habit).
 */
export const GROW_STARS = 1;

/** A rule edit already scheduled to start after today (e.g. an accepted offer, or a next-period edit). */
export function hasPendingRule(habit: Pick<Habit, 'rules'>, today: DateKey): boolean {
  return habit.rules.some((r) => r.from > today);
}

/** The graduation offer to show today: none while an edit is already pending (§13.2). */
export function currentOffer(s: AppState, habit: Habit, today: DateKey): 'grow' | 'tinier' | null {
  if (hasPendingRule(habit, today)) return null;
  const t = trackingOf(s);
  return graduationOffer(habit, logsFor(t, habit.id), evalContext(t, today));
}

export function acceptGrowOffer(tx: Tx, id: string, patch: Partial<HabitInput>): boolean {
  const h = tx.s.habits.find((x) => x.id === id);
  if (!h || currentOffer(tx.s, h, tx.env.today) !== 'grow') return false;
  updateHabit(tx, id, patch, 'tomorrow');
  const key = `grow|${id}|${tx.env.today}`;
  if (!hasOnce(tx.s, key)) {
    setOnce(tx, key);
    grantStars(tx, GROW_STARS, 'gift');
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Templates & onboarding                                              */
/* ------------------------------------------------------------------ */

/** Fallback plants when a template's species is still in a capsule (in preference order). */
const PLANT_FALLBACK: readonly PlantSpeciesId[] = ['tulip', 'daisy', 'sunflower', 'succulent', 'monstera'];
const PLANT_SUBSTITUTE: Partial<Record<PlantSpeciesId, PlantSpeciesId>> = {
  cactus: 'succulent',
  lavender: 'tulip',
  lily: 'daisy',
  strawberry: 'tulip',
  sakura: 'tulip',
  lemon: 'sunflower',
  mushroom: 'monstera',
};

/** The HabitInput for a template, using an owned plant (a starter substitute when needed). */
export function habitInputFromTemplate(template: HabitTemplate, collection: AppState['collection']): HabitInput {
  const has = (p: PlantSpeciesId) => owns(collection, `plant-${p}`);
  const plant = has(template.plant)
    ? template.plant
    : [PLANT_SUBSTITUTE[template.plant], ...PLANT_FALLBACK].find((p): p is PlantSpeciesId => p !== undefined && has(p)) ?? template.plant;
  return {
    name: template.name,
    icon: template.icon,
    color: template.color as PastelKey,
    plant,
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
  dayStartsAt?: number;
  birthday?: string;
}

/**
 * Finishes onboarding (§13.10): the name, Mochi (fixed character, buddy, always out), the starter
 * recipes in the pantry, and up to 3 habits from templates. There is no coin gift: the first
 * check-in earns the first capsule (First Sprout, economy.ts). Idempotent once onboarded.
 */
export function completeOnboarding(tx: Tx, opts: OnboardingInput): string[] {
  if (tx.s.profile.onboarded) return [];
  const profile = tx.section('profile');
  profile.name = (opts.name ?? '').trim().slice(0, 40);
  profile.onboarded = true;
  if (opts.birthday && /^\d{2}-\d{2}$/.test(opts.birthday)) profile.birthday = opts.birthday;
  if (opts.dayStartsAt !== undefined) tx.section('settings').dayStartsAt = clampDayStartsAt(opts.dayStartsAt);
  if (!tx.s.pets[MOCHI_ID]) {
    addToCollection(tx, MOCHI_ID);
    tx.section('pets')[MOCHI_ID] = mochiPetState(tx.env.now, tx.env.today);
  }
  profile.buddy = MOCHI_ID;
  for (const t of ownedTreats(tx.s.collection)) ensureRecipe(tx, t.id);
  const ids: string[] = [];
  for (const templateId of opts.templateIds.slice(0, ONBOARDING_MAX_HABITS)) {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) continue;
    const input = habitInputFromTemplate(template, tx.s.collection);
    if (validateHabitInput(tx.s, input).length > 0) continue;
    ids.push(createHabit(tx, input));
  }
  return ids;
}
