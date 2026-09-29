/**
 * Property tests for the three pillars and the rituals under seeded random play (check-ins at
 * random hours, un-checks, tiny, backfill, history edits, rule edits, pairing and parting, petting,
 * looks chosen, nudges answered, fresh starts, season changes, archive/restore/delete, stacking).
 * After every step:
 * - the save stays valid;
 * - companion XP: at most once per occurrence, and at most 30 a day per pet from habits;
 * - companion sunshine never exceeds the habit's sunshine (all pairings of a habit together);
 * - stories are only ever added, in order, and at most one per step for a pair;
 * - looks are only ever added (earlier looks never change), keepsakes are once per plant per stage
 *   and never removed;
 * - the season review is idempotent (opening the day again changes nothing; nothing is filed twice);
 * - stage B pays nothing beyond §6: Sunday Note / Herbarium stamps equal their once-keys and never
 *   go down (backfill pays only upward differences), and the only stamp a fresh start can pay is Grow's.
 */
import { describe, expect, it, vi } from 'vitest';
import type { GameEvent } from '@/state/api';
import type { AppState, PlantLook, StoryId } from '@/state/types';
import { validateState } from '@/state/validate';
import * as company from '@/domain/company';
import { addDays } from '@/domain/dates';
import { newPetState, petPet } from '@/domain/friendship';
import * as habits from '@/domain/habits';
import * as logging from '@/domain/logging';
import { chance, mulberry32, pick, randomInt, type Rng } from '@/domain/rng';
import { KEEPSAKE_STAGES } from '@/domain/routines';
import { openDay } from '@/domain/rollover';
import { applyFreshStart, resolveSeasonReview, type FreshStartChoice } from '@/domain/seasonReview';
import { answerTimeNudge, setPlantLook } from '@/domain/signature';
import { transact } from '@/domain/tx';
import { Game, at } from './game';

vi.setConfig({ testTimeout: 120_000 });

const SEEDS = Array.from({ length: 16 }, (_, i) => 31 + i * 7331);
const PETS = ['pet-cat-tortie', 'pet-cow-jersey', 'pet-dog-pom', 'pet-frog-peeper'];
const ICONS = ['walk', 'book', 'water', 'yoga', 'broom', 'journal'];

function attempt(fn: () => void): void {
  try {
    fn();
  } catch (e) {
    if (!(e instanceof habits.HabitInputError)) throw e;
  }
}

