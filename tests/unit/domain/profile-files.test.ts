/**
 * The pure file generators behind "Add to calendar" (watering time, DESIGN §9.5, VOICE.md §20) and
 * "Export waterings as CSV" (VOICE.md §21).
 */
import { describe, expect, it } from 'vitest';
import { wateringTimeFileName, wateringTimeIcs, wateringsCsv, wateringsCsvFileName } from '@/domain/profile';
import { Game, at } from './game';

const NOW = at('2026-09-29', 9);

describe('wateringTimeIcs (RFC 5545)', () => {
  it('one daily floating-time event with a display alarm, CRLF line ends', () => {
    const ics = wateringTimeIcs('morning', '07:30', ['Walk', 'Stretch'], { startDate: '2026-09-29', now: NOW })!;
    const lines = ics.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines.at(-1)).toBe('');
    expect(lines.at(-2)).toBe('END:VCALENDAR');
    expect(lines).toContain('RRULE:FREQ=DAILY');
    expect(lines).toContain('DTSTART:20260929T073000'); // floating: follows her across time zones
    expect(lines).toContain('DTSTAMP:20260929T090000Z');
    expect(lines).toContain('SUMMARY:Watering time');
    expect(lines).toContain('DESCRIPTION:Morning plants: Walk\\, Stretch.');
    expect(lines).toContain('UID:catkin-watering-time-morning@catkin.app');
    expect(lines.filter((l) => l === 'BEGIN:VALARM')).toHaveLength(1);
    expect(ics).not.toMatch(/[^\r]\n/);
    expect(wateringTimeFileName('morning')).toBe('catkin-watering-time-morning.ics');
  });

  it('escapes TEXT (backslash, semicolon, comma) and folds long lines at 75 octets', () => {
    const long = 'Practise the cello; scales, then the long piece \\ slowly'.repeat(3);
    const ics = wateringTimeIcs('evening', '21:05', [long, 'Read'], { startDate: '2026-09-29', now: NOW })!;
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    const unfolded = ics.replace(/\r\n /g, '');
    expect(unfolded).toContain('Practise the cello\\; scales\\, then the long piece \\\\ slowly');
    expect(unfolded).toContain('\\, Read.');
  });

  it('no habits: "Evening plants."; a bad time or date gives no file', () => {
    expect(wateringTimeIcs('evening', '19:00', [], { startDate: '2026-09-29', now: NOW })).toContain('DESCRIPTION:Evening plants.\r\n');
    expect(wateringTimeIcs('evening', '7:00', ['Read'], { startDate: '2026-09-29', now: NOW })).toBeNull();
    expect(wateringTimeIcs('evening', '24:00', ['Read'], { startDate: '2026-09-29', now: NOW })).toBeNull();
    expect(wateringTimeIcs('evening', '19:00', ['Read'], { startDate: '2026-9-29', now: NOW })).toBeNull();
  });
});

describe('wateringsCsv', () => {
  it('one row per logged day and habit, oldest first, with the VOICE states; nothing ahead of today', () => {
    const g = new Game({ start: '2026-03-02' });
    const walk = g.addHabit({ name: 'Walk' });
    const water = g.addHabit({ name: 'Water', target: 8, unit: 'glasses', tiny: { label: '4', count: 4 } });
    g.checkIn(walk);
    g.checkIn(water);
    g.goTo('2026-03-03');
    g.tiny(water);
    g.rest(walk, '2026-03-03');
    const csv = wateringsCsv(g.state, g.today);
    expect(csv.split('\r\n')).toEqual([
      'date,habit,count,target,state',
      '2026-03-02,Walk,1,1,watered',
      '2026-03-02,Water,1,8,partial',
      '2026-03-03,Walk,0,1,rest',
      '2026-03-03,Water,0,8,tiny', // a tiny version is logged by level, not by count
      '',
    ]);
    expect(wateringsCsv(g.state, '2026-03-02').split('\r\n')).toHaveLength(4);
    expect(wateringsCsvFileName('2026-03-03')).toBe('catkin-waterings-2026-03-03.csv');
  });

  it('defuses spreadsheet formulas and quotes commas and quotes in names', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit({ name: '=SUM(A1)' });
    const b = g.addHabit({ name: 'Tea, "proper"' });
    g.checkIn(a);
    g.checkIn(b);
    expect(wateringsCsv(g.state, g.today).split('\r\n').slice(1, 3)).toEqual(["2026-03-02,'=SUM(A1),1,1,watered", '2026-03-02,"Tea, ""proper""",1,1,watered']);
  });
});
