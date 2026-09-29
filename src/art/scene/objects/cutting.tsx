/**
 * The Cutting (DESIGN §13), the lifetime gauge: a pothos cutting by the window from day one. It grows on the
 * sunshine of every habit together: roots in its glass, then a pot, then a vine that trails along the window frame
 * until it frames the whole window. The pot is the plants module's own pothos; the vine is drawn here, along a path
 * the scene gives (up the jamb, across the head of the window, down the other side).
 */
import type { JSX } from 'preact';
import type { Light } from '@/art/light';
import { PlantArt } from '@/art/plants';
import type { Pt } from '../decor/geo';

/** How much of its path the vine covers (0 until the Cutting is potted and leafy, 1 when it frames the window). */
export function vineReach(stage: number, overall: number): number {
  if (stage < 3) return 0;
  const t = (Math.max(0, Math.min(1, overall)) * 7 - 2.6) / 4.4;
  return stage >= 7 ? 1 : Math.max(0.06, Math.min(1, t));
}

/** The stage the pot shows: the glass (0), roots (1), potted (2), then a leafy pothos from which the vine runs. */
export const cuttingPotStage = (stage: number): number => (stage <= 1 ? Math.max(0, Math.floor(stage)) : stage === 2 ? 2 : 3);

/** The cutting in its glass or pot, on its own canvas (PlantArt's scene frame). */
export function CuttingPot({ stage, light, animated }: { stage: number; light: Light; animated?: boolean }): JSX.Element {
  return <PlantArt species="pothos" stage={cuttingPotStage(stage)} progress={stage >= 3 ? 1 : 0.5} pot="terracotta" size="100%" light={light} animated={animated} seed="the-cutting" />;
}

const LEAF = 'M0 0C-1.9 -0.9 -2.6 -3.4 -0.1 -5.4C2.6 -3.4 1.9 -0.9 0 0Z';
const GREENS = { light: '#AECB92', dark: '#86AE77', stripe: '#E8EFCF', vine: '#8FAF78' };
const NIGHT = { light: '#8FA386', dark: '#6E8766', stripe: '#B9BFA6', vine: '#76906A' };

/** Points `t` of the way along a polyline, with the heading there. */
function walk(path: readonly Pt[], len: number): { at: Pt; dir: Pt } {
  let left = len;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (left <= seg || i === path.length - 1) {
      const k = seg ? Math.min(1, left / seg) : 0;
      return { at: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], dir: seg ? [(b[0] - a[0]) / seg, (b[1] - a[1]) / seg] : [0, -1] };
    }
    left -= seg;
  }
  return { at: path[path.length - 1]!, dir: [0, -1] };
}

export function pathLength(path: readonly Pt[]): number {
  let n = 0;
  for (let i = 1; i < path.length; i++) n += Math.hypot(path[i]![0] - path[i - 1]![0], path[i]![1] - path[i - 1]![1]);
  return n;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * The vine along `path` (scene units), `reach` of the way. A slightly wavering stem with pothos leaves every few
 * units, alternating sides, the variegated light ones on the lit side. Drawn into the scene's own SVG.
 */
export function CuttingVine({ path, reach, light }: { path: readonly Pt[]; reach: number; light: Light }): JSX.Element | null {
  if (reach <= 0 || path.length < 2) return null;
  const inks = light.night ? NIGHT : GREENS;
  const total = pathLength(path) * Math.min(1, reach);
  const step = 1.4;
  let d = '';
  const leaves: JSX.Element[] = [];
  for (let s = 0, i = 0; s <= total; s += step, i++) {
    const { at, dir } = walk(path, s);
    const wob = Math.sin(s * 0.55) * 0.5;
    const x = at[0] - dir[1] * wob;
    const y = at[1] + dir[0] * wob;
    d += `${i ? 'L' : 'M'}${r2(x)} ${r2(y)}`;
    if (i % 3 === 1) {
      const side = (i / 3) % 2 < 1 ? 1 : -1;
      const ang = (Math.atan2(dir[1], dir[0]) * 180) / Math.PI + 90 + side * 62;
      const grow = Math.min(1, (total - s) / 6 + 0.35);
      const tone = side > 0 ? inks.light : inks.dark;
      leaves.push(
        <g key={i} transform={`translate(${r2(x)} ${r2(y)}) rotate(${r2(ang)}) scale(${r2(0.62 * grow)})`}>
          <path d={LEAF} fill={tone} />
          {side > 0 && <path d="M0 -0.6C-0.4 -2 -0.3 -3.4 0 -4.6" fill="none" stroke={inks.stripe} stroke-width={0.5} stroke-linecap="round" />}
        </g>,
      );
    }
  }
  return (
    <g data-cutting-vine={r2(reach)}>
      <path d={d} fill="none" stroke={inks.vine} stroke-width={0.42} stroke-linecap="round" stroke-linejoin="round" />
      {leaves}
    </g>
  );
}