/** One random action. Returns whether it was a stage-B-only action (it must not move the wallet, bar Grow). */
function step(g: Game, rng: Rng): 'wallet-neutral' | 'grow' | 'other' {
  const live = g.state.habits.filter((h) => h.archivedOn === undefined);
  const r = rng();
  if (live.length < 2 || r < 0.04) {
    const kind = randomInt(rng, 0, 3);
    const schedule = kind === 0 ? { kind: 'daily' as const } : kind === 1 ? { kind: 'days' as const, days: [1, 3, 5] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[] } : kind === 2 ? { kind: 'weekly' as const, times: randomInt(rng, 1, 4), every: 1 as const } : { kind: 'monthly' as const, times: 1, every: 1 as const };
    const anchor = live.length > 0 && chance(rng, 0.3) ? pick(rng, live).id : undefined;
    attempt(() =>
      g.addHabit({
        name: `H${g.state.habits.length}`,
        icon: pick(rng, ICONS),
        schedule,
        tiny: chance(rng, 0.5) ? { label: 'tiny' } : undefined,
        timeOfDay: pick(rng, ['morning', 'midday', 'evening', 'anytime'] as const),
        ...(anchor ? { anchorHabitId: anchor } : {}),
        ...(chance(rng, 0.1) ? { endsOn: addDays(g.today, randomInt(rng, 0, 60)) } : {}),
      }),
    );
    return 'other';
  }
  const h = pick(rng, live);
  const back = chance(rng, 0.75) ? 0 : randomInt(rng, 1, 9);
  const date = addDays(g.today, -back);
  if (r < 0.4) {
    // A live check-in at a random hour of today (or a backfill).
    if (back === 0) g.now = at(g.today, randomInt(rng, 4, 23), randomInt(rng, 0, 59));
    if (chance(rng, 0.15)) g.tiny(h.id, date);
    else g.checkIn(h.id, date);
    return 'other';
  }
  if (r < 0.48) {
    g.undo(h.id, date);
    return 'other';
  }
  if (r < 0.52) {
    g.run((tx) => logging.editHistory(tx, h.id, date, chance(rng, 0.6)));
    return 'other';
  }
  if (r < 0.58) {
    const pet = pick(rng, PETS);
    if (!g.state.pets[pet]) g.state = { ...g.state, pets: { ...g.state.pets, [pet]: newPetState(pet, g.rng, g.now, g.today, true) } };
    g.run((tx) => company.setCompanion(tx, h.id, chance(rng, 0.85) ? pet : null));
    return 'wallet-neutral';
  }
  if (r < 0.61) {
    const pet = pick(rng, Object.keys(g.state.pets).concat(PETS[0]!));
    if (g.state.pets[pet]) g.run((tx) => petPet(tx, pet)); // may earn a pin (its stamps are §6)
    return 'other';
  }
  if (r < 0.63) {
    const looks = g.state.plantLooks?.[h.id];
    if (looks) g.run((tx) => setPlantLook(tx, h.id, chance(rng, 0.3) ? null : randomInt(rng, 0, looks.looks.length)));
    g.run((tx) => answerTimeNudge(tx, h.id, chance(rng, 0.5)));
    return 'wallet-neutral';
  }
  if (r < 0.65) {
    g.run((tx) => company.readStory(tx, h.id, pick(rng, ['start', 'why', 'lookAtUs'] as StoryId[])));
    g.run((tx) => company.answerWhy(tx, h.id, chance(rng, 0.5) ? 'because' : null));
    return 'wallet-neutral';
  }
  if (r < 0.68) {
    const choice = pick(rng, ['keep', 'tinier', 'grow', 'rest', 'finish'] as FreshStartChoice[]);
    const inputs = [{ habitId: h.id, choice }];
    if (g.state.seasons?.pending && chance(rng, 0.5)) g.run((tx) => ({ r: resolveSeasonReview(tx, chance(rng, 0.3) ? 'skip' : inputs) }));
    else g.run((tx) => ({ r: applyFreshStart(tx, inputs) }));
    // Tinier is a rule edit "this period" and re-settles the window like any edit (§6), so it may move coins.
    return choice === 'grow' ? 'grow' : choice === 'tinier' ? 'other' : 'wallet-neutral';
  }
  if (r < 0.7) {
    const schedule = chance(rng, 0.5) ? { kind: 'daily' as const } : { kind: 'weekly' as const, times: randomInt(rng, 1, 5), every: 1 as const };
    attempt(() => g.run((tx) => habits.updateHabit(tx, h.id, { schedule, target: 1 }, pick(rng, ['today', 'next-period'] as const))));
    return 'other';
  }
  if (r < 0.72) {
    const other = pick(rng, live);
    attempt(() => g.run((tx) => habits.updateHabit(tx, h.id, { anchorHabitId: chance(rng, 0.7) ? other.id : undefined })));
    return 'other';
  }
  if (r < 0.735) {
    g.run((tx) => habits.archiveHabit(tx, h.id));
    return 'other';
  }
  if (r < 0.745) {
    const archived = g.state.habits.find((x) => x.archivedOn !== undefined);
    if (archived) g.run((tx) => habits.restoreHabit(tx, archived.id));
    return 'other';
  }
  if (r < 0.755) {
    g.run((tx) => habits.deleteHabit(tx, h.id));
    return 'other';
  }
  if (r < 0.93) {
    g.advance(randomInt(rng, 1, 2));
    return 'other';
  }
  g.advance(randomInt(rng, 5, 40)); // across seasons
  return 'other';
}

/** What the random play actually exercised, across seeds (checked at the end). */
const seen = new Map<string, number>();
const saw = (k: string, n = 1) => seen.set(k, (seen.get(k) ?? 0) + n);

