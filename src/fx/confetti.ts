/**
 * Confetti & particle bursts on ONE shared, lazily created, full-viewport canvas.
 * pointer-events: none; DPR-aware (capped at 2); the rAF loop only runs while particles live,
 * and the canvas is removed after a short idle. Reduced motion = a brief, still sparkle fade.
 */
import { BUDGET, MAX_LIVE, PASTEL_CONFETTI, alphaOf, spawn, spawnStill, step, type Intensity, type Particle, type ParticleShape } from './particles';
import { prefersReducedMotion } from './motion';
import { SPARKLE_PATH } from '@/ui/Sparkle';

export interface BurstOptions {
  /** Viewport coordinates of the origin. Defaults to screen center. */
  x?: number;
  y?: number;
  /** Relative size of the celebration. */
  intensity?: 'tiny' | 'small' | 'medium' | 'big' | 'epic';
  /** Particle shapes to use. */
  shapes?: ('petal' | 'heart' | 'star' | 'circle' | 'sparkle' | 'coin')[];
  /** CSS colors; defaults to the pastel palette. */
  colors?: string[];
}

const SPRITE = 32; // sprite cell size in CSS px (drawn at DPR)
const IDLE_REMOVE_MS = 1500;

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let dpr = 1;
let particles: Particle[] = [];
let raf = 0;
let last = 0;
let idleTimer = 0;
const sprites = new Map<string, HTMLCanvasElement>();

/* ---------------- Sprite atlas: each shape × color pre-rendered once ---------------- */

function shapePath(c: CanvasRenderingContext2D, shape: ParticleShape) {
  const r = SPRITE * 0.36;
  c.beginPath();
  switch (shape) {
    case 'circle':
      c.arc(0, 0, r * 0.62, 0, Math.PI * 2);
      break;
    case 'petal':
      c.ellipse(0, 0, r * 0.5, r, 0, 0, Math.PI * 2);
      break;
    case 'heart': {
      const s = r / 5;
      c.moveTo(0, 4.2 * s);
      c.bezierCurveTo(-1.2 * s, 3.1 * s, -5 * s, 0.6 * s, -5 * s, -1.8 * s);
      c.bezierCurveTo(-5 * s, -3.8 * s, -3.4 * s, -5 * s, -2 * s, -5 * s);
      c.bezierCurveTo(-0.9 * s, -5 * s, -0.3 * s, -4.4 * s, 0, -3.7 * s);
      c.bezierCurveTo(0.3 * s, -4.4 * s, 0.9 * s, -5 * s, 2 * s, -5 * s);
      c.bezierCurveTo(3.4 * s, -5 * s, 5 * s, -3.8 * s, 5 * s, -1.8 * s);
      c.bezierCurveTo(5 * s, 0.6 * s, 1.2 * s, 3.1 * s, 0, 4.2 * s);
      break;
    }
    case 'star':
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? r * 0.45 : r;
        c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      c.closePath();
      break;
    case 'sparkle': {
      const p = new Path2D(SPARKLE_PATH);
      c.scale(r / 10, r / 10);
      c.fill(p);
      return;
    }
    case 'coin':
      c.arc(0, 0, r * 0.8, 0, Math.PI * 2);
      break;
  }
}

function sprite(shape: ParticleShape, color: string): HTMLCanvasElement {
  const key = `${shape}|${color}|${dpr}`;
  const hit = sprites.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = cv.height = SPRITE * dpr;
  const c = cv.getContext('2d')!;
  c.scale(dpr, dpr);
  c.translate(SPRITE / 2, SPRITE / 2);
  c.fillStyle = color;
  c.save();
  shapePath(c, shape);
  if (shape !== 'sparkle') c.fill();
  c.restore();
  if (shape === 'coin') {
    c.lineWidth = 1.6;
    c.strokeStyle = '#5A3E45';
    c.stroke();
    c.beginPath();
    c.arc(0, 0, SPRITE * 0.17, 0, Math.PI * 2);
    c.strokeStyle = '#FFE593';
    c.lineWidth = 1.4;
    c.stroke();
  } else if (color.toUpperCase() === '#FFFFFF') {
    // White pieces get a whisper of outline so they read on cream.
    c.save();
    shapePath(c, shape);
    c.restore();
    c.lineWidth = 1;
    c.strokeStyle = 'rgba(183,163,173,0.55)';
    if (shape !== 'sparkle') c.stroke();
  }
  sprites.set(key, cv);
  return cv;
}

/* ---------------- Canvas lifecycle ---------------- */

function resize() {
  if (!canvas || !ctx) return;
  const nextDpr = Math.min(2, window.devicePixelRatio || 1);
  if (nextDpr !== dpr) sprites.clear();
  dpr = nextDpr;
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
}

