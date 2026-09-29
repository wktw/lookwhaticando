import { OUTLINE } from '@/art/pets/geometry';
import type { ScenePalette } from '../palette';
import { GATE_X } from '../layout';
import { useUid } from '../uid';

/**
 * The picket fence along the horizon, edge to edge, with an arched garden gate where the path
 * arrives. Drawn on the land canvas (see Land.tsx): a 7-post tile repeated as a pattern, so the
 * posts always meet the gate squarely whatever the scene's width.
 */
const LINE = 3.4;
const PITCH = 66;
/** Post height nudges within one tile, so the pickets look hand-built rather than stamped. */
const NUDGE = [0, -4, 2, -2, 3, -1, 1] as const;
const TILE = PITCH * NUDGE.length;
/** Gate posts stand this far either side of the gate's centre. */
const GATE_POST = 47;
const RAILS = [414, 440] as const;

/** A pattern x-offset that puts a tile's post `index` at canvas x `at`. */
const alignPost = (index: number, at: number) => (((at - (PITCH / 2 + index * PITCH)) % TILE) + TILE) % TILE;

function Vine({ x }: { x: number }) {
  const flowers = [
    { x: x - 6, y: 450, c: '#FFC4D3' },
    { x: x + 7, y: 432, c: '#FFFDF7' },
    { x: x - 3, y: 412, c: '#FFC4D3' },
  ];
  return (
    <g>
      <path d={`M${x - 9} 466 C${x + 12} 458 ${x - 12} 440 ${x + 9} 430 C${x - 4} 424 ${x + 6} 412 ${x - 2} 404`} fill="none" stroke="#86B972" stroke-width={3} stroke-linecap="round" />
      {flowers.map((f) => (
        <g key={f.y} fill={f.c} stroke={OUTLINE} stroke-width={1.2}>
          <circle cx={f.x - 3} cy={f.y} r={3} />
          <circle cx={f.x + 3} cy={f.y} r={3} />
          <circle cx={f.x} cy={f.y - 3} r={3} />
          <circle cx={f.x} cy={f.y + 3} r={3} />
          <circle cx={f.x} cy={f.y} r={1.8} fill="#FFD65C" />
        </g>
      ))}
    </g>
  );
}

function Picket({ palette, x, dy }: { palette: ScenePalette; x: number; dy: number }) {
  return (
    <g>
      <path
        d={`M${x - 8} 470 L${x - 8} ${404 + dy} Q${x - 8} ${394 + dy} ${x} ${390 + dy} Q${x + 8} ${394 + dy} ${x + 8} ${404 + dy} L${x + 8} 470 Z`}
        fill={palette.wood}
        stroke={palette.line}
        stroke-width={LINE}
        stroke-linejoin="round"
      />
      <rect x={x + 1.5} y={405 + dy} width={5} height={62 - dy} rx={2.5} fill={palette.woodShade} />
    </g>
  );
}

/** Two half-doors whose tops rise into an arch, a heart where they meet, and a lantern on the post. */
function Gate({ palette, glow }: { palette: ScenePalette; glow: string }) {
  const lit = palette.night;
  const door = (side: -1 | 1) => {
    const inner = side * 3;
    const outer = side * 38;
    return `M${inner} 470 L${inner} 392 Q${side * 20} 394 ${outer} 406 L${outer} 470 Z`;
  };
  return (
    <g transform={`translate(${GATE_X} 0)`} stroke={palette.line} stroke-width={LINE} stroke-linejoin="round" stroke-linecap="round">
      {[-1, 1].map((side) => (
        <g key={side}>
          <path d={door(side as -1 | 1)} fill={palette.wood} />
          <path d={`M${side * 20} 398 L${side * 20} 466 M${side * 10} 394 L${side * 10} 466 M${side * 30} 402 L${side * 30} 466`} fill="none" stroke={palette.woodShade} stroke-width={3} />
          <path d={`M${side * 5} 432 L${side * 36} 432`} fill="none" stroke-width={2.4} />
        </g>
      ))}
      <path d="M-6.5 388 C-8 384 -3.5 381.5 0 385 C3.5 381.5 8 384 6.5 388 L0 394 Z" fill={lit ? '#D7839F' : '#F58CAA'} stroke-width={2.4} />
      {[-GATE_POST, GATE_POST].map((x) => (
        <g key={x}>
          <rect x={x - 10} y={378} width={20} height={94} rx={4} fill={palette.wood} />
          <rect x={x + 2} y={384} width={5} height={82} rx={2.5} fill={palette.woodShade} stroke="none" />
          <circle cx={x} cy={370} r={9} fill={palette.woodShade} />
          <circle cx={x - 3} cy={367} r={2.6} fill="#fff" opacity={0.6} stroke="none" />
        </g>
      ))}
      {/* a little lantern hung from the right post, lit at night */}
      <path d={`M${GATE_POST + 10} 392 L${GATE_POST + 22} 392 L${GATE_POST + 22} 398`} fill="none" stroke-width={2.6} />
      {lit && <circle cx={GATE_POST + 22} cy={410} r={46} fill={`url(#${glow})`} stroke="none" />}
      <rect x={GATE_POST + 15} y={398} width={14} height={19} rx={4} fill={lit ? '#FFE9A3' : '#FFF6DE'} stroke-width={2.4} />
      <rect x={GATE_POST + 14} y={396} width={16} height={4.5} rx={2} fill="#C9A0DC" stroke-width={2.2} />
    </g>
  );
}

export function Fence({ palette, glow }: { palette: ScenePalette; glow: string }) {
  const id = useUid('fence');
  const leftEnd = GATE_X - GATE_POST;
  const rightStart = GATE_X + GATE_POST;
  const tile = (
    <>
      {NUDGE.map((dy, i) => (
        <Picket key={i} palette={palette} x={PITCH / 2 + i * PITCH} dy={dy} />
      ))}
      <Vine x={PITCH / 2 + 3 * PITCH} />
    </>
  );
  return (
    <g>
      <defs>
        <pattern id={`${id}-l`} x={alignPost(NUDGE.length - 1, leftEnd - PITCH)} y={0} width={TILE} height={1000} patternUnits="userSpaceOnUse">
          {tile}
        </pattern>
        <pattern id={`${id}-r`} x={alignPost(0, rightStart + PITCH)} y={0} width={TILE} height={1000} patternUnits="userSpaceOnUse">
          {tile}
        </pattern>
      </defs>
      <g stroke={palette.line} stroke-width={LINE} stroke-linejoin="round" fill={palette.wood}>
        {RAILS.map((y) => (
          <g key={y}>
            <rect x={-100} y={y} width={leftEnd + 100} height={11} rx={5.5} />
            <rect x={rightStart} y={y} width={6100 - rightStart} height={11} rx={5.5} />
          </g>
        ))}
      </g>
      <rect x={-100} y={380} width={leftEnd - PITCH / 2 + 100} height={95} fill={`url(#${id}-l)`} />
      <rect x={rightStart + PITCH / 2} y={380} width={6100 - rightStart} height={95} fill={`url(#${id}-r)`} />
      <Gate palette={palette} glow={glow} />
    </g>
  );
}
