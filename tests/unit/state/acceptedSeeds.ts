/** Shared accepted-state seeds and adversarial edits for model and DOM consumers (WP-04). */
import { readFileSync, readdirSync } from 'node:fs';
import { URL as FileURL } from 'node:url';
import { addDays } from '@/domain/dates';
import type { Rng } from '@/domain/rng';
import { decodeState } from '@/state/decode';
import { createInitialState } from '@/state/defaults';
import { buildDemo } from '@/state/demo';
import type { AppState } from '@/state/types';
import { UTC, at } from '../domain/game';

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
type Obj = { [k: string]: Json };
const TODAY = '2026-09-29';
const NOW = at(TODAY, 21, 45);

/** Real old exports plus explicit current-feature seeds; each caller owns its fresh states. */
export function acceptedSeeds(): Array<{ label: string; state: AppState }> {
  const corpus = new FileURL('../../fixtures/saves/', import.meta.url);
  const seeds: Array<{ label: string; state: AppState }> = [];
  for (const build of readdirSync(corpus).filter((d) => /^[0-9a-f]{7}$/.test(d)).sort()) {
    for (const file of readdirSync(new FileURL(`${build}/`, corpus)).filter((f) => f.endsWith('.json')).sort()) {
      const parsed = JSON.parse(readFileSync(new FileURL(`${build}/${file}`, corpus), 'utf8')) as Obj;
      const decoded = decodeState(parsed.state, 'import', { declaredVersion: parsed.v });
      if (decoded.kind !== 'ok') throw new Error(`corpus ${build}/${file}: ${decoded.kind}`);
      seeds.push({ label: `${build}/${file}`, state: decoded.state });
    }
  }
  const demo = buildDemo({ today: TODAY, now: NOW, local: UTC, days: 60 });
  seeds.push({ label: 'demo', state: demo }, { label: 'fresh', state: createInitialState(NOW) });
  const modern = structuredClone(demo);
  const habit = modern.habits[0]!, anchor = modern.habits[1]!;
  const from = habit.startedOn;
  for (const h of modern.habits) delete h.anchorHabitId;
  habit.anchorHabitId = anchor.id;
  habit.rules = [
    { from, gridFrom: from, schedule: { kind: 'weekly', every: 2, times: 2 }, target: 1, step: 1 },
    { from: addDays(from, 7), cutInactive: 2, schedule: { kind: 'daily' }, target: 1, step: 1 },
  ];
  const log = Object.values(modern.logs[habit.id]!).find((l) => l.kind === 'log')!;
  if (log.kind === 'log') log.beforeAnchor = anchor.id;
  const pet = Object.values(modern.pets)[0]!;
  pet.favoriteKnown = true;
  pet.favoriteKnownOn = addDays(from, 1);
  pet.arrivedOn = from;
  modern.profile.createdOn = from;
  modern.profile.onboardingStep = { step: 'place', habitIds: [habit.id], petId: pet.id };
  modern.company!.pairs[`${pet.id}|${habit.id}`] = {
    petId: pet.id, habitId: habit.id, since: from, sunshine: 0, waterings: 0,
    stints: [{ from, to: addDays(from, 2) }, { from: addDays(from, 4) }],
  };
  seeds.push({ label: 'modern-history', state: modern });
  const unstarted = structuredClone(modern);
  unstarted.habits[2]!.archivedOn = unstarted.habits[2]!.startedOn;
  unstarted.habits[2]!.unstarted = true;
  seeds.push({ label: 'unstarted', state: unstarted });
  return seeds;
}

