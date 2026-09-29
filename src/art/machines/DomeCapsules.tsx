import type { DomeBody } from '@/fx/physics';
import { OUTLINE } from './geometry';
import { shade, tint } from './color';

/**
 * The capsules visible inside the glass. Each tint is defined once as a <symbol>, so a
 * capsule is just two <use> nodes: a shell that rotates as it tumbles and a highlight that
 * stays up-left (the light doesn't turn with the capsule).
 *
 * Interactive machines pass `register` to get each capsule's nodes and then move them with
 * direct attribute writes from a rAF loop, never through Preact state.
 */

export interface CapsuleNodes {
  root: SVGGElement;
  shell: SVGUseElement;
}

export interface DomeCapsulesProps {
  uid: string;
  colors: readonly string[];
  bodies: readonly DomeBody[];
  register?: (id: number, nodes: CapsuleNodes | null) => void;
}

export function capsuleTransforms(b: Pick<DomeBody, 'x' | 'y' | 'angle'>): { root: string; shell: string } {
  return {
    root: `translate(${b.x.toFixed(2)} ${b.y.toFixed(2)})`,
    shell: `rotate(${((b.angle * 180) / Math.PI).toFixed(1)})`,
  };
}

export function DomeCapsules({ uid, colors, bodies, register }: DomeCapsulesProps) {
  const r = bodies[0]?.r ?? 12.5;
  return (
    <g class="dome-capsules">
      <defs>
        {colors.map((c, i) => (
          <symbol key={c + i} id={`${uid}-shell-${i}`} overflow="visible">
            <path d={`M${-r} 0 A${r} ${r} 0 0 1 ${r} 0 Z`} fill={c} />
            <path d={`M${-r} 0 A${r} ${r} 0 0 0 ${r} 0 Z`} fill={tint(c, 0.6)} />
            <rect x={-r - 0.6} y={-1.5} width={2 * r + 1.2} height={3} rx={1.5} fill={shade(c, 0.14)} />
            <circle r={r} fill="none" stroke={OUTLINE} stroke-width={1.9} />
          </symbol>
        ))}
        <symbol id={`${uid}-shine`} overflow="visible">
          <ellipse cx={-r * 0.42} cy={-r * 0.52} rx={r * 0.3} ry={r * 0.17} transform={`rotate(-38 ${-r * 0.42} ${-r * 0.52})`} fill="#fff" opacity={0.85} />
        </symbol>
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
            <use href={`#${uid}-shine`} />
          </g>
        );
      })}
    </g>
  );
}
