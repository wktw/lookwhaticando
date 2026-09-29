/**
 * Coins (or stars) that arc from where they were earned into the wallet.
 * The wallet element is whatever carries `data-wallet-target="coins" | "stars"`; on each landing
 * it gets a bump and counters listening via `inboundFlight()` tick up in step.
 */
import { h, render } from 'preact';
import { CoinIcon, StarIcon } from '@/art/icons';
import { fxLayer, toPoint, type Point } from './layer';
import { arcControl, easeInOutCubic, quadAt, spriteCount } from './arc';
import { prefersReducedMotion } from './motion';
import { sfx } from './sound';

export type WalletKind = 'coins' | 'stars';

export interface FlyCoinsOptions {
  from: DOMRect | Point;
  amount: number;
  kind?: WalletKind;
}

type LandListener = (landed: number, count: number) => void;

/** A flight in progress toward one wallet counter. */
export interface Flight {
  kind: WalletKind;
  count: number;
  landed: number;
  onLand(fn: LandListener): () => void;
  done: Promise<void>;
}

const inbound = new Map<WalletKind, Flight>();
const BUMP = 'mm-wallet-bump';

/** The flight currently heading to `kind`'s counter, if any (read by AnimatedNumber). */
export function inboundFlight(kind: WalletKind): Flight | null {
  return inbound.get(kind) ?? null;
}

function isVisible(el: Element): DOMRect | null {
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return null;
  if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return null;
  return r;
}

/** The visible wallet target nearest to the origin (sidebar vs. Today header, for example). */
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

function createFlight(kind: WalletKind, count: number): Flight & { land(): void } {
  const listeners = new Set<LandListener>();
  let resolve!: () => void;
  const done = new Promise<void>((r) => (resolve = r));
  const flight = {
    kind,
    count,
    landed: 0,
    done,
    onLand(fn: LandListener) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    land() {
      flight.landed++;
      for (const fn of listeners) fn(flight.landed, count);
      if (flight.landed >= count) {
        if (inbound.get(kind) === flight) inbound.delete(kind);
        resolve();
      }
    },
  };
  return flight;
}

const FRAMES = 16;

function flySprite(kind: WalletKind, from: Point, to: Point, index: number, count: number): Promise<void> {
  const el = document.createElement('div');
  el.className = 'mm-fx-sprite';
  render(h(kind === 'coins' ? CoinIcon : StarIcon, { size: '100%' }), el);
  fxLayer().appendChild(el);

  const spread = (index - (count - 1) / 2) * 26;
  const ctrl = arcControl(from, to, 90 + Math.random() * 60, spread + (Math.random() - 0.5) * 30);
  const spin = kind === 'coins' ? 2 + Math.floor(Math.random() * 2) : 0;
  const keyframes: Keyframe[] = [];
  for (let i = 0; i <= FRAMES; i++) {
    const t = i / FRAMES;
    const p = quadAt(from, ctrl, to, easeInOutCubic(t));
    // Pop up big, shrink into the wallet; coins flip (scaleX) as they tumble, stars twirl.
    const scale = t < 0.18 ? 0.4 + (t / 0.18) * 0.85 : 1.25 - (t - 0.18) * 0.55;
    const flip = spin ? Math.max(0.2, Math.abs(Math.cos(t * Math.PI * spin))) : 1;
    const rot = kind === 'stars' ? t * 300 : 0;
    keyframes.push({
      transform: `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) rotate(${rot.toFixed(0)}deg) scale(${(scale * flip).toFixed(3)}, ${scale.toFixed(3)})`,
      opacity: t < 0.08 ? t / 0.08 : 1,
    });
  }
  const anim = el.animate(keyframes, { duration: 620 + Math.random() * 120, delay: index * 60, easing: 'linear', fill: 'both' });
  return anim.finished
    .catch(() => undefined)
    .then(() => {
      render(null, el);
      el.remove();
    });
}

/** Fly `amount` coins/stars from a point or element rect into the wallet. Resolves once all have landed. */
export function flyCoins({ from, amount, kind = 'coins' }: FlyCoinsOptions): Promise<void> {
  const count = spriteCount(amount);
  if (!count || typeof document === 'undefined') return Promise.resolve();
  const origin = toPoint(from);
  const target = findWalletTarget(kind, origin);
  const flight = createFlight(kind, count);
  inbound.set(kind, flight);

  const land = () => {
    if (target) bumpWallet(target);
    flight.land();
  };

  if (!target || prefersReducedMotion() || typeof Element.prototype.animate !== 'function') {
    // No visible wallet (or no motion): count up in place without the flight.
    queueMicrotask(() => {
      for (let i = 0; i < count; i++) land();
    });
    if (target) sfx.play('coin', { volume: 0.7 });
    return flight.done;
  }

  const to = toPoint(target.getBoundingClientRect());
  for (let i = 0; i < count; i++) {
    void flySprite(kind, origin, to, i, count).then(() => {
      sfx.play('coin', { volume: 0.55, pitch: 1 + i * 0.045 });
      land();
    });
  }
  return flight.done;
}
