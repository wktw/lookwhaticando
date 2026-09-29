/**
 * `validateState`: a hand-written schema guard for AppState (DESIGN §13.8: snapshots are taken only
 * when it passes; imports and loads are checked with it). No dependencies.
 *
 * It checks structure and invariants the reducers rely on — types, ranges, DateKey formats, the
 * versioned-rule invariants (rules sorted, first rule starts on `startedOn`), unique habit ids,
 * logs only for existing habits, a well-formed ledger — and reports readable paths
 * ("habits[2].rules[0].from: not a date"). Unknown collectible ids are allowed (a future catalog
 * may add items); unknown *fields* are ignored.
 */
import { PASTELS } from '@/catalog/types';
import { MACHINES } from '@/catalog/machines';
import { ZONES } from '@/catalog/zones';
import { PERSONALITIES } from '@/catalog/personalities';
import { isDateKey } from '@/domain/dates';
import { validateHabitRules } from '@/domain/rules';
import { SCHEMA_VERSION, type AppState } from './types';

export type ValidationResult = { ok: true; state: AppState } | { ok: false; errors: string[] };

const MAX_ERRORS = 40;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isInt = (v: unknown): v is number => Number.isInteger(v);
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const nonNeg = (v: unknown): v is number => isNum(v) && v >= 0;
const nonNegInt = (v: unknown): v is number => isInt(v) && (v as number) >= 0;
const oneOf =
  <T>(values: readonly T[]) =>
  (v: unknown): v is T =>
    values.includes(v as T);

const MACHINE_IDS = MACHINES.map((m) => m.id);
const ZONE_IDS = ZONES.map((z) => z.id);
const PERSONALITY_IDS = PERSONALITIES.map((p) => p.id);
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

class Report {
  readonly errors: string[] = [];
  /** Records `what` at `path` unless `ok`. Returns ok. */
  check(ok: boolean, path: string, what: string): boolean {
    if (!ok && this.errors.length < MAX_ERRORS) this.errors.push(`${path}: ${what}`);
    return ok;
  }
  get full(): boolean {
    return this.errors.length >= MAX_ERRORS;
  }
}

function checkRecord(r: Report, v: unknown, path: string, each: (value: unknown, key: string, p: string) => void, key?: (k: string) => boolean): void {
  if (!r.check(isObj(v), path, 'not an object')) return;
  for (const [k, value] of Object.entries(v as Obj)) {
    if (r.full) return;
    if (key && !r.check(key(k), `${path}.${k}`, 'bad key')) continue;
    each(value, k, `${path}.${k}`);
  }
}

function checkSchedule(r: Report, s: unknown, path: string): void {
  if (!r.check(isObj(s), path, 'not an object')) return;
  const kind = (s as Obj).kind;
  if (kind === 'daily') return;
  if (kind === 'days') {
    const days = (s as Obj).days;
    r.check(Array.isArray(days) && days.every((d) => isInt(d) && d >= 0 && d <= 6), `${path}.days`, 'not a list of weekdays');
    return;
  }
  if (kind === 'weekly' || kind === 'monthly') {
    r.check(isInt((s as Obj).times), `${path}.times`, 'not an integer');
    r.check(isInt((s as Obj).every), `${path}.every`, 'not an integer');
    return;
  }
  r.check(false, `${path}.kind`, `unknown kind ${String(kind)}`);
}

