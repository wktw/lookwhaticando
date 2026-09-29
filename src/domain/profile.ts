/**
 * Profile and preferences (DESIGN §9.5 "You", §13.2 "Day boundary", §13.8 reminders).
 * Settings are clamped to their valid ranges on the way in, so the rest of the domain can trust them.
 */
import type { Settings } from '@/state/types';
import { clampDayStartsAt } from './dates';
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
  for (const k of ['sound', 'haptics', 'quickOpen', 'quietRewards'] as const) if (typeof patch[k] === 'boolean') out[k] = patch[k];
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

