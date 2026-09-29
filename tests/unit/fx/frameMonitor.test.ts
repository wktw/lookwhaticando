// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isLite, LITE_MEDIAN_MS, MAX_FLICKING, median, nearestFlickers, resetFrameMonitor, shouldGoLite, watchScene } from '@/fx/frameMonitor';

describe('auto-lite (DESIGN §11.1)', () => {
  it('goes lite only when the median frame is over 25 ms, over a real sample', () => {
    expect(LITE_MEDIAN_MS).toBe(25);
    expect(median([16.7, 16.7, 33.4, 16.7])).toBe(16.7);
    // 4× CPU on the Shelf: p95 33 ms, but a median of 16.7 stays full.
    expect(shouldGoLite([...Array(100).fill(16.7), ...Array(10).fill(33.4)])).toBe(false);
    expect(shouldGoLite(Array(60).fill(33.4))).toBe(true);
    expect(shouldGoLite([40, 40, 40])).toBe(false);
  });

  it('lets only the pets nearest the middle of the screen flick, and none off screen', () => {
    const vp = { width: 400, height: 800 };
    const at = (id: string, y: number) => ({ id, rect: { top: y - 20, bottom: y + 20, left: 180, right: 220 } });
    const pets = [at('a', 400), at('b', 300), at('c', 600), at('d', 100), at('e', 750), at('far', 2000)];
    const on = nearestFlickers(pets, vp);
    expect(on.size).toBe(MAX_FLICKING);
    expect([...on]).toEqual(['a', 'b', 'c', 'd']);
    expect(on.has('far')).toBe(false);
  });
});

describe('watchScene', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetFrameMonitor();
  });

  /** A hand-driven requestAnimationFrame: each step() runs the queued frame at t += dt. */
  function fakeFrames() {
    let queue: FrameRequestCallback[] = [];
    let t = 0;
    let requested = 0;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => (requested++, queue.push(cb), queue.length));
    vi.stubGlobal('cancelAnimationFrame', () => (queue = []));
    return {
      get requested() {
        return requested;
      },
      run(frames: number, dt: number) {
        for (let i = 0; i < frames; i++) {
          const q = queue;
          queue = [];
          t += dt;
          q.forEach((cb) => cb(t));
        }
      },
    };
  }

  it('goes lite after a slow 2 s sample, once a session', async () => {
    const f = fakeFrames();
    const root = document.createElement('div');
    const stop = watchScene(root);
    f.run(80, 40);
    await Promise.resolve();
    expect(isLite()).toBe(true);
    stop();
  });

  it('leaving the Shelf mid-sample samples again next time', async () => {
    const f = fakeFrames();
    const root = document.createElement('div');
    const first = watchScene(root);
    f.run(10, 40);
    first();
    await Promise.resolve();
    expect(isLite()).toBe(false);
    const stop = watchScene(root);
    f.run(80, 40);
    await Promise.resolve();
    expect(isLite()).toBe(true);
    stop();
  });
});