function checkHabit(r: Report, h: unknown, path: string): void {
  if (!r.check(isObj(h), path, 'not an object')) return;
  const o = h as Obj;
  r.check(isStr(o.id) && o.id.length > 0 && !o.id.includes('|'), `${path}.id`, 'bad id');
  r.check(isStr(o.name), `${path}.name`, 'not a string');
  r.check(isStr(o.icon), `${path}.icon`, 'not a string');
  r.check(oneOf(PASTELS)(o.color), `${path}.color`, 'unknown colour');
  r.check(isStr(o.plant), `${path}.plant`, 'not a string');
  r.check(isStr(o.pot), `${path}.pot`, 'not a string');
  r.check(oneOf(['light', 'steady', 'big'] as const)(o.effort), `${path}.effort`, 'unknown effort');
  r.check(oneOf(['morning', 'midday', 'evening', 'anytime'] as const)(o.timeOfDay), `${path}.timeOfDay`, 'unknown time of day');
  r.check(o.polarity === 'build' || o.polarity === 'avoid', `${path}.polarity`, 'unknown polarity');
  r.check(nonNeg(o.createdAt), `${path}.createdAt`, 'not a timestamp');
  r.check(o.createdOn === undefined || isDateKey(o.createdOn), `${path}.createdOn`, 'not a date');
  r.check(isDateKey(o.startedOn), `${path}.startedOn`, 'not a date');
  r.check(o.archivedOn === undefined || (isDateKey(o.archivedOn) && o.archivedOn >= String(o.startedOn)), `${path}.archivedOn`, 'not a date on/after startedOn');
  r.check(isNum(o.order), `${path}.order`, 'not a number');
  for (const k of ['unit', 'anchor', 'notes'] as const) r.check(o[k] === undefined || isStr(o[k]), `${path}.${k}`, 'not a string');
  r.check(o.dueDay === undefined || o.dueDay === 'last' || (isInt(o.dueDay) && o.dueDay >= 1 && o.dueDay <= 31), `${path}.dueDay`, 'bad due day');
  if (r.check(Array.isArray(o.pauses), `${path}.pauses`, 'not a list')) {
    (o.pauses as unknown[]).forEach((p, i) => {
      const ok = isObj(p) && isDateKey(p.start) && (p.end === undefined || (isDateKey(p.end) && p.end >= p.start));
      r.check(ok, `${path}.pauses[${i}]`, 'bad pause');
    });
  }
  if (!r.check(Array.isArray(o.rules) && o.rules.length > 0, `${path}.rules`, 'no rules')) return;
  let shapesOk = true;
  (o.rules as unknown[]).forEach((rule, i) => {
    const rp = `${path}.rules[${i}]`;
    if (!r.check(isObj(rule), rp, 'not an object')) return (shapesOk = false);
    const ro = rule as Obj;
    shapesOk = r.check(isDateKey(ro.from), `${rp}.from`, 'not a date') && shapesOk;
    shapesOk = r.check(isInt(ro.target), `${rp}.target`, 'not an integer') && shapesOk;
    shapesOk = r.check(isInt(ro.step), `${rp}.step`, 'not an integer') && shapesOk;
    const before = r.errors.length;
    checkSchedule(r, ro.schedule, `${rp}.schedule`);
    if (r.errors.length > before) shapesOk = false;
    if (ro.tiny !== undefined) shapesOk = r.check(isObj(ro.tiny) && isStr(ro.tiny.label), `${rp}.tiny`, 'bad tiny version') && shapesOk;
    return undefined;
  });
  if (shapesOk && isDateKey(o.startedOn)) {
    for (const issue of validateHabitRules(o as unknown as AppState['habits'][number])) {
      r.check(false, `${path}.rules${issue.index !== undefined ? `[${issue.index}]` : ''}`, issue.code);
    }
  }
}

function checkLog(r: Report, log: unknown, path: string): void {
  if (!r.check(isObj(log), path, 'not an object')) return;
  const o = log as Obj;
  r.check(o.note === undefined || isStr(o.note), `${path}.note`, 'not a string');
  if (o.kind === 'rest') {
    r.check(o.count === undefined && o.level === undefined, path, 'a rest day cannot carry a count');
    return;
  }
  if (!r.check(o.kind === 'log', `${path}.kind`, 'unknown kind')) return;
  r.check(nonNeg(o.count), `${path}.count`, 'not a count');
  r.check(o.level === undefined || o.level === 'tiny', `${path}.level`, 'unknown level');
  r.check(o.at === undefined || (Array.isArray(o.at) && o.at.every(nonNeg)), `${path}.at`, 'not a list of timestamps');
}

function checkLetter(r: Report, l: unknown, path: string): void {
  if (!r.check(isObj(l), path, 'not an object')) return;
  const o = l as Obj;
  r.check(isStr(o.id), `${path}.id`, 'not a string');
  r.check(nonNegInt(o.stars) && nonNeg(o.achieved) && nonNeg(o.expected), path, 'bad numbers');
  if (o.kind === 'weekly') {
    r.check(isDateKey(o.weekStart), `${path}.weekStart`, 'not a date');
    r.check(Array.isArray(o.newFriends) && Array.isArray(o.plantsGrown), path, 'bad lists');
  } else r.check(o.kind === 'monthly' && isStr(o.month) && /^\d{4}-\d{2}$/.test(o.month), path, 'bad letter');
}

