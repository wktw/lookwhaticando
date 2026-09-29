/**
 * The save stays bounded (DESIGN §13.8): five years of twelve busy habits (6 daily incl. 3 count
 * habits tapped 8× a day, 3 on certain days, 3 at 3×/week; 85% kept; live stamps on every tap; notes;
 * everything collected; 320 letters) serialises to well under 1,000,000 characters once compacted.
 */
import { describe, expect, it } from 'vitest';
import { COLLECTIBLES, PETS, TREATS } from '@/catalog/collectibles';
import { MACHINES } from '@/catalog/machines';
import { BADGES } from '@/catalog/badges';
import type { AppState, DayLog, Habit, Letter } from '@/state/types';
import { encodeEnvelope } from '@/state/persist';
import { validateState } from '@/state/validate';
import { addDays, eachDay } from '@/domain/dates';
import { ledgerKey } from '@/domain/economy';
import { compactSave } from '@/domain/rollover';
import { transact } from '@/domain/tx';
import { chance, mulberry32, pick } from '@/domain/rng';
import { Game, UTC, at } from '../domain/game';

const TODAY = '2026-09-29';

function fiveYearSave(): AppState {
  const rng = mulberry32(5);
  const g = new Game({ start: TODAY, hour: 21 });
  g.freeze = false;
  const start = addDays(TODAY, -(5 * 365 + 1));
  const days = eachDay(start, TODAY);
  const s = structuredClone(g.state);
  s.profile.createdAt = at(start, 9);
  s.clock = { maxDateKey: TODAY, maxEpochMs: at(TODAY, 21), lastCheckinAt: at(TODAY, 20) };
  for (let i = 0; i < 12; i++) {
    const kind = i % 4;
    const schedule: Habit['rules'][number]['schedule'] =
      kind === 0 ? { kind: 'daily' } : kind === 1 ? { kind: 'days', days: [1, 3, 5] } : kind === 2 ? { kind: 'weekly', times: 3, every: 1 } : { kind: 'daily' };
    const target = kind === 3 ? 8 : 1;
    const id = `h-${String(i).padStart(8, '0')}`;
    s.habits.push({
      id,
      name: `Habit number ${i}`,
      icon: 'sparkle',
      color: 'sage',
      plant: 'tulip',
      pot: 'terracotta',
      rules: [{ from: start, schedule, target, step: 1, ...(kind === 3 ? { tiny: { label: 'Four glasses', count: 4 } } : { tiny: { label: 'The tiny version' } }) }],
      effort: 'steady',
      timeOfDay: 'anytime',
      polarity: 'build',
      anchor: 'After I pour my morning coffee',
      createdAt: at(start, 9),
      startedOn: start,
      pauses: [{ start: addDays(start, 100), end: addDays(start, 110) }],
      order: i,
    });
    const logs: Record<string, DayLog> = {};
    for (const d of days) {
      // Logs follow the schedule: certain-days habits on their days, 3×/week habits ~3 days a week.
      const wd = new Date(`${d}T12:00:00Z`).getUTCDay();
      if (kind === 1 && ![1, 3, 5].includes(wd)) continue;
      if (kind === 2 && !chance(rng, 3.3 / 7)) continue;
      if (chance(rng, 0.03)) {
        logs[d] = { kind: 'rest' };
        continue;
      }
      if (!chance(rng, 0.85)) continue;
      const taps = target > 1 ? 8 : 1;
      const log: DayLog = { kind: 'log', count: target, at: Array.from({ length: taps }, (_, k) => at(d, 8 + k, 15)) };
      if (chance(rng, 0.04)) log.note = 'A short reflection about how today went, kept warmly.';
      logs[d] = log;
      s.ledger.recent[ledgerKey(id, d)] = { coins: 5, sunshine: 1, cap: 5, lvl: 'full' }; // a never-compacted ledger
    }
    s.logs[id] = logs;
    s.ledger.sunshine[id] = 1500;
    s.ledger.bestStage[id] = 7;
    for (const tier of [3, 7, 14, 21, 30, 45, 60, 90, 120, 180, 365]) s.ledger.once[`rung|${id}|${tier}`] = true;
  }
  for (const d of days) s.ledger.daily[d] = 40;
  for (const d of days) if (chance(rng, 0.5)) s.ledger.once[`perfect|${d}`] = 12;
  for (let n = 7; n <= 1800; n += 7) s.ledger.once[`showup|${n}`] = true;
  s.lifetime = { coinsEarned: 60000, starsEarned: 3000, checkins: 18000, pulls: 2000, perfectDays: 900, showUpDays: 1800, lastShowUpDay: TODAY };
  // Everything collected, 60 friends, a full meadow, every badge, five years of letters.
  for (const c of COLLECTIBLES) s.collection[c.id] = { count: 3, firstAt: at(start, 9) };
  for (const p of PETS.slice(0, 60)) {
    s.collection[`moonlit:${p.id}`] = { count: 1, firstAt: 0 };
    s.pets[p.id] = { id: p.id, name: p.defaultName, personality: 'sunny', favoriteTreat: pick(rng, TREATS).id, favoriteKnown: true, xp: 2400, outfit: { head: 'wear-pink-bow', neck: 'wear-bell-collar' }, inMeadow: false, favorite: chance(rng, 0.2), obtainedAt: at(start, 9), daily: { date: TODAY, pets: 5, treats: 3, buddy: 0 } };
  }
  for (const t of TREATS) s.pantry[t.id] = { servings: 5, restockedOn: TODAY };
  for (const m of MACHINES) s.pity[m.id] = { sinceRare: 3, sinceUltra: 20, dupStreak: 1, pulls: 180 };
  s.meadow.zones = ['meadow', 'pond', 'orchard', 'porch', 'greenhouse', 'starhill'];
  s.meadow.decor = Array.from({ length: 100 }, (_, i) => ({ id: `d-${String(i).padStart(6, '0')}`, itemId: 'decor-cardboard-box', zone: 'meadow' as const, x: 0.123456, y: 0.654321, flip: true }));
  for (const b of BADGES) s.badges[b.id] = at(start, 9);
  const letters: Letter[] = [];
  for (let w = 0; w < 5 * 52; w++) {
    const weekStart = addDays('2021-10-04', 7 * w);
    letters.push({ kind: 'weekly', id: `weekly-${weekStart}`, weekStart, achieved: 70, expected: 80, stars: 3, showUpDays: 7, bestHabitId: 'h-00000000', quote: { habitId: 'h-00000000', date: weekStart, text: 'A short reflection about how today went, kept warmly.' }, newFriends: ['pet-cat-orange'], plantsGrown: ['h-00000001'], readAt: at(weekStart, 9) });
  }
  for (let m = 0; m < 60; m++) {
    const month = `${2021 + Math.floor((m + 9) / 12)}-${String(((m + 9) % 12) + 1).padStart(2, '0')}`;
    letters.push({ kind: 'monthly', id: `bouquet-${month}`, month, achieved: 300, expected: 340, stars: 4, previousPct: 85, growingBonus: false, stems: s.habits.map((h) => ({ habitId: h.id, plant: h.plant, count: 7 })), readAt: 0 });
  }
  s.inbox = letters;
  return s;
}

describe('save size stays bounded', () => {
  it('5 years × 12 habits serialise to < 1,000,000 characters after compaction (and stay valid)', () => {
    const big = fiveYearSave();
    const before = encodeEnvelope(big, 1, 0, 'test').length;
    const compacted = transact(big, { now: at(TODAY, 21), today: TODAY, local: UTC, rng: mulberry32(1) }, (tx) => {
      compactSave(tx);
      return {};
    }).state;
    const after = encodeEnvelope(compacted, 2, 0, 'test').length;
    expect(validateState(compacted)).toMatchObject({ ok: true });
    expect(before).toBeGreaterThan(1_000_000);
    expect(after).toBeLessThan(1_000_000);
    expect(Object.keys(compacted.ledger.recent).every((k) => k.slice(-10) >= addDays(TODAY, -7))).toBe(true);
    expect(Object.keys(compacted.ledger.daily)).toHaveLength(8);
    // History itself is never compacted away: every log survives (only stamps older than 120 days go).
    expect(Object.keys(compacted.logs['h-00000000']!)).toEqual(Object.keys(big.logs['h-00000000']!));
    console.info(`5y×12 save: ${before.toLocaleString('en-US')} → ${after.toLocaleString('en-US')} chars`);
  });
});
