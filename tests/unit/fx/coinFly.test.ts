// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flyCoins } from '@/fx/coinFly';
import { pendingFor } from '@/fx/walletLedger';

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

/** Element.animate that finishes only when the test says so. */
let landings: (() => void)[] = [];

beforeEach(() => {
  landings = [];
  Element.prototype.animate = function () {
    let done!: () => void;
    const finished = new Promise<void>((r) => (done = r));
    landings.push(done);
    return { finished } as unknown as Animation;
  };
  const jar = document.createElement('div');
  jar.dataset.walletTarget = 'coins';
  jar.getBoundingClientRect = () => new DOMRect(300, 20, 40, 30);
  document.body.appendChild(jar);
});

afterEach(() => {
  document.body.innerHTML = '';
});

const sprites = () => document.querySelectorAll('.ck-fx-sprite').length;

describe('the brass coin (one in the air at a time)', () => {
  it('queues rapid rewards, and a coin still waiting carries the next reward along', async () => {
    const landed: number[] = [];
    const a = flyCoins({ from: { x: 40, y: 600 }, amount: 5 }).then(() => landed.push(5));
    const b = flyCoins({ from: { x: 40, y: 640 }, amount: 3 }).then(() => landed.push(3));
    const c = flyCoins({ from: { x: 40, y: 680 }, amount: 2 }).then(() => landed.push(2));
    // Every reward is held back from the counter until its coin lands.
    expect(pendingFor('coins')).toBe(10);
    expect(sprites()).toBe(1);

    landings.shift()!();
    await flush();
    await flush();
    expect(landed).toEqual([5]);
    expect(pendingFor('coins')).toBe(5);
    // The 3 and the 2 fly together as the next single coin.
    expect(sprites()).toBe(1);

    landings.shift()!();
    await Promise.all([a, b, c]);
    expect(landed.sort()).toEqual([2, 3, 5]);
    expect(pendingFor('coins')).toBe(0);
    expect(landings).toHaveLength(0);
  });

  it('with no wallet on screen, the counter simply catches up', async () => {
    document.body.innerHTML = '';
    await flyCoins({ from: { x: 0, y: 0 }, amount: 7 });
    expect(pendingFor('coins')).toBe(0);
    expect(sprites()).toBe(0);
  });
});
