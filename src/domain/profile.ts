/**
 * Profile and preferences (DESIGN §9.5 "You", v1 §13.2 "Day boundary", v1 §13.8 reminders).
 * Settings are clamped to their valid ranges on the way in, so the rest of the domain can trust them.
 */
import type { AppState, DateKey, Settings, TimeOfDay } from '@/state/types';
import { fillLine } from '@/catalog/lineKit';
import { DATA, REMINDERS } from '@/catalog/linesCore';
import { logStatus } from './activity';
import { clampDayStartsAt, isDateKey } from './dates';
import { ruleAt } from './rules';
import { effectiveTarget } from './schedule';
import type { Tx } from './tx';

export const MAX_NAME = 40;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function setName(tx: Tx, name: string): void {
  tx.section('profile').name = Array.from(name.trim()).slice(0, MAX_NAME).join('');
}

/** 'MM-DD' (validated), or undefined to forget it. */
export function setBirthday(tx: Tx, mmdd: string | undefined): boolean {
  const profile = tx.section('profile');
  if (mmdd === undefined || mmdd === '') {
    delete profile.birthday;
    return true;
  }
  const m = /^(\d{2})-(\d{2})$/.exec(mmdd);
  const month = Number(m?.[1]);
  const day = Number(m?.[2]);
  const max = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if (!m || max === undefined || day < 1 || day > max) return false;
  profile.birthday = mmdd;
  return true;
}

/** A settings patch with every value clamped / checked (unknown or invalid values are dropped). */
export function sanitizeSettings(patch: Partial<Settings>): Partial<Settings> {
  const out: Partial<Settings> = {};
  if (patch.weekStart === 0 || patch.weekStart === 1) out.weekStart = patch.weekStart;
  if (typeof patch.dayStartsAt === 'number') out.dayStartsAt = clampDayStartsAt(patch.dayStartsAt);
  if (patch.theme === 'auto' || patch.theme === 'light' || patch.theme === 'night') out.theme = patch.theme;
  if (patch.reduceMotion === 'auto' || patch.reduceMotion === 'on' || patch.reduceMotion === 'off') out.reduceMotion = patch.reduceMotion;
  for (const k of ['sound', 'haptics', 'quickOpen', 'quietRewards', 'showCompanions', 'compactToday', 'quoteNotes', 'keyboardShortcuts'] as const) if (typeof patch[k] === 'boolean') out[k] = patch[k];
  if (patch.hemisphere === 'north' || patch.hemisphere === 'south') out.hemisphere = patch.hemisphere;
  if (typeof patch.volume === 'number' && Number.isFinite(patch.volume)) out.volume = Math.min(1, Math.max(0, patch.volume));
  if (patch.reminders && typeof patch.reminders === 'object') {
    const r: Settings['reminders'] = {};
    for (const k of ['morning', 'midday', 'evening'] as const) {
      const v = patch.reminders[k];
      if (typeof v === 'string' && HHMM.test(v)) r[k] = v;
    }
    out.reminders = r;
  }
  return out;
}

export function updateSettings(tx: Tx, patch: Partial<Settings>): void {
  const clean = sanitizeSettings(patch);
  if (Object.keys(clean).length === 0) return;
  Object.assign(tx.section('settings'), clean);
}

/** Records that a backup was just made (for the gentle backup nudge). */
export function markBackup(tx: Tx): void {
  tx.set('lastBackupAt', tx.env.now);
}


/* ------------------------------------------------------------------ */
/* Watering time (.ics) and the CSV export (DESIGN §9.5, §11.1)        */
/* ------------------------------------------------------------------ */

/** A Today block with a watering time (Anytime has none). */
export type WateringSlot = Exclude<TimeOfDay, 'anytime'>;

