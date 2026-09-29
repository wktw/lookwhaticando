import type { ComponentChildren, JSX, Ref } from 'preact';
import { useId } from 'preact/hooks';
import type { MachineDef } from '@/catalog/types';
import {
  CAP,
  CHUTE,
  COLLAR,
  CRANK,
  CRANK_REST,
  DECAL,
  DOME,
  DOME_INNER,
  FEET,
  GROUND_Y,
  OUTLINE,
  SLOT,
  STROKE,
  TRAY,
  VIEWBOX,
  bodyPath,
  capPath,
} from './geometry';
import { shade, tint } from './color';
import { DomeCapsules } from './DomeCapsules';
import { MOTIFS, type MotifCtx } from './motifs';
import { settledPile } from './pile';
import { machineTheme } from './theme';
import './machine.css';

type Theme = MachineDef['theme'];

export interface MachineArtProps {
  machine: MachineDef;
  /** Replaces the dome capsules (interactive machines render their own); defaults to the settled pile. */
  dome?: JSX.Element;
  /** The machine's root <svg>, e.g. for idle life. */
  svgRef?: Ref<SVGSVGElement>;
  /** The rotating crank handle, for direct transform writes. */
  crankRef?: Ref<SVGGElement>;
  /** The coin plate (it jiggles when you turn the crank before paying). */
  slotRef?: Ref<SVGGElement>;
  /** The chute flap (hinged at its top edge). */
  flapRef?: Ref<SVGGElement>;
  /** Drawn inside the chute opening, under the flap: a capsule on its way out. */
  chute?: JSX.Element;
  /** Drawn over everything: the coin, the rolled-out capsule. */
  children?: ComponentChildren;
  /** Accessible label; decorative when omitted. */
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
  /** CSS height (width follows the 240:350 aspect). Defaults to filling the container width. */
  height?: number | string;
}

/**
 * One parametric gumball machine, themed by MachineDef.theme and dressed with its series
 * motif (DESIGN §6.2): glass dome with a highlight, capsules inside, coin slot, crank,
 * chute with a flap, price plate, and two little mochi feet. Same outline language as the pets.
 */
