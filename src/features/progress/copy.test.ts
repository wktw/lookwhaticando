import { describe, expect, it } from 'vitest';
import type { PlantLook } from '@/state/types';
import type { YearQuiltVM } from '@/state/views/calendar';
import { lint } from '../../../tests/unit/voiceLint';
import { DETAIL_UI, PROGRESS_UI, clockText, dayAria, journalLine, lookName, lookTag, nudgeWords, stateWord, storyRemaining, storyText } from './copy';
import { yearPaths } from './YearStrip';

const look = (over: Partial<PlantLook> = {}): PlantLook => ({
  colour: 'dawn',
  shape: 'classic',
  read: 'bloom',
  on: '2025-09-01',
  evidence: { band: 'dawn', eligibleDays: 20, bandDays: 15, usualMinute: 450, tinyDays: 0, doneDays: 20 },
  ...over,
});

describe('small formatters', () => {
  it('writes clock times the catkin way', () => {
    expect(clockText(450)).toBe('7:30 am');
    expect(clockText(18 * 60)).toBe('6 pm');
    expect(clockText(12 * 60 + 15)).toBe('12:15 pm');
    expect(clockText(0)).toBe('12 am');
  });

  it('names a calendar day like the week strip, and says nothing about an empty day', () => {
    expect(dayAria({ date: '2025-09-27', state: 'done', count: 1, target: 1 })).toBe('Saturday, September 27, watered');
    expect(dayAria({ date: '2025-09-27', state: 'none' })).toBe('Saturday, September 27');
    expect(dayAria({ date: '2025-09-27', state: 'partial' }, { done: 3, due: 5 })).toBe('Saturday, September 27, 3 of 5 watered');
    expect(dayAria({ date: '2025-09-27', state: 'none' }, { done: 0, due: 5 })).toBe('Saturday, September 27');
    expect(stateWord('partial', 5, 8, 'glasses')).toBe('5 of 8 glasses');
    expect(stateWord('partial', 0, 8, 'glasses')).toBeNull();
  });
});

describe('Blooms Like You, in plain words (VOICE §14)', () => {
  it('names the look and says why', () => {
    expect(lookName(look({ shape: 'paired' }))).toBe('Dawn · Paired');
    expect(lookTag(look(), () => null)).toBe('Dawn: you usually water it before 9.');
    const paired = look({ shape: 'paired', evidence: { ...look().evidence, keptTogether: { habitId: 'walk', days: 18 } } });
    expect(lookTag(paired, () => 'Walk')).toBe('Dawn · Paired: you usually water it before 9, and on 18 days it came right after Walk.');
    const petite = look({ colour: 'twilight', shape: 'petite', evidence: { ...look().evidence, tinyDays: 9 } });
    expect(lookTag(petite, () => null)).toBe('Twilight · Petite: you usually water it after 6 pm, and the tiny version counted on 9 days.');
  });

  it('words the time nudge with both answers', () => {
    const w = nudgeWords('Walk', { from: 'morning', to: 'evening', band: 'twilight', usualMinute: 19 * 60 });
    expect(w).toEqual({ ask: 'You set Walk for mornings but usually water it after 6 pm. Move it to Evening?', move: 'Move to Evening', leave: 'Leave it in Morning' });
  });
});

describe('the Garden Journal (VOICE §15)', () => {
  const anchor = () => 'Walk';
  it('inks what is known', () => {
    expect(journalLine({ kind: 'usualTime', inked: true, minute: 450, band: 'dawn' }, anchor)).toBe('You usually water it around 7:30 am.');
    expect(journalLine({ kind: 'steadiestDay', inked: true, weekday: 4, days: 9 }, anchor)).toBe('Thursdays are when it’s watered most.');
    expect(journalLine({ kind: 'keptTogether', inked: true, anchorHabitId: 'w', days: 18 }, anchor)).toBe('Watered right after Walk on 18 days.');
    expect(journalLine({ kind: 'whyItLooks', inked: true, colour: 'dawn', shape: 'classic', band: 'dawn', usualMinute: 450 }, anchor)).toBe('It blooms Dawn because you water it before 9 am, usually.');
  });
  it('pencils what will fill in, in waterings, never a date', () => {
    expect(journalLine({ kind: 'usualTime', inked: false, remaining: 1 }, anchor)).toBe('Your usual time fills in after 1 more watering.');
    expect(journalLine({ kind: 'usualTime', inked: false, remaining: 6 }, anchor)).toBe('Your usual time fills in after 6 more waterings.');
    expect(journalLine({ kind: 'whyItLooks', inked: false, remaining: 12 }, anchor)).toBe('Why it looks the way it does fills in at Blooming.');
  });
});

describe('the stories (VOICE §13)', () => {
  const base = { name: 'Juniper', habit: 'Read', plant: 'begonia' as const, since: '2025-09-01', waterings: 9, moment: null, why: null };
  it('opens on the facts, and waits in silence until unlocked', () => {
    expect(storyText({ ...base, story: { id: 'start', unlocked: true, on: '2025-09-08', read: false, remaining: null } })).toBe(
      'The start. Juniper moved into the Read plant on Sep 1. Nine waterings later, Juniper has a favourite side of the pot.',
    );
    expect(storyText({ ...base, story: { id: 'lookAtUs', unlocked: false, on: null, read: false, remaining: 4 } })).toBeNull();
    expect(storyText({ ...base, why: 'Evenings feel longer', story: { id: 'why', unlocked: true, on: null, read: true, remaining: null } })).toBe('Why it matters: ‘Evenings feel longer’.');
    expect(storyRemaining(1)).toBe('About 1 more watering together.');
  });
});

describe('the year strip’s drawing', () => {
  it('draws one path per kind, flowers sized by the day, and nothing for undrawn days', () => {
    const vm: YearQuiltVM = {
      year: 2025,
      weeks: [
        [null, { date: '2025-01-06', level: 4, fraction: 1, state: 'done' }, { date: '2025-01-07', level: 0, fraction: null, state: 'rest' }, { date: '2025-01-08', level: 0, fraction: 0, state: 'none' }, null, null, null],
      ],
      months: [{ month: '2025-01', label: 'Jan', column: 0 }],
      summary: { checkins: 1, daysShowedUp: 1 },
      todayColumn: null,
    };
    const p = yearPaths(vm);
    expect(p.petals.match(/M/g)?.length).toBe(5);
    expect(p.moons).not.toBe('');
    expect(p.quiet).not.toBe('');
    expect(p.leaves).toBe('');
    expect(p.months).toEqual([{ label: 'Jan', x: 1 }]);
  });
});

describe('every line of the screen’s own copy keeps the voice', () => {
  const strings: string[] = [];
  const walk = (o: unknown) => {
    if (typeof o === 'string') strings.push(o);
    else if (o && typeof o === 'object') Object.values(o).forEach(walk);
  };
  walk(PROGRESS_UI);
  walk(DETAIL_UI);
  it.each(strings)('%s', (s) => {
    expect(lint(s)).toEqual([]);
  });
});
