// @vitest-environment jsdom
/** A deterministic DOM sample shares the exact generator used by the 10,000-state model test. */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act } from 'preact/test-utils';
import { mulberry32 } from '@/domain/rng';
import { appDayKey, monotonicDayKey } from '@/domain/dates';
import { decodeState } from '@/state/decode';
import * as store from '@/state/store';
import { TodayScreen } from '@/features/today/TodayScreen';
import { ProgressScreen } from '@/features/progress/ProgressScreen';
import { ShelfScreen } from '@/features/shelf/ShelfScreen';
import { CapsulesScreen } from '@/features/capsules/CapsulesScreen';
import { YouScreen } from '@/features/you/YouScreen';
import { selectedDay } from '@/features/today/state';
import { routeRest } from '@/app/router';
import { toasts } from '@/ui/toast';
import { installDom, mount, until } from '@/features/capsules/testing';
import { UTC, at } from '../domain/game';
import { fakeBrowser } from './fixtures';
import { acceptedSeeds, adversarialCase } from './acceptedSeeds';

vi.setConfig({ testTimeout: 120_000 });
let view: ReturnType<typeof mount> | null = null;
beforeAll(() => {
  installDom();
  Element.prototype.scrollIntoView = () => {};
  window.matchMedia ??= ((media: string) => ({ matches: false, media, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
});
afterEach(() => { view?.unmount(); view = null; store.flushSaves(); });

describe('accepted states in the actual screen renderers (WP-04)', () => {
  it('renders the modern seeds and a reproducible accepted mutation sample through all five screens', async () => {
    const seeds = acceptedSeeds();
    const rng = mulberry32(20261002);
    const samples = seeds.filter((s) => ['modern-history', 'unstarted', 'fresh'].includes(s.label));
    let attempts = 0;
    for (; attempts < 400 && samples.length < 15; attempts++) {
      const seed = seeds[attempts % seeds.length]!;
      const candidate = adversarialCase(seed.state, rng);
      const decoded = decodeState(JSON.parse(JSON.stringify(candidate.state)), 'import');
      if (decoded.kind === 'ok') samples.push({ label: `${seed.label} #${attempts}: ${candidate.edits.join(', ')}`, state: decoded.state });
    }
    expect(samples).toHaveLength(15);
    for (const sample of samples) {
      fakeBrowser({ hour: 21 });
      store.hydrate();
      const now = at('2026-09-29', 21, 45);
      await act(() => {
        store.state.value = sample.state;
        store.now.value = now;
        store.today.value = monotonicDayKey(appDayKey(now, sample.state.settings.dayStartsAt, UTC), sample.state.clock.maxDateKey);
        selectedDay.value = store.today.value;
        routeRest.value = [];
        toasts.value = [];
      });
      for (const screen of [TodayScreen, ProgressScreen, ShelfScreen, CapsulesScreen, YouScreen]) {
        try {
          const Screen = screen;
          view = mount(<Screen />);
          if (screen === ProgressScreen) await until(() => view!.root.querySelector('[data-section="memory"], [data-empty="progress"]'), `${sample.label}: Progress below the fold`);
          if (screen === ShelfScreen) await until(() => view!.root.querySelector('#shelf-places'), `${sample.label}: Shelf below the fold`);
          expect(view.root.querySelector('h1'), `${sample.label}: ${screen.name}`).not.toBeNull();
        } catch (error) {
          throw new Error(`Accepted sample ${sample.label}, renderer ${screen.name}: ${String(error)}`, { cause: error });
        } finally {
          view?.unmount();
          view = null;
        }
      }
    }
  });
});
