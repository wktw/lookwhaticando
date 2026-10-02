/**
 * `validateState`: a hand-written schema guard for AppState (DESIGN v1 §13.8: snapshots are taken only
 * when it passes; imports and loads are checked with it). No dependencies.
 *
 * It checks structure and invariants the reducers rely on — types, ranges, DateKey formats, the
 * versioned-rule invariants (rules sorted, first rule starts on `startedOn`), unique habit ids,
 * logs only for existing habits, a well-formed ledger — and reports readable paths
 * ("habits[2].rules[0].from: not a date"). Unknown collectible ids are allowed (a future catalog
 * may add items); unknown *fields* are ignored.
 *
 * Accepted means usable (WP-A5, INV-6: audit data-d7, FS7, FS8): every field a consumer reads is
 * checked, not only its shape. The letters' unions are complete (the Bouquet's legacy `stems`, the
 * Sunday Note's quote, highlights and P.S., `readAt`); calendar values are real (a month 01–12, a
 * birthday that exists, every day between `DAY_MIN` and `DAY_MAX`, so a consumer can step a year
 * either way); timestamps sit between 0 and a fixed ceiling (`MAX_TIME`, never "now", so a backup
 * from a device whose clock ran fast still opens); counts are safe integers and every number is
 * within `Number.MAX_SAFE_INTEGER`; strings and collections have generous bounds (`MAX_TEXT`,
 * `MAX_ITEMS`); stacks have no cycles; a look's evidence is complete; and no id or map key is an
 * `Object.prototype` name (`__proto__`, `constructor`, `toString`…), which a plain-object map
 * would read as inherited or write as its prototype. Unknown catalogue ids and unknown highlight
 * kinds stay tolerated: their consumers skip what they don't know. No catkin build ever wrote a
 * value these rules refuse (the corpus in tests/fixtures/saves, DEC-E1), except a day she picked
 * outside the calendar (tracking from 1899, a pause until 3026), which `repairDays` (./migrate.ts)
 * brings back before this runs, and which no action writes any more.
 */
import { PASTELS } from '@/catalog/types';
import { MACHINES } from '@/catalog/machines';
import { PLACES } from '@/catalog/places';
import { PERSONALITIES } from '@/catalog/personalities';
import { isDateKey } from '@/domain/dates';
import { DAY_MAX, DAY_MIN } from '@/domain/dayRange';
import { MAX_COUNT, MAX_STAMPS_PER_DAY } from '@/domain/logging';
import { validateHabitRules } from '@/domain/rules';
import { SCHEMA_VERSION, type AppState } from './types';

export type ValidationResult = { ok: true; state: AppState } | { ok: false; errors: string[] };

const MAX_ERRORS = 40;

/** The latest timestamp a save may hold: 1 January 3000 (fixed, not "now"; a Date holds far more). */
export const MAX_TIME = Date.UTC(3000, 0, 1);
/** The calendar a save may name: wide enough for any real day, with a year to spare either way (src/domain/dayRange.ts). */
export { DAY_MAX, DAY_MIN };
/** The longest string a save may hold (names are 40 characters, notes 280). */
export const MAX_TEXT = 10_000;
/** The most entries any list or map may hold. */
export const MAX_ITEMS = 100_000;

/** Names a plain-object map would read as inherited, or write as its prototype (FS7). */
const RESERVED = new Set<string>([...Object.getOwnPropertyNames(Object.prototype), '__proto__', 'constructor', 'prototype']);
export const isReservedKey = (k: string): boolean => RESERVED.has(k);

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length <= MAX_TEXT;
/** A finite number a consumer can do sums with. */
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= Number.MAX_SAFE_INTEGER;
const isInt = (v: unknown): v is number => Number.isSafeInteger(v);
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const nonNeg = (v: unknown): v is number => isNum(v) && v >= 0;
const nonNegInt = (v: unknown): v is number => isInt(v) && (v as number) >= 0;
/** Epoch ms from 1970 to `MAX_TIME`. */
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= MAX_TIME;
/** A timestamp a save or a backup may carry (also the envelope's `savedAt` and a backup's `exportedAt`, FS8). */
export const isTimestamp = isTime;
/** A real calendar day between `DAY_MIN` and `DAY_MAX`. */
const isDay = (v: unknown): v is string => isDateKey(v) && v >= DAY_MIN && v <= DAY_MAX;
/** An id or a catalogue id: a non-empty string that no map reads as inherited. Unknown ids are fine. */
const isId = (v: unknown): v is string => isStr(v) && v.length > 0 && !RESERVED.has(v);
const optional =
  (p: (v: unknown) => boolean) =>
  (v: unknown): boolean =>
    v === undefined || p(v);
const isList = (v: unknown): v is unknown[] => Array.isArray(v) && v.length <= MAX_ITEMS;
const oneOf =
  <T>(values: readonly T[]) =>
  (v: unknown): v is T =>
    values.includes(v as T);

