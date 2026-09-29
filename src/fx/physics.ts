/**
 * Capsule-dome physics (DESIGN §9.3): a tiny rigid-circle simulation inside a round glass
 * dome with an optional flat floor (the collar the globe sits in).
 *
 * Semi-implicit Euler with warm-started sequential impulses (restitution for real impacts,
 * Coulomb friction that makes capsules roll), then positional correction. A fixed 120 Hz step
 * behind an accumulator keeps results independent of frame rate, and every random choice
 * comes from a seeded PRNG, so a given seed always builds the same pile.
 *
 * The sim knows nothing about rendering: callers read `bodies` (x, y, angle) each frame and
 * write them into SVG transforms. `awake` turns false once everything is at rest, which is
 * the caller's cue to stop its animation loop.
 */

export interface DomeBody {
  /** Stable id (never reused), for mapping bodies to rendered nodes. */
  readonly id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Radians. */
  angle: number;
  /** Angular velocity, rad/s. */
  spin: number;
  readonly r: number;
  /** Index into the caller's color palette. */
  readonly tint: number;
}

export interface DomeConfig {
  /** Dome center. */
  cx: number;
  cy: number;
  /** Inner radius of the glass. */
  radius: number;
  /** Optional flat floor: bodies rest on y = floor (the collar hides the globe's bottom). */
  floor?: number;
  count: number;
  bodyRadius: number;
  /** ± relative size variation, 0..0.3. */
  sizeJitter?: number;
  /** Number of palette tints bodies are assigned from. */
  tints?: number;
  seed?: number;
  /** units/s² */
  gravity?: number;
  /** 0..1 bounciness for real impacts. */
  restitution?: number;
  /** Coulomb friction coefficient. */
  friction?: number;
  /** Linear damping, 1/s. */
  damping?: number;
}

const STEP = 1 / 120;
const MAX_FRAME = 1 / 15;
const VELOCITY_ITERATIONS = 8;
const POSITION_ITERATIONS = 3;
/** Overlap tolerated before positional correction kicks in (keeps piles from jittering). */
const SLOP = 0.08;
const CORRECTION = 0.7;
/** Impacts slower than this are resting contact (no bounce). */
const BOUNCE_THRESHOLD = 45;
const WARM_START = 0.85;
const SLEEP_SPEED = 5;
const SLEEP_SPIN = 0.5;
const SLEEP_AFTER = 0.4;
/** Contact key for the glass / the floor (body ids stay far below this). */
const GLASS = 1 << 20;
const FLOOR = GLASS + 1;

interface Contact {
  key: number;
  a: DomeBody;
  /** null = the glass or the floor. */
  b: DomeBody | null;
  /** Unit normal from a toward b (or toward the wall). */
  nx: number;
  ny: number;
  /** Inverse masses. */
  ia: number;
  ib: number;
  /** Target separating speed from restitution. */
  bounce: number;
  /** Accumulated impulses (warm-started from the previous step). */
  pn: number;
  pt: number;
}