function ensureCanvas(): CanvasRenderingContext2D | null {
  if (canvas && ctx) return ctx;
  canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:280';
  ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas = null;
    return null;
  }
  document.body.appendChild(canvas);
  resize();
  addEventListener('resize', resize);
  return ctx;
}

function teardown() {
  cancelAnimationFrame(raf);
  raf = 0;
  removeEventListener('resize', resize);
  canvas?.remove();
  canvas = null;
  ctx = null;
  sprites.clear();
}

function frame(now: number) {
  const c = ctx;
  if (!c || !canvas) return;
  const dt = Math.min(48, now - last || 16);
  last = now;
  const h = innerHeight;
  particles = particles.filter((p) => step(p, dt, h));

  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, canvas.width, canvas.height);
  for (const p of particles) {
    const a = alphaOf(p);
    if (a <= 0) continue;
    const img = sprite(p.shape, p.color);
    const pulse = p.still ? 0.7 + 0.5 * Math.sin((p.age / p.life) * Math.PI) : 1;
    const flutter = p.shape === 'circle' || p.still ? 1 : 0.35 + 0.65 * Math.abs(Math.cos(p.wob));
    const s = (p.size / (SPRITE * 0.72)) * pulse * dpr;
    const cos = Math.cos(p.rot);
    const sin = Math.sin(p.rot);
    c.globalAlpha = a;
    c.setTransform(cos * s * flutter, sin * s * flutter, -sin * s, cos * s, p.x * dpr, p.y * dpr);
    c.drawImage(img, -SPRITE / 2, -SPRITE / 2, SPRITE, SPRITE);
  }
  c.globalAlpha = 1;

  if (particles.length) {
    raf = requestAnimationFrame(frame);
  } else {
    raf = 0;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, canvas.width, canvas.height);
    idleTimer = window.setTimeout(teardown, IDLE_REMOVE_MS);
  }
}

function add(batch: Particle[]) {
  if (!batch.length || !ensureCanvas()) return;
  clearTimeout(idleTimer);
  particles.push(...batch);
  if (particles.length > MAX_LIVE) particles.splice(0, particles.length - MAX_LIVE);
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
}

const DEFAULT_SHAPES: Record<Intensity, ParticleShape[]> = {
  tiny: ['sparkle', 'circle', 'star'],
  small: ['sparkle', 'circle', 'star', 'heart'],
  medium: ['petal', 'heart', 'star', 'circle', 'sparkle'],
  big: ['petal', 'heart', 'star', 'circle', 'sparkle'],
  epic: ['petal', 'heart', 'star', 'circle', 'sparkle'],
};

/** Launch speed range per intensity (px/ms): tiny puffs stay close, epic ones fill the room. */
const SPEED: Record<Intensity, [number, number]> = {
  tiny: [0.12, 0.32],
  small: [0.2, 0.55],
  medium: [0.35, 0.9],
  big: [0.45, 1.1],
  epic: [0.55, 1.3],
};

export function burst(opts: BurstOptions = {}): void {
  if (typeof window === 'undefined' || document.hidden) return;
  try {
    const intensity = opts.intensity ?? 'medium';
    const count = BUDGET[intensity];
    const shapes = opts.shapes?.length ? opts.shapes : DEFAULT_SHAPES[intensity];
    const colors = opts.colors?.length ? opts.colors : PASTEL_CONFETTI;
    const hasOrigin = opts.x !== undefined && opts.y !== undefined;
    const x = opts.x ?? innerWidth / 2;
    const y = opts.y ?? innerHeight / 2;

    if (prefersReducedMotion()) {
      const radius = hasOrigin ? 40 + count * 1.2 : Math.min(innerWidth, innerHeight) * 0.4;
      add(spawnStill({ x, y, count: Math.max(4, Math.min(18, Math.round(count / 6))), radius, colors }));
      return;
    }

    const speed = SPEED[intensity];
    const small = intensity === 'tiny' || intensity === 'small';
    if (!hasOrigin && (intensity === 'big' || intensity === 'epic')) {
      // Two party cannons from the bottom corners, aimed up and inward.
      const half = Math.round(count / 2);
      const up = -Math.PI / 2;
      add(spawn({ x: -10, y: innerHeight + 10, count: half, shapes, colors, angle: up + 0.45, spread: 0.32, speed: [speed[0] + 0.35, speed[1] + 0.45] }));
      add(spawn({ x: innerWidth + 10, y: innerHeight + 10, count: count - half, shapes, colors, angle: up - 0.45, spread: 0.32, speed: [speed[0] + 0.35, speed[1] + 0.45] }));
      return;
    }
    add(spawn({ x, y, count, shapes, colors, spread: small ? Math.PI : Math.PI / 2.4, speed }));
  } catch {
    /* Confetti is decoration. */
  }
}
