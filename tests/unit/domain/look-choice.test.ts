import { describe, expect, it } from 'vitest';
import { addDays } from '@/domain/dates';
import { compactSave } from '@/domain/rollover';
import * as signature from '@/domain/signature';
import { gardenJournal } from '@/domain/journal';
import { habitDetailVM } from '@/state/views/habit';
import { lookArtOf } from '@/state/views/plantPresentation';
import { validateState } from '@/state/validate';
import { encodeEnvelope, parseEnvelope } from '@/state/persist';
import { Game, at } from './game';

const view = (g: Game, id: string) => habitDetailVM(g.state, { today: g.today, now: g.now, local: g.local }, id)!;
function monthly(months = 24) {
  const g = new Game({ start: '2024-01-01' });
  const id = g.addHabit({ schedule: { kind: 'monthly', times: 1, every: 1 }, plant: 'begonia' });
  for (let i = 0; i < months; i++) {
    g.goTo(`${2024 + Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, '0')}-01`, 7);
    g.checkIn(id);
  }
  return { g, id };
}

describe('a deliberate alternative to an uncertain time read', () => {
  it('offers a faithful two-year monthly gardener a colour after real timestamp compaction', () => {
    const { g, id } = monthly();
    g.run((tx) => compactSave(tx));
    expect(g.state.logs[id]!['2024-01-01']).not.toHaveProperty('done');
    expect(signature.eligibleTimes(g.state, g.state.habits[0]!, g.today, g.local).length).toBeLessThan(10);
    expect(view(g, id).looks.choice).toBe(true);
    const before = structuredClone(g.state);
    expect(g.run((tx) => signature.confirmPlantLook(tx, id, 'twilight'))).toBe(true);
    expect(g.state.plantLooks![id]).toMatchObject({ looks: [], shown: null, chosen: true, confirmed: { colour: 'twilight', shape: 'classic', on: g.today, shown: true } });
    expect(lookArtOf(g.state, id)).toEqual({ colour: 'twilight', shape: 'classic' });
    expect(g.state.plantLooks![id]!.confirmed).not.toHaveProperty('evidence');
    expect(g.state.logs).toEqual(before.logs);
    expect(g.state.wallet).toEqual(before.wallet);
    expect(signature.timeNudge(g.state, g.state.habits[0]!, g.today, g.local)).toBeNull();
    const journal = gardenJournal(g.state, g.state.habits[0]!, { today: g.today, local: g.local, weekStart: 1, checkinsToBlooming: null });
    expect(journal.some((j) => j.kind === 'usualTime' && j.inked)).toBe(false);
    expect(journal.some((j) => j.kind === 'whyItLooks' && j.inked)).toBe(false);
    const decoded = parseEnvelope(encodeEnvelope(g.state, 3, g.now, 'test'));
    expect(decoded.kind).toBe('ok');
    if (decoded.kind === 'ok') expect(lookArtOf(decoded.state, id)).toEqual(lookArtOf(g.state, id));
  });

  it('waits for ten scheduled occurrences, not ten arbitrary logs in one monthly period', () => {
    const { g, id } = monthly(9);
    expect(view(g, id).looks.waiting).not.toBeNull();
    expect(view(g, id).looks.choice).toBe(false);
    g.goTo('2024-09-14');
    for (let day = 2; day < 14; day++) g.checkIn(id, `2024-09-${String(day).padStart(2, '0')}`);
    expect(view(g, id).looks.choice).toBe(false);
    expect(g.run((tx) => signature.confirmPlantLook(tx, id, 'dawn'))).toBe(false);
    g.goTo('2024-10-01'); g.checkIn(id);
    expect(view(g, id).looks.choice).toBe(true);
  });

  it.each([0, 180, 360])('offers the 00:30 night gardener a choice with day start %i without inferring a time', (dayStartsAt) => {
    const g = new Game({ start: '2026-01-01' });
    g.state = { ...g.state, settings: { ...g.state.settings, dayStartsAt } };
    const id = g.addHabit();
    for (let i = 1; i <= 50; i++) { g.goTo(addDays('2026-01-01', i), 0, 30); g.checkIn(id); }
    expect(signature.eligibleTimes(g.state, g.state.habits[0]!, g.today, g.local)).toEqual([]);
    expect(view(g, id).looks.choice).toBe(true);
  });

  it('offers a three-habit two-minute routine while keeping the burst filter and genuine Paired shape', () => {
    const g = new Game({ start: '2026-01-01' });
    const a = g.addHabit({ name: 'Walk' });
    const b = g.addHabit({ name: 'Read', anchorHabitId: a });
    const c = g.addHabit({ name: 'Stretch' });
    for (let i = 0; i < 50; i++) {
      g.goTo(addDays('2026-01-01', i), 7);
      g.checkIn(a); g.now += 60_000; g.checkIn(b); g.now += 59_000; g.checkIn(c);
    }
    for (const id of [a, b, c]) expect(view(g, id).looks.choice).toBe(true);
    expect(signature.eligibleTimes(g.state, g.state.habits[1]!, g.today, g.local)).toEqual([]);
    expect(g.run((tx) => signature.confirmPlantLook(tx, b, 'wildflower'))).toBe(true);
    expect(g.state.plantLooks![b]!.confirmed).toMatchObject({ shape: 'paired', partnerId: a });
    const earned = lookArtOf(g.state, b);
    g.state = { ...g.state, habits: g.state.habits.map((h) => h.id === b ? { ...h, anchorHabitId: c } : h) };
    expect(lookArtOf(g.state, b)).toEqual(earned);
    g.state = { ...g.state, habits: g.state.habits.filter((h) => h.id !== a) };
    expect(lookArtOf(g.state, b)).toEqual({ colour: 'wildflower', shape: 'paired' });
  });

  it('keeps confirmed, earned and Classic choices through rereads and reload, without changing old evidence', () => {
    const { g, id } = monthly();
    g.run((tx) => signature.confirmPlantLook(tx, id, 'twilight'));
    for (let i = 1; i <= 10; i++) { g.now = at(addDays(g.today, 1), 7); g.checkIn(id); }
    expect(g.state.plantLooks![id]!.looks[0]).toMatchObject({ colour: 'dawn', evidence: { eligibleDays: 10 } });
    expect(lookArtOf(g.state, id)).toMatchObject({ colour: 'twilight' });
    g.run((tx) => signature.setPlantLook(tx, id, null));
    expect(lookArtOf(g.state, id)).toBeUndefined();
    g.run((tx) => signature.setPlantLook(tx, id, 'confirmed'));
    expect(lookArtOf(g.state, id)).toMatchObject({ colour: 'twilight' });
    g.run((tx) => signature.setPlantLook(tx, id, 0));
    expect(lookArtOf(g.state, id)).toMatchObject({ colour: 'dawn' });
    g.run((tx) => signature.setPlantLook(tx, id, null));
    g.advance(); g.checkIn(id);
    expect(lookArtOf(g.state, id)).toBeUndefined();
    expect(validateState(g.state).ok).toBe(true);
  });

  it.each([{ colour: 'moonlight' }, { shape: 'giant' }, { on: 'never' }, { shown: 'yes' }, { partnerId: 7 }])('rejects malformed explicit provenance %j', (bad) => {
    const { g, id } = monthly(9);
    g.goTo('2024-10-01');
    g.state = { ...g.state, plantLooks: { [id]: { looks: [], shown: null, reads: {}, chosen: true, confirmed: { colour: 'dawn', shape: 'classic', on: g.today, shown: true, ...bad } } } } as typeof g.state;
    expect(validateState(g.state).ok).toBe(false);
  });

  it('does not count pauses, days off or an empty future lifetime as completed occurrences', () => {
    const { g, id } = monthly(9);
    g.goTo('2024-10-01');
    const habit = g.state.habits[0]!;
    const altered = [
      { ...g.state, habits: [{ ...habit, pauses: [{ start: '2024-10-01', end: '2024-10-31' }] }] },
      { ...g.state, offDays: { '2024-10-01': true as const } },
      { ...g.state, habits: [{ ...habit, archivedOn: habit.startedOn, unstarted: true as const }] },
    ];
    for (const state of altered) expect(signature.lookChoiceOffer(state, state.habits[0]!, g.today)).toBe(false);
    expect(signature.lookChoiceOffer(g.state, habit, g.today)).toBe(false);
    expect(g.run((tx) => signature.confirmPlantLook(tx, id, 'moonlight' as never))).toBe(false);
  });

  it('keeps a confirmed option and the later choice of Classic through both natural Blooming and Evergreen reads', () => {
    const g = new Game({ start: '2026-01-01' });
    const id = g.addHabit({ plant: 'begonia' });
    for (let i = 0; i < 50; i++) { g.goTo(addDays('2026-01-01', i), 23, 30); g.checkIn(id); }
    expect(g.run((tx) => signature.confirmPlantLook(tx, id, 'twilight'))).toBe(true);
    for (let i = 50; i < 61; i++) { g.goTo(addDays('2026-01-01', i), 7); g.checkIn(id); }
    const bloom = structuredClone(g.state.plantLooks![id]!.looks[0]);
    expect(bloom).toMatchObject({ colour: 'dawn', read: 'bloom' });
    expect(lookArtOf(g.state, id)).toMatchObject({ colour: 'twilight' });
    g.run((tx) => signature.setPlantLook(tx, id, null));
    for (let i = 61; i < 185; i++) { g.goTo(addDays('2026-01-01', i), 19); g.checkIn(id); }
    expect(g.state.plantLooks![id]!.reads.evergreen).toBeDefined();
    expect(g.state.plantLooks![id]!.looks[0]).toEqual(bloom);
    expect(g.state.plantLooks![id]!.confirmed).toMatchObject({ colour: 'twilight', shown: false });
    expect(lookArtOf(g.state, id)).toBeUndefined();
  });
});