/** mulberry32: tiny, fast, good-enough seeded PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class DomeSim {
  readonly bodies: DomeBody[] = [];
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
  readonly floor: number;

  private readonly rand: () => number;
  private readonly gravity: number;
  private readonly restitution: number;
  private readonly friction: number;
  private readonly damping: number;
  private readonly bodyRadius: number;
  private readonly sizeJitter: number;
  private readonly tints: number;
  private contacts: Contact[] = [];
  private accumulator = 0;
  private calm = 0;
  private sleeping = false;
  private nextId = 0;

  constructor(cfg: DomeConfig) {
    this.cx = cfg.cx;
    this.cy = cfg.cy;
    this.radius = cfg.radius;
    this.floor = cfg.floor ?? cfg.cy + cfg.radius;
    this.rand = mulberry32(cfg.seed ?? 1);
    this.gravity = cfg.gravity ?? 1400;
    this.restitution = cfg.restitution ?? 0.35;
    this.friction = cfg.friction ?? 0.3;
    this.damping = cfg.damping ?? 0.5;
    this.bodyRadius = cfg.bodyRadius;
    this.sizeJitter = cfg.sizeJitter ?? 0.06;
    this.tints = Math.max(1, cfg.tints ?? 1);
    this.spawnPile(cfg.count);
  }

  /** False once everything has settled; the render loop can stop until the next nudge. */
  get awake(): boolean {
    return !this.sleeping;
  }

  wake(): void {
    this.sleeping = false;
    this.calm = 0;
  }

  /** Advance by real elapsed seconds (fixed substeps; leftover time carries to the next call). */
  step(dt: number): boolean {
    if (this.sleeping) return false;
    this.accumulator += Math.min(Math.max(dt, 0), MAX_FRAME);
    while (this.accumulator >= STEP && !this.sleeping) {
      this.substep(STEP);
      this.accumulator -= STEP;
    }
    return !this.sleeping;
  }

  /** Run until asleep (or the time limit). Returns the simulated seconds. */
  settle(maxSeconds = 8): number {
    this.wake();
    let t = 0;
    while (!this.sleeping && t < maxSeconds) {
      this.substep(STEP);
      t += STEP;
    }
    return t;
  }

  /**
   * Shake the pile, as a crank turn stirs a real gumball machine: lower capsules get kicked up
   * hardest. `strength` ≈ 1 is a firm shake; `swirl` (−1..1) adds a spin around the dome.
   */
  agitate(strength: number, swirl = 0): void {
    if (!(strength > 0) || this.bodies.length === 0) return;
    this.wake();
    const top = this.cy - this.radius;
    const span = this.floor - top;
    for (const b of this.bodies) {
      const depth = Math.min(1, Math.max(0, (b.y - top) / span));
      const kick = strength * (0.35 + 0.65 * depth) * (0.6 + 0.4 * this.rand());
      b.vy -= 520 * kick;
      b.vx += strength * 260 * (this.rand() - 0.5);
      if (swirl !== 0) {
        const dx = b.x - this.cx;
        const dy = b.y - this.cy;
        const d = Math.hypot(dx, dy) || 1;
        b.vx += (-dy / d) * swirl * strength * 220;
        b.vy += (dx / d) * swirl * strength * 220;
      }
      b.spin += strength * 14 * (this.rand() - 0.5);
    }
  }

  /**
   * Remove the capsule sitting lowest (over the exit) and return it; neighbors tumble into its
   * place. With `prefer`, a preferred capsule close to the exit wins over the very lowest one
   * (e.g. a colored capsule over a white one); if none is close, the lowest one still goes.
   */
  removeOne(prefer?: (b: DomeBody) => boolean): DomeBody | null {
    if (this.bodies.length === 0) return null;
    const exitScore = (b: DomeBody) => b.y - Math.abs(b.x - this.cx) * 0.35;
    const bestOf = (ok: (b: DomeBody) => boolean) => {
      let best = -1;
      for (let i = 0; i < this.bodies.length; i++) {
        const b = this.bodies[i]!;
        if (ok(b) && (best < 0 || exitScore(b) > exitScore(this.bodies[best]!))) best = i;
      }
      return best;
    };
    let pick = bestOf(() => true);
    if (prefer && !prefer(this.bodies[pick]!)) {
      const floor = exitScore(this.bodies[pick]!) - this.bodyRadius * 2.2;
      const near = bestOf((b) => prefer(b) && exitScore(b) >= floor);
      if (near >= 0) pick = near;
    }
    const [removed] = this.bodies.splice(pick, 1);
    this.contacts = [];
    this.wake();
    return removed ?? null;
  }

  /** Drop a fresh capsule in from the top of the dome. */
  addOne(): DomeBody {
    const b = this.makeBody(this.cx + (this.rand() - 0.5) * this.radius * 0.5, this.cy - this.radius * 0.72);
    b.vy = 60;
    this.bodies.push(b);
    this.wake();
    return b;
  }

  /* ------------------------------------------------------------------ */

  private makeBody(x: number, y: number): DomeBody {
    const r = this.bodyRadius * (1 + (this.rand() * 2 - 1) * this.sizeJitter);
    return {
      id: this.nextId++,
      x,
      y,
      vx: 0,
      vy: 0,
      angle: (this.rand() - 0.5) * Math.PI * 1.2,
      spin: 0,
      r,
      tint: Math.floor(this.rand() * this.tints),
    };
  }

  /** Loose hexagonal pile from the floor up, jittered so settling gives a natural heap. */
  private spawnPile(count: number): void {
    const d = this.bodyRadius * 2.08;
    const rowH = d * 0.866;
    const slots: { x: number; y: number }[] = [];
    for (let row = 0; slots.length < count * 3; row++) {
      const y = this.floor - this.bodyRadius - row * rowH;
      if (y < this.cy - this.radius) break;
      const offset = row % 2 ? d / 2 : 0;
      for (let k = -12; k <= 12; k++) {
        const x = this.cx + k * d + offset;
        if (Math.hypot(x - this.cx, y - this.cy) <= this.radius - this.bodyRadius * 1.05) slots.push({ x, y });
      }
    }
    slots.sort((a, b) => b.y - a.y || Math.abs(a.x - this.cx) - Math.abs(b.x - this.cx));
    for (const s of slots.slice(0, count)) {
      const j = this.bodyRadius * 0.3;
      this.bodies.push(this.makeBody(s.x + (this.rand() - 0.5) * j, s.y - this.rand() * j));
    }
  }

  private substep(h: number): void {
    const bodies = this.bodies;
    const damp = Math.exp(-this.damping * h);
    const spinDamp = Math.exp(-2 * h);
    for (const b of bodies) {
      b.vy += this.gravity * h;
      b.vx *= damp;
      b.vy *= damp;
      b.spin *= spinDamp;
    }

    this.findContacts();
    for (const c of this.contacts) this.applyImpulse(c, c.pn, c.pt);
    for (let it = 0; it < VELOCITY_ITERATIONS; it++) {
      for (const c of this.contacts) this.solveContact(c);
    }

    const startX = bodies.map((b) => b.x);
    const startY = bodies.map((b) => b.y);
    for (const b of bodies) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.angle += b.spin * h;
    }
    for (let it = 0; it < POSITION_ITERATIONS; it++) {
      for (let i = 0; i < bodies.length; i++) {
        const a = bodies[i]!;
        for (let j = i + 1; j < bodies.length; j++) separate(a, bodies[j]!);
        this.contain(a);
      }
    }

    // Rest is judged by actual movement: in a pile, impulses cancel gravity only up to solver
    // precision, and positional correction absorbs that tiny residual.
    let fastest = 0;
    let fastestSpin = 0;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i]!;
      const mx = (b.x - startX[i]!) / h;
      const my = (b.y - startY[i]!) / h;
      fastest = Math.max(fastest, mx * mx + my * my);
      fastestSpin = Math.max(fastestSpin, Math.abs(b.spin));
    }
    if (fastest < SLEEP_SPEED * SLEEP_SPEED && fastestSpin < SLEEP_SPIN) {
      this.calm += h;
      if (this.calm >= SLEEP_AFTER) this.sleep();
    } else {
      this.calm = 0;
    }
  }

  private sleep(): void {
    this.sleeping = true;
    this.accumulator = 0;
    this.contacts = [];
    for (const b of this.bodies) {
      b.vx = 0;
      b.vy = 0;
      b.spin = 0;
    }
  }

  /** Gather touching pairs and wall/floor contacts, carrying impulses over from last step. */
  private findContacts(): void {
    const previous = new Map<number, Contact>();
    for (const c of this.contacts) previous.set(c.key, c);
    const next: Contact[] = [];
    const bodies = this.bodies;
    const add = (key: number, a: DomeBody, b: DomeBody | null, nx: number, ny: number) => {
      const ia = 1 / (a.r * a.r);
      const ib = b ? 1 / (b.r * b.r) : 0;
      const vn = (b ? b.vx * nx + b.vy * ny : 0) - (a.vx * nx + a.vy * ny);
      const old = previous.get(key);
      next.push({
        key,
        a,
        b,
        nx,
        ny,
        ia,
        ib,
        bounce: -vn > BOUNCE_THRESHOLD ? -vn * this.restitution : 0,
        pn: old ? old.pn * WARM_START : 0,
        pt: old ? old.pt * WARM_START : 0,
      });
    };
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i]!;
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const rr = a.r + b.r + 0.02;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const lo = Math.min(a.id, b.id);
        const hi = Math.max(a.id, b.id);
        add(lo * GLASS + hi, a, b, dx / d, dy / d);
      }
      const dx = a.x - this.cx;
      const dy = a.y - this.cy;
      const limit = this.radius - a.r - 0.02;
      const d2 = dx * dx + dy * dy;
      if (d2 > limit * limit) {
        const d = Math.sqrt(d2);
        add(a.id * GLASS + GLASS, a, null, dx / d, dy / d);
      }
      if (a.y + a.r > this.floor - 0.02) add(a.id * GLASS + FLOOR, a, null, 0, 1);
    }
    this.contacts = next;
  }

  /** Box2D-lite style: clamp the accumulated impulse, apply the difference. */
  private solveContact(c: Contact): void {
    const { a, b, nx, ny, ia, ib } = c;
    const tx = -ny;
    const ty = nx;
    // Relative velocity of b's contact point w.r.t. a's (spin × lever arm lies along the tangent).
    const rvx = (b ? b.vx : 0) - a.vx;
    const rvy = (b ? b.vy : 0) - a.vy;
    const vn = rvx * nx + rvy * ny;
    const pn0 = c.pn;
    c.pn = Math.max(pn0 + (c.bounce - vn) / (ia + ib), 0);
    const dpn = c.pn - pn0;

    const vt = rvx * tx + rvy * ty - (b ? b.spin * b.r : 0) - a.spin * a.r;
    const pt0 = c.pt;
    const maxPt = this.friction * c.pn;
    // 1/m + r²/I for solid disks (I = m r²/2) is 3/m.
    c.pt = clamp(pt0 - vt / (3 * ia + 3 * ib), -maxPt, maxPt);
    this.applyImpulse(c, dpn, c.pt - pt0);
  }

  private applyImpulse(c: Contact, pn: number, pt: number): void {
    if (pn === 0 && pt === 0) return;
    const { a, b, nx, ny, ia, ib } = c;
    const px = nx * pn - ny * pt;
    const py = ny * pn + nx * pt;
    a.vx -= px * ia;
    a.vy -= py * ia;
    a.spin -= (2 * pt * ia) / a.r;
    if (b) {
      b.vx += px * ib;
      b.vy += py * ib;
      b.spin -= (2 * pt * ib) / b.r;
    }
  }

  /** Project a body back inside the glass and above the floor. */
  private contain(b: DomeBody): void {
    const dx = b.x - this.cx;
    const dy = b.y - this.cy;
    const limit = this.radius - b.r;
    const d = Math.hypot(dx, dy);
    if (d > limit) {
      b.x = this.cx + (dx / d) * limit;
      b.y = this.cy + (dy / d) * limit;
    }
    if (b.y > this.floor - b.r) b.y = this.floor - b.r;
  }
}

/** Push two overlapping bodies apart (heavier moves less). */
function separate(a: DomeBody, b: DomeBody): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const rr = a.r + b.r;
  const d2 = dx * dx + dy * dy;
  if (d2 >= rr * rr) return;
  const d = Math.sqrt(d2);
  const push = Math.max(rr - d - SLOP, 0) * CORRECTION;
  if (push === 0) return;
  // Perfectly coincident bodies separate along a fixed axis (keeps runs deterministic).
  const nx = d > 1e-6 ? dx / d : 1;
  const ny = d > 1e-6 ? dy / d : 0;
  const ia = 1 / (a.r * a.r);
  const ib = 1 / (b.r * b.r);
  const k = push / (ia + ib);
  a.x -= nx * k * ia;
  a.y -= ny * k * ia;
  b.x += nx * k * ib;
  b.y += ny * k * ib;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