describe('three pillars and rituals: invariants under random play', () => {
  it.each(SEEDS)('seed %i', (seed) => {
    const rng = mulberry32(seed);
    const g = new Game({ seed, start: addDays('2026-01-05', randomInt(rng, 0, 300)) });
    const xpOnce = new Set<string>();
    const xpByPetDay = new Map<string, number>();
    // A faithful habit with a companion from day one, so plants reach Blooming within the run.
    const faithful = g.addHabit({ name: 'Faithful', icon: pick(rng, ICONS), tiny: { label: 'tiny' } });
    g.state = { ...g.state, pets: { ...g.state.pets, [PETS[0]!]: newPetState(PETS[0]!, g.rng, g.now, g.today, true) } };
    g.run((tx) => company.setCompanion(tx, faithful, PETS[0]!));
    const hour = randomInt(rng, 6, 21);
    let prev: AppState = g.state;
    for (let i = 0; i < 280; i++) {
      const mark = g.events.length;
      const walletBefore = g.state.wallet;
      let kind: ReturnType<typeof step> = 'other';
      if (i < 60 && g.state.habits.some((h) => h.id === faithful && h.archivedOn === undefined)) {
        g.now = at(g.today, hour, randomInt(rng, 0, 59));
        if (chance(rng, 0.9)) g.checkIn(faithful);
        g.advance(1);
      } else kind = step(g, rng);
      const fresh: GameEvent[] = g.events.slice(mark);
      for (const e of fresh) saw(e.type);
      const s = g.state;
      const where = `seed ${seed} step ${i}`;

      const v = validateState(s);
      expect(v.ok ? [] : v.errors, where).toEqual([]);

      // Companion XP: once per occurrence, ≤ 30 per pet per action day.
      for (const e of fresh) {
        if (e.type !== 'companionXp') continue;
        expect(e.xp, where).toBeGreaterThan(0);
        const key = `${e.habitId}|${e.date}`;
        expect(xpOnce.has(key), `${where} XP twice for ${key}`).toBe(false);
        xpOnce.add(key);
        const dayKey = `${e.petId}|${g.today}`;
        xpByPetDay.set(dayKey, (xpByPetDay.get(dayKey) ?? 0) + e.xp);
        expect(xpByPetDay.get(dayKey)!, where).toBeLessThanOrEqual(30);
      }

      // Companion sunshine never exceeds the habit's sunshine.
      const byHabit = new Map<string, number>();
      for (const p of Object.values(s.company?.pairs ?? {})) {
        expect(p.sunshine, where).toBeGreaterThanOrEqual(0);
        expect(p.waterings, where).toBeGreaterThanOrEqual(0);
        byHabit.set(p.habitId, (byHabit.get(p.habitId) ?? 0) + p.sunshine);
      }
      for (const [hid, sun] of byHabit) expect(sun, `${where} ${hid}`).toBeLessThanOrEqual((s.ledger.sunshine[hid] ?? 0) + 1e-6);

      // Stories: only added, in order, at most one per step for a pair.
      for (const [k, p] of Object.entries(s.company?.pairs ?? {})) {
        const before = prev.company?.pairs[k];
        const now = Object.keys(p.stories ?? {});
        const was = Object.keys(before?.stories ?? {});
        for (const id of was) expect(now, `${where} ${k}`).toContain(id);
        expect(now.length - was.length, `${where} ${k}`).toBeLessThanOrEqual(1);
        const order = ['start', 'why', 'lookAtUs'];
        expect(now.map((id) => order.indexOf(id)).sort(), `${where} ${k}`).toEqual(order.slice(0, now.length).map((_, j) => j));
      }

      // Looks only ever added; the shown look is a real one.
      for (const [hid, pl] of Object.entries(s.plantLooks ?? {})) {
        const before: PlantLook[] = prev.plantLooks?.[hid]?.looks ?? [];
        expect(pl.looks.slice(0, before.length), `${where} ${hid}`).toEqual(before);
        expect(pl.shown === null || (pl.shown >= 0 && pl.shown < pl.looks.length), where).toBe(true);
      }

      // Keepsakes: never removed, once per plant per stage.
      const ks = s.keepsakes ?? [];
      for (const k of prev.keepsakes ?? []) expect(ks.find((x) => x.id === k.id), where).toBeDefined();
      expect(new Set(ks.map((k) => `${k.habitId}|${k.stage}`)).size, where).toBe(ks.length);
      for (const k of ks) expect(KEEPSAKE_STAGES, where).toContain(k.stage);

      // Season review: idempotent; filed only grows.
      const again = transact(s, g.env(), (tx) => {
        openDay(tx);
        return {};
      });
      expect(again.state.seasons, where).toBe(s.seasons);
      expect(again.state.keepsakes, where).toBe(s.keepsakes);
      expect(again.state.plantLooks, where).toBe(s.plantLooks);
      const filed = (s.seasons?.filed ?? []).map((r) => r.key);
      expect(new Set(filed).size, where).toBe(filed.length);
      for (const r of prev.seasons?.filed ?? []) expect(filed, where).toContain(r.key);

      // Rituals pay per §6 only, upward differences only.
      for (const l of s.inbox) {
        if (l.kind === 'anniversary') {
          expect(l.stars, where).toBe(0);
          continue;
        }
        const key = l.kind === 'weekly' ? `weekly|${l.weekStart}` : `bloom|${l.month}`;
        const paid = s.ledger.once[key];
        if (paid !== undefined) expect(l.stars, `${where} ${l.id}`).toBe(paid);
        const before = prev.inbox.find((x) => x.id === l.id);
        if (before) expect(l.stars, `${where} ${l.id}`).toBeGreaterThanOrEqual(before.stars);
      }
      if (kind === 'wallet-neutral') expect(s.wallet, where).toEqual(walletBefore);
      if (kind === 'grow') {
        expect(s.wallet.coins, where).toBe(walletBefore.coins);
        expect(s.wallet.stars - walletBefore.stars, where).toBeLessThanOrEqual(1);
      }
      prev = s;
    }
    saw('filed', s0(g.state.seasons?.filed.length));
    saw('looks', Object.values(g.state.plantLooks ?? {}).reduce((n, pl) => n + pl.looks.length, 0));
  });

  it('exercised every feature across the seeds', () => {
    for (const k of ['companion', 'companionXp', 'story', 'keepsake', 'look', 'seasonReview', 'retired', 'petLevel', 'letter', 'filed', 'looks']) {
      expect(seen.get(k) ?? 0, k).toBeGreaterThan(0);
    }
  });
});

const s0 = (n: number | undefined): number => n ?? 0;
