/**
 * A brass coin that arcs from where it was earned into the wallet or the coin jar (DESIGN §9.1).
 * One coin per reward, and only one in the air at a time: rapid check-ins queue, and a coin still
 * waiting takes the next reward's amount along with it, so a burst never becomes a stream.
 *
 * The target is whatever visible element carries `data-wallet-target="coins" | "stars"` (the
 * wallet pill, the sidebar wallet, the jar on the sill), nearest to where the coin starts.
 * Each landing bumps it and releases the flight's reservation, so counters (AnimatedNumber with
 * `walletKind`) roll once as the coin drops in.
 */
import { h, render } from 'preact';
import { CoinIcon, StampIcon } from '@/art/icons';
import { fxLayer, toPoint, type Point } from './layer';
import { arcControl, easeInOutCubic, quadAt } from './arc';
import { prefersReducedMotion } from './motion';
import { sfx } from './sound';
import { reserve, type Payout, type Reservation, type WalletKind } from './walletLedger';

export type { WalletKind } from './walletLedger';

export interface FlyCoinsOptions {
  from: DOMRect | Point;
  amount: number;
  kind?: WalletKind;
  /**
   * The reservation made when the reward was committed (see walletLedger). Without one, the
   * flight reserves `amount` itself, which only holds the counter back if it's called in the
   * same tick as the store update (as celebrateCheckIn does).
   */
  reservation?: Reservation;
}

const BUMP = 'ck-wallet-bump';
/** One coin's flight (ms). */
export const COIN_FLIGHT_MS = 560;

function isVisible(el: Element): DOMRect | null {
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return null;
  if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return null;
  return r;
}

/** The visible wallet target nearest to the origin (sidebar vs. Today header vs. the jar). */
export function findWalletTarget(kind: WalletKind, from: Point): HTMLElement | null {
  let best: HTMLElement | null = null;
  let bestDist = Infinity;
  for (const el of document.querySelectorAll<HTMLElement>(`[data-wallet-target="${kind}"]`)) {
    const r = isVisible(el);
    if (!r) continue;
    const d = Math.hypot(r.left + r.width / 2 - from.x, r.top + r.height / 2 - from.y);
    if (d < bestDist) {
      bestDist = d;
      best = el;
    }
  }
  return best;
}

export function bumpWallet(el: HTMLElement) {
  el.classList.remove(BUMP);
  void el.offsetWidth; // restart the animation
  el.classList.add(BUMP);
  el.addEventListener('animationend', () => el.classList.remove(BUMP), { once: true });
}

const FRAMES = 14;

function flySprite(kind: WalletKind, from: Point, to: Point): Promise<void> {
  const el = document.createElement('div');
  el.className = 'ck-fx-sprite';
  render(h(kind === 'coins' ? CoinIcon : StampIcon, { size: '100%' }), el);
  fxLayer().appendChild(el);

  const ctrl = arcControl(from, to, 110, (to.x < from.x ? 1 : -1) * 18);
  const keyframes: Keyframe[] = [];
  for (let i = 0; i <= FRAMES; i++) {
    const t = i / FRAMES;
    const p = quadAt(from, ctrl, to, easeInOutCubic(t));
    // Lifts a little bigger, settles smaller into the wallet; a coin turns over once on the way.
    const scale = t < 0.2 ? 0.7 + (t / 0.2) * 0.35 : 1.05 - (t - 0.2) * 0.4;
    const turn = kind === 'coins' ? Math.max(0.25, Math.abs(Math.cos(t * Math.PI))) : 1;
    keyframes.push({
      transform: `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) scale(${(scale * turn).toFixed(3)}, ${scale.toFixed(3)})`,
      opacity: t < 0.1 ? t / 0.1 : 1,
    });
  }
  const anim = el.animate(keyframes, { duration: COIN_FLIGHT_MS, easing: 'linear', fill: 'both' });
  return anim.finished
    .catch(() => undefined)
    .then(() => {
      render(null, el);
      el.remove();
    });
}

interface Flight {
  kind: WalletKind;
  from: Point;
  holds: Reservation[];
  landed: (() => void)[];
}

const waiting: Flight[] = [];
let inAir = false;

function land(f: Flight, target: HTMLElement | null) {
  if (target) bumpWallet(target);
  for (const r of f.holds) r.release();
  for (const done of f.landed) done();
}

function launchNext() {
  if (inAir) return;
  const f = waiting.shift();
  if (!f) return;
  const target = findWalletTarget(f.kind, f.from);
  if (!target || prefersReducedMotion() || typeof Element.prototype.animate !== 'function') {
    // No visible wallet (or no motion): the counter rolls in place, no flight.
    if (target) sfx.play('coin', { volume: 0.7 });
    land(f, target);
    launchNext();
    return;
  }
  inAir = true;
  void flySprite(f.kind, f.from, toPoint(target.getBoundingClientRect())).then(() => {
    sfx.play('coin', { volume: 0.7 });
    land(f, target);
    inAir = false;
    launchNext();
  });
}

/** Fly one coin (or stamp) worth `amount` into the wallet. Resolves once it has landed. */
export function flyCoins({ from, amount, kind = 'coins', reservation }: FlyCoinsOptions): Promise<void> {
  if (!(amount > 0) || typeof document === 'undefined') {
    reservation?.release();
    return Promise.resolve();
  }
  const held = reservation ?? reserve(kind, amount);
  held.hold(Infinity);
  return new Promise<void>((resolve) => {
    // A coin already waiting for its turn carries this reward too.
    const queued = waiting.find((f) => f.kind === kind);
    if (queued) {
      queued.holds.push(held);
      queued.landed.push(resolve);
      return;
    }
    waiting.push({ kind, from: toPoint(from), holds: [held], landed: [resolve] });
    launchNext();
  });
}

/** Fly a batch's reserved rewards (coins and stamps) from one place. */
export function flyPayout(payout: Payout | undefined, from: DOMRect | Point): void {
  for (const r of [payout?.coins, payout?.stars]) {
    if (r?.left) void flyCoins({ from, amount: r.left, kind: r.kind, reservation: r });
  }
}
