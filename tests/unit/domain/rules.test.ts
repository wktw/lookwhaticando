import { describe, expect, it } from 'vitest';
import {
  editEffectiveFrom,
  isScheduledOn,
  normalizeRules,
  rhythmSpanAt,
  rhythmSpans,
  ruleAt,
  ruleSegments,
  scheduleStatusOn,
  validateHabitRules,
  withRuleEdit,
  withStartedOn,
} from '@/domain/rules';
import type { RuleContent } from '@/domain/schedule';
import { DAILY, habit, monthly, onDays, rule, weekly } from './helpers';

const content = (schedule: RuleContent['schedule'], extra: Partial<RuleContent> = {}): RuleContent => ({ schedule, target: 1, step: 1, ...extra });

describe('ruleAt & segments', () => {
  const h = habit({
    startedOn: '2026-08-01',
    rules: [rule('2026-08-01', DAILY), rule('2026-09-01', onDays(1, 3, 5)), rule('2026-09-14', weekly(3))],
  });

  it.each([
    ['2026-07-15', 0], // before the first rule: clamped to it
    ['2026-08-01', 0],
    ['2026-08-31', 0],
    ['2026-09-01', 1],
    ['2026-09-13', 1],
    ['2026-09-14', 2],
    ['2027-01-01', 2],
  ])('ruleAt(%s) is rule #%i', (date, i) => {
    expect(ruleAt(h, date)).toBe(h.rules[i]);
  });

  it('segments cover consecutive ranges', () => {
    expect(ruleSegments(h).map((s) => [s.start, s.end])).toEqual([
      [null, '2026-08-31'],
      ['2026-09-01', '2026-09-13'],
      ['2026-09-14', null],
    ]);
  });

  it('schedule status uses the rule in effect that day', () => {
    expect(scheduleStatusOn(h, '2026-08-04')).toBe('scheduled'); // Tue under daily
    expect(scheduleStatusOn(h, '2026-09-08')).toBe('unscheduled'); // Tue under Mon/Wed/Fri
    expect(scheduleStatusOn(h, '2026-09-09')).toBe('scheduled'); // Wed
    expect(scheduleStatusOn(h, '2026-09-15')).toBe('flexible');
    expect(isScheduledOn(h, '2026-09-15')).toBe(false);
  });

  it('throws on a habit without rules', () => {
    expect(() => ruleAt({ rules: [] }, '2026-09-01')).toThrow();
  });
});

describe('rhythm spans (streak continuity)', () => {
  it('day-based edits stay in one rhythm; kind changes start a new one', () => {
    const h = habit({
      startedOn: '2026-01-01',
      rules: [
        rule('2026-01-01', DAILY),
        rule('2026-02-01', onDays(1, 3, 5)),
        rule('2026-03-01', DAILY, { target: 8 }),
        rule('2026-04-01', weekly(3)),
        rule('2026-05-01', weekly(2, 2)),
        rule('2026-06-01', monthly(2)),
        rule('2026-07-01', DAILY),
      ],
    });
    expect(rhythmSpans(h).map((s) => [s.rhythm, s.start, s.end, s.firstIndex, s.lastIndex])).toEqual([
      ['day', null, '2026-03-31', 0, 2],
      ['week', '2026-04-01', '2026-05-31', 3, 4],
      ['month', '2026-06-01', '2026-06-30', 5, 5],
      ['day', '2026-07-01', null, 6, 6],
    ]);
    expect(rhythmSpanAt(h, '2026-05-15').rhythm).toBe('week');
    expect(rhythmSpanAt(h, '2025-12-01').firstIndex).toBe(0);
  });
});

describe('validation', () => {
  it('accepts a well-formed history', () => {
    expect(validateHabitRules(habit({ startedOn: '2026-09-01', rules: [rule('2026-09-01', DAILY), rule('2026-09-10', weekly(3))] }))).toEqual([]);
  });

  it('reports ordering, start and content problems with indices', () => {
    const issues = validateHabitRules({
      startedOn: '2026-09-02',
      rules: [rule('2026-09-01', DAILY), rule('2026-09-01', weekly(9)), rule('2026-02-30', DAILY)],
    });
    expect(issues.map((i) => [i.code, i.index])).toEqual([
      ['times-range', 1],
      ['rules-order', 1],
      ['from-invalid', 2],
      ['rules-order', 2],
      ['first-rule-start', 0],
    ]);
    expect(validateHabitRules({ startedOn: '2026-09-01', rules: [] })[0]!.code).toBe('rules-empty');
  });

  it('normalizeRules sorts and lets the later duplicate win', () => {
    const a = rule('2026-09-10', weekly(3));
    const b = rule('2026-09-01', DAILY);
    const c = rule('2026-09-10', weekly(2));
    expect(normalizeRules([a, b, c])).toEqual([b, c]);
  });
});

