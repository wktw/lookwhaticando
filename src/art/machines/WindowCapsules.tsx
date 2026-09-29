import type { DomeBody } from '@/fx/physics';
import { moon } from './crescent';
import { mix, richer } from './color';
import type { Lighting } from './lighting';

/**
 * The capsules behind a cabinet's glass. Each capsule has one clear half and one tinted half
 * (DESIGN §10.4), with the folded paper insert showing through the clear one. A tint is one
 * <symbol>, so a capsule is three <use> nodes: the shell, which turns as it tumbles, then its
 * shade crescent and glint, which stay put because the window light doesn't turn with it.
 *
 * Interactive cabinets pass `register` to get each capsule's nodes and move them with direct
 * attribute writes from a rAF loop, never through Preact state.
 */

export interface CapsuleNodes {
  root: SVGGElement;
  shell: SVGUseElement;
}

export interface WindowCapsulesProps {
  uid: string;
  colors: readonly string[];
  bodies: readonly DomeBody[];
  lighting: Lighting;
  register?: (id: number, nodes: CapsuleNodes | null) => void;
}

export function capsuleTransforms(b: Pick<DomeBody, 'x' | 'y' | 'angle'>): { root: string; shell: string } {
  return {
    root: `translate(${b.x.toFixed(2)} ${b.y.toFixed(2)})`,
    shell: `rotate(${((b.angle * 180) / Math.PI).toFixed(1)})`,
  };
}

/** A capsule shell in its own turning frame: tinted half below, clear half above, insert inside. */
export function ShellSymbol({ id, r, color, lighting }: { id: string; r: number; color: string; lighting: Lighting }) {
  const lit = lighting.lit;
  const night = lighting.light.night;
  // Clear plastic keeps its body at night; the pastel tints dim least (lighting.tint).
  const clear = night ? 0.32 : 0.38;
  const tint = richer(color);
  return (
    <symbol id={id} overflow="visible">
      <path d={`M${-r} 0 A${r} ${r} 0 0 0 ${r} 0 Z`} fill={lighting.tint(tint)} />
      {/* The folded insert, seen through the clear half. */}
      <path d={`M${-r * 0.56} -0.6 L${-r * 0.44} ${-r * 0.5} L${r * 0.46} ${-r * 0.58} L${r * 0.58} -0.6 Z`} fill={lit('#FFFBF2')} opacity={0.9} />
      <path d={`M${-r} 0 A${r} ${r} 0 0 1 ${r} 0 Z`} fill={night ? '#F3E6DA' : '#FFFFFF'} opacity={clear} />
      <rect x={-r - 0.4} y={-1.3} width={2 * r + 0.8} height={2.6} rx={1.3} fill={lighting.tint(mix(tint, '#FFFFFF', 0.3))} />
    </symbol>
  );
}

/** The crescent and glint every capsule shares (fixed to the room, not the capsule). */
export function CapsuleLightSymbols({ uid, r, lighting }: { uid: string; r: number; lighting: Lighting }) {
  const [tx, ty] = lighting.toward;
  const len = Math.hypot(tx, ty);
  const a = (Math.atan2(ty, tx) * 180) / Math.PI;
  return (
    <>
      <symbol id={`${uid}-shade`} overflow="visible">
        <path d={moon(0, 0, r, lighting.toward, r * 0.46)} fill={lighting.shade} />
      </symbol>
      <symbol id={`${uid}-glint`} overflow="visible">
        <ellipse
          cx={(tx / len) * r * 0.58}
          cy={(ty / len) * r * 0.58}
          rx={r * 0.12}
          ry={r * 0.3}
          transform={`rotate(${a.toFixed(1)} ${((tx / len) * r * 0.58).toFixed(2)} ${((ty / len) * r * 0.58).toFixed(2)})`}
          fill="#FFFFFF"
          opacity={lighting.light.night ? 0.45 : 0.85}
        />
      </symbol>
    </>
  );
}

export function WindowCapsules({ uid, colors, bodies, lighting, register }: WindowCapsulesProps) {
  const r = bodies[0]?.r ?? 11.5;
  return (
    <g class="window-capsules">
      <defs>
        {colors.map((c, i) => (
          <ShellSymbol key={c + i} id={`${uid}-shell-${i}`} r={r} color={c} lighting={lighting} />
        ))}
        <CapsuleLightSymbols uid={uid} r={r} lighting={lighting} />
      </defs>
      {bodies.map((b) => {
        const t = capsuleTransforms(b);
        return (
          <g
            key={b.id}
            transform={t.root}
            ref={register ? (el: SVGGElement | null) => register(b.id, el ? { root: el, shell: el.firstElementChild as SVGUseElement } : null) : undefined}
          >
            <use href={`#${uid}-shell-${b.tint % colors.length}`} transform={t.shell} />
            <use href={`#${uid}-shade`} />
            <use href={`#${uid}-glint`} />
          </g>
        );
      })}
    </g>
  );
}