function checkPet(r: Report, p: unknown, id: string, path: string): void {
  if (!r.check(isObj(p), path, 'not an object')) return;
  const o = p as Obj;
  r.check(o.id === id, `${path}.id`, 'does not match its key');
  r.check(isStr(o.name), `${path}.name`, 'not a string');
  r.check(oneOf(PERSONALITY_IDS)(o.personality), `${path}.personality`, 'unknown personality');
  r.check(isStr(o.favoriteTreat), `${path}.favoriteTreat`, 'not a string');
  r.check(isBool(o.favoriteKnown) && isBool(o.inMeadow) && isBool(o.favorite), path, 'bad flags');
  r.check(nonNeg(o.xp), `${path}.xp`, 'not a number');
  r.check(nonNeg(o.obtainedAt), `${path}.obtainedAt`, 'not a timestamp');
  r.check(isObj(o.outfit) && Object.values(o.outfit).every((v) => v === undefined || isStr(v)), `${path}.outfit`, 'bad outfit');
  const d = o.daily;
  r.check(isObj(d) && isStr(d.date) && nonNegInt(d.pets) && nonNegInt(d.treats) && nonNegInt(d.buddy), `${path}.daily`, 'bad daily counters');
}

/** Validates an unknown value as a current-schema AppState. */
export function validateState(x: unknown): ValidationResult {
  const r = new Report();
  if (!isObj(x)) return { ok: false, errors: ['state: not an object'] };
  const s = x;
  r.check(s.version === SCHEMA_VERSION, 'version', `expected ${SCHEMA_VERSION}`);

  if (r.check(isObj(s.profile), 'profile', 'not an object')) {
    const p = s.profile as Obj;
    r.check(isStr(p.name), 'profile.name', 'not a string');
    r.check(p.buddy === null || isStr(p.buddy), 'profile.buddy', 'not an id');
    r.check(isBool(p.onboarded), 'profile.onboarded', 'not a boolean');
    r.check(nonNeg(p.createdAt), 'profile.createdAt', 'not a timestamp');
    r.check(p.birthday === undefined || (isStr(p.birthday) && /^\d{2}-\d{2}$/.test(p.birthday)), 'profile.birthday', 'not MM-DD');
    if (isStr(p.buddy)) r.check(isObj(s.pets) && isObj((s.pets as Obj)[p.buddy]), 'profile.buddy', 'not an owned pet');
  }

  if (r.check(isObj(s.settings), 'settings', 'not an object')) {
    const st = s.settings as Obj;
    r.check(st.weekStart === 0 || st.weekStart === 1, 'settings.weekStart', 'not 0/1');
    r.check(isInt(st.dayStartsAt) && st.dayStartsAt >= 0 && st.dayStartsAt <= 360, 'settings.dayStartsAt', 'not 0–360');
    r.check(oneOf(['auto', 'light', 'night'] as const)(st.theme), 'settings.theme', 'unknown theme');
    r.check(oneOf(['auto', 'on', 'off'] as const)(st.reduceMotion), 'settings.reduceMotion', 'unknown value');
    for (const k of ['sound', 'haptics', 'quickOpen', 'quietRewards'] as const) r.check(isBool(st[k]), `settings.${k}`, 'not a boolean');
    r.check(isNum(st.volume) && st.volume >= 0 && st.volume <= 1, 'settings.volume', 'not 0–1');
    checkRecord(r, st.reminders, 'settings.reminders', (v, k, path) => r.check(['morning', 'midday', 'evening'].includes(k) && isStr(v) && HHMM.test(v), path, 'not HH:MM'));
  }

  const habitIds = new Set<string>();
  if (r.check(Array.isArray(s.habits), 'habits', 'not a list')) {
    (s.habits as unknown[]).forEach((h, i) => {
      if (r.full) return;
      checkHabit(r, h, `habits[${i}]`);
      const id = isObj(h) ? h.id : undefined;
      if (isStr(id)) r.check(!habitIds.has(id) && (habitIds.add(id), true), `habits[${i}].id`, 'duplicate id');
    });
  }

  checkRecord(r, s.logs, 'logs', (byDate, habitId, path) => {
    r.check(habitIds.has(habitId), path, 'logs for an unknown habit');
    checkRecord(r, byDate, path, (log, _d, p) => checkLog(r, log, p), isDateKey);
  });
  checkRecord(r, s.offDays, 'offDays', (v, _k, path) => r.check(v === true, path, 'not true'), isDateKey);

  if (r.check(isObj(s.wallet), 'wallet', 'not an object')) {
    const w = s.wallet as Obj;
    for (const k of ['coins', 'stars', 'tickets'] as const) r.check(nonNegInt(w[k]), `wallet.${k}`, 'not a whole number ≥ 0');
    r.check(isInt(w.stardust) && w.stardust >= 0 && w.stardust <= 9, 'wallet.stardust', 'not 0–9');
  }
  if (r.check(isObj(s.lifetime), 'lifetime', 'not an object')) {
    const l = s.lifetime as Obj;
    for (const k of ['coinsEarned', 'starsEarned', 'checkins', 'pulls', 'perfectDays', 'showUpDays'] as const) r.check(nonNeg(l[k]), `lifetime.${k}`, 'not a number ≥ 0');
    r.check(l.lastShowUpDay === undefined || isDateKey(l.lastShowUpDay), 'lifetime.lastShowUpDay', 'not a date');
  }

  if (r.check(isObj(s.ledger), 'ledger', 'not an object')) {
    const g = s.ledger as Obj;
    checkRecord(
      r,
      g.recent,
      'ledger.recent',
      (v, _k, path) =>
        r.check(
          isObj(v) && nonNeg(v.coins) && nonNeg(v.sunshine) && (v.cap === undefined || nonNeg(v.cap)) && (v.lvl === undefined || ['tiny', 'full', 'over'].includes(v.lvl as string)),
          path,
          'bad entry',
        ),
      (k) => /^[^|]+\|\d{4}-\d{2}-\d{2}$/.test(k) && isDateKey(k.slice(k.lastIndexOf('|') + 1)),
    );
    checkRecord(r, g.sunshine, 'ledger.sunshine', (v, _k, path) => r.check(nonNeg(v), path, 'not a number ≥ 0'));
    checkRecord(r, g.bestStage, 'ledger.bestStage', (v, _k, path) => r.check(isInt(v) && v >= 0 && v <= 7, path, 'not a stage'));
    checkRecord(r, g.once, 'ledger.once', (v, _k, path) => r.check(v === true || isNum(v), path, 'not true or a number'));
    checkRecord(r, g.daily, 'ledger.daily', (v, _k, path) => r.check(nonNeg(v), path, 'not a number ≥ 0'), isDateKey);
  }

  checkRecord(r, s.collection, 'collection', (v, _k, path) => r.check(isObj(v) && isInt(v.count) && v.count >= 1 && nonNeg(v.firstAt), path, 'bad entry'));
  checkRecord(
    r,
    s.pity,
    'pity',
    (v, _k, path) => r.check(isObj(v) && ['sinceRare', 'sinceUltra', 'dupStreak', 'pulls'].every((f) => nonNegInt(v[f])), path, 'bad counter'),
    oneOf(MACHINE_IDS),
  );
  checkRecord(r, s.pets, 'pets', (v, k, path) => checkPet(r, v, k, path));
  checkRecord(r, s.pantry, 'pantry', (v, _k, path) => r.check(isObj(v) && nonNegInt(v.servings) && isDateKey(v.restockedOn), path, 'bad entry'));

  if (r.check(isObj(s.meadow), 'meadow', 'not an object')) {
    const m = s.meadow as Obj;
    r.check(Array.isArray(m.zones) && m.zones.includes('meadow') && m.zones.every(oneOf(ZONE_IDS)), 'meadow.zones', 'bad zones');
    if (r.check(Array.isArray(m.decor), 'meadow.decor', 'not a list')) {
      const ids = new Set<string>();
      (m.decor as unknown[]).forEach((d, i) => {
        const ok =
          isObj(d) && isStr(d.id) && !ids.has(d.id) && isStr(d.itemId) && oneOf(ZONE_IDS)(d.zone) && isNum(d.x) && d.x >= 0 && d.x <= 1 && isNum(d.y) && d.y >= 0 && d.y <= 1;
        if (isObj(d) && isStr(d.id)) ids.add(d.id);
        r.check(ok, `meadow.decor[${i}]`, 'bad placement');
      });
    }
  }

  checkRecord(r, s.badges, 'badges', (v, _k, path) => r.check(nonNeg(v), path, 'not a timestamp'));
  if (r.check(Array.isArray(s.inbox), 'inbox', 'not a list')) (s.inbox as unknown[]).forEach((l, i) => checkLetter(r, l, `inbox[${i}]`));
  if (s.pendingReveal !== undefined) {
    const p = s.pendingReveal;
    r.check(isObj(p) && oneOf(MACHINE_IDS)(p.machineId) && isStr(p.itemId) && isBool(p.isNew) && nonNeg(p.stardust) && nonNeg(p.fusedStars) && nonNeg(p.at), 'pendingReveal', 'bad reveal');
  }
  if (r.check(isObj(s.clock), 'clock', 'not an object')) {
    const c = s.clock as Obj;
    r.check(c.maxDateKey === '' || isDateKey(c.maxDateKey), 'clock.maxDateKey', 'not a date');
    r.check(nonNeg(c.maxEpochMs) && nonNeg(c.lastCheckinAt), 'clock', 'bad timestamps');
  }
  r.check(s.lastBackupAt === undefined || nonNeg(s.lastBackupAt), 'lastBackupAt', 'not a timestamp');

  return r.errors.length === 0 ? { ok: true, state: x as unknown as AppState } : { ok: false, errors: r.errors };
}