const STRINGS: Json[] = [
  '',
  '__proto__',
  'constructor',
  'toString',
  'prototype',
  'hasOwnProperty',
  'zzz-from-a-later-catalogue',
  'h-unknown1',
  '2026-99-01',
  '2026-13',
  '2026-02-29',
  '2024-02-29',
  '2026-09-30',
  '2027-01-01',
  '1000-01-01',
  '1899-12-31',
  '1900-01-01',
  '2999-12-31',
  '9999-12-31',
  '12-31',
  '02-30',
  '07:30',
  '25:00',
  'a'.repeat(20_000),
  'teatime',
  'morning',
  'evening',
  'weekly',
  'monthly',
  'anniversary',
  'companion',
  'found',
  'stageUp',
  'kept',
  'log',
  'rest',
  'tiny',
  'over',
  'sill',
  'pond',
  'cats',
  'daily',
  'days',
  'pot',
  'place',
  'dawn',
  'bloom',
];
const NUMBERS: Json[] = [-1, 0, 1, 2, 3, 7, 8, 9, 10, 24, 25, 0.5, 1.5, 99, 360, 361, 1439, 1440, 1e6, 1e6 + 1, 1e20, 1e300, 2 ** 53, 2 ** 60, -1e20, Date.UTC(2999, 11, 31), Date.UTC(3000, 0, 2)];
const OTHERS: Json[] = [true, false, null, {}, [], [1], ['x'], [{}], { kind: 'x' }, { date: '2026-09-29' }];

const pick = <T>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length)]!;

/** Every (container, key) in a JSON tree. */
function slots(root: Json): [Obj | Json[], string | number][] {
  const out: [Obj | Json[], string | number][] = [];
  const walk = (v: Json): void => {
    if (Array.isArray(v)) {
      v.forEach((x, i) => {
        out.push([v, i]);
        walk(x);
      });
    } else if (v !== null && typeof v === 'object') {
      for (const k of Object.keys(v)) {
        out.push([v, k]);
        walk(v[k]!);
      }
    }
  };
  walk(root);
  return out;
}

const setOwn = (o: Obj | Json[], k: string | number, v: Json): void => void Object.defineProperty(o, k, { value: v, writable: true, enumerable: true, configurable: true });

/** One adversarial edit, in place. */
function edit(state: Json, rng: Rng): string {
  const all = slots(state);
  const [box, key] = pick(rng, all);
  const roll = rng();
  if (roll < 0.1 && !Array.isArray(box)) {
    delete box[key as string];
    return `delete ${String(key)}`;
  }
  if (roll < 0.17) {
    // A new key beside it: a reserved name or an unknown one, as an own property (as JSON.parse makes it).
    let container: Obj | null = null;
    if (!Array.isArray(box)) container = box;
    else {
      const v = box[key as number];
      if (v !== null && v !== undefined && typeof v === 'object' && !Array.isArray(v)) container = v;
    }
    if (container) {
      const k = pick(rng, ['__proto__', 'constructor', 'toString', 'valueOf', 'zzz', '2026-09-30', 'h-new|2026-09-29']);
      const value = structuredClone(Object.values(container)[0] ?? 1) as Json;
      setOwn(container, k, value);
      return `add ${k}`;
    }
  }
  let value: Json;
  const kind = rng();
  if (kind < 0.35) value = pick(rng, STRINGS);
  else if (kind < 0.7) value = pick(rng, NUMBERS);
  else if (kind < 0.8) value = pick(rng, OTHERS);
  else {
    // Another part of the same save: realistic values in the wrong place.
    const [b2, k2] = pick(rng, all);
    value = structuredClone((b2 as Obj)[k2 as string] ?? null) as Json;
  }
  if (Array.isArray(box) && rng() < 0.2) box.push(value);
  else setOwn(box, key, value);
  return `set ${String(key)} = ${JSON.stringify(value)?.slice(0, 40)}`;
}


/** A JSON-shaped candidate and a compact trace; decode it before treating it as AppState. */
export function adversarialCase(seed: AppState, rng: Rng): { state: unknown; edits: string[] } {
  const state = structuredClone(seed) as unknown as Json;
  const roll = rng();
  const count = roll < 0.5 ? 1 : roll < 0.8 ? 2 : 3;
  const edits = Array.from({ length: count }, () => edit(state, rng));
  return { state, edits };
}
