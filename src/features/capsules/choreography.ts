/**
 * Web Animations for the pull (DESIGN §7.2): the token into the slot, a capsule sinking out of
 * the window, dropping into the chute port and settling there behind the lifted flap.
 * Transform and opacity only, unhurried, with no overshoot. In SVG, `px` in a CSS transform
 * means view-box units.
 */
import { CHUTE, CHUTE_REST, SLOT } from '@/art/machines/geometry';
import { done } from './motion';
import type { TokenKind } from './Token';

const at = (x: number, y: number, extra = '') => `translate(${x}px, ${y}px) ${extra}`.trim();
const EASE = 'cubic-bezier(.2,.8,.2,1)';

/**
 * The token arcs up from the counter and slides into the slot: a coin turns edge-on into the
 * vertical slit, a stamp flattens into the horizontal one.
 */
export function animateCoin(el: Element, reduced: boolean, onClink: () => void, kind: TokenKind = 'coin'): Promise<void> {
  const clink = setTimeout(onClink, reduced ? 120 : 600);
  const slot = { x: SLOT.cx, y: SLOT.cy };
  const into = kind === 'stamp' ? 'scale(1, 0.16)' : 'scale(0.16, 1)';
  if (reduced) {
    return done(
      el.animate(
        [
          { transform: at(slot.x, slot.y), opacity: 0 },
          { transform: at(slot.x, slot.y), opacity: 1, offset: 0.4 },
          { transform: at(slot.x, slot.y), opacity: 0 },
        ],
        { duration: 260, fill: 'forwards' },
      ),
    ).then(() => clearTimeout(clink));
  }
  return done(
    el.animate(
      [
        { transform: at(224, 330, 'rotate(0deg) scale(0.9)'), opacity: 0, easing: EASE },
        { transform: at(214, 296, 'rotate(-40deg) scale(1)'), opacity: 1, offset: 0.16, easing: 'cubic-bezier(.3,.7,.4,1)' },
        { transform: at(196, 226, 'rotate(-150deg) scale(1.05)'), offset: 0.52, easing: 'cubic-bezier(.45,0,.7,.6)' },
        { transform: at(slot.x, slot.y - 16, 'rotate(-180deg) scale(1)'), offset: 0.76, easing: 'ease-in' },
        { transform: at(slot.x, slot.y - 2, `rotate(-180deg) ${into}`), opacity: 1, offset: 0.9 },
        { transform: at(slot.x, slot.y + 4, `rotate(-180deg) ${into}`), opacity: 0 },
      ],
      { duration: 760, fill: 'forwards' },
    ),
  );
}

/** The released capsule sinks through the window floor, behind the tin. */
export function animateSink(el: Element, reduced: boolean): Promise<void> {
  if (reduced) return Promise.resolve();
  return done(
    el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(40px)' }], {
      duration: 300,
      easing: 'cubic-bezier(.55,0,.9,.5)',
      fill: 'forwards',
    }),
  );
}

/**
 * Into the chute: the flap swings up, and the capsule drops into the port from behind the tin,
 * settles on the port floor and stays there, waiting, while the flap stays lifted.
 * `onLand(strength)` fires as it lands.
 */
export function animateChute(capsule: Element, flap: Element | null, reduced: boolean, onLand: (strength: number) => void): Promise<void> {
  flap?.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.18)' }], {
    duration: reduced ? 1 : 260,
    easing: EASE,
    fill: 'forwards',
  });
  if (reduced) {
    onLand(1);
    return done(
      capsule.animate(
        [
          { transform: at(CHUTE_REST.x, CHUTE_REST.y), opacity: 0 },
          { transform: at(CHUTE_REST.x, CHUTE_REST.y), opacity: 1 },
        ],
        { duration: 200, fill: 'forwards' },
      ),
    );
  }
  const timers = [0.62, 0.84].map((t, i) => setTimeout(() => onLand([1, 0.3][i]!), 560 * t));
  return done(
    capsule.animate(
      [
        { transform: at(CHUTE_REST.x - 6, CHUTE.y - 16, 'rotate(-40deg)'), opacity: 1, easing: 'cubic-bezier(.5,0,.9,.5)' },
        { transform: at(CHUTE_REST.x - 1, CHUTE_REST.y, 'rotate(-6deg)'), offset: 0.62, easing: 'cubic-bezier(.2,.7,.4,1)' },
        { transform: at(CHUTE_REST.x, CHUTE_REST.y - 2.5, 'rotate(0deg)'), offset: 0.74, easing: 'cubic-bezier(.5,0,.9,.5)' },
        { transform: at(CHUTE_REST.x, CHUTE_REST.y, 'rotate(0deg)'), offset: 0.84, easing: EASE },
        { transform: at(CHUTE_REST.x, CHUTE_REST.y, 'rotate(0deg)'), opacity: 1 },
      ],
      { duration: 560, fill: 'forwards' },
    ),
  ).then(() => timers.forEach(clearTimeout));
}

/** The capsule was taken: the flap falls shut again. */
export function closeFlap(flap: Element | null): void {
  for (const a of flap?.getAnimations?.() ?? []) a.cancel();
}

export type Jolt = 'chunk' | 'nope' | 'clink';

const JOLTS: Record<Jolt, { frames: Keyframe[]; duration: number }> = {
  // The mechanism lets go: the cabinet settles a fraction on its feet.
  chunk: {
    frames: [{ transform: 'none' }, { transform: 'translateY(1.5px)', offset: 0.35 }, { transform: 'none' }],
    duration: 260,
  },
  // A small shake of the head: not yet.
  nope: {
    frames: [
      { transform: 'none' },
      { transform: 'translateX(-3px)' },
      { transform: 'translateX(3px)' },
      { transform: 'translateX(-1.5px)' },
      { transform: 'none' },
    ],
    duration: 380,
  },
  clink: {
    frames: [{ transform: 'none' }, { transform: 'translateY(1px)' }, { transform: 'none' }],
    duration: 140,
  },
};

/** A small physical reaction of the whole cabinet (skipped with reduced motion). */
export function jolt(el: HTMLElement | null, kind: Jolt, reduced: boolean): void {
  if (!el || reduced) return;
  const { frames, duration } = JOLTS[kind];
  el.animate(frames, { duration, easing: 'ease-out' });
}
