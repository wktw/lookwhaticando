/** Degrees of turning that release a capsule (DESIGN §9.3). */
export const TURN_TARGET = 300;
/** A ratchet click every this many degrees. */
export const TICK_DEG = 30;
/** Rotation that commits a direction; either way counts, as long as it stays consistent. */
const COMMIT_DEG = 12;
/** One pointer move turning more than this jumped across the hub: it's not a turn. */
export const MAX_STEP_DEG = 60;

/** Signed smallest difference between two angles in degrees, in (−180, 180]. */
export function angleDelta(from: number, to: number): number {
  let d = (to - from) % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

/**
 * The crank's ratchet: the first ~12° of a drag commit a direction (clockwise or not, both are
 * fine); after that only rotation in that direction advances, and backing up never undoes it.
 */
export class Ratchet {
  progress = 0;
  dir: 0 | 1 | -1 = 0;
  private pending = 0;

  constructor(readonly target = TURN_TARGET) {}

  get done(): boolean {
    return this.progress >= this.target;
  }

  /** Feed a signed rotation from a drag. Returns how far it moved the crank forward. */
  turn(delta: number): number {
    if (Math.abs(delta) > MAX_STEP_DEG) return 0;
    if (this.dir === 0) {
      this.pending += delta;
      if (Math.abs(this.pending) < COMMIT_DEG) return 0;
      this.dir = this.pending > 0 ? 1 : -1;
      return this.forward(Math.abs(this.pending));
    }
    return Math.sign(delta) === this.dir ? this.forward(Math.abs(delta)) : 0;
  }

  /** Turn forward regardless of the pointer (auto-turn); commits clockwise if nothing is committed yet. */
  push(amount: number): number {
    if (this.dir === 0) this.dir = 1;
    return this.forward(amount);
  }

  reset(): void {
    this.progress = 0;
    this.dir = 0;
    this.pending = 0;
  }

  private forward(amount: number): number {
    if (amount <= 0 || this.done) return 0;
    const next = Math.min(this.target, this.progress + amount);
    const moved = next - this.progress;
    this.progress = next;
    return moved;
  }
}

/** Ratchet clicks owed for moving from `from` to `to` degrees: one per tick crossed, at most `cap`. */
export function ticksCrossed(from: number, to: number, cap = 3): number {
  return Math.min(cap, Math.max(0, Math.floor(to / TICK_DEG) - Math.floor(from / TICK_DEG)));
}
