// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { useEffect } from 'preact/hooks';
import { CollectibleArt } from '@/art/CollectibleArt';
import { mount } from './artCheck.testutil';

afterEach(() => vi.useRealTimers());

it('settles CollectibleArt hook work before the SVG test host is discarded', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame'] });
  const view = mount(<CollectibleArt id="treat-carob-heart" size={40} />);
  view.done();
  // A pending Preact fallback timeout used to outlive jsdom and call its removed
  // cancelAnimationFrame global. Test the actual work, before the environment goes away.
  expect(vi.getTimerCount()).toBe(0);
});

it('runs mounted effects and their cleanup within the helper’s mount/unmount lifecycle', () => {
  const effects: string[] = [];
  function Drawing() {
    useEffect(() => {
      effects.push('mounted');
      return () => { effects.push('unmounted'); };
    }, []);
    return <g />;
  }
  const view = mount(<Drawing />);
  view.done();
  expect(effects).toEqual(['mounted', 'unmounted']);
});
