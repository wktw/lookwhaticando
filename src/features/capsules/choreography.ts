/**
 * Web Animations for the pull (DESIGN §9.3): coin into the slot, capsule sinking out of the
 * dome, the chute flap, and the capsule rolling out and bouncing. Transform/opacity only.
 * SVG coordinates: `px` in a CSS transform on an SVG element means view-box units.
 */
import { CHUTE, REST, SLOT } from '@/art/machines/geometry';
import { done } from './motion';

const at = (x: number, y: number, extra = '') => `translate(${x}px, ${y}px) ${extra}`.trim();

/** A coin (or star, or ticket) arcs up from below the machine and drops edge-on into the slot. */
export function animateCoin(el: Element, reduced: boolean, onClink: () => void): Promise<void> {
  const clink = setTimeout(onClink, reduced ? 120 : 560);
  if (reduced) {
    return done(
      el.animate(
        [
          { transform: at(SLOT.cx, SLOT.cy - 8), opacity: 0 },
          { transform: at(SLOT.cx, SLOT.cy - 8), opacity: 1, offset: 0.4 },
          { transform: at(SLOT.cx, SLOT.cy - 8), opacity: 0 },
        ],
        { duration: 260, fill: 'forwards' },
      ),
    ).then(() => clearTimeout(clink));
  }
  return done(
    el.animate(
      [
        { transform: at(226, 344, 'rotate(0deg) scale(0.85)'), opacity: 0, easing: 'cubic-bezier(.2,.7,.4,1)' },
        { transform: at(214, 300, 'rotate(-60deg) scale(1)'), opacity: 1, offset: 0.12, easing: 'cubic-bezier(.3,.8,.5,1)' },
        { transform: at(190, 196, 'rotate(-250deg) scale(1.12)'), offset: 0.48, easing: 'cubic-bezier(.5,0,.8,.6)' },
        { transform: at(SLOT.cx, SLOT.cy - 22, 'rotate(-360deg) scale(1)'), offset: 0.74, easing: 'ease-in' },
        { transform: at(SLOT.cx, SLOT.cy - 4, 'rotate(-360deg) scale(0.22, 1)'), opacity: 1, offset: 0.88 },
        { transform: at(SLOT.cx, SLOT.cy + 6, 'rotate(-360deg) scale(0.18, 0.9)'), opacity: 0 },
      ],
      { duration: 720, fill: 'forwards' },
    ),
  );
}

/** The released capsule sinks through the dome floor, behind the collar. */
export function animateSink(el: Element, reduced: boolean): Promise<void> {
  if (reduced) return Promise.resolve();
  return done(
    el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(48px)' }], {
      duration: 320,
      easing: 'cubic-bezier(.55,0,.9,.5)',
      fill: 'forwards',
    }),
  );
}

/**
 * The flap swings open, the capsule pops out of the chute, drops to the ground, bounces
 * twice and rolls to rest in front of the machine. `onImpact(strength)` fires on each landing.
 */
export function animateDrop(capsule: Element, flap: Element | null, reduced: boolean, onImpact: (strength: number) => void): Promise<void> {
  if (reduced) {
    onImpact(1);
    return done(
      capsule.animate(
        [
          { transform: at(REST.x, REST.y), opacity: 0 },
          { transform: at(REST.x, REST.y), opacity: 1 },
        ],
        {
          duration: 200,
          fill: 'forwards',
        },
      ),
    );
  }
  const duration = 1150;
  flap?.animate(
    [
      { transform: 'scaleY(1)' },
      { transform: 'scaleY(0.12)', offset: 0.1 },
      { transform: 'scaleY(0.12)', offset: 0.3 },
      { transform: 'scaleY(1.08)', offset: 0.42 },
      { transform: 'scaleY(1)' },
    ],
    { duration: duration * 0.7, easing: 'ease-out' },
  );
  const timers = [
    setTimeout(() => onImpact(1), duration * 0.42),
    setTimeout(() => onImpact(0.45), duration * 0.66),
    setTimeout(() => onImpact(0.2), duration * 0.83),
  ];
  const x0 = CHUTE.cx;
  const y0 = CHUTE.cy;
  const ground = REST.y;
  return done(
    capsule.animate(
      [
        { transform: at(x0, y0, 'rotate(-100deg) scale(0.35)'), opacity: 0 },
        { transform: at(x0, y0 + 2, 'rotate(-100deg) scale(0.55)'), opacity: 1, offset: 0.08, easing: 'cubic-bezier(.3,1.4,.6,1)' },
        { transform: at(x0 + 2, y0 + 14, 'rotate(-92deg) scale(1)'), offset: 0.2, easing: 'cubic-bezier(.5,0,1,.6)' },
        { transform: at(x0 + 10, ground, 'rotate(-70deg) scale(1.06, 0.9)'), offset: 0.42, easing: 'cubic-bezier(0,.5,.5,1)' },
        { transform: at(x0 + 18, ground - 13, 'rotate(-44deg) scale(1)'), offset: 0.54, easing: 'cubic-bezier(.5,0,1,.5)' },
        { transform: at(x0 + 24, ground, 'rotate(-26deg) scale(1.03, 0.95)'), offset: 0.66, easing: 'cubic-bezier(0,.5,.5,1)' },
        { transform: at(x0 + 27, ground - 4, 'rotate(-14deg) scale(1)'), offset: 0.75, easing: 'cubic-bezier(.5,0,1,.5)' },
        { transform: at(x0 + 29, ground, 'rotate(-6deg)'), offset: 0.83, easing: 'ease-out' },
        { transform: at(REST.x, REST.y, 'rotate(0deg)'), opacity: 1 },
      ],
      { duration, fill: 'forwards' },
    ),
  ).then(() => timers.forEach(clearTimeout));
}

export type Jolt = 'chunk' | 'nope' | 'clink';

const JOLTS: Record<Jolt, { frames: Keyframe[]; duration: number }> = {
  // The whole machine squashes as the mechanism lets go.
  chunk: {
    frames: [
      { transform: 'none' },
      { transform: 'translateY(3px) scale(1.025, 0.965)', offset: 0.3 },
      { transform: 'translateY(-2px) scale(0.99, 1.015)', offset: 0.65 },
      { transform: 'none' },
    ],
    duration: 300,
  },
  // A gentle head-shake: "not quite yet".
  nope: {
    frames: [{ transform: 'none' }, { transform: 'rotate(-2.5deg)' }, { transform: 'rotate(2.5deg)' }, { transform: 'rotate(-1.5deg)' }, { transform: 'none' }],
    duration: 420,
  },
  clink: {
    frames: [{ transform: 'none' }, { transform: 'translateY(1.5px)' }, { transform: 'none' }],
    duration: 140,
  },
};

/** A quick physical reaction of the whole machine (skipped with reduced motion). */
export function jolt(el: HTMLElement | null, kind: Jolt, reduced: boolean): void {
  if (!el || reduced) return;
  const { frames, duration } = JOLTS[kind];
  el.animate(frames, { duration, easing: 'ease-out' });
}
