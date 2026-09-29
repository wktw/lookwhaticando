import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DATA, ERRORS, INSTALL } from '@/catalog/lines';
import { wateringTimeIcs } from '@/domain/profile';
import { keyStep, moveBy, moveTo, slotAt } from './reorder';
import { SLOT_DEFAULTS, WATERING_SLOTS, clockLabel, minutesLabel, slotTimes, staticCalPath, wantsStaticCal, isAppleTouch } from './calendar';
import { STATIC_CAL } from './calendarStatic';
import { SHELL_LINES } from './shellCopy';
import { DATA_COPY, movedLine } from './copy';
import { backupFileName, backupNudge } from './DataSection';
import { birthdayDays, joinBirthday, splitBirthday, profileFacts } from './ProfileSection';
import { DAY_START_OPTIONS } from './PreferencesSection';
import { importErrorText, previewLine } from './ImportSheet';
import { dayOf } from './when';

describe('arranging habits', () => {
  const ids = ['a', 'b', 'c', 'd'];
  it('moves one id by a step, to an end, or to a slot', () => {
    expect(moveBy(ids, 'b', 1)).toEqual(['a', 'c', 'b', 'd']);
    expect(moveBy(ids, 'b', -1)).toEqual(['b', 'a', 'c', 'd']);
    expect(moveBy(ids, 'c', -Infinity)).toEqual(['c', 'a', 'b', 'd']);
    expect(moveBy(ids, 'a', Infinity)).toEqual(['b', 'c', 'd', 'a']);
    expect(moveTo(ids, 'd', 1)).toEqual(['a', 'd', 'b', 'c']);
  });
  it('hands back the same list when nothing moves (so nothing is saved)', () => {
    expect(moveBy(ids, 'a', -1)).toBe(ids);
    expect(moveBy(ids, 'd', 1)).toBe(ids);
    expect(moveBy(ids, 'zz', 1)).toBe(ids);
  });
  it('finds the slot a dragged row is over from the other rows’ midpoints', () => {
    const mids = [30, 90, 150, 210];
    expect(slotAt(10, mids, 2)).toBe(0);
    expect(slotAt(100, mids, 0)).toBe(1);
    expect(slotAt(500, mids, 0)).toBe(3);
    expect(slotAt(160, mids, 1)).toBe(2);
  });
  it('answers the arrow keys, Home and End', () => {
    expect(keyStep('ArrowUp')).toBe(-1);
    expect(keyStep('ArrowDown')).toBe(1);
    expect(keyStep('Home')).toBe(-Infinity);
    expect(keyStep('End')).toBe(Infinity);
    expect(keyStep('a')).toBeNull();
  });
  it('reads a move out as a position', () => {
    expect(movedLine('Walk', 2, 5)).toBe('Walk, 2 of 5.');
  });
});