export function MachineArt(props: MachineArtProps) {
  const { machine, title, height } = props;
  const uid = `mc${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const theme = machineTheme(machine);
  const motif = MOTIFS[machine.id];
  const ctx: MotifCtx = { theme, uid };
  const px = typeof height === 'number' ? `${height}px` : height;

  return (
    <svg
      ref={props.svgRef}
      class={['machine', `machine-${machine.id}`, props.class ?? ''].filter(Boolean).join(' ')}
      viewBox={VIEWBOX}
      width={px ? undefined : '100%'}
      height={px}
      style={props.style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <clipPath id={`${uid}-body`}>
          <path d={bodyPath()} />
        </clipPath>
        <clipPath id={`${uid}-dome`}>
          <circle cx={DOME.cx} cy={DOME.cy} r={DOME_INNER} />
        </clipPath>
        <clipPath id={`${uid}-chute`}>
          <rect x={CHUTE.cx - CHUTE.w / 2 + 5} y={CHUTE.cy - CHUTE.h / 2 + 5} width={CHUTE.w - 10} height={CHUTE.h - 10} rx={7} />
        </clipPath>
      </defs>

      <ellipse cx={120} cy={GROUND_Y} rx={96} ry={7} fill={OUTLINE} opacity={0.1} />
      {motif.back?.(ctx)}

      <g fill={shade(theme.body, 0.1)} stroke={OUTLINE} stroke-width={STROKE}>
        <ellipse cx={120 - FEET.dx} cy={FEET.y} rx={FEET.rx} ry={FEET.ry} />
        <ellipse cx={120 + FEET.dx} cy={FEET.y} rx={FEET.rx} ry={FEET.ry} />
      </g>

      <MachineBody ctx={ctx} uid={uid} pattern={motif.body?.(ctx)} />
      <g transform={`translate(${DECAL.cx} ${DECAL.cy})`}>{motif.decal?.(ctx)}</g>
      <CoinSlot theme={theme} slotRef={props.slotRef} />
      <Chute theme={theme} uid={uid} flapRef={props.flapRef}>
        {props.chute}
      </Chute>
      <Crank theme={theme} crankRef={props.crankRef} />

      <Glass uid={uid} theme={theme}>
        {props.dome ?? <DomeCapsules uid={uid} colors={theme.capsules} bodies={settledPile(machine)} />}
      </Glass>
      <Collar machine={machine} theme={theme} />

      {motif.capBack?.(ctx)}
      {!motif.topper && <Knob theme={theme} />}
      <path d={capPath()} fill={theme.body} stroke={OUTLINE} stroke-width={STROKE} stroke-linejoin="round" />
      <path
        d={`M${CAP.cx - 22} ${CAP.top + 7} Q${CAP.cx - 12} ${CAP.top + 2.5} ${CAP.cx - 2} ${CAP.top + 3}`}
        fill="none"
        stroke="#fff"
        stroke-width={3.4}
        stroke-linecap="round"
        opacity={0.7}
      />
      <rect
        x={CAP.cx - CAP.halfWidth - 5}
        y={CAP.bottom - 5}
        width={(CAP.halfWidth + 5) * 2}
        height={10}
        rx={5}
        fill={theme.trim}
        stroke={OUTLINE}
        stroke-width={STROKE}
      />
      {motif.cap?.(ctx)}
      {motif.topper?.(ctx)}
      {motif.front?.(ctx)}

      {props.children}
    </svg>
  );
}

function MachineBody({ ctx, uid, pattern }: { ctx: MotifCtx; uid: string; pattern?: JSX.Element | null }) {
  const { theme } = ctx;
  return (
    <g>
      <path d={bodyPath()} fill={theme.body} />
      <g clip-path={`url(#${uid}-body)`}>
        {pattern}
        <ellipse cx={82} cy={222} rx={30} ry={9} transform="rotate(-12 82 222)" fill="#fff" opacity={0.35} />
        <ellipse cx={120} cy={322} rx={110} ry={26} fill={OUTLINE} opacity={0.07} />
      </g>
      <path d={bodyPath()} fill="none" stroke={OUTLINE} stroke-width={STROKE} stroke-linejoin="round" />
    </g>
  );
}

function Glass({ uid, theme, children }: { uid: string; theme: Theme; children: ComponentChildren }) {
  const { cx, cy, r } = DOME;
  const arc = (rad: number, a0: number, a1: number) => {
    const p = (a: number) => `${(cx + Math.cos((a * Math.PI) / 180) * rad).toFixed(2)} ${(cy + Math.sin((a * Math.PI) / 180) * rad).toFixed(2)}`;
    return `M${p(a0)} A${rad} ${rad} 0 0 1 ${p(a1)}`;
  };
  return (
    <g class="machine-glass">
      <circle class="machine-glass-fill" cx={cx} cy={cy} r={r} fill={theme.glass} style={{ '--machine-glass': theme.glass } as JSX.CSSProperties} />
      <ellipse cx={cx} cy={cy + r * 0.62} rx={r * 0.8} ry={r * 0.36} fill={OUTLINE} opacity={0.05} />
      <g clip-path={`url(#${uid}-dome)`}>{children}</g>
      <circle cx={cx} cy={cy} r={r - 5} fill="none" stroke="#fff" stroke-width={7} opacity={0.3} />
      <path d={arc(r - 14, 192, 246)} fill="none" stroke="#fff" stroke-width={10} stroke-linecap="round" opacity={0.88} />
      <path d={arc(r - 14, 254, 263)} fill="none" stroke="#fff" stroke-width={10} stroke-linecap="round" opacity={0.88} />
      <path d={arc(r - 8, 14, 56)} fill="none" stroke="#fff" stroke-width={4.5} stroke-linecap="round" opacity={0.6} />
      <circle cx={cx + r * 0.5} cy={cy - r * 0.52} r={4} fill="#fff" opacity={0.8} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={OUTLINE} stroke-width={STROKE} />
      {/* Night only: a rim of moonlight so the glass edge reads on a dark page. */}
      <g class="machine-night-rim" fill="none" stroke="#fff">
        <circle cx={cx} cy={cy} r={r - 2.6} stroke-width={1.4} opacity={0.3} />
        <circle cx={cx} cy={cy} r={r + 2.8} stroke-width={2.6} opacity={0.1} />
      </g>
    </g>
  );
}

