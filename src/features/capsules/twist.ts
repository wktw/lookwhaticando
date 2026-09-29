import { MAX_STEP_DEG } from './ratchet';

/** Degrees of twisting that open a capsule (one step; a Secret takes three). */
export const TWIST_STEP = 90;
/** The clear half gives this far under your fingers (a twist, not a spin), then clicks round. */
const MAX_VISUAL = 12;

/**
 * Twist to open (DESIGN §7.2): a circular drag around the capsule, either way round. Progress is
 * the furthest net rotation reached, so wobbling back never undoes it; a jump straight across
 * the centre is not a twist. A tap counts as one whole step.
 */
export class TwistTracker {
  /** Net signed rotation of the current drag. */
  private net = 0;
  /** Degrees of twist banked by finished drags and taps. */
  private banked = 0;
  private best = 0;

  constructor(
    readonly steps = 1,
    readonly step = TWIST_STEP,
  ) {}

  /** Feed one pointer move's change of angle around the capsule's centre (degrees). */
  turn(delta: number): void {
    if (Math.abs(delta) > MAX_STEP_DEG || this.done) return;
    this.net += delta;
    this.best = Math.max(this.best, Math.abs(this.net));
  }

  /** A tap, a click, Enter or Space: one whole step. */
  tap(): void {
    if (this.done) return;
    this.banked = (this.stepsDone + 1) * this.step;
    this.release();
  }

  /** The drag ended: keep what it earned, and start the next drag from a level top half. */
  release(): void {
    this.banked = Math.max(this.banked, this.stepsDone * this.step);
    this.best = 0;
    this.net = 0;
  }

  /** Total twist so far, in degrees. */
  get progress(): number {
    return Math.min(this.steps * this.step, this.banked + this.best);
  }

  get stepsDone(): number {
    return Math.min(this.steps, Math.floor(this.progress / this.step));
  }

  get done(): boolean {
    return this.stepsDone >= this.steps;
  }

  /** How far the clear half is turned right now (degrees, signed with the drag). */
  get angle(): number {
    const partial = this.best % this.step;
    return Math.sign(this.net) * Math.min(MAX_VISUAL, partial * (MAX_VISUAL / (this.step * 0.75)));
  }
}
