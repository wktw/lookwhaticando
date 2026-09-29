/**
 * Stage B in the state layer: validation of every new (optional) field, the store actions the
 * screens call, the view models they read, and a backup round trip.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppState } from '@/state/types';
import type { GameEvent } from '@/state/api';
import { validateState } from '@/state/validate';
import { onGameEvent } from '@/state/events';
import { makeBackup, parseBackupText } from '@/state/handoff';
import { migrate } from '@/state/migrate';
import * as store from '@/state/store';
import * as company from '@/domain/company';
import { addDays } from '@/domain/dates';
import { newPetState } from '@/domain/friendship';
import * as logging from '@/domain/logging';
import { habitDetailVM, memoryShelfVM, petVM, petsVM, shelfVM, todayVM, tuneVM, type ViewEnv } from '@/state/selectors';
import { Game, UTC, at } from '../domain/game';
import { fakeBrowser } from './fixtures';

vi.setConfig({ testTimeout: 30_000 });

const envOf = (g: Game): ViewEnv => ({ today: g.today, now: g.now, local: UTC });
const CAT = 'pet-cat-tortie';
const COW = 'pet-cow-jersey';

/** A played save with a companion, a keepsake, stacking, a look, a story and a starred note. */
function played(): { g: Game; read: string; walk: string } {
  const g = new Game({ start: '2026-01-05' });
  const walk = g.addHabit({ name: 'Walk', icon: 'walk' });
  const read = g.addHabit({ name: 'Read', icon: 'book', anchorHabitId: walk, why: 'Calmer evenings.' });
  g.state = { ...g.state, pets: { [CAT]: newPetState(CAT, g.rng, g.now, g.today, true), [COW]: newPetState(COW, g.rng, g.now, g.today, true) } };
  g.run((tx) => company.setCompanion(tx, read, CAT));
  let day = g.today;
  for (let i = 0; i < 45; i++, day = addDays(day, 1)) {
    g.goTo(day, 8, 0);
    g.checkIn(walk);
    g.goTo(day, 8, 30);
    g.checkIn(read);
    if (i === 40) g.run((tx) => (logging.setNote(tx, read, day, 'Slow chapter'), logging.starNote(tx, read, day, true)));
  }
  return { g, read, walk };
}