describe('edit timing (DESIGN §13.2)', () => {
  const today = '2026-09-30'; // Wednesday
  it.each([
    // [description, rules, startedOn, timing, weekStart, expected from]
    ['daily: from today', [rule('2026-08-01', DAILY)], '2026-08-01', 'today', 1, '2026-09-30'],
    ['daily ignores next-period', [rule('2026-08-01', DAILY)], '2026-08-01', 'next-period', 1, '2026-09-30'],
    ['weekly this period (Mon start)', [rule('2026-08-03', weekly(3))], '2026-08-03', 'today', 1, '2026-09-28'],
    ['weekly next period (Mon start)', [rule('2026-08-03', weekly(3))], '2026-08-03', 'next-period', 1, '2026-10-05'],
    ['weekly this period (Sun start)', [rule('2026-08-03', weekly(3))], '2026-08-03', 'today', 0, '2026-09-27'],
    ['weekly next period (Sun start)', [rule('2026-08-03', weekly(3))], '2026-08-03', 'next-period', 0, '2026-10-04'],
    ['biweekly this period', [rule('2026-08-12', weekly(1, 2))], '2026-08-12', 'today', 1, '2026-09-21'],
    ['biweekly next period', [rule('2026-08-12', weekly(1, 2))], '2026-08-12', 'next-period', 1, '2026-10-05'],
    ['quarterly this period', [rule('2026-02-10', monthly(1, 3))], '2026-02-10', 'today', 1, '2026-08-01'],
    ['quarterly next period', [rule('2026-02-10', monthly(1, 3))], '2026-02-10', 'next-period', 1, '2026-11-01'],
    ['monthly this period', [rule('2026-01-05', monthly(2))], '2026-01-05', 'today', 1, '2026-09-01'],
    // A flexible rule that began mid-period: "this period" never reaches before the rule's own start.
    ['weekly begun mid-week', [rule('2026-08-01', DAILY), rule('2026-09-29', weekly(3))], '2026-08-01', 'today', 1, '2026-09-29'],
    // Created this week: the edit replaces the first rule (from stays = startedOn).
    ['created this week', [rule('2026-09-30', weekly(3))], '2026-09-30', 'today', 1, '2026-09-30'],
    // Graduation ("Ready to grow?"): the new rule starts tomorrow, whatever the kind.
    ['daily: tomorrow', [rule('2026-08-01', DAILY)], '2026-08-01', 'tomorrow', 1, '2026-10-01'],
    ['weekly: tomorrow', [rule('2026-08-03', weekly(3))], '2026-08-03', 'tomorrow', 1, '2026-10-01'],
  ] as const)('%s', (_d, rules, startedOn, timing, weekStart, expected) => {
    expect(editEffectiveFrom({ rules: [...rules], startedOn }, today, timing, weekStart)).toBe(expected);
  });
});

describe('withRuleEdit', () => {
  const base = habit({ startedOn: '2026-08-01', rules: [rule('2026-08-01', DAILY)] });

  it('appends a day-based edit from today, keeping history', () => {
    const edited = withRuleEdit(base, content(onDays(1, 3, 5)), '2026-09-30', 'today', 1);
    expect(edited.rules).toEqual([rule('2026-08-01', DAILY), rule('2026-09-30', onDays(1, 3, 5))]);
    expect(base.rules).toHaveLength(1); // immutable
  });

  it('a no-op edit returns the same habit; an edit then its undo collapses', () => {
    expect(withRuleEdit(base, content(DAILY), '2026-09-30', 'today', 1)).toBe(base);
    const once = withRuleEdit(base, content(DAILY, { target: 8 }), '2026-09-30', 'today', 1);
    const undone = withRuleEdit(once, content(DAILY), '2026-09-30', 'today', 1);
    expect(undone.rules).toEqual(base.rules);
  });

  it('a later edit supersedes a pending next-period edit', () => {
    const h = habit({ startedOn: '2026-08-03', rules: [rule('2026-08-03', weekly(3))] });
    const pending = withRuleEdit(h, content(weekly(2)), '2026-09-30', 'next-period', 1);
    expect(pending.rules.map((r) => r.from)).toEqual(['2026-08-03', '2026-10-05']);
    const now = withRuleEdit(pending, content(weekly(4)), '2026-09-30', 'today', 1);
    expect(now.rules).toEqual([rule('2026-08-03', weekly(3)), rule('2026-09-28', weekly(4))]);
    const back = withRuleEdit(pending, content(weekly(3)), '2026-09-30', 'next-period', 1);
    expect(back.rules).toEqual(h.rules); // pending edit reverted
  });

  it('replacing the whole history keeps rules[0].from === startedOn', () => {
    const h = habit({ startedOn: '2026-09-30', rules: [rule('2026-09-30', DAILY)] });
    const edited = withRuleEdit(h, content(weekly(3)), '2026-09-30', 'today', 1);
    expect(edited.rules).toEqual([rule('2026-09-30', weekly(3))]);
    expect(validateHabitRules(edited)).toEqual([]);
  });

  it('copies only rule fields, normalises, and rejects invalid content', () => {
    const extra = { ...content({ kind: 'days', days: [5, 1] }), name: 'ignored' } as RuleContent;
    expect(withRuleEdit(base, extra, '2026-09-30', 'today', 1).rules[1]).toEqual(rule('2026-09-30', onDays(1, 5)));
    expect(() => withRuleEdit(base, content(DAILY, { target: 0 }), '2026-09-30', 'today', 1)).toThrow(RangeError);
  });
});

describe('withStartedOn ("Start tracking from…")', () => {
  it('moves startedOn and the first rule earlier, never later', () => {
    const h = habit({ startedOn: '2026-09-22', rules: [rule('2026-09-22', DAILY), rule('2026-09-28', weekly(3))] });
    const earlier = withStartedOn(h, '2026-09-15');
    expect(earlier.startedOn).toBe('2026-09-15');
    expect(earlier.rules.map((r) => r.from)).toEqual(['2026-09-15', '2026-09-28']);
    expect(validateHabitRules(earlier)).toEqual([]);
    expect(withStartedOn(h, '2026-09-25')).toBe(h);
  });
});
