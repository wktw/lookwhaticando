/**
 * `validateState`: a hand-written schema guard for AppState (DESIGN v1 §13.8: snapshots are taken only
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
import { PLACES } from '@/catalog/places';
import { PERSONALITIES } from '@/catalog/personalities';
import { isDateKey } from '@/domain/dates';
import { MAX_STAMPS_PER_DAY } from '@/domain/logging';
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
const PLACE_IDS = PLACES.map((p) => p.id);
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
  // WP-B5: an empty lifetime, written as archivedOn === startedOn (what older builds accept). Not
  // checked against the dates: an older build's Restore or backdate keeps the flag, and the domain
  // honours it only while it is consistent (isUnstarted), so such a save is not corrupt.
  r.check(o.unstarted === undefined || o.unstarted === true, `${path}.unstarted`, 'not true');
  r.check(isNum(o.order), `${path}.order`, 'not a number');
  for (const k of ['unit', 'anchor', 'notes'] as const) r.check(o[k] === undefined || isStr(o[k]), `${path}.${k}`, 'not a string');
  r.check(o.dueDay === undefined || o.dueDay === 'last' || (isInt(o.dueDay) && o.dueDay >= 1 && o.dueDay <= 31), `${path}.dueDay`, 'bad due day');
  r.check(o.companionId === undefined || isStr(o.companionId), `${path}.companionId`, 'not a string');
  r.check(o.why === undefined || (isStr(o.why) && Array.from(o.why).length <= 140), `${path}.why`, 'not a short string');
  r.check(o.anchorHabitId === undefined || (isStr(o.anchorHabitId) && o.anchorHabitId !== o.id), `${path}.anchorHabitId`, 'bad anchor');
  r.check(o.endsOn === undefined || (isDateKey(o.endsOn) && o.endsOn >= String(o.startedOn)), `${path}.endsOn`, 'not a date on/after startedOn');
  r.check(o.ribbon === undefined || (isDateKey(o.ribbon) && o.archivedOn !== undefined), `${path}.ribbon`, 'a ribbon needs an archived habit');
  r.check(o.timeNudge === undefined || o.timeNudge === 'moved' || o.timeNudge === 'left', `${path}.timeNudge`, 'unknown answer');
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
    // WP-B5: a backdated first rule's kept period grid.
    if (ro.gridFrom !== undefined) shapesOk = r.check(isDateKey(ro.gridFrom), `${rp}.gridFrom`, 'not a date') && shapesOk;
    // WP-B5: the days of the period it cut that were already paused or off at the edit.
    if (ro.cutInactive !== undefined) shapesOk = r.check(isInt(ro.cutInactive) && ro.cutInactive >= 1, `${rp}.cutInactive`, 'not a positive whole number') && shapesOk;
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
  r.check(o.starred === undefined || (o.starred === true && isStr(o.note)), `${path}.starred`, 'only a note can be starred');
  if (o.kind === 'rest') {
    r.check(o.count === undefined && o.level === undefined, path, 'a rest day cannot carry a count');
    return;
  }
  if (!r.check(o.kind === 'log', `${path}.kind`, 'unknown kind')) return;
  r.check(nonNeg(o.count), `${path}.count`, 'not a count');
  r.check(o.level === undefined || o.level === 'tiny', `${path}.level`, 'unknown level');
  r.check(o.at === undefined || (Array.isArray(o.at) && o.at.every(nonNeg)), `${path}.at`, 'not a list of timestamps');
  // §5.1: `at` holds at most 24 live check-in times (logging.ts caps it; Blooms Like You reads them).
  r.check(!Array.isArray(o.at) || o.at.length <= MAX_STAMPS_PER_DAY, `${path}.at`, `more than ${MAX_STAMPS_PER_DAY} stamps`);
  // WP-B4: check-in provenance, optional (absent means unknown); a timestamp when present.
  r.check(o.first === undefined || nonNeg(o.first), `${path}.first`, 'not a timestamp');
  r.check(o.done === undefined || nonNeg(o.done), `${path}.done`, 'not a timestamp');
  r.check(o.beforeAnchor === undefined || isStr(o.beforeAnchor), `${path}.beforeAnchor`, 'not a habit id');
}

function checkLetter(r: Report, l: unknown, path: string): void {
  if (!r.check(isObj(l), path, 'not an object')) return;
  const o = l as Obj;
  r.check(isStr(o.id), `${path}.id`, 'not a string');
  if (o.kind === 'anniversary') {
    r.check(isDateKey(o.date) && isInt(o.years) && o.years >= 1 && nonNeg(o.waterings) && nonNegInt(o.stars), path, 'bad anniversary');
    r.check(o.firstHabitId === undefined || isStr(o.firstHabitId), `${path}.firstHabitId`, 'not a string');
    return;
  }
  r.check(nonNegInt(o.stars) && nonNeg(o.achieved) && nonNeg(o.expected), path, 'bad numbers');
  if (o.kind === 'weekly') {
    r.check(isDateKey(o.weekStart), `${path}.weekStart`, 'not a date');
    r.check(Array.isArray(o.newFriends) && Array.isArray(o.plantsGrown), path, 'bad lists');
    r.check(o.waterings === undefined || nonNegInt(o.waterings), `${path}.waterings`, 'not a count');
    r.check(o.highlights === undefined || (Array.isArray(o.highlights) && o.highlights.every((h) => isObj(h) && isStr(h.kind))), `${path}.highlights`, 'bad highlights');
    r.check(o.ps === undefined || (isObj(o.ps) && isStr(o.ps.kind) && isStr(o.ps.petId)), `${path}.ps`, 'bad P.S.');
  } else {
    r.check(o.kind === 'monthly' && isStr(o.month) && /^\d{4}-\d{2}$/.test(o.month), path, 'bad letter');
    r.check(
      o.pressings === undefined ||
        (Array.isArray(o.pressings) && o.pressings.every((p) => isObj(p) && isStr(p.habitId) && nonNegInt(p.waterings) && nonNegInt(p.rests) && isInt(p.size) && p.size >= 0 && p.size <= 7)),
      `${path}.pressings`,
      'bad pressings',
    );
    r.check(o.margin === undefined || (isObj(o.margin) && isStr(o.margin.kind) && isDateKey(o.margin.date)), `${path}.margin`, 'bad margin');
  }
}

function checkCompany(r: Report, c: unknown, petIds: Set<string>): void {
  if (!r.check(isObj(c), 'company', 'not an object')) return;
  const o = c as Obj;
  checkRecord(r, o.pairs, 'company.pairs', (v, k, path) => {
    const ok =
      isObj(v) &&
      isStr(v.petId) &&
      isStr(v.habitId) &&
      k === `${v.petId}|${v.habitId}` &&
      isDateKey(v.since) &&
      nonNeg(v.sunshine) &&
      nonNegInt(v.waterings) &&
      (v.whyAsked === undefined || v.whyAsked === true) &&
      (v.knownForSince === undefined || isDateKey(v.knownForSince));
    if (!r.check(ok, path, 'bad pairing')) return;
    const pair = v as Obj;
    r.check(petIds.has(pair.petId as string), `${path}.petId`, 'unknown pet');
    if (pair.stories !== undefined) {
      checkRecord(r, pair.stories, `${path}.stories`, (st, _k, p) => r.check(isObj(st) && isDateKey(st.on) && (st.readAt === undefined || nonNeg(st.readAt)), p, 'bad story'), oneOf(['start', 'why', 'lookAtUs'] as const));
    }
  });
  const offer = o.offer;
  r.check(isObj(offer) && nonNegInt(offer.declines) && (offer.shownOn === undefined || isDateKey(offer.shownOn)), 'company.offer', 'bad offer');
}

const KEEPSAKE_KINDS = ['move', 'read', 'hydrate', 'rest', 'mind', 'create', 'tidy', 'cook', 'care', 'garden', 'connect', 'plan', 'brass-seed'] as const;

function checkLooks(r: Report, v: unknown, path: string): void {
  if (!r.check(isObj(v) && Array.isArray(v.looks) && isObj(v.reads), path, 'bad looks')) return;
  const o = v as Obj;
  const looks = o.looks as unknown[];
  looks.forEach((l, i) => {
    const ok =
      isObj(l) &&
      oneOf(['dawn', 'sunlit', 'twilight', 'wildflower'] as const)(l.colour) &&
      oneOf(['classic', 'petite', 'paired'] as const)(l.shape) &&
      oneOf(['bloom', 'evergreen'] as const)(l.read) &&
      isDateKey(l.on) &&
      isObj(l.evidence);
    r.check(ok, `${path}.looks[${i}]`, 'bad look');
  });
  r.check(o.shown === null || (isInt(o.shown) && o.shown >= 0 && o.shown < looks.length), `${path}.shown`, 'not a look');
  const reads = o.reads as Obj;
  r.check((reads.bloom === undefined || isDateKey(reads.bloom)) && (reads.evergreen === undefined || isDateKey(reads.evergreen)), `${path}.reads`, 'bad reads');
}

function checkSeasonRecord(r: Report, v: unknown, path: string): void {
  const ok =
    isObj(v) &&
    isDateKey(v.key) &&
    oneOf(['spring', 'summer', 'autumn', 'winter'] as const)(v.name) &&
    isDateKey(v.start) &&
    isDateKey(v.end) &&
    v.start === v.key &&
    v.end >= v.start &&
    oneOf(['north', 'south'] as const)(v.hemisphere) &&
    nonNegInt(v.waterings) &&
    Array.isArray(v.plants) &&
    v.plants.length <= 8 &&
    v.plants.every((p) => isObj(p) && isStr(p.habitId) && isInt(p.fromStage) && isInt(p.toStage) && nonNegInt(p.waterings)) &&
    (v.filed === undefined || oneOf(['reviewed', 'skipped', 'silent'] as const)(v.filed));
  r.check(ok, path, 'bad season');
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
  r.check(
    isObj(d) && isStr(d.date) && nonNegInt(d.pets) && nonNegInt(d.treats) && (d.favorites === undefined || nonNegInt(d.favorites)) && (d.company === undefined || nonNegInt(d.company)),
    `${path}.daily`,
    'bad daily counters',
  );
  // The Shelf (§8.4, §8.2): a place that isn't open (a restored older save) reads as the Sill.
  if (o.place !== undefined) r.check(oneOf(PLACE_IDS)(o.place), `${path}.place`, 'unknown place');
  if (o.spot !== undefined) {
    const sp = o.spot;
    r.check(isObj(sp) && ((sp.kind === 'pot' && isStr(sp.habitId)) || (sp.kind === 'place' && oneOf(PLACE_IDS)(sp.place))), `${path}.spot`, 'bad spot');
  }
  if (o.bestFriend !== undefined) r.check(isStr(o.bestFriend), `${path}.bestFriend`, 'not a string');
  if (o.bestFriendsOn !== undefined) r.check(isDateKey(o.bestFriendsOn), `${path}.bestFriendsOn`, 'not a date');
  if (o.memories !== undefined) {
    r.check(
      Array.isArray(o.memories) &&
        o.memories.every(
          (m) =>
            isObj(m) &&
            oneOf(['best-friends', 'came-home', 'bloomed', 'moved-in', 'favourite', 'day'] as const)(m.kind) &&
            isDateKey(m.date) &&
            (m.habitId === undefined || isStr(m.habitId)) &&
            (m.treatId === undefined || isStr(m.treatId)),
        ),
      `${path}.memories`,
      'bad memories',
    );
  }
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
    r.check(isBool(p.onboarded), 'profile.onboarded', 'not a boolean');
    r.check(nonNeg(p.createdAt), 'profile.createdAt', 'not a timestamp');
    r.check(p.birthday === undefined || (isStr(p.birthday) && /^\d{2}-\d{2}$/.test(p.birthday)), 'profile.birthday', 'not MM-DD');
  }

  if (r.check(isObj(s.settings), 'settings', 'not an object')) {
    const st = s.settings as Obj;
    r.check(st.weekStart === 0 || st.weekStart === 1, 'settings.weekStart', 'not 0/1');
    r.check(isInt(st.dayStartsAt) && st.dayStartsAt >= 0 && st.dayStartsAt <= 360, 'settings.dayStartsAt', 'not 0–360');
    r.check(oneOf(['auto', 'light', 'night'] as const)(st.theme), 'settings.theme', 'unknown theme');
    r.check(oneOf(['auto', 'on', 'off'] as const)(st.reduceMotion), 'settings.reduceMotion', 'unknown value');
    for (const k of ['sound', 'haptics', 'quickOpen', 'quietRewards'] as const) r.check(isBool(st[k]), `settings.${k}`, 'not a boolean');
    for (const k of ['showCompanions', 'compactToday', 'quoteNotes', 'keyboardShortcuts'] as const) r.check(st[k] === undefined || isBool(st[k]), `settings.${k}`, 'not a boolean');
    r.check(st.hemisphere === undefined || st.hemisphere === 'north' || st.hemisphere === 'south', 'settings.hemisphere', 'not north/south');
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

  const petIds = new Set(isObj(s.pets) ? Object.keys(s.pets) : []);
  if (r.check(isObj(s.ledger), 'ledger', 'not an object')) {
    const g = s.ledger as Obj;
    checkRecord(
      r,
      g.recent,
      'ledger.recent',
      (v, _k, path) =>
        r.check(
          isObj(v) &&
          nonNeg(v.coins) &&
          nonNeg(v.sunshine) &&
          (v.cap === undefined || nonNeg(v.cap)) &&
          (v.lvl === undefined || ['tiny', 'full', 'over'].includes(v.lvl as string)) &&
          (v.co === undefined || (isObj(v.co) && isStr(v.co.pet) && petIds.has(v.co.pet) && nonNeg(v.co.sun) && v.co.sun <= (v.sunshine as number) + 1e-6 && (v.co.watered === undefined || v.co.watered === true))),
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

  checkRecord(r, s.collection, 'collection', (v, _k, path) => r.check(isObj(v) && isInt(v.count) && v.count >= 1 && nonNeg(v.firstAt) && (v.ordered === undefined || v.ordered === true), path, 'bad entry'));
  checkRecord(
    r,
    s.pity,
    'pity',
    (v, _k, path) => r.check(isObj(v) && ['sinceRare', 'sinceUltra', 'dupStreak', 'pulls'].every((f) => nonNegInt(v[f])), path, 'bad counter'),
    oneOf(MACHINE_IDS),
  );
  checkRecord(r, s.pets, 'pets', (v, k, path) => checkPet(r, v, k, path));
  checkRecord(r, s.pantry, 'pantry', (v, _k, path) => r.check(isObj(v) && nonNegInt(v.servings) && isDateKey(v.restockedOn), path, 'bad entry'));

  if (r.check(isObj(s.shelf), 'shelf', 'not an object')) {
    const m = s.shelf as Obj;
    const places = m.places;
    r.check(
      Array.isArray(places) && places.includes('sill') && places.every(oneOf(PLACE_IDS)) && new Set(places).size === places.length,
      'shelf.places',
      'bad places',
    );
    if (r.check(Array.isArray(m.decor), 'shelf.decor', 'not a list')) {
      const ids = new Set<string>();
      (m.decor as unknown[]).forEach((d, i) => {
        const ok =
          isObj(d) && isStr(d.id) && !ids.has(d.id) && isStr(d.itemId) && oneOf(PLACE_IDS)(d.place) && isNum(d.x) && d.x >= 0 && d.x <= 1 && isNum(d.y) && d.y >= 0 && d.y <= 1;
        if (isObj(d) && isStr(d.id)) ids.add(d.id);
        r.check(ok, `shelf.decor[${i}]`, 'bad placement');
      });
    }
  }

  checkRecord(r, s.badges, 'badges', (v, _k, path) => r.check(nonNeg(v), path, 'not a timestamp'));
  if (r.check(Array.isArray(s.inbox), 'inbox', 'not a list')) (s.inbox as unknown[]).forEach((l, i) => checkLetter(r, l, `inbox[${i}]`));
  if (s.found !== undefined && r.check(Array.isArray(s.found), 'found', 'not a list')) {
    (s.found as unknown[]).forEach((f, i) =>
      r.check(isObj(f) && isDateKey(f.date) && isStr(f.petId) && nonNegInt(f.seed), `found[${i}]`, 'bad found thing'),
    );
  }
  // Stage B (all optional): Keeping Company, keepsakes, looks, stage days, seasons.
  if (Array.isArray(s.habits)) {
    const companions = new Set<string>();
    (s.habits as unknown[]).forEach((h, i) => {
      if (!isObj(h) || h.companionId === undefined) return;
      const pet = h.companionId as string;
      r.check(petIds.has(pet), `habits[${i}].companionId`, 'unknown pet');
      r.check(h.archivedOn === undefined, `habits[${i}].companionId`, 'an archived habit has no companion');
      r.check(!companions.has(pet), `habits[${i}].companionId`, 'a pet keeps one habit company');
      companions.add(pet);
      r.check(isObj(s.company) && isObj((s.company as Obj).pairs) && isObj(((s.company as Obj).pairs as Obj)[`${pet}|${String(h.id)}`]), `habits[${i}].companionId`, 'no pairing record');
    });
    (s.habits as unknown[]).forEach((h, i) => {
      if (isObj(h) && isStr(h.anchorHabitId)) r.check(habitIds.has(h.anchorHabitId), `habits[${i}].anchorHabitId`, 'unknown habit');
    });
  }
  if (s.company !== undefined) checkCompany(r, s.company, petIds);
  if (s.keepsakes !== undefined && r.check(Array.isArray(s.keepsakes), 'keepsakes', 'not a list')) {
    const ids = new Set<string>();
    (s.keepsakes as unknown[]).forEach((k, i) => {
      const ok =
        isObj(k) &&
        isStr(k.id) &&
        !ids.has(k.id) &&
        k.id === `k-${String(k.habitId)}-${String(k.stage)}` &&
        isStr(k.habitId) &&
        isStr(k.petId) &&
        [1, 4, 5, 7].includes(k.stage as number) &&
        oneOf(KEEPSAKE_KINDS)(k.kind) &&
        isDateKey(k.date) &&
        (k.note === undefined || (isObj(k.note) && isDateKey(k.note.date) && isStr(k.note.text)));
      if (isObj(k) && isStr(k.id)) ids.add(k.id);
      r.check(ok, `keepsakes[${i}]`, 'bad keepsake');
    });
  }
  if (s.plantLooks !== undefined) checkRecord(r, s.plantLooks, 'plantLooks', (v, _k, path) => checkLooks(r, v, path));
  if (s.stageDates !== undefined) {
    checkRecord(r, s.stageDates, 'stageDates', (v, _k, path) =>
      checkRecord(r, v, path, (d, _st, p) => r.check(isDateKey(d), p, 'not a date'), (st) => /^[1-7]$/.test(st)),
    );
  }
  if (s.seasons !== undefined && r.check(isObj(s.seasons) && Array.isArray((s.seasons as Obj).filed), 'seasons', 'bad seasons')) {
    const sh = s.seasons as Obj;
    if (sh.pending !== undefined) checkSeasonRecord(r, sh.pending, 'seasons.pending');
    const keys = new Set<string>();
    (sh.filed as unknown[]).forEach((v, i) => {
      checkSeasonRecord(r, v, `seasons.filed[${i}]`);
      const key = isObj(v) ? String(v.key) : '';
      r.check(!keys.has(key) && (!isObj(sh.pending) || sh.pending.key !== key), `seasons.filed[${i}]`, 'filed twice');
      keys.add(key);
    });
  }
  if (s.pendingReveal !== undefined) {
    const p = s.pendingReveal;
    r.check(isObj(p) && oneOf(MACHINE_IDS)(p.machineId) && isStr(p.itemId) && isBool(p.isNew) && nonNeg(p.stardust) && nonNeg(p.fusedStars) && nonNeg(p.at) && (p.order === undefined || p.order === true), 'pendingReveal', 'bad reveal');
  }
  if (r.check(isObj(s.clock), 'clock', 'not an object')) {
    const c = s.clock as Obj;
    r.check(c.maxDateKey === '' || isDateKey(c.maxDateKey), 'clock.maxDateKey', 'not a date');
    r.check(nonNeg(c.maxEpochMs) && nonNeg(c.lastCheckinAt), 'clock', 'bad timestamps');
  }
  r.check(s.lastBackupAt === undefined || nonNeg(s.lastBackupAt), 'lastBackupAt', 'not a timestamp');

  return r.errors.length === 0 ? { ok: true, state: x as unknown as AppState } : { ok: false, errors: r.errors };
}