describe('validation of the stage B fields', () => {
  const base = () => {
    const { g, read } = played();
    g.freeze = false;
    return { s: structuredClone(g.state) as AppState & Record<string, unknown>, read };
  };
  const errors = (s: unknown) => {
    const v = validateState(s);
    return v.ok ? [] : v.errors.join('\n');
  };

  it('accepts a played save with every stage B field', () => {
    const { s } = base();
    expect(s.company && s.keepsakes && s.plantLooks && s.stageDates).toBeTruthy();
    expect(errors(s)).toEqual([]);
  });

  it.each<[string, string, (s: AppState, read: string) => void]>([
    ['a companion that is not a pet', 'companionId', (s, read) => (s.habits.find((h) => h.id === read)!.companionId = 'pet-ghost')],
    ['one pet keeping two habits', 'a pet keeps one habit company', (s, read) => (s.habits.find((h) => h.id !== read)!.companionId = CAT)],
    ['a companion without its pairing record', 'no pairing record', (s, read) => (s.habits.find((h) => h.id === read)!.companionId = COW)],
    ['an archived habit with a companion', 'archived habit has no companion', (s, read) => (s.habits.find((h) => h.id === read)!.archivedOn = '2026-02-01')],
    ['an anchor that is not a habit', 'anchorHabitId', (s, read) => (s.habits.find((h) => h.id === read)!.anchorHabitId = 'h-ghost')],
    ['a why too long', '.why', (s, read) => (s.habits.find((h) => h.id === read)!.why = 'x'.repeat(141))],
    ['a ribbon on a live habit', '.ribbon', (s, read) => (s.habits.find((h) => h.id === read)!.ribbon = '2026-02-01')],
    ['endsOn before it started', '.endsOn', (s, read) => (s.habits.find((h) => h.id === read)!.endsOn = '2025-01-01')],
    ['a star without a note', '.starred', (s, read) => (s.logs[read]!['2026-01-06'] = { kind: 'log', count: 1, starred: true })],
    ['a pairing under the wrong key', 'company.pairs', (s) => (s.company!.pairs['x|y'] = Object.values(s.company!.pairs)[0]!)],
    ['a bad offer', 'company.offer', (s) => (s.company!.offer = { declines: -1 })],
    ['an unknown story', '.stories', (s) => ((Object.values(s.company!.pairs)[0]!.stories as Record<string, unknown>)['epilogue'] = { on: '2026-01-06' })],
    ['a companion share over the day’s sunshine', 'ledger.recent', (s) => {
      const e = Object.values(s.ledger.recent).find((x) => x.co)!;
      e.co = { ...e.co!, sun: e.sunshine + 1 };
    }],
    ['a keepsake id that is not its plant and stage', 'keepsakes[0]', (s) => (s.keepsakes![0] = { ...s.keepsakes![0]!, id: 'k-other-9' })],
    ['a keepsake at a stage without keepsakes', 'keepsakes[0]', (s) => (s.keepsakes![0] = { ...s.keepsakes![0]!, stage: 2, id: `k-${s.keepsakes![0]!.habitId}-2` })],
    ['a shown look that does not exist', '.shown', (s, read) => (s.plantLooks![read]!.shown = 3)],
    ['an unknown colour', '.looks[0]', (s, read) => ((s.plantLooks![read]!.looks[0] as { colour: string }).colour = 'neon')],
    ['a stage day that is not a date', 'stageDates', (s, read) => (s.stageDates![read]![1] = 'soon')],
    ['a season filed twice', 'filed twice', (s) => {
      const r = { key: '2026-03-01', name: 'spring' as const, start: '2026-03-01', end: '2026-05-31', hemisphere: 'north' as const, plants: [], waterings: 0 };
      s.seasons = { filed: [r, r] };
    }],
    ['a season that does not start on its key', 'seasons.pending', (s) => (s.seasons = { filed: [], pending: { key: '2026-03-02', name: 'spring', start: '2026-03-01', end: '2026-05-31', hemisphere: 'north', plants: [], waterings: 0 } })],
    ['an unknown hemisphere', 'settings.hemisphere', (s) => (s.settings.hemisphere = 'east' as never)],
    ['a setting that is not a boolean', 'settings.showCompanions', (s) => (s.settings.showCompanions = 'yes' as never)],
    ['a bad anniversary note', 'inbox', (s) => s.inbox.push({ kind: 'anniversary', id: 'a', date: '2027-01-05', years: 0, waterings: 1, stars: 0 })],
  ])('rejects %s (reported at %s)', (_name, path, mutate) => {
    const { s, read } = base();
    mutate(s, read);
    expect(errors(s)).toContain(path);
  });

  it('old saves without any stage B field stay valid, and migration fills the new settings', () => {
    const { s } = base();
    for (const k of ['company', 'keepsakes', 'plantLooks', 'stageDates', 'seasons'] as const) delete s[k];
    for (const h of s.habits) {
      delete h.companionId;
      delete h.anchorHabitId;
      delete h.why;
    }
    for (const e of Object.values(s.ledger.recent)) delete e.co;
    const settings = s.settings as unknown as Record<string, unknown>;
    for (const k of ['showCompanions', 'compactToday', 'quoteNotes']) delete settings[k];
    expect(errors(s)).toEqual([]);
    const m = migrate(JSON.parse(JSON.stringify(s)));
    expect(m.ok && (m.state.settings as Record<string, unknown>)).toMatchObject({ showCompanions: true, compactToday: false, quoteNotes: true });
  });

  it('a backup carries every stage B field', async () => {
    const { s } = base();
    const parsed = await parseBackupText(JSON.stringify(makeBackup(s, { now: at('2026-02-20'), appVersion: 't', device: 'd' })));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) for (const k of ['company', 'keepsakes', 'plantLooks', 'stageDates'] as const) expect(parsed.state[k]).toEqual(s[k]);
  });
});