/** RFC 5545 TEXT escaping: backslash, semicolon, comma and newlines. */
function icsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** RFC 5545 line folding: lines longer than 75 octets continue on the next line after a space. */
function foldIcsLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let cur = '';
  let len = 0;
  for (const ch of Array.from(line)) {
    const n = new TextEncoder().encode(ch).length;
    if (len + n > (out.length === 0 ? 75 : 74)) {
      out.push(cur);
      cur = '';
      len = 0;
    }
    cur += ch;
    len += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** 'YYYYMMDDTHHMMSSZ' for an epoch time (UTC). */
function icsUtc(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`;
}

/**
 * A "watering time" calendar file (§11.1 Reminders, VOICE.md §20): one daily event at `time`
 * ('HH:MM', floating local time so it follows her through time zones) from `startDate`, with a
 * DISPLAY alarm at the time. SUMMARY "Watering time"; DESCRIPTION "Morning plants: Walk, Stretch."
 * (no count, no pet names, never "don't forget"). Null for a time that isn't 'HH:MM'.
 */
export function wateringTimeIcs(slot: WateringSlot, time: string, habitNames: readonly string[], opts: { startDate: DateKey; now: number }): string | null {
  const m = HHMM.exec(time);
  if (!m || !isDateKey(opts.startDate)) return null;
  const Block = REMINDERS.rows[slot];
  const names = habitNames.map((n) => n.trim()).filter((n) => n !== '');
  const description = names.length > 0 ? fillLine(REMINDERS.description, { Block, habits: names.join(', ') }) : fillLine(REMINDERS.descriptionEmpty, { Block });
  const [hh, mm] = time.split(':');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//catkin//Watering time//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:catkin-watering-time-${slot}@catkin.app`,
    `DTSTAMP:${icsUtc(opts.now)}`,
    `DTSTART:${opts.startDate.replace(/-/g, '')}T${hh}${mm}00`,
    'DURATION:PT15M',
    'RRULE:FREQ=DAILY',
    `SUMMARY:${icsText(REMINDERS.summary)}`,
    `DESCRIPTION:${icsText(description)}`,
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(REMINDERS.alarm)}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}

/** The .ics file's name: "catkin-watering-time-morning.ics". */
export const wateringTimeFileName = (slot: WateringSlot): string => fillLine(REMINDERS.file, { block: slot });

/** A CSV field: quoted when it holds a comma, quote or newline; a leading =, +, - or @ is defused. */
function csvField(value: string | number): string {
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * "Export waterings as CSV" (§9.5, VOICE.md §21): one row per logged day and habit, oldest first
 * (habits in their order), columns date, habit, count, target, state ("watered", "tiny",
 * "partial", "rest"). Deleted habits have no logs left; archived ones keep theirs. Days with nothing
 * logged have no row.
 */
export function wateringsCsv(s: Pick<AppState, 'habits' | 'logs'>, today: DateKey): string {
  const rows: string[] = [DATA.csvColumns.join(',')];
  const byOrder = [...s.habits].sort((a, b) => a.order - b.order);
  const entries: { date: DateKey; i: number; row: string }[] = [];
  byOrder.forEach((h, i) => {
    for (const [date, log] of Object.entries(s.logs[h.id] ?? {})) {
      if (!isDateKey(date) || date > today) continue;
      const rule = ruleAt(h, date);
      const status = logStatus(log, rule, date < today);
      if (status === 'none') continue;
      const state = status === 'done' ? DATA.csvStates.watered : DATA.csvStates[status];
      const count = log.kind === 'log' ? log.count : 0;
      entries.push({ date, i, row: [date, h.name, count, effectiveTarget(rule), state].map(csvField).join(',') });
    }
  });
  entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.i - b.i));
  for (const e of entries) rows.push(e.row);
  return `${rows.join('\r\n')}\r\n`;
}

/** The CSV file's name: "catkin-waterings-2025-09-29.csv". */
export const wateringsCsvFileName = (today: DateKey): string => fillLine(DATA.csvFile, { date: today });