const MACHINE_IDS = MACHINES.map((m) => m.id);
const PLACE_IDS = PLACES.map((p) => p.id);
const PERSONALITY_IDS = PERSONALITIES.map((p) => p.id);
const TIMES_OF_DAY = ['morning', 'midday', 'evening', 'anytime'] as const;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/** 'MM-DD' that names a real day of some year (29 February included). */
function isBirthday(v: unknown): boolean {
  const m = typeof v === 'string' ? /^(\d{2})-(\d{2})$/.exec(v) : null;
  if (!m) return false;
  const month = Number(m[1]);
  const day = Number(m[2]);
  return month >= 1 && month <= 12 && day >= 1 && day <= DAYS_IN_MONTH[month - 1]!;
}

/** 'YYYY-MM' inside the calendar a save may name. */
const isMonth = (v: unknown): boolean => typeof v === 'string' && MONTH.test(v) && `${v}-01` >= DAY_MIN && `${v}-01` <= DAY_MAX;

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

/** A map: an object of at most `MAX_ITEMS` entries, none of them under a reserved key (FS7). */
function checkRecord(r: Report, v: unknown, path: string, each: (value: unknown, key: string, p: string) => void, key?: (k: string) => boolean): void {
  if (!r.check(isObj(v), path, 'not an object')) return;
  const keys = Object.keys(v as Obj);
  if (!r.check(keys.length <= MAX_ITEMS, path, 'too many entries')) return;
  for (const k of keys) {
    if (r.full) return;
    if (!r.check(!RESERVED.has(k), `${path}.${k}`, 'reserved key')) continue;
    if (key && !r.check(key(k), `${path}.${k}`, 'bad key')) continue;
    each((v as Obj)[k], k, `${path}.${k}`);
  }
}

