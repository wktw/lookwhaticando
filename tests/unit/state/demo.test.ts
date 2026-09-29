import { describe, expect, it } from 'vitest';
import { MOCHI_ID } from '@/catalog/collectibles';
import { buildDemo, epochAtLocal } from '@/state/demo';
import { validateState } from '@/state/validate';
import { addDays, appDayKey, zonedLocalTime } from '@/domain/dates';
import { UTC, at } from '../domain/game';

const TODAY = '2026-09-29';
const NOW = at(TODAY, 21, 45);
const demo = buildDemo({ today: TODAY, now: NOW, local: UTC });

describe('the demo meadow (DESIGN §9.5, §13.8)', () => {
  it('is a valid save, built deterministically', () => {
    expect(validateState(demo)).toMatchObject({ ok: true });
    expect(JSON.stringify(buildDemo({ today: TODAY, now: NOW, local: UTC }))).toBe(JSON.stringify(demo));
    expect(demo.clock.maxDateKey).toBe(TODAY);
    expect(demo.profile).toMatchObject({ onboarded: true, buddy: MOCHI_ID });
  });

  it('tells the whole story: every schedule kind, dips and recoveries, an edit, a late starter, notes', () => {
    const kinds = demo.habits.map((h) => h.rules[0]!.schedule.kind);
    expect(demo.habits).toHaveLength(7);
    expect(new Set(kinds)).toEqual(new Set(['daily', 'days', 'weekly', 'monthly']));
    expect(new Set(demo.habits.map((h) => h.timeOfDay))).toEqual(new Set(['morning', 'midday', 'evening', 'anytime']));
    expect(demo.habits.some((h) => h.polarity === 'avoid')).toBe(true);
    expect(demo.habits.some((h) => h.rules[0]!.target > 1 && h.rules[0]!.tiny?.count)).toBe(true);
    expect(demo.habits.some((h) => h.rules.length > 1)).toBe(true); // a schedule edit
    const start = addDays(TODAY, -119);
    expect(demo.habits.some((h) => h.startedOn > addDays(start, 30))).toBe(true); // started mid-way
    expect(demo.habits.filter((h) => h.pauses.length > 0)).toHaveLength(2); // the vacation
    expect(Object.keys(demo.offDays).length).toBeGreaterThanOrEqual(3); // the sick week
    const logs = Object.values(demo.logs).flatMap((l) => Object.values(l));
    expect(logs.filter((l) => l.note).length).toBeGreaterThan(5);
    expect(logs.filter((l) => l.kind === 'log' && l.level === 'tiny').length).toBeGreaterThan(5);
    expect(logs.filter((l) => l.kind === 'rest').length).toBeGreaterThan(0);
  });

  it('has a lived-in meadow: ~14 friends, outfits, favorites, decor, a zone, badges and a waiting letter', () => {
    const pets = Object.values(demo.pets);
    expect(pets.length).toBeGreaterThanOrEqual(12);
    expect(pets.length).toBeLessThanOrEqual(20);
    expect(pets.some((p) => Object.keys(p.outfit).length > 0)).toBe(true);
    expect(pets.some((p) => p.id !== MOCHI_ID && p.favoriteKnown)).toBe(true);
    expect(pets.some((p) => p.xp > 100)).toBe(true);
    expect(demo.meadow.decor.length).toBeGreaterThan(0);
    expect(demo.meadow.zones).toContain('pond');
    expect(Object.keys(demo.badges).length).toBeGreaterThanOrEqual(10);
    expect(demo.wallet.coins).toBeGreaterThan(25);
    const unread = demo.inbox.filter((l) => l.readAt === undefined);
    expect(unread).toHaveLength(1);
    expect(unread[0]).toMatchObject({ kind: 'weekly', weekStart: '2026-09-21' });
    expect(demo.inbox.some((l) => l.kind === 'monthly')).toBe(true);
    expect(demo.lifetime.pulls).toBeGreaterThan(10);
  });

  it('never acts after "now"', () => {
    const early = buildDemo({ today: TODAY, now: at(TODAY, 6), local: UTC, days: 30 });
    for (const logs of Object.values(early.logs)) expect(logs[TODAY]).toBeUndefined();
    expect(early.clock.maxEpochMs).toBeLessThanOrEqual(at(TODAY, 6));
  });

  it('works in a real time zone across a DST change', () => {
    const ny = zonedLocalTime('America/New_York');
    const now = epochAtLocal('2026-11-15', 21, 0, ny);
    const s = buildDemo({ today: '2026-11-15', now, local: ny, days: 45 });
    expect(validateState(s)).toMatchObject({ ok: true });
    expect(appDayKey(s.clock.maxEpochMs, s.settings.dayStartsAt, ny)).toBe('2026-11-15');
    expect(epochAtLocal('2026-11-01', 1, 30, ny)).toBe(Date.UTC(2026, 10, 1, 5, 30)); // the repeated hour resolves to its first occurrence
  });
});
