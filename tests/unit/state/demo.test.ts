import { describe, expect, it, vi } from 'vitest';
import { STARTER_IDS, getCollectible } from '@/catalog/collectibles';
import { buildDemo, epochAtLocal } from '@/state/demo';
import { FIRST_CAPSULE_MACHINES } from '@/domain/gacha';
import type { AppState } from '@/state/types';
import { validateState } from '@/state/validate';
import { addDays, appDayKey, zonedLocalTime } from '@/domain/dates';
import { UTC, at } from '../domain/game';

// Builds whole saves (the 120-day demo, months of play): generous time for a busy CI machine.
vi.setConfig({ testTimeout: 30_000 });

const TODAY = '2026-09-29';
const NOW = at(TODAY, 21, 45);
const demo = buildDemo({ today: TODAY, now: NOW, local: UTC });

describe('the demo (DESIGN §9.5, §11.1)', () => {
  it('is a valid save, built deterministically', () => {
    expect(validateState(demo)).toMatchObject({ ok: true });
    expect(JSON.stringify(buildDemo({ today: TODAY, now: NOW, local: UTC }))).toBe(JSON.stringify(demo));
    expect(demo.clock.maxDateKey).toBe(TODAY);
    expect(demo.profile).toMatchObject({ onboarded: true, name: 'Sam' });
    expect('buddy' in demo.profile).toBe(false);
  });

  it('is catkin through and through: starter plants, the first-pick capsule first, catkin places', () => {
    const starters = new Set(STARTER_IDS);
    for (const h of demo.habits) expect(starters.has(`plant-${h.plant}`), h.name).toBe(true);
    const first = Object.values(demo.pets).sort((a, b) => a.obtainedAt - b.obtainedAt)[0]!;
    const def = getCollectible(first.id)!;
    expect(def).toMatchObject({ category: 'pet' });
    expect(FIRST_CAPSULE_MACHINES).toContain(def.source);
    expect(demo.ledger.once['gift|first-capsule']).toBe(true);
    expect(demo.shelf.places[0]).toBe('sill');
    for (const d of demo.shelf.decor) expect(demo.shelf.places).toContain(d.place);
    for (const l of Object.values(demo.logs).flatMap((x) => Object.values(x))) if (l.note) expect(l.note).not.toMatch(/!|\p{Extended_Pictographic}/u);
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

  it('has a lived-in Shelf: ~14 pets, outfits, favourites, decor, a place, pins and a waiting Sunday Note', () => {
    const pets = Object.values(demo.pets);
    expect(pets.length).toBeGreaterThanOrEqual(12);
    expect(pets.length).toBeLessThanOrEqual(20);
    expect(pets.some((p) => Object.keys(p.outfit).length > 0)).toBe(true);
    expect(pets.some((p) => p.favoriteKnown)).toBe(true);
    expect(pets.some((p) => p.xp > 100)).toBe(true);
    expect(demo.shelf.decor.length).toBeGreaterThan(0);
    expect(demo.shelf.places).toContain('pond');
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

/** Species of a save's pets (Moonlit variants count as their species). */
function speciesMix(s: AppState): Map<string, number> {
  const out = new Map<string, number>();
  for (const id of Object.keys(s.pets)) {
    const def = getCollectible(id.replace(/^moonlit:/, ''));
    if (def?.category === 'pet') out.set(def.species, (out.get(def.species) ?? 0) + 1);
  }
  return out;
}

describe('every demo uses a mixed cast (DESIGN §1 Many animals)', () => {
  it.each(['2026-09-29', '2026-12-20', '2027-03-10', '2027-06-15', '2027-02-10'])('built on %s: at least 5 species, none above 30%%', (today) => {
    const d = buildDemo({ today, now: at(today, 21, 45), local: UTC });
    const mix = speciesMix(d);
    const total = [...mix.values()].reduce((a, n) => a + n, 0);
    const shares = [...mix.entries()].map(([sp, n]) => `${sp} ${n}`).join(', ');
    expect(mix.size, shares).toBeGreaterThanOrEqual(5);
    for (const [sp, n] of mix) expect(n / total, `${sp}: ${shares}`).toBeLessThanOrEqual(0.3);
  });

  it('different seeds start with different first-pick cabinets', () => {
    const firsts = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => {
        const d = buildDemo({ today: TODAY, now: NOW, local: UTC, seed, days: 10 });
        const first = Object.values(d.pets).sort((a, b) => a.obtainedAt - b.obtainedAt)[0]!;
        return getCollectible(first.id)!.source;
      }),
    );
    expect(firsts.size).toBeGreaterThanOrEqual(3);
  });
});