function Collar({ machine, theme }: { machine: MachineDef; theme: Theme }) {
  const { x, y, w, h, r } = COLLAR;
  const stars = machine.currency === 'stars';
  const label = String(machine.price);
  const plateW = 30 + label.length * 8;
  return (
    <g class="machine-collar">
      <rect x={x} y={y} width={w} height={h} rx={r} fill={theme.trim} stroke={OUTLINE} stroke-width={STROKE} />
      <path d={`M${x + 10} ${y + 5} L${x + 34} ${y + 5}`} stroke="#fff" stroke-width={3} stroke-linecap="round" opacity={0.75} />
      <g transform={`translate(120 ${y + h / 2})`}>
        <rect x={-plateW / 2} y={-8.5} width={plateW} height={17} rx={8.5} fill="#fff" stroke={OUTLINE} stroke-width={1.8} />
        <g transform={`translate(${-plateW / 2 + 11} 0)`}>{stars ? <MiniStar /> : <MiniCoin />}</g>
        <text x={-plateW / 2 + 21} y={4.6} class="machine-price" fill={theme.ink}>
          {label}
        </text>
      </g>
    </g>
  );
}

function MiniCoin() {
  return (
    <g stroke={OUTLINE} stroke-width={1.3}>
      <circle r={6} fill="#F6C544" />
      <circle r={3.4} fill="none" stroke="#fff" stroke-width={1.1} opacity={0.75} />
    </g>
  );
}

function MiniStar() {
  return (
    <path
      d="M0 -6.6 L1.9 -2.3 L6.4 -1.9 L3 1.1 L4 5.7 L0 3.3 L-4 5.7 L-3 1.1 L-6.4 -1.9 L-1.9 -2.3 Z"
      fill="#FFD65C"
      stroke={OUTLINE}
      stroke-width={1.3}
      stroke-linejoin="round"
    />
  );
}

function Knob({ theme }: { theme: Theme }) {
  return (
    <g stroke={OUTLINE} stroke-width={STROKE}>
      <rect x={114} y={20} width={12} height={14} rx={3} fill={shade(theme.trim, 0.06)} />
      <circle cx={120} cy={18} r={9} fill={theme.trim} />
      <circle cx={116.8} cy={15} r={2.4} fill="#fff" stroke="none" opacity={0.85} />
    </g>
  );
}

/** A coin plate: a little coin over the slit, so it can't be mistaken for a zero. */
function CoinSlot({ theme, slotRef }: { theme: Theme; slotRef?: Ref<SVGGElement> }) {
  const { cx, cy, w, h, slitY } = SLOT;
  return (
    <g class="machine-slot" ref={slotRef}>
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={10} fill={theme.trim} stroke={OUTLINE} stroke-width={STROKE} />
      <path d={`M${cx - 6} ${cy - h / 2 + 5} L${cx + 1} ${cy - h / 2 + 5}`} stroke="#fff" stroke-width={2.4} stroke-linecap="round" opacity={0.7} />
      <g transform={`translate(${cx} ${cy - 10})`} stroke={OUTLINE} stroke-width={1.5}>
        <circle r={5.6} fill="#F6C544" />
        <circle r={3.1} fill="none" stroke="#FFE593" stroke-width={1.2} />
      </g>
      <rect x={cx - 2.4} y={slitY - 8} width={4.8} height={16} rx={2.4} fill={OUTLINE} opacity={0.88} />
    </g>
  );
}