function checkSchedule(r: Report, s: unknown, path: string): void {
  if (!r.check(isObj(s), path, 'not an object')) return;
  const kind = (s as Obj).kind;
  if (kind === 'daily') return;
  if (kind === 'days') {
    const days = (s as Obj).days;
    r.check(isList(days) && days.every((d) => isInt(d) && d >= 0 && d <= 6), `${path}.days`, 'not a list of weekdays');
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
  r.check(isId(o.id) && !o.id.includes('|'), `${path}.id`, 'bad id');
  r.check(isStr(o.name), `${path}.name`, 'not a string');
  r.check(isStr(o.icon) && !RESERVED.has(o.icon), `${path}.icon`, 'not an icon');
  r.check(oneOf(PASTELS)(o.color), `${path}.color`, 'unknown colour');
  r.check(isId(o.plant), `${path}.plant`, 'not a plant');
  r.check(isId(o.pot), `${path}.pot`, 'not a pot');
  r.check(oneOf(['light', 'steady', 'big'] as const)(o.effort), `${path}.effort`, 'unknown effort');
  r.check(oneOf(TIMES_OF_DAY)(o.timeOfDay), `${path}.timeOfDay`, 'unknown time of day');
  r.check(o.polarity === 'build' || o.polarity === 'avoid', `${path}.polarity`, 'unknown polarity');
  r.check(isTime(o.createdAt), `${path}.createdAt`, 'not a timestamp');
  r.check(optional(isDay)(o.createdOn), `${path}.createdOn`, 'not a date');
  r.check(isDay(o.startedOn), `${path}.startedOn`, 'not a date');
  r.check(o.archivedOn === undefined || (isDay(o.archivedOn) && o.archivedOn >= String(o.startedOn)), `${path}.archivedOn`, 'not a date on/after startedOn');
  // WP-B5: an empty lifetime, written as archivedOn === startedOn (what older builds accept). Not
  // checked against the dates: an older build's Restore or backdate keeps the flag, and the domain
  // honours it only while it is consistent (isUnstarted), so such a save is not corrupt.
  r.check(o.unstarted === undefined || o.unstarted === true, `${path}.unstarted`, 'not true');
  r.check(isNum(o.order), `${path}.order`, 'not a number');
  for (const k of ['unit', 'anchor', 'notes'] as const) r.check(optional(isStr)(o[k]), `${path}.${k}`, 'not a string');
  r.check(o.dueDay === undefined || o.dueDay === 'last' || (isInt(o.dueDay) && o.dueDay >= 1 && o.dueDay <= 31), `${path}.dueDay`, 'bad due day');
  r.check(optional(isId)(o.companionId), `${path}.companionId`, 'not an id');
  r.check(o.why === undefined || (isStr(o.why) && Array.from(o.why).length <= 140), `${path}.why`, 'not a short string');
  r.check(o.anchorHabitId === undefined || (isId(o.anchorHabitId) && o.anchorHabitId !== o.id), `${path}.anchorHabitId`, 'bad anchor');
  r.check(o.endsOn === undefined || (isDay(o.endsOn) && o.endsOn >= String(o.startedOn)), `${path}.endsOn`, 'not a date on/after startedOn');
  r.check(o.ribbon === undefined || (isDay(o.ribbon) && o.archivedOn !== undefined), `${path}.ribbon`, 'a ribbon needs an archived habit');
  r.check(o.timeNudge === undefined || o.timeNudge === 'moved' || o.timeNudge === 'left', `${path}.timeNudge`, 'unknown answer');
  if (r.check(isList(o.pauses), `${path}.pauses`, 'not a list')) {
    (o.pauses as unknown[]).forEach((p, i) => {
      const ok = isObj(p) && isDay(p.start) && (p.end === undefined || (isDay(p.end) && p.end >= p.start));
      r.check(ok, `${path}.pauses[${i}]`, 'bad pause');
    });
  }
  if (!r.check(isList(o.rules) && o.rules.length > 0, `${path}.rules`, 'no rules')) return;
  let shapesOk = true;
  (o.rules as unknown[]).forEach((rule, i) => {
    const rp = `${path}.rules[${i}]`;
    if (!r.check(isObj(rule), rp, 'not an object')) return (shapesOk = false);
    const ro = rule as Obj;
    shapesOk = r.check(isDay(ro.from), `${rp}.from`, 'not a date') && shapesOk;
    shapesOk = r.check(isInt(ro.target), `${rp}.target`, 'not an integer') && shapesOk;
    shapesOk = r.check(isInt(ro.step), `${rp}.step`, 'not an integer') && shapesOk;
    const before = r.errors.length;
    checkSchedule(r, ro.schedule, `${rp}.schedule`);
    if (r.errors.length > before) shapesOk = false;
    if (ro.tiny !== undefined) shapesOk = r.check(isObj(ro.tiny) && isStr(ro.tiny.label) && optional(nonNeg)(ro.tiny.count), `${rp}.tiny`, 'bad tiny version') && shapesOk;
    // WP-B5: a backdated first rule's kept period grid.
    if (ro.gridFrom !== undefined) shapesOk = r.check(isDay(ro.gridFrom), `${rp}.gridFrom`, 'not a date') && shapesOk;
    // WP-B5: the days of the period it cut that were already paused or off at the edit.
    if (ro.cutInactive !== undefined) shapesOk = r.check(isInt(ro.cutInactive) && ro.cutInactive >= 1, `${rp}.cutInactive`, 'not a positive whole number') && shapesOk;
    return undefined;
  });
  if (shapesOk && isDay(o.startedOn)) {
    for (const issue of validateHabitRules(o as unknown as AppState['habits'][number])) {
      r.check(false, `${path}.rules${issue.index !== undefined ? `[${issue.index}]` : ''}`, issue.code);
    }
  }
}

function checkLog(r: Report, log: unknown, path: string): void {
  if (!r.check(isObj(log), path, 'not an object')) return;
  const o = log as Obj;
  r.check(optional(isStr)(o.note), `${path}.note`, 'not a string');
  r.check(o.starred === undefined || (o.starred === true && isStr(o.note)), `${path}.starred`, 'only a note can be starred');
  if (o.kind === 'rest') {
    r.check(o.count === undefined && o.level === undefined, path, 'a rest day cannot carry a count');
    return;
  }
  if (!r.check(o.kind === 'log', `${path}.kind`, 'unknown kind')) return;
  r.check(nonNeg(o.count) && o.count <= MAX_COUNT, `${path}.count`, 'not a count');
  r.check(o.level === undefined || o.level === 'tiny', `${path}.level`, 'unknown level');
  r.check(o.at === undefined || (Array.isArray(o.at) && o.at.every(isTime)), `${path}.at`, 'not a list of timestamps');
  // §5.1: `at` holds at most 24 live check-in times (logging.ts caps it; Blooms Like You reads them).
  r.check(!Array.isArray(o.at) || o.at.length <= MAX_STAMPS_PER_DAY, `${path}.at`, `more than ${MAX_STAMPS_PER_DAY} stamps`);
  // WP-B4: check-in provenance, optional (absent means unknown); a timestamp when present.
  r.check(o.first === undefined || nonNeg(o.first), `${path}.first`, 'not a timestamp');
  r.check(o.done === undefined || nonNeg(o.done), `${path}.done`, 'not a timestamp');
  r.check(o.beforeAnchor === undefined || isStr(o.beforeAnchor), `${path}.beforeAnchor`, 'not a habit id');
}

/** A Sunday Note highlight: the known kinds have every field their line reads; an unknown kind is skipped by its reader. */
function isHighlight(h: unknown): boolean {
  // WP-B6: a highlight may carry the plant species it had when the letter was written.
  if (!isObj(h) || !isStr(h.kind) || !optStr(h.plant)) return false;
  switch (h.kind) {
    case 'stageUp':
      return isId(h.habitId) && isInt(h.stage) && h.stage >= 0 && h.stage <= 7 && isDay(h.date) && optional(isId)(h.petId);
    case 'newcomer':
      return isId(h.petId) && isDay(h.date) && optional(isId)(h.habitId);
    case 'everyDay':
      return isId(h.habitId);
    case 'topHabit':
    case 'tiny':
      return isId(h.habitId) && nonNegInt(h.days);
    case 'newHabit':
      return isId(h.habitId) && isDay(h.date);
    case 'kept':
      return isId(h.habitId) && isId(h.anchorHabitId) && nonNegInt(h.days);
    default:
      return optional(isId)(h.habitId) && optional(isId)(h.petId);
  }
}

/** The Sunday Note's P.S.: a companion's routine or a found thing, complete (its reader reads every field). */
function isPS(p: unknown): boolean {
  if (!isObj(p) || !isId(p.petId)) return false;
  if (p.kind === 'companion') return isId(p.habitId) && nonNegInt(p.days) && oneOf(TIMES_OF_DAY)(p.timeOfDay) && optStr(p.icon);
  if (p.kind === 'found') return isDay(p.date) && isInt(p.seed);
  return false;
}

function checkLetter(r: Report, l: unknown, path: string): void {
  if (!r.check(isObj(l), path, 'not an object')) return;
  const o = l as Obj;
  r.check(isStr(o.id), `${path}.id`, 'not a string');
  r.check(optional(isTime)(o.readAt), `${path}.readAt`, 'not a timestamp');
  if (o.kind === 'anniversary') {
    r.check(isDay(o.date) && isInt(o.years) && o.years >= 1 && nonNeg(o.waterings) && nonNegInt(o.stars), path, 'bad anniversary');
    r.check(optional(isId)(o.firstHabitId), `${path}.firstHabitId`, 'not an id');
    return;
  }
  r.check(nonNegInt(o.stars) && nonNeg(o.achieved) && nonNeg(o.expected), path, 'bad numbers');
  if (o.kind === 'weekly') {
    r.check(isDay(o.weekStart), `${path}.weekStart`, 'not a date');
    r.check(isList(o.newFriends) && o.newFriends.every(isStr) && isList(o.plantsGrown) && o.plantsGrown.every(isStr), path, 'bad lists');
    r.check(optional(nonNeg)(o.showUpDays), `${path}.showUpDays`, 'not a count');
    r.check(optional(isId)(o.bestHabitId), `${path}.bestHabitId`, 'not an id');
    r.check(optional(nonNegInt)(o.waterings), `${path}.waterings`, 'not a count');
    r.check(o.highlights === undefined || (isList(o.highlights) && o.highlights.every(isHighlight)), `${path}.highlights`, 'bad highlights');
    r.check(o.quote === undefined || (isObj(o.quote) && isId(o.quote.habitId) && isDay(o.quote.date) && isStr(o.quote.text)), `${path}.quote`, 'bad quote');
    r.check(o.ps === undefined || isPS(o.ps), `${path}.ps`, 'bad P.S.');
  } else {
    r.check(o.kind === 'monthly' && isMonth(o.month), path, 'bad letter');
    r.check(optional(nonNeg)(o.previousPct), `${path}.previousPct`, 'not a number');
    r.check(optional(isBool)(o.growingBonus) && optional(isBool)(o.firstPage), path, 'bad flags');
    // The Monthly Bouquet (an older build's page, read as pressings): stems of 0–7.
    r.check(
      o.stems === undefined || (isList(o.stems) && o.stems.every((st) => isObj(st) && isId(st.habitId) && isId(st.plant) && isInt(st.count) && st.count >= 0 && st.count <= 7)),
      `${path}.stems`,
      'bad stems',
    );
    r.check(
      o.pressings === undefined ||
        (isList(o.pressings) &&
          o.pressings.every((p) => isObj(p) && isId(p.habitId) && optional(isId)(p.plant) && nonNegInt(p.waterings) && nonNegInt(p.rests) && isInt(p.size) && p.size >= 0 && p.size <= 7)),
      `${path}.pressings`,
      'bad pressings',
    );
    r.check(o.margin === undefined || (isObj(o.margin) && isStr(o.margin.kind) && isDay(o.margin.date) && optional(isId)(o.margin.habitId) && optional(isId)(o.margin.petId) && optStr(o.margin.plant)), `${path}.margin`, 'bad margin');
  }
}

/** WP-B6: a pairing's spans, oldest first, apart, each `to` on or after its `from`; only the last may be open. */
function validStints(v: unknown): boolean {
  if (!Array.isArray(v)) return false;
  let prev: string | null = null;
  return v.every((st, i) => {
    if (!isObj(st) || !isDateKey(st.from) || (prev !== null && st.from <= prev)) return false;
    if (st.to === undefined) return i === v.length - 1;
    if (!isDateKey(st.to) || st.to < st.from) return false;
    prev = st.to;
    return true;
  });
}

const optStr = (v: unknown): boolean => v === undefined || isStr(v);

function checkCompany(r: Report, c: unknown, petIds: Set<string>): void {
  if (!r.check(isObj(c), 'company', 'not an object')) return;
  const o = c as Obj;
  checkRecord(r, o.pairs, 'company.pairs', (v, k, path) => {
    const ok =
      isObj(v) &&
      isId(v.petId) &&
      isId(v.habitId) &&
      k === `${v.petId}|${v.habitId}` &&
      isDay(v.since) &&
      nonNeg(v.sunshine) &&
      nonNegInt(v.waterings) &&
      (v.whyAsked === undefined || v.whyAsked === true) &&
      optional(isDay)(v.knownForSince) &&
      (v.stints === undefined || validStints(v.stints));
    if (!r.check(ok, path, 'bad pairing')) return;
    const pair = v as Obj;
    r.check(petIds.has(pair.petId as string), `${path}.petId`, 'unknown pet');
    if (pair.stories !== undefined) {
      checkRecord(r, pair.stories, `${path}.stories`, (st, _k, p) => r.check(isObj(st) && isDay(st.on) && optional(isTime)(st.readAt), p, 'bad story'), oneOf(['start', 'why', 'lookAtUs'] as const));
    }
  });
  const offer = o.offer;
  r.check(isObj(offer) && nonNegInt(offer.declines) && optional(isDay)(offer.shownOn), 'company.offer', 'bad offer');
}

const KEEPSAKE_KINDS = ['move', 'read', 'hydrate', 'rest', 'mind', 'create', 'tidy', 'cook', 'care', 'garden', 'connect', 'plan', 'brass-seed'] as const;

/** A look's evidence, which the plant tag says in words (data-d7: PlantLook evidence). */
function isEvidence(e: unknown): boolean {
  return (
    isObj(e) &&
    oneOf(['dawn', 'sunlit', 'twilight', 'all-sorts'] as const)(e.band) &&
    nonNegInt(e.eligibleDays) &&
    nonNegInt(e.bandDays) &&
    isInt(e.usualMinute) &&
    e.usualMinute >= 0 &&
    e.usualMinute < 1440 &&
    nonNegInt(e.tinyDays) &&
    nonNegInt(e.doneDays) &&
    (e.keptTogether === undefined || (isObj(e.keptTogether) && isId(e.keptTogether.habitId) && nonNegInt(e.keptTogether.days)))
  );
}

function checkLooks(r: Report, v: unknown, path: string): void {
  if (!r.check(isObj(v) && isList(v.looks) && isObj(v.reads), path, 'bad looks')) return;
  const o = v as Obj;
  const looks = o.looks as unknown[];
  looks.forEach((l, i) => {
    const ok =
      isObj(l) &&
      oneOf(['dawn', 'sunlit', 'twilight', 'wildflower'] as const)(l.colour) &&
      oneOf(['classic', 'petite', 'paired'] as const)(l.shape) &&
      oneOf(['bloom', 'evergreen'] as const)(l.read) &&
      isDay(l.on) &&
      isEvidence(l.evidence);
    r.check(ok, `${path}.looks[${i}]`, 'bad look');
  });
  r.check(o.shown === null || (isInt(o.shown) && o.shown >= 0 && o.shown < looks.length), `${path}.shown`, 'not a look');
  r.check(o.chosen === undefined || o.chosen === true, `${path}.chosen`, 'not true');
  if (o.confirmed !== undefined) {
    const c = o.confirmed;
    r.check(isObj(c) && oneOf(['dawn', 'sunlit', 'twilight', 'wildflower'] as const)(c.colour)
      && oneOf(['classic', 'petite', 'paired'] as const)(c.shape) && isDay(c.on)
      && typeof c.shown === 'boolean' && optional(isId)(c.partnerId), `${path}.confirmed`, 'bad confirmed look');
  }
  const reads = o.reads as Obj;
  r.check(optional(isDay)(reads.bloom) && optional(isDay)(reads.evergreen), `${path}.reads`, 'bad reads');
}

function checkSeasonRecord(r: Report, v: unknown, path: string): void {
  const ok =
    isObj(v) &&
    isDay(v.key) &&
    oneOf(['spring', 'summer', 'autumn', 'winter'] as const)(v.name) &&
    isDay(v.start) &&
    isDay(v.end) &&
    v.start === v.key &&
    v.end >= v.start &&
    oneOf(['north', 'south'] as const)(v.hemisphere) &&
    nonNegInt(v.waterings) &&
    Array.isArray(v.plants) &&
    v.plants.length <= 8 &&
    v.plants.every((p) => isObj(p) && isId(p.habitId) && optional(isId)(p.plant) && isInt(p.fromStage) && isInt(p.toStage) && nonNegInt(p.waterings) && optional(isId)(p.petId)) &&
    (v.filed === undefined || oneOf(['reviewed', 'skipped', 'silent'] as const)(v.filed));
  r.check(ok, path, 'bad season');
}

function checkPet(r: Report, p: unknown, id: string, path: string): void {
  if (!r.check(isObj(p), path, 'not an object')) return;
  const o = p as Obj;
  r.check(o.id === id, `${path}.id`, 'does not match its key');
  r.check(isStr(o.name), `${path}.name`, 'not a string');
  r.check(oneOf(PERSONALITY_IDS)(o.personality), `${path}.personality`, 'unknown personality');
  r.check(isId(o.favoriteTreat), `${path}.favoriteTreat`, 'not a treat');
  r.check(isBool(o.favoriteKnown) && isBool(o.inMeadow) && isBool(o.favorite), path, 'bad flags');
  r.check(nonNeg(o.xp), `${path}.xp`, 'not a number');
  r.check(isTime(o.obtainedAt), `${path}.obtainedAt`, 'not a timestamp');
  // WP-B6: the days it came home and its favourite was found, kept at the event.
  r.check(optional(isDay)(o.arrivedOn), `${path}.arrivedOn`, 'not a date');
  r.check(optional(isDay)(o.favoriteKnownOn), `${path}.favoriteKnownOn`, 'not a date');
  r.check(isObj(o.outfit) && Object.entries(o.outfit).every(([k, v]) => !RESERVED.has(k) && optional(isId)(v)), `${path}.outfit`, 'bad outfit');
  const d = o.daily;
  r.check(
    isObj(d) && isStr(d.date) && nonNegInt(d.pets) && nonNegInt(d.treats) && optional(nonNegInt)(d.favorites) && optional(nonNegInt)(d.company),
    `${path}.daily`,
    'bad daily counters',
  );
  // The Shelf (§8.4, §8.2): a place that isn't open (a restored older save) reads as the Sill.
  if (o.place !== undefined) r.check(oneOf(PLACE_IDS)(o.place), `${path}.place`, 'unknown place');
  if (o.spot !== undefined) {
    const sp = o.spot;
    r.check(isObj(sp) && ((sp.kind === 'pot' && isId(sp.habitId)) || (sp.kind === 'place' && oneOf(PLACE_IDS)(sp.place))), `${path}.spot`, 'bad spot');
  }
  if (o.bestFriend !== undefined) r.check(isId(o.bestFriend), `${path}.bestFriend`, 'not an id');
  if (o.bestFriendsOn !== undefined) r.check(isDay(o.bestFriendsOn), `${path}.bestFriendsOn`, 'not a date');
  if (o.memories !== undefined) {
    r.check(
      isList(o.memories) &&
        o.memories.every(
          (m) =>
            isObj(m) &&
            oneOf(['best-friends', 'came-home', 'bloomed', 'moved-in', 'favourite', 'day'] as const)(m.kind) &&
            isDay(m.date) &&
            optional(isId)(m.habitId) &&
            optional(isId)(m.treatId),
        ),
      `${path}.memories`,
      'bad memories',
    );
  }
}

/** Following anchors from any habit never leads back to it (a stack has a first habit). */
function anchorCycle(habits: unknown[]): number {
  const next = new Map<string, string>();
  for (const h of habits) if (isObj(h) && isStr(h.id) && isStr(h.anchorHabitId)) next.set(h.id, h.anchorHabitId);
  for (let i = 0; i < habits.length; i++) {
    const h = habits[i];
    if (!isObj(h) || !isStr(h.id)) continue;
    const seen = new Set<string>([h.id]);
    for (let cur = next.get(h.id); cur !== undefined; cur = next.get(cur)) {
      if (cur === h.id) return i;
      if (seen.has(cur)) break;
      seen.add(cur);
    }
  }
  return -1;
}

/** Onboarding's late step (WP-C5): what the flow writes, and nothing it couldn't show. */
function isOnboardingStep(v: unknown): boolean {
  if (!isObj(v)) return false;
  return (v.step === 'today' || v.step === 'first' || v.step === 'place') && Array.isArray(v.habitIds) && v.habitIds.length <= 3 && v.habitIds.every(isId) && optional(isId)(v.petId);
}

/** Validates an unknown value as a current-schema AppState. */
export function validateState(x: unknown): ValidationResult {
  const r = new Report();
  if (!isObj(x)) return { ok: false, errors: ['state: not an object'] };
  const s = x;
  r.check(s.version === SCHEMA_VERSION, 'version', `expected ${SCHEMA_VERSION}`);
  for (const k of Object.keys(s)) r.check(!RESERVED.has(k), k, 'reserved key');

  if (r.check(isObj(s.profile), 'profile', 'not an object')) {
    const p = s.profile as Obj;
    r.check(isStr(p.name), 'profile.name', 'not a string');
    r.check(isBool(p.onboarded), 'profile.onboarded', 'not a boolean');
    r.check(isTime(p.createdAt), 'profile.createdAt', 'not a timestamp');
    r.check(optional(isDay)(p.createdOn), 'profile.createdOn', 'not a date');
    r.check(p.birthday === undefined || isBirthday(p.birthday), 'profile.birthday', 'not a real MM-DD');
    r.check(p.onboardingStep === undefined || isOnboardingStep(p.onboardingStep), 'profile.onboardingStep', 'not an onboarding step');
  }

  if (r.check(isObj(s.settings), 'settings', 'not an object')) {
    const st = s.settings as Obj;
    r.check(st.weekStart === 0 || st.weekStart === 1, 'settings.weekStart', 'not 0/1');
    r.check(isInt(st.dayStartsAt) && st.dayStartsAt >= 0 && st.dayStartsAt <= 360, 'settings.dayStartsAt', 'not 0–360');
    r.check(oneOf(['auto', 'light', 'night'] as const)(st.theme), 'settings.theme', 'unknown theme');
    r.check(oneOf(['auto', 'on', 'off'] as const)(st.reduceMotion), 'settings.reduceMotion', 'unknown value');
    for (const k of ['sound', 'haptics', 'quickOpen', 'quietRewards'] as const) r.check(isBool(st[k]), `settings.${k}`, 'not a boolean');
    for (const k of ['showCompanions', 'compactToday', 'quoteNotes', 'keyboardShortcuts'] as const) r.check(optional(isBool)(st[k]), `settings.${k}`, 'not a boolean');
    r.check(st.hemisphere === undefined || st.hemisphere === 'north' || st.hemisphere === 'south', 'settings.hemisphere', 'not north/south');
    r.check(isNum(st.volume) && st.volume >= 0 && st.volume <= 1, 'settings.volume', 'not 0–1');
    checkRecord(r, st.reminders, 'settings.reminders', (v, k, path) => r.check(['morning', 'midday', 'evening'].includes(k) && isStr(v) && HHMM.test(v), path, 'not HH:MM'));
  }

  const habitIds = new Set<string>();
  if (r.check(isList(s.habits), 'habits', 'not a list')) {
    (s.habits as unknown[]).forEach((h, i) => {
      if (r.full) return;
      checkHabit(r, h, `habits[${i}]`);
      const id = isObj(h) ? h.id : undefined;
      if (isStr(id)) r.check(!habitIds.has(id) && (habitIds.add(id), true), `habits[${i}].id`, 'duplicate id');
    });
    const cycle = anchorCycle(s.habits as unknown[]);
    r.check(cycle < 0, `habits[${cycle}].anchorHabitId`, 'an anchor cycle');
  }

  checkRecord(r, s.logs, 'logs', (byDate, habitId, path) => {
    r.check(habitIds.has(habitId), path, 'logs for an unknown habit');
    checkRecord(r, byDate, path, (log, _d, p) => checkLog(r, log, p), isDay);
  });
  checkRecord(r, s.offDays, 'offDays', (v, _k, path) => r.check(v === true, path, 'not true'), isDay);

  if (r.check(isObj(s.wallet), 'wallet', 'not an object')) {
    const w = s.wallet as Obj;
    for (const k of ['coins', 'stars', 'tickets'] as const) r.check(nonNegInt(w[k]), `wallet.${k}`, 'not a whole number ≥ 0');
    r.check(isInt(w.stardust) && w.stardust >= 0 && w.stardust <= 9, 'wallet.stardust', 'not 0–9');
  }
  if (r.check(isObj(s.lifetime), 'lifetime', 'not an object')) {
    const l = s.lifetime as Obj;
    for (const k of ['coinsEarned', 'starsEarned', 'checkins', 'pulls', 'perfectDays', 'showUpDays'] as const) r.check(nonNeg(l[k]), `lifetime.${k}`, 'not a number ≥ 0');
    r.check(optional(isDay)(l.lastShowUpDay), 'lifetime.lastShowUpDay', 'not a date');
  }

  const petIds = new Set(isObj(s.pets) ? Object.keys(s.pets).filter((k) => !RESERVED.has(k)) : []);
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
            optional(nonNeg)(v.cap) &&
            (v.lvl === undefined || ['tiny', 'full', 'over'].includes(v.lvl as string)) &&
            (v.co === undefined || (isObj(v.co) && isStr(v.co.pet) && petIds.has(v.co.pet) && nonNeg(v.co.sun) && v.co.sun <= (v.sunshine as number) + 1e-6 && (v.co.watered === undefined || v.co.watered === true))),
          path,
          'bad entry',
        ),
      (k) => /^[^|]+\|\d{4}-\d{2}-\d{2}$/.test(k) && isDay(k.slice(k.lastIndexOf('|') + 1)),
    );
    checkRecord(r, g.sunshine, 'ledger.sunshine', (v, _k, path) => r.check(nonNeg(v), path, 'not a number ≥ 0'));
    checkRecord(r, g.bestStage, 'ledger.bestStage', (v, _k, path) => r.check(isInt(v) && v >= 0 && v <= 7, path, 'not a stage'));
    checkRecord(r, g.once, 'ledger.once', (v, _k, path) => r.check(v === true || isNum(v), path, 'not true or a number'));
    checkRecord(r, g.daily, 'ledger.daily', (v, _k, path) => r.check(nonNeg(v), path, 'not a number ≥ 0'), isDay);
  }

  checkRecord(r, s.collection, 'collection', (v, _k, path) => r.check(isObj(v) && isInt(v.count) && v.count >= 1 && isTime(v.firstAt) && (v.ordered === undefined || v.ordered === true), path, 'bad entry'));
  checkRecord(
    r,
    s.pity,
    'pity',
    (v, _k, path) => r.check(isObj(v) && ['sinceRare', 'sinceUltra', 'dupStreak', 'pulls'].every((f) => nonNegInt(v[f])), path, 'bad counter'),
    oneOf(MACHINE_IDS),
  );
  checkRecord(r, s.pets, 'pets', (v, k, path) => checkPet(r, v, k, path));
  checkRecord(r, s.pantry, 'pantry', (v, _k, path) => r.check(isObj(v) && nonNegInt(v.servings) && isDay(v.restockedOn), path, 'bad entry'));

  if (r.check(isObj(s.shelf), 'shelf', 'not an object')) {
    const m = s.shelf as Obj;
    const places = m.places;
    r.check(
      Array.isArray(places) && places.includes('sill') && places.every(oneOf(PLACE_IDS)) && new Set(places).size === places.length,
      'shelf.places',
      'bad places',
    );
    if (r.check(isList(m.decor), 'shelf.decor', 'not a list')) {
      const ids = new Set<string>();
      (m.decor as unknown[]).forEach((d, i) => {
        const ok =
          isObj(d) && isStr(d.id) && !ids.has(d.id) && isId(d.itemId) && oneOf(PLACE_IDS)(d.place) && isNum(d.x) && d.x >= 0 && d.x <= 1 && isNum(d.y) && d.y >= 0 && d.y <= 1 && optional(isBool)(d.flip);
        if (isObj(d) && isStr(d.id)) ids.add(d.id);
        r.check(ok, `shelf.decor[${i}]`, 'bad placement');
      });
    }
  }

  checkRecord(r, s.badges, 'badges', (v, _k, path) => r.check(isTime(v), path, 'not a timestamp'));
  if (r.check(isList(s.inbox), 'inbox', 'not a list')) (s.inbox as unknown[]).forEach((l, i) => checkLetter(r, l, `inbox[${i}]`));
  if (s.found !== undefined && r.check(isList(s.found), 'found', 'not a list')) {
    (s.found as unknown[]).forEach((f, i) => r.check(isObj(f) && isDay(f.date) && isId(f.petId) && nonNegInt(f.seed), `found[${i}]`, 'bad found thing'));
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
      const pairs = isObj(s.company) && isObj((s.company as Obj).pairs) ? ((s.company as Obj).pairs as Obj) : null;
      const key = `${pet}|${String(h.id)}`;
      r.check(pairs !== null && Object.prototype.hasOwnProperty.call(pairs, key) && isObj(pairs[key]), `habits[${i}].companionId`, 'no pairing record');
    });
    (s.habits as unknown[]).forEach((h, i) => {
      if (isObj(h) && isStr(h.anchorHabitId)) r.check(habitIds.has(h.anchorHabitId), `habits[${i}].anchorHabitId`, 'unknown habit');
    });
  }
  if (s.company !== undefined) checkCompany(r, s.company, petIds);
  if (s.keepsakes !== undefined && r.check(isList(s.keepsakes), 'keepsakes', 'not a list')) {
    const ids = new Set<string>();
    (s.keepsakes as unknown[]).forEach((k, i) => {
      const ok =
        isObj(k) &&
        isStr(k.id) &&
        !ids.has(k.id) &&
        k.id === `k-${String(k.habitId)}-${String(k.stage)}` &&
        isId(k.habitId) &&
        isId(k.petId) &&
        [1, 4, 5, 7].includes(k.stage as number) &&
        oneOf(KEEPSAKE_KINDS)(k.kind) &&
        isDay(k.date) &&
        (k.note === undefined || (isObj(k.note) && isDay(k.note.date) && isStr(k.note.text)));
      if (isObj(k) && isStr(k.id)) ids.add(k.id);
      r.check(ok, `keepsakes[${i}]`, 'bad keepsake');
    });
  }
  if (s.plantLooks !== undefined) checkRecord(r, s.plantLooks, 'plantLooks', (v, _k, path) => checkLooks(r, v, path));
  if (s.stageDates !== undefined) {
    checkRecord(r, s.stageDates, 'stageDates', (v, _k, path) => checkRecord(r, v, path, (d, _st, p) => r.check(isDay(d), p, 'not a date'), (st) => /^[1-7]$/.test(st)));
  }
  if (s.seasons !== undefined && r.check(isObj(s.seasons) && isList((s.seasons as Obj).filed), 'seasons', 'bad seasons')) {
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
    r.check(
      isObj(p) && oneOf(MACHINE_IDS)(p.machineId) && isId(p.itemId) && isBool(p.isNew) && nonNeg(p.stardust) && nonNeg(p.fusedStars) && optional(nonNeg)(p.friendshipXp) && isTime(p.at) && (p.order === undefined || p.order === true),
      'pendingReveal',
      'bad reveal',
    );
  }
  if (r.check(isObj(s.clock), 'clock', 'not an object')) {
    const c = s.clock as Obj;
    r.check(c.maxDateKey === '' || isDay(c.maxDateKey), 'clock.maxDateKey', 'not a date');
    r.check(isTime(c.maxEpochMs) && isTime(c.lastCheckinAt), 'clock', 'bad timestamps');
  }
  r.check(optional(isTime)(s.lastBackupAt), 'lastBackupAt', 'not a timestamp');

  return r.errors.length === 0 ? { ok: true, state: x as unknown as AppState } : { ok: false, errors: r.errors };
}
