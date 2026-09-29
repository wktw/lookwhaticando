import { describe, expect, it } from 'vitest';
import type { AppState } from '@/state/types';
import { validateState } from '@/state/validate';
import * as gacha from '@/domain/gacha';
import { Game } from '../domain/game';

function sample(): AppState {
  const g = new Game({ start: '2026-03-02' });
  g.run((tx) => (gacha.pull(tx, 'cats', { free: true }), gacha.finishReveal(tx)));
  const a = g.addHabit();
  g.addHabit({ name: 'Yoga', schedule: { kind: 'weekly', times: 2, every: 1 } });
  g.checkIn(a);
  g.freeze = false;
  return structuredClone(g.state);
}

type Mutator = (s: AppState & Record<string, unknown>) => void;
/** The sample's one pet (from the "Cats or Cows?" capsule). */
const pet = (s: AppState) => Object.values(s.pets)[0]!;

const CORRUPTIONS: [string, string, Mutator][] = [
  ['wrong version', 'version', (s) => (s.version = 7)],
  ['negative coins', 'wallet.coins', (s) => (s.wallet.coins = -1)],
  ['fractional stars', 'wallet.stars', (s) => (s.wallet.stars = 1.5)],
  ['unfused stardust', 'wallet.stardust', (s) => (s.wallet.stardust = 12)],
  ['NaN check-ins', 'lifetime.checkins', (s) => (s.lifetime.checkins = Number.NaN)],
  ['habits not a list', 'habits', (s) => ((s as Record<string, unknown>).habits = {})],
  ['habit without rules', 'habits[0].rules', (s) => (s.habits[0]!.rules = [])],
  ['rule with a bad date', 'habits[0].rules[0].from', (s) => (s.habits[0]!.rules[0]!.from = '2026-02-30')],
  ['first rule not on startedOn', 'habits[0].rules[0]', (s) => (s.habits[0]!.startedOn = '2026-03-01')],
  ['rules out of order', 'habits[0].rules[1]', (s) => s.habits[0]!.rules.push({ ...s.habits[0]!.rules[0]! })],
  ['unknown schedule kind', 'habits[0].rules[0].schedule.kind', (s) => ((s.habits[0]!.rules[0]!.schedule as { kind: string }).kind = 'hourly')],
  ['duplicate habit ids', 'habits[1].id', (s) => (s.habits[1]!.id = s.habits[0]!.id)],
  ['archived before started', 'habits[0].archivedOn', (s) => (s.habits[0]!.archivedOn = '2026-01-01')],
  ['id with a pipe', 'habits[0].id', (s) => (s.habits[0]!.id = 'a|b')],
  ['bad pause', 'habits[0].pauses[0]', (s) => (s.habits[0]!.pauses = [{ start: '2026-03-05', end: '2026-03-01' }])],
  ['logs for an unknown habit', 'logs.ghost', (s) => (s.logs['ghost'] = {})],
  ['log with a bad date key', 'logs', (s) => (s.logs[s.habits[0]!.id]!['yesterday'] = { kind: 'log', count: 1 })],
  ['log with a negative count', '.count', (s) => (s.logs[s.habits[0]!.id]!['2026-03-02'] = { kind: 'log', count: -2 })],
  ['rest with a count', 'a rest day cannot carry a count', (s) => (s.logs[s.habits[0]!.id]!['2026-03-02'] = { kind: 'rest', count: 1 } as never)],
  ['ledger key without a date', 'ledger.recent', (s) => (s.ledger.recent['nodate'] = { coins: 1, sunshine: 1 })],
  ['ledger entry with a bad level', 'ledger.recent', (s) => (Object.values(s.ledger.recent)[0]!.lvl = 'huge' as never)],
  ['stage out of range', 'ledger.bestStage', (s) => (s.ledger.bestStage['x'] = 9)],
  ['once value not a number', 'ledger.once', (s) => (s.ledger.once['x'] = 'yes' as never)],
  ['pet key mismatch', '.id', (s) => (pet(s).id = 'pet-somebody-else')],
  ['unknown personality', '.personality', (s) => (pet(s).personality = 'grumpy' as never)],
  ['bad daily counters', '.daily', (s) => (pet(s).daily = { date: '2026-03-02', pets: 1, treats: -1 })],
  ['a shelf without the Sill', 'shelf.places', (s) => (s.shelf.places = ['pond'])],
  ['an unknown place', 'shelf.places', (s) => (s.shelf.places = ['sill', 'meadow' as never])],
  ['a place twice', 'shelf.places', (s) => (s.shelf.places = ['sill', 'pond', 'pond'])],
  ['decor off the map', 'shelf.decor[0]', (s) => (s.shelf.decor = [{ id: 'd1', itemId: 'decor-x', place: 'sill', x: 2, y: 0 }])],
  ['decor in an unknown place', 'shelf.decor[0]', (s) => (s.shelf.decor = [{ id: 'd1', itemId: 'decor-x', place: 'meadow' as never, x: 0, y: 0 }])],
  ['the Mochi-era meadow instead of the shelf', 'shelf', (s) => ((s as Record<string, unknown>).shelf = undefined)],
  ['a bad found thing', 'found[0]', (s) => (s.found = [{ date: 'today', petId: 'pet-cat-orange', seed: 1 }])],
  ['pity for an unknown machine', 'pity', (s) => ((s.pity as Record<string, unknown>)['arcade'] = { sinceRare: 0, sinceUltra: 0, dupStreak: 0, pulls: 0 })],
  ['day start out of range', 'settings.dayStartsAt', (s) => (s.settings.dayStartsAt = 999)],
  ['reminder not HH:MM', 'settings.reminders', (s) => (s.settings.reminders = { morning: '7am' })],
  ['bad clock', 'clock.maxDateKey', (s) => (s.clock.maxDateKey = 'soon')],
  ['bad letter', 'inbox[0]', (s) => s.inbox.push({ kind: 'weekly', id: 'w', weekStart: 'x' } as never)],
  ['bad pending reveal', 'pendingReveal', (s) => (s.pendingReveal = { machineId: 'cats' } as never)],
  ['missing section', 'ledger', (s) => delete (s as Record<string, unknown>).ledger],
];

describe('validateState', () => {
  it('accepts fresh, onboarded and played saves', () => {
    expect(validateState(new Game({ onboard: false }).state)).toMatchObject({ ok: true });
    expect(validateState(sample())).toMatchObject({ ok: true });
  });

  it.each(CORRUPTIONS)('rejects %s (reported at %s)', (_name, path, mutate) => {
    const s = sample() as AppState & Record<string, unknown>;
    mutate(s);
    const v = validateState(s);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.errors.join('\n')).toContain(path);
  });

  it('rejects non-objects', () => {
    expect(validateState(null)).toEqual({ ok: false, errors: ['state: not an object'] });
    expect(validateState('save')).toMatchObject({ ok: false });
  });

  it('allows unknown collectible ids (a newer catalog) but not malformed entries', () => {
    const s = sample();
    s.collection['pet-from-the-future'] = { count: 1, firstAt: 0 };
    expect(validateState(s).ok).toBe(true);
    s.collection['pet-broken'] = { count: 0, firstAt: 0 };
    expect(validateState(s).ok).toBe(false);
  });
});