function Chute({ theme, uid, flapRef, children }: { theme: Theme; uid: string; flapRef?: Ref<SVGGElement>; children?: ComponentChildren }) {
  const { cx, cy, w, h } = CHUTE;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const t = TRAY;
  const tl = t.cx - t.w / 2;
  const tr = t.cx + t.w / 2;
  return (
    <g class="machine-chute">
      <rect x={x} y={y} width={w} height={h} rx={11} fill={theme.trim} stroke={OUTLINE} stroke-width={STROKE} />
      <rect x={x + 5} y={y + 5} width={w - 10} height={h - 10} rx={7} fill="#4A3540" />
      <g clip-path={`url(#${uid}-chute)`}>{children}</g>
      <g class="machine-flap" ref={flapRef}>
        <rect x={x + 5} y={y + 5} width={w - 10} height={h - 10} rx={7} fill={shade(theme.trim, 0.1)} stroke={OUTLINE} stroke-width={1.8} />
        <path d={`M${cx - 8} ${y + 10.5} L${cx + 8} ${y + 10.5}`} stroke={OUTLINE} stroke-width={2} stroke-linecap="round" opacity={0.45} />
      </g>
      {/* the tray lip the capsule rolls out over */}
      <path
        d={`M${tl + 3} ${t.y} H${tr - 3} Q${tr + 1} ${t.y} ${tr} ${t.y + 3} L${tr - 2} ${t.y + t.h - 2.5} Q${tr - 3} ${t.y + t.h} ${tr - 6} ${t.y + t.h} H${tl + 6} Q${tl + 3} ${t.y + t.h} ${tl + 2} ${t.y + t.h - 2.5} L${tl} ${t.y + 3} Q${tl - 1} ${t.y} ${tl + 3} ${t.y} Z`}
        fill={shade(theme.trim, 0.05)}
        stroke={OUTLINE}
        stroke-width={STROKE}
        stroke-linejoin="round"
      />
      <path d={`M${tl + 8} ${t.y + 3} H${t.cx - 6}`} stroke="#fff" stroke-width={2.2} stroke-linecap="round" opacity={0.75} />
    </g>
  );
}

/** Scalloped "flower" hub: reads as something you turn, and it's cute. */
function hubPath(r: number, bumps: number): string {
  const pt = (a: number) => `${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`;
  const chord = 2 * r * Math.sin(Math.PI / bumps);
  let d = `M${pt(0)}`;
  for (let i = 1; i <= bumps; i++) d += ` A${(chord * 0.62).toFixed(2)} ${(chord * 0.62).toFixed(2)} 0 0 1 ${pt((i / bumps) * Math.PI * 2)}`;
  return `${d} Z`;
}

function Crank({ theme, crankRef }: { theme: Theme; crankRef?: Ref<SVGGElement> }) {
  const { cx, cy, r } = CRANK;
  const knob = theme.body === '#FFFFFF' ? theme.trim : theme.body;
  return (
    <g class="machine-crank" transform={`translate(${cx} ${cy})`}>
      <circle class="machine-crank-glow" r={r + 11} fill="none" stroke="#FFE593" stroke-width={7} />
      <path d={hubPath(r - 2.5, 9)} fill={theme.trim} stroke={OUTLINE} stroke-width={STROKE} stroke-linejoin="round" />
      <circle r={r - 9} fill={tint(theme.trim, 0.55)} stroke={OUTLINE} stroke-width={1.5} opacity={0.95} />
      <g class="machine-crank-wobble">
        <g class="machine-crank-handle" ref={crankRef} transform={`rotate(${CRANK_REST})`}>
          <rect x={-4.6} y={-r + 3} width={9.2} height={r - 1} rx={4.6} fill={shade(theme.trim, 0.08)} stroke={OUTLINE} stroke-width={STROKE} />
          <circle cx={0} cy={-r + 3} r={9.5} fill={knob} stroke={OUTLINE} stroke-width={STROKE} />
          <circle cx={-3} cy={-r} r={2.6} fill="#fff" opacity={0.85} />
          <circle r={6.2} fill={knob} stroke={OUTLINE} stroke-width={2.2} />
        </g>
      </g>
    </g>
  );
}
