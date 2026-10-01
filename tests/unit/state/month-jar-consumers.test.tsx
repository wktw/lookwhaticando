// @vitest-environment jsdom
/**
 * The month jar's two consumers agree on the page (domain-d7, WP-B7, DEC-P12e): the Progress hero
 * (`Hero.tsx`) and the Today band (`Band.tsx`, through `todayVM.monthJar` into the windowsill scene)
 * draw the same stems, and each stem is a habit she showed up for this month, read as the Herbarium
 * page reads a day: a zero-count Tiny watering earns one, a partial count on a day that is over does
 * not (a count that reached the Tiny count does), today's watering earns one, a rest earns none, and
 * a log outside the habit's lifetime earns none.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Hero } from '@/features/progress/Hero';
import { Band } from '@/features/today/Band';
import { installDom, mount, useState_, TODAY } from '@/features/progress/testing';
import { progressView, todayView } from '@/state/selectors';
import { state } from '@/state/store';
import { Game } from '../domain/game';

vi.setConfig({ testTimeout: 30_000 });

beforeAll(() => installDom());

let views: ReturnType<typeof mount>[] = [];
afterEach(() => {
  for (const v of views) v.unmount();
  views = [];
});

const stemsIn = (root: ParentNode) => [...root.querySelectorAll('[data-stem]')].map((el) => el.getAttribute('data-stem'));

describe('the Progress hero and the Today band draw the same month jar (domain-d7, WP-B7)', () => {
  it('a stem for each habit she showed up for this month, in both jars', () => {
    const g = new Game({ start: '2026-09-01' });
    const walk = g.addHabit({ name: 'Walk', tiny: { label: 'Shoes on' } });
    const water = g.addHabit({ name: 'Water', icon: 'water', target: 8 });
    const glasses = g.addHabit({ name: 'Glasses', icon: 'water', target: 8, tiny: { label: 'Two glasses', count: 2 } });
    const yoga = g.addHabit({ name: 'Yoga', icon: 'yoga' });
    const read = g.addHabit({ name: 'Read', icon: 'book' });
    const run = g.addHabit({ name: 'Run', icon: 'run' });
    g.goTo('2026-09-10');
    expect(g.tiny(walk).completed).toBe(true); // a zero-count Tiny watering
    g.setCount(water, '2026-09-08', 3); // a partial count, the day over
    g.setCount(glasses, '2026-09-08', 2); // the Tiny count, the day over
    expect(g.rest(yoga, g.today)).toBe(true); // a rest
    g.goTo(TODAY);
    g.checkIn(run); // today's watering
    // Read started on the 20th, with a log left on the 3rd (outside its lifetime).
    g.state = {
      ...g.state,
      habits: g.state.habits.map((h) => (h.id === read ? { ...h, startedOn: '2026-09-20' } : h)),
      logs: { ...g.state.logs, [read]: { '2026-09-03': { kind: 'log', count: 1 } } },
    };
    useState_(g.state);
    const want = [walk, glasses, run];

    const hero = mount(<Hero vm={progressView.value} />);
    views.push(hero);
    expect(stemsIn(hero.root)).toEqual(want);

    const band = mount(<Band vm={todayView.value} state={state.value} coins={state.value.wallet.coins} onWallet={() => undefined} scene />);
    views.push(band);
    expect(stemsIn(band.root)).toEqual(want);
  });
});
