// @vitest-environment jsdom
/**
 * The quality bar (wave 2): the You screen's first render under 50 ms on a 3-year × 20-habit save.
 * Nothing on it walks the history: the profile counts come from `lifetime`, the habit list from
 * the habits themselves. In Chromium (production build, a real 3y × 20 save) the switch to You
 * renders in about 16 ms. jsdom builds SVG and DOM several times slower, so this guard allows
 * 400 ms there (the machine may be busy with other suites): it catches a history walk sneaking in,
 * not the last millisecond.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { state } from '@/state/store';
import { installDom, mount } from '@/features/capsules/testing';
import { bigSave } from '../../../tests/unit/state/bigsave';
import { YouScreen } from './YouScreen';

vi.setConfig({ testTimeout: 120_000 });

beforeAll(() => {
  installDom();
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
});

describe('You on 3 years × 20 habits', () => {
  it('renders without walking the history (jsdom guard; ~16 ms in Chromium)', () => {
    state.value = bigSave({ years: 3, habits: 20 });
    mount(<YouScreen />).unmount();
    const times: number[] = [];
    for (let i = 0; i < 5; i++) {
      const t = performance.now();
      const v = mount(<YouScreen />);
      times.push(performance.now() - t);
      v.unmount();
    }
    const median = [...times].sort((a, b) => a - b)[2]!;
    console.log(`You 3y×20: median first render ${median.toFixed(1)} ms`);
    expect(median).toBeLessThan(400);
  });
});
