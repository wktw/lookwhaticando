/**
 * A worst-realistic-case save: five years of twelve busy habits (6 daily incl. 3 count habits tapped
 * 8× a day, 3 on certain days, 3 at 3×/week; 85% kept; live stamps on every tap; notes; everything
 * collected; 60 friends; 320 letters) with a never-compacted ledger.
 */
import { COLLECTIBLES, PETS, TREATS } from '@/catalog/collectibles';
import { MACHINES } from '@/catalog/machines';
import { BADGES } from '@/catalog/badges';
import type { AppState, DayLog, Habit, Letter } from '@/state/types';
import { addDays, eachDay, monthFromIndex, monthIndex, startOfWeek } from '@/domain/dates';
import { ledgerKey } from '@/domain/economy';
import { chance, mulberry32, pick } from '@/domain/rng';
import { Game, at } from '../domain/game';

export const TODAY = '2026-09-29';

export function fiveYearSave(): AppState {
  return bigSave({ years: 5, habits: 12 });
}

/**
 * A big save: `years` of `habits` busy habits (see module doc), with every stage B record a
 * long-kept sill has: companions on half the habits (and their pairings, stories and keepsakes),
 * stacked pairs, plant looks, stage days and filed seasons.
 */
export function bigSave(opts: { years: number; habits: number; notes?: 'daily' }): AppState {
  const rng = mulberry32(5);
  const g = new Game({ start: TODAY, hour: 21 });
  g.freeze = false;
  // The journal variant has exactly 365 days per fixture year, regardless of leap years.
  const journal = opts.notes === 'daily';
  const start = addDays(TODAY, journal ? 1 - opts.years * 365 : -(opts.years * 365 + 1));
  const days = eachDay(start, TODAY);
  const s = structuredClone(g.state);
  s.profile.createdAt = at(start, 9);
  if (journal) s.profile.createdOn = start;
  s.clock = { maxDateKey: TODAY, maxEpochMs: at(TODAY, 21), lastCheckinAt: at(TODAY, 20) };
  for (let i = 0; i < opts.habits; i++) {
    const kind = journal ? 0 : i % 4;
    const schedule: Habit['rules'][number]['schedule'] =
      kind === 0 ? { kind: 'daily' } : kind === 1 ? { kind: 'days', days: [1, 3, 5] } : kind === 2 ? { kind: 'weekly', times: 3, every: 1 } : { kind: 'daily' };
    const target = kind === 3 ? 8 : 1;
    const id = `h-${String(i).padStart(8, '0')}`;
    s.habits.push({
      id,
      name: `Habit number ${i}`,
      icon: 'sparkle',
      color: 'sage',
      plant: 'pothos',
      pot: 'terracotta',
      rules: [{ from: start, schedule, target, step: 1, ...(kind === 3 ? { tiny: { label: 'Four glasses', count: 4 } } : { tiny: { label: 'The tiny version' } }) }],
      effort: 'steady',
      timeOfDay: 'anytime',
      polarity: 'build',
      anchor: 'After I pour my morning coffee',
      createdAt: at(start, 9),
      startedOn: start,
      pauses: journal ? [] : [{ start: addDays(start, 100), end: addDays(start, 110) }],
      order: i,
    });
    const logs: Record<string, DayLog> = {};
    for (const d of days) {
      // Logs follow the schedule: certain-days habits on their days, 3×/week habits ~3 days a week.
      const wd = new Date(`${d}T12:00:00Z`).getUTCDay();
      if (kind === 1 && ![1, 3, 5].includes(wd)) continue;
      if (kind === 2 && !chance(rng, 3.3 / 7)) continue;
      if (!journal && chance(rng, 0.03)) {
        logs[d] = { kind: 'rest' };
        continue;
      }
      if (!journal && !chance(rng, 0.85)) continue;
      const taps = target > 1 ? 8 : 1;
      const log: DayLog = { kind: 'log', count: target, at: Array.from({ length: taps }, (_, k) => at(d, 8 + k, 15)) };
      if (journal) {
        log.note = `Habit ${i}, ${d}. A daily reflection, kept in full. `.padEnd(280, 'A little detail from the day. ');
        log.first = log.at![0]!;
        log.done = log.at![log.at!.length - 1]!;
        if (d.endsWith('-01')) log.starred = true;
      } else if (chance(rng, 0.04)) log.note = 'A short reflection about how today went, kept warmly.';
      logs[d] = log;
      s.ledger.recent[ledgerKey(id, d)] = { coins: 5, sunshine: 1, cap: 5, lvl: 'full' }; // a never-compacted ledger
    }
    s.logs[id] = logs;
    s.ledger.sunshine[id] = journal ? days.length : 1500;
    s.ledger.bestStage[id] = 7;
    for (const tier of [3, 7, 14, 21, 30, 45, 60, 90, 120, 180, 365]) s.ledger.once[`rung|${id}|${tier}`] = true;
  }
  for (const d of days) s.ledger.daily[d] = 40;
  for (const d of days) if (chance(rng, 0.5)) s.ledger.once[`perfect|${d}`] = 12;
  for (let n = 7; n <= 1800; n += 7) s.ledger.once[`showup|${n}`] = true;
  s.lifetime = { coinsEarned: 60000, starsEarned: 3000, checkins: 18000, pulls: 2000, perfectDays: 900, showUpDays: 1800, lastShowUpDay: TODAY };
  if (journal) Object.assign(s.lifetime, { coinsEarned: days.length * opts.habits * 5, checkins: days.length * opts.habits, perfectDays: days.length, showUpDays: days.length });
  // Everything collected, 60 pets, every place, every pin, five years of Sunday Notes and pages, two weeks of found things.
  for (const c of COLLECTIBLES) s.collection[c.id] = { count: 3, firstAt: at(start, 9) };
  for (const p of PETS.slice(0, 60)) {
    s.collection[`moonlit:${p.id}`] = { count: 1, firstAt: 0 };
    s.pets[p.id] = { id: p.id, name: p.defaultName, personality: 'sunny', favoriteTreat: pick(rng, TREATS).id, favoriteKnown: true, xp: 2400, outfit: { head: 'wear-ribbon-bow', neck: 'wear-bell-collar' }, inMeadow: false, favorite: chance(rng, 0.2), obtainedAt: at(start, 9), daily: { date: TODAY, pets: 5, treats: 3, favorites: 1 } };
  }
  for (const t of TREATS) s.pantry[t.id] = { servings: 5, restockedOn: TODAY };
  for (const m of MACHINES) s.pity[m.id] = { sinceRare: 3, sinceUltra: 20, dupStreak: 1, pulls: 180 };
  s.shelf.places = ['sill', 'pond', 'grass', 'bookshelf', 'balcony', 'quilt'];
  s.shelf.decor = Array.from({ length: 100 }, (_, i) => ({ id: `d-${String(i).padStart(6, '0')}`, itemId: 'decor-cardboard-box', place: 'sill' as const, x: 0.123456, y: 0.654321, flip: true }));
  s.found = Array.from({ length: 14 }, (_, i) => ({ date: addDays(TODAY, i - 13), petId: PETS[i]!.id, seed: 1234 }));
  for (const b of BADGES) s.badges[b.id] = at(start, 9);
  const letters: Letter[] = [];
  for (let w = 0; w < (journal ? opts.years : 5) * 52; w++) {
    const weekStart = addDays(journal ? startOfWeek(start, 1) : '2021-10-04', 7 * w);
    const quoteDate = journal && weekStart < start ? start : weekStart;
    const quote = journal ? s.logs['h-00000000']?.[quoteDate]?.note : undefined;
    letters.push({ kind: 'weekly', id: `weekly-${weekStart}`, weekStart, achieved: 70, expected: 80, stars: 3, showUpDays: 7, bestHabitId: 'h-00000000', quote: { habitId: 'h-00000000', date: quoteDate, text: quote ?? 'A short reflection about how today went, kept warmly.' }, newFriends: ['pet-cat-orange'], plantsGrown: ['h-00000001'], readAt: at(weekStart, 9) });
  }
  for (let m = 0; m < (journal ? opts.years * 12 : 60); m++) {
    const month = journal ? monthFromIndex(monthIndex(start) + m) : `${2021 + Math.floor((m + 9) / 12)}-${String(((m + 9) % 12) + 1).padStart(2, '0')}`;
    letters.push({ kind: 'monthly', id: `bouquet-${month}`, month, achieved: 300, expected: 340, stars: 4, previousPct: 85, growingBonus: false, stems: s.habits.map((h) => ({ habitId: h.id, plant: h.plant, count: 7 })), readAt: 0 });
  }
  s.inbox = letters;
  // Stage B: companions on every other habit, stacks, looks, stage days, keepsakes, seasons.
  const pairs: NonNullable<AppState['company']>['pairs'] = {};
  s.habits.forEach((h, i) => {
    if (i % 2 === 1) h.anchorHabitId = s.habits[i - 1]!.id;
    if (i % 2 === 0 && PETS[i]) {
      h.companionId = PETS[i]!.id;
      pairs[`${PETS[i]!.id}|${h.id}`] = { petId: PETS[i]!.id, habitId: h.id, since: start, sunshine: 1200, waterings: 900, stories: { start: { on: addDays(start, 7), readAt: 1 }, why: { on: addDays(start, 21), readAt: 1 }, lookAtUs: { on: addDays(start, 42), readAt: 1 } }, whyAsked: true };
    }
    s.stageDates = { ...s.stageDates, [h.id]: { 1: addDays(start, 1), 2: addDays(start, 4), 3: addDays(start, 10), 4: addDays(start, 21), 5: addDays(start, 42), 6: addDays(start, 90), 7: addDays(start, 180) } };
    const look = (colour: 'dawn' | 'twilight', read: 'bloom' | 'evergreen', on: string) => ({ colour, shape: 'classic' as const, read, on, evidence: { band: colour, eligibleDays: 40, bandDays: 40, usualMinute: 495, tinyDays: 0, doneDays: 40 } });
    s.plantLooks = { ...s.plantLooks, [h.id]: { looks: [look('dawn', 'bloom', addDays(start, 42)), look('twilight', 'evergreen', addDays(start, 180))], shown: 1, reads: { bloom: addDays(start, 42), evergreen: addDays(start, 180) } } };
    if (h.companionId) {
      for (const stage of [1, 4, 5, 7]) s.keepsakes = [...(s.keepsakes ?? []), { id: `k-${h.id}-${stage}`, habitId: h.id, petId: h.companionId, stage, kind: stage === 7 ? 'brass-seed' : 'move', date: addDays(start, stage * 10) }];
    }
  });
  s.company = { pairs, offer: { declines: 3 } };
  s.seasons = {
    filed: [],
    pending: {
      key: '2026-06-01',
      name: 'summer',
      start: '2026-06-01',
      end: '2026-08-31',
      hemisphere: 'north',
      plants: s.habits.slice(0, 8).map((h) => ({ habitId: h.id, plant: h.plant, fromStage: 7, toStage: 7, waterings: 80, ...(h.companionId ? { petId: h.companionId } : {}) })),
      waterings: 80 * s.habits.length,
    },
  };
  return s;
}
