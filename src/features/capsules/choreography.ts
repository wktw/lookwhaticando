/**
 * Web Animations for the pull (DESIGN §9.3): coin into the slot, capsule sinking out of the
 * dome, down the chute behind the flap, then out over the tray lip, bouncing and rolling to
 * rest. Transform/opacity only. SVG coordinates: `px` in a CSS transform on an SVG element
 * means view-box units.
 */
import { CHUTE, OUT_CAPSULE_R, REST, SLOT } from '@/art/machines/geometry';
import { done } from './motion';

const at = (x: number, y: number, extra = '') => `translate(${x}px, ${y}px) ${extra}`.trim();

/** A coin (or star, or ticket) arcs up from below the machine and drops edge-on into the slot. */
export function animateCoin(el: Element, reduced: boolean, onClink: () => void): Promise<void> {
  const clink = setTimeout(onClink, reduced ? 120 : 560);
  if (reduced) {
    return done(
      el.animate(
        [
          { transform: at(SLOT.cx, SLOT.slitY - 6), opacity: 0 },
          { transform: at(SLOT.cx, SLOT.slitY - 6), opacity: 1, offset: 0.4 },
          { transform: at(SLOT.cx, SLOT.slitY - 6), opacity: 0 },
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
        { transform: at(SLOT.cx, SLOT.slitY - 20, 'rotate(-360deg) scale(1)'), offset: 0.74, easing: 'ease-in' },
        { transform: at(SLOT.cx, SLOT.slitY - 3, 'rotate(-360deg) scale(0.22, 1)'), opacity: 1, offset: 0.88 },
        { transform: at(SLOT.cx, SLOT.slitY + 6, 'rotate(-360deg) scale(0.18, 0.9)'), opacity: 0 },
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

/** Where the capsule noses out of the chute, and how small it looks back there. */
const LIP = { x: CHUTE.cx, y: CHUTE.cy + 3, scale: 0.5 } as const;

/**
 * Inside the chute (a layer clipped to the opening, under the flap): the capsule rolls down
 * behind the flap, the flap swings up, and the capsule comes forward to the tray lip.
 * The flap falls shut again once the capsule is out.
 */
export function animateChute(capsule: Element, flap: Element | null, reduced: boolean): Promise<void> {
  if (reduced) return Promise.resolve();
  flap?.animate(
    [
      { transform: 'scaleY(1)' },
      { transform: 'scaleY(0.14)', offset: 0.22 },
      { transform: 'scaleY(0.14)', offset: 0.55 },
      { transform: 'scaleY(1.1)', offset: 0.74 },
      { transform: 'scaleY(0.96)', offset: 0.87 },
      { transform: 'scaleY(1)' },
    ],
    { duration: 950, easing: 'ease-out' },
  );
  return done(
    capsule.animate(
      [
        { transform: at(LIP.x, CHUTE.cy - 16, 'rotate(-30deg) scale(0.4)'), opacity: 1 },
        { transform: at(LIP.x, CHUTE.cy + 1, 'rotate(0deg) scale(0.42)'), offset: 0.55, easing: 'cubic-bezier(.3,.7,.5,1)' },
        { transform: at(LIP.x, LIP.y, `rotate(10deg) scale(${LIP.scale})`), opacity: 1 },
      ],
      { duration: 300, easing: 'cubic-bezier(.5,0,.9,.6)' },
    ),
  );
}

/** Rolling without slipping: degrees turned per view-box unit travelled. */
const ROLL = 180 / Math.PI / OUT_CAPSULE_R;

/**
 * Out in front: the capsule tips over the lip, drops to the ground, bounces twice and rolls
 * clear of the machine's foot to rest. `onImpact(strength)` fires on each landing.
 */
export function animateDrop(capsule: Element, reduced: boolean, onImpact: (strength: number) => void): Promise<void> {
  if (reduced) {
    onImpact(1);
    return done(
      capsule.animate(
        [
          { transform: at(REST.x, REST.y, 'rotate(0deg) scale(1)'), opacity: 0 },
          { transform: at(REST.x, REST.y, 'rotate(0deg) scale(1)'), opacity: 1 },
        ],
        { duration: 200, fill: 'forwards' },
      ),
    );
  }
  const duration = 1300;
  const g = REST.y;
  // On the ground it turns with the distance rolled, arriving upright at rest.
  const roll = (x: number) => 360 - (REST.x - x) * ROLL;
  const frame = (x: number, y: number, rot: number, sx: number, sy: number, offset: number, easing: string): Keyframe => ({
    transform: `translate(${x}px, ${y}px) rotate(${rot.toFixed(1)}deg) scale(${sx}, ${sy})`,
    offset,
    easing,
  });
  const timers = [0.3, 0.52, 0.68].map((t, i) => setTimeout(() => onImpact([1, 0.45, 0.2][i]!), duration * t));
  return done(
    capsule.animate(
      [
        { ...frame(LIP.x, LIP.y, 10, LIP.scale, LIP.scale, 0, 'cubic-bezier(.4,0,.8,.5)'), opacity: 1 },
        frame(LIP.x + 2, LIP.y + 6, 40, 0.72, 0.72, 0.1, 'cubic-bezier(.5,0,1,.6)'),
        frame(LIP.x + 8, g, roll(LIP.x + 8), 1.08, 0.88, 0.3, 'cubic-bezier(0,.55,.45,1)'),
        frame(LIP.x + 20, g - 13, roll(LIP.x + 20), 1, 1, 0.41, 'cubic-bezier(.55,0,1,.45)'),
        frame(LIP.x + 32, g, roll(LIP.x + 32), 1.04, 0.95, 0.52, 'cubic-bezier(0,.55,.45,1)'),
        frame(LIP.x + 40, g - 4, roll(LIP.x + 40), 1, 1, 0.6, 'cubic-bezier(.55,0,1,.45)'),
        frame(LIP.x + 47, g, roll(LIP.x + 47), 1, 1, 0.68, 'cubic-bezier(.2,.6,.3,1)'),
        frame(REST.x + 3, g, roll(REST.x + 3), 1, 1, 0.92, 'ease-in-out'),
        { ...frame(REST.x, g, 360, 1, 1, 1, 'linear'), opacity: 1 },
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
