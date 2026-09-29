import type { ScenePalette } from '../palette';

/** A picket fence running along the horizon. Canvas 1400×1000 at the scene's scale. */
const LINE = 3;
/** Posts: [x, height nudge] so the pickets look hand-built rather than stamped. */
const POSTS = Array.from({ length: 21 }, (_, i) => [40 + i * 66, [0, -4, 2, -2, 3, -1, 1][i % 7]!] as const);
/** Posts with a flowering vine. */
const VINES = [3, 11, 16];

function Vine({ x }: { x: number }) {
  return (
    <g>
      <path d={`M${x - 9} 466 C${x + 12} 458 ${x - 12} 440 ${x + 9} 430 C${x - 4} 424 ${x + 6} 412 ${x - 2} 404`} fill="none" stroke="#86B972" stroke-width={3} stroke-linecap="round" />
      {[
        [x - 6, 450, '#FFC4D3'],
        [x + 7, 432, '#FFFDF7'],
        [x - 3, 412, '#FFC4D3'],
      ].map(([fx, fy, c]) => (
        <g key={fy as number} fill={c as string} stroke="#5A3E45" stroke-width={1.2}>
          <circle cx={(fx as number) - 3} cy={fy as number} r={3} />
          <circle cx={(fx as number) + 3} cy={fy as number} r={3} />
          <circle cx={fx as number} cy={(fy as number) - 3} r={3} />
          <circle cx={fx as number} cy={(fy as number) + 3} r={3} />
          <circle cx={fx as number} cy={fy as number} r={1.8} fill="#FFD65C" />
        </g>
      ))}
    </g>
  );
}

export function Fence({ palette, class: cls }: { palette: ScenePalette; class?: string }) {
  return (
    <svg class={cls} viewBox="0 0 1400 1000" aria-hidden="true" focusable="false">
      <g stroke={palette.line} stroke-width={LINE} stroke-linejoin="round">
        <rect x={20} y={414} width={1360} height={11} rx={5.5} fill={palette.wood} />
        <rect x={20} y={440} width={1360} height={11} rx={5.5} fill={palette.wood} />
        {POSTS.map(([x, dy]) => (
          <path key={x} d={`M${x - 8} 470 L${x - 8} ${404 + dy} Q${x - 8} ${394 + dy} ${x} ${390 + dy} Q${x + 8} ${394 + dy} ${x + 8} ${404 + dy} L${x + 8} 470 Z`} fill={palette.wood} />
        ))}
      </g>
      <g fill={palette.woodShade}>
        {POSTS.map(([x, dy]) => (
          <rect key={x} x={x + 1.5} y={405 + dy} width={5} height={62 - dy} rx={2.5} />
        ))}
      </g>
      {VINES.map((i) => <Vine key={i} x={POSTS[i]![0]} />)}
    </svg>
  );
}