describe('view models', () => {
  it('Today: the companion lives in its pot, the others are nearest; damp soil, routine, look, the stack order', () => {
    const { g, read, walk } = played();
    const vm = todayVM(g.state, envOf(g));
    const readCard = vm.blocks.flatMap((b) => b.cards).find((c) => c.id === read)!;
    expect(readCard).toMatchObject({ damp: true, after: { habitId: walk, name: 'Walk' }, companion: { petId: CAT, routine: { petId: CAT, routine: 'read', phase: 'settled' } } });
    expect(readCard.look).toEqual({ colour: 'dawn', shape: 'paired' });
    expect(vm.sill.map((p) => [p.habitId, p.resident])).toEqual([
      [walk, { petId: COW, companion: false }],
      [read, { petId: CAT, companion: true }],
    ]);
    expect(vm.sill[1]).toMatchObject({ damp: true, routine: { routine: 'read' }, bow: false });
    expect(vm.showCompanions).toBe(true);
    expect(vm.season).toEqual({ name: 'winter', start: '2025-12-01', end: '2026-02-28', hemisphere: 'north' });
    expect(vm.storyWaiting).toEqual({ habitId: read, petId: CAT, story: 'start' });
    expect(vm.companionOffer).toEqual({ petId: COW, suggested: walk, habitIds: [walk] });
    // "Show companions" off: no companion on cards; everyone is just nearest in the band.
    const off = { ...g.state, settings: { ...g.state.settings, showCompanions: false } };
    const vm2 = todayVM(off, envOf(g));
    expect(vm2.blocks.flatMap((b) => b.cards).every((c) => c.companion === null)).toBe(true);
    expect(vm2.sill.every((p) => !p.resident?.companion && p.routine === null)).toBe(true);
    expect(vm2.storyWaiting).toBeNull();
    expect(vm2.companionOffer).toBeNull();
  });

  it('Today on a birthday and a came-home day', () => {
    const { g } = played();
    const s = { ...g.state, profile: { ...g.state.profile, birthday: '02-18' } };
    const g2 = Object.assign(Object.create(Game.prototype), g, { state: s }) as Game;
    g2.now = at('2026-02-18', 9);
    const vm = todayVM(s, { today: '2026-02-18', now: g2.now, local: UTC });
    expect(vm.birthday).toEqual({ petIds: [CAT, COW].sort((a, b) => s.pets[a]!.obtainedAt - s.pets[b]!.obtainedAt || (a < b ? -1 : 1)) });
    const later = todayVM(s, { today: '2027-01-05', now: at('2027-01-05', 9), local: UTC });
    expect(later.cameHome.map((c) => c.years)).toEqual([1, 1]);
    expect(later.sill.some((p) => p.bow)).toBe(true);
  });

  it('Habit Detail: companion and stories, keepsakes, looks and tag, journal, stacking, tune', () => {
    const { g, read, walk } = played();
    const d = habitDetailVM(g.state, envOf(g), read)!;
    expect(d.why).toBe('Calmer evenings.');
    expect(d.companion).toMatchObject({ petId: CAT, since: '2026-01-05', askWhy: true, moment: { text: 'Slow chapter' } });
    expect(d.companion!.stories.map((st) => [st.id, st.unlocked])).toEqual([
      ['start', true],
      ['why', true],
      ['lookAtUs', true],
    ]);
    expect(d.keepsakes.map((k) => [k.stage, k.kind, k.placed])).toEqual([
      [1, 'read', false],
      [4, 'read', false],
      [5, 'read', false],
    ]);
    expect(d.looks).toMatchObject({ shown: 0, waiting: null, tag: { colour: 'dawn', shape: 'paired', evidence: { keptTogether: { habitId: walk, days: 42 } } } }); // read at Blooming (day 42)
    expect(d.journal.map((e) => [e.kind, e.inked])).toEqual([
      ['usualTime', true],
      ['steadiestDay', true],
      ['keptTogether', true],
      ['whyItLooks', true],
    ]);
    expect(d.after).toEqual({ habitId: walk, name: 'Walk', keptTogether: 45 });
    expect(habitDetailVM(g.state, envOf(g), walk)!.followers).toEqual([read]);
    expect(d.checkinsToBlooming).toBeNull();
    expect(d.tune).toMatchObject({ habitId: read, restUntil: '2026-02-28', finish: true });
    expect(d.timeNudge).toBeNull();
  });

  it('the pet card, the Shelf’s keepsakes and the memory shelf', () => {
    const { g, read } = played();
    const p = petVM(g.state, envOf(g), CAT)!;
    expect(p).toMatchObject({ habitId: read, company: { habitId: read, since: '2026-01-05', knownFor: { icon: 'book', routine: { phase: 'settled' } } }, suggestedHabit: null });
    expect(p.moments.map((m) => m.kind)).toEqual(['came-home', 'bloomed']);
    expect(petVM(g.state, envOf(g), COW)!.suggestedHabit).not.toBeNull();
    expect(petsVM(g.state).pets.find((x) => x.id === CAT)!.habitId).toBe(read);
    const sh = shelfVM(g.state);
    expect(sh.keepsakes).toHaveLength(3);
    expect(sh.inventory.filter((i) => i.keepsake).map((i) => i.itemId)).toEqual([`keepsake:k-${read}-1`, `keepsake:k-${read}-4`, `keepsake:k-${read}-5`]);
    const m = memoryShelfVM(g.state);
    expect(m.items.every((i) => i.kind === 'sundayNote' || i.kind === 'herbarium')).toBe(true);
    expect(m.herbarium[0]!.pages[0]).toMatchObject({ kind: 'herbarium', month: '2026-01' });
    expect(JSON.stringify(m)).not.toMatch(/"expected"|"achieved"/);
  });

  it('"Tune my habits" anytime: the chips for every live habit and the season’s dates', () => {
    const { g } = played();
    const t = tuneVM(g.state, envOf(g));
    expect(t.season).toMatchObject({ name: 'winter', justThisSeasonEnd: '2026-02-28', nextStart: '2026-03-01', hemisphere: 'north' });
    expect(t.chips.map((c) => c.habitName)).toEqual(['Walk', 'Read']);
  });
});

