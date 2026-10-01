// @vitest-environment jsdom
/**
 * The ritual reader's pencil sketch (WP-B6, domain-w2-d3): a Sunday Note's peek card draws the
 * routine frozen into the note (`SundayPS.icon`), never the habit's icon as it is now, and a note
 * written before WP-B6 (no routine kept) has no sketch.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act } from 'preact/test-utils';
import { companionOf, setCompanion } from '@/domain/company';
import { eachDay } from '@/domain/dates';
import { newPetState } from '@/domain/friendship';
import * as habits from '@/domain/habits';
import { RitualReader } from '@/features/rituals/RitualReader';
import { installDom, mount, useState_ } from '@/features/progress/testing';
import { state } from '@/state/store';
import type { AppState, Letter } from '@/state/types';
import { Game } from '../domain/game';

vi.setConfig({ testTimeout: 60_000 });

const CAT = 'pet-cat-tortie';
const NOTE = 'weekly-2026-03-02';
let view: ReturnType<typeof mount> | null = null;

beforeAll(() => installDom());
afterEach(() => {
  view?.unmount();
  view = null;
});

/** Read (a book) kept company by the cat all week, and the week's note written on Monday. */
function week(): { g: Game; read: string } {
  const g = new Game({ start: '2026-02-16' });
  const read = g.addHabit({ name: 'Read', icon: 'book', timeOfDay: 'evening', plant: 'pothos' });
  g.state = {
    ...g.state,
    pets: { ...g.state.pets, [CAT]: newPetState(CAT, g.rng, g.now, g.today, true) },
    collection: { ...g.state.collection, [CAT]: { count: 1, firstAt: g.now } },
  };
  for (const d of eachDay('2026-02-16', '2026-03-08')) {
    g.goTo(d, 12);
    if (d === '2026-03-02') g.run((tx) => setCompanion(tx, read, CAT));
    g.checkIn(read);
  }
  g.goTo('2026-03-09', 9);
  expect(companionOf(g.state, g.state.habits[0]!)).toBe(CAT);
  return { g, read };
}

const sketch = () => document.querySelector('[data-sketch]')?.getAttribute('data-sketch') ?? null;
function open(s: AppState) {
  useState_(s);
  view = mount(<RitualReader request={{ kind: 'letter', id: NOTE }} />);
}

describe('the ritual reader’s pencil sketch', () => {
  it('draws the routine frozen into the note, through an icon edit', () => {
    const { g, read } = week();
    const note = g.state.inbox.find((l) => l.id === NOTE) as Extract<Letter, { kind: 'weekly' }>;
    expect(note.ps).toMatchObject({ kind: 'companion', icon: 'book' });
    open(g.state);
    expect(document.querySelector('[data-note="sundayNote"]')).not.toBeNull();
    expect(sketch()).toBe('read');
    g.run((tx) => habits.updateHabit(tx, read, { icon: 'walk' }));
    act(() => {
      state.value = g.state;
    });
    // Before: the walk's sketch, as if the cat had waited by the door all along.
    expect(sketch()).toBe('read');
  });

  it('draws no sketch for a note written before WP-B6 (no routine kept)', () => {
    const { g } = week();
    const inbox = g.state.inbox.map((l) => {
      if (l.id !== NOTE || l.kind !== 'weekly' || l.ps?.kind !== 'companion') return l;
      const { icon: _i, ...ps } = l.ps;
      return { ...l, ps };
    });
    open({ ...g.state, inbox });
    expect(document.querySelector('[data-note="sundayNote"]')).not.toBeNull();
    // Before: the habit's icon now (the book's sketch).
    expect(sketch()).toBeNull();
  });
});