describe('watering time', () => {
  it('offers 15-minute steps inside each block, and a default within them', () => {
    expect(slotTimes('morning')[0]).toBe('05:00');
    expect(slotTimes('morning').at(-1)).toBe('11:45');
    expect(slotTimes('evening').at(-1)).toBe('23:45');
    for (const slot of WATERING_SLOTS) expect(slotTimes(slot)).toContain(SLOT_DEFAULTS[slot]);
  });
  it('words times the VOICE way: "7 am", "7:30 am", "12 pm"', () => {
    expect(clockLabel('07:00')).toBe('7 am');
    expect(clockLabel('07:30')).toBe('7:30 am');
    expect(clockLabel('12:00')).toBe('12 pm');
    expect(clockLabel('00:00')).toBe('12 am');
    expect(clockLabel('19:45')).toBe('7:45 pm');
    expect(minutesLabel(180)).toBe('3 am');
  });
  it('uses the static file only on an iPhone or iPad running the hosted app', () => {
    expect(wantsStaticCal({ single: false, protocol: 'https:', appleTouch: true })).toBe(true);
    expect(wantsStaticCal({ single: false, protocol: 'https:', appleTouch: false })).toBe(false);
    expect(wantsStaticCal({ single: true, protocol: 'file:', appleTouch: true })).toBe(false);
    expect(isAppleTouch('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 'iPhone', 5)).toBe(true);
    expect(isAppleTouch('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5)).toBe(true);
    expect(isAppleTouch('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 0)).toBe(false);
  });
  it('ships a current static calendar file for every block and time (npm: node scripts/generate-cal.mjs)', () => {
    const dir = join(process.cwd(), 'public', 'cal');
    const files = readdirSync(dir).filter((f) => f.endsWith('.ics'));
    let n = 0;
    for (const slot of WATERING_SLOTS) {
      for (const time of slotTimes(slot)) {
        const path = staticCalPath(slot, time);
        expect(files).toContain(path.replace('cal/', ''));
        expect(readFileSync(join(process.cwd(), 'public', path), 'utf8')).toBe(wateringTimeIcs(slot, time, [], STATIC_CAL));
        n++;
      }
    }
    expect(files.length).toBe(n);
    // No habit names and no pet names in a file anyone can fetch.
    expect(readFileSync(join(dir, 'morning-0730.ics'), 'utf8')).toMatch(/DESCRIPTION:Morning plants\.\r\n/);
  });
});

describe('the shell’s copies of VOICE lines', () => {
  it('match lines.ts word for word', () => {
    expect(SHELL_LINES.otherWindow).toBe(ERRORS.otherWindow);
    expect(SHELL_LINES.useHere).toBe(ERRORS.useHere);
    expect(SHELL_LINES.newerSave).toBe(ERRORS.newerSave);
    expect(SHELL_LINES.save).toBe(ERRORS.save);
    expect(SHELL_LINES.clock).toBe(ERRORS.clock);
    expect(SHELL_LINES.leaveDemo).toBe(DATA.leaveDemo);
    expect(SHELL_LINES.updateReady).toBe(INSTALL.updateReady);
    expect(SHELL_LINES.demoPill).toBe(DATA_COPY.demoPill);
  });
});

describe('profile', () => {
  it('splits and joins a birthday, keeping 29 February', () => {
    expect(splitBirthday('02-29')).toEqual({ month: 2, day: 29 });
    expect(splitBirthday(undefined)).toEqual({ month: 0, day: 0 });
    expect(joinBirthday(3, 7)).toBe('03-07');
    expect(joinBirthday(0, 7)).toBeUndefined();
    expect(birthdayDays(2)).toBe(29);
    expect(birthdayDays(4)).toBe(30);
  });
  it('counts only what is there, and never a 0', () => {
    expect(profileFacts({ habits: 7, pets: 14, waterings: 401, quiet: false })).toBe('7 habits · 14 pets · 401 waterings');
    expect(profileFacts({ habits: 1, pets: 0, waterings: 0, quiet: false })).toBe('1 habit');
    expect(profileFacts({ habits: 0, pets: 3, waterings: 0, quiet: true })).toBe('');
  });
  it('offers day starts from midnight to 6 am, every half hour', () => {
    expect(DAY_START_OPTIONS[0]).toEqual({ value: 0, label: '12 am' });
    expect(DAY_START_OPTIONS.at(-1)).toEqual({ value: 360, label: '6 am' });
    expect(DAY_START_OPTIONS).toHaveLength(13);
  });
});

describe('data', () => {
  const now = Date.UTC(2026, 8, 29, 12);
  it('names the backup file by the day', () => {
    expect(backupFileName('2026-09-29')).toBe('catkin-backup-2026-09-29.json');
  });
  it('nudges only when there is something to keep and the last backup is over a month old', () => {
    expect(backupNudge({ lastBackupAt: undefined, checkins: 50, now })).toBeNull();
    expect(backupNudge({ lastBackupAt: now - 5 * 86_400_000, checkins: 50, now })).toBeNull();
    expect(backupNudge({ lastBackupAt: now - 40 * 86_400_000, checkins: 0, now })).toBeNull();
    expect(backupNudge({ lastBackupAt: now - 40 * 86_400_000, checkins: 50, now })).toMatch(/^Worth saving a backup: the last one is from Aug \d+\.$/);
  });
  it('words dates as "Sep 20", with the year only when it isn’t this one', () => {
    expect(dayOf(new Date(2026, 8, 20, 10).getTime(), now)).toBe('Sep 20');
    expect(dayOf(new Date(2025, 11, 2, 10).getTime(), now)).toBe('Dec 2, 2025');
  });
  it('describes a backup before importing it, and says why one can’t go ahead', () => {
    expect(previewLine({ ok: true, habits: 5, checkins: 312, friends: 7, savedAt: new Date(2026, 8, 20, 9).getTime() })).toBe(
      'This backup has 5 habits, 312 waterings and 7 pets. Saved Sep 20.',
    );
    expect(previewLine({ ok: true, habits: 2, checkins: 0, friends: 0, savedAt: 0 })).toBe('This backup has 2 habits, 0 waterings and 0 pets.');
    expect(importErrorText('not-a-backup')).toBe(ERRORS.notBackup);
    expect(importErrorText('damaged-payload')).toBe(ERRORS.notBackup);
    expect(importErrorText('made-by-newer-version')).toBe(ERRORS.newerBackup);
  });
});