describe('store actions', () => {
  let unsub: (() => void) | null = null;
  afterEach(() => {
    unsub?.();
    unsub = null;
  });

  it('pairs, reads stories, answers why, stars notes, answers the nudge, tunes and reviews a season', () => {
    const b = fakeBrowser({ start: '2026-08-20', hour: 9 });
    store.configureStore({ timeZone: () => 'Australia/Sydney' });
    store.hydrate();
    const events: GameEvent[] = [];
    unsub = onGameEvent((e) => events.push(e));
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    expect(store.state.value.settings.hemisphere).toBe('south');
    const id = store.createHabit({ name: 'Walk', icon: 'walk', color: 'sage', plant: 'pothos', pot: 'terracotta', schedule: { kind: 'daily' }, target: 1, step: 1, effort: 'steady', timeOfDay: 'morning', polarity: 'build' });
    const pull = store.pull('cats', { free: true });
    store.finishReveal();
    if (!pull.ok) throw new Error('no capsule');
    expect(store.setCompanion(id, pull.itemId)).toBe(true);
    expect(events.some((e) => e.type === 'companion')).toBe(true);
    store.checkIn(id);
    expect(events.some((e) => e.type === 'companionXp')).toBe(true);
    store.setNote(id, store.today.value, 'Rain');
    expect(store.starNote(id, store.today.value, true)).toBe(true);
    expect(store.answerWhy(id, 'Fresh air')).toBe(false); // not unlocked yet
    expect(store.answerTimeNudge(id, true)).toBe(false); // nothing to answer
    expect(store.setPlantLook(id, 0)).toBe(false);
    expect(store.tuneHabits([{ habitId: id, choice: 'keep' }])).toEqual([{ habitId: id, choice: 'keep', ok: true }]);
    // Spring in the south starts Sep 1: winter's card waits on Today.
    b.advance(12 * 86_400_000);
    store.startClock()();
    expect(store.state.value.seasons?.pending).toMatchObject({ name: 'winter', hemisphere: 'south' });
    expect(store.resolveSeasonReview([])).toEqual([]);
    expect(store.state.value.seasons?.pending).toBeUndefined();
    expect(store.resolveSeasonReview('skip')).toBe(false);
    store.updateSettings({ showCompanions: false, compactToday: true, quoteNotes: false, hemisphere: 'north' });
    expect(store.state.value.settings).toMatchObject({ showCompanions: false, compactToday: true, quoteNotes: false, hemisphere: 'north' });
    store.noteCompanionOffer();
    store.declineCompanionOffer();
    expect(store.state.value.company?.offer.declines).toBe(1);
    expect(validateState(store.state.value).ok).toBe(true);
  });
});
