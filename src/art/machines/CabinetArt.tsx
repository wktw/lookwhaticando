import type { ComponentChildren, JSX, Ref } from 'preact';
import { useId } from 'preact/hooks';
import type { MachineDef } from '@/catalog/types';
import { DAY_LIGHT, type Light } from '@/art/light';
import {
  BEZEL,
  BODY,
  CHUTE,
  CHUTE_LIP,
  FEET,
  FLAP_H,
  GLASS,
  GROUND_Y,
  HANDLE,
  HANDLE_REST,
  LABEL,
  MOTIF,
  PLATE,
  PLINTH,
  PRICE,
  SLOT,
  TAG_PIN,
  VIEWBOX,
  inset,
  rectPath,
} from './geometry';
import { band, litSide, moon } from './crescent';
import { lighting, type Lighting } from './lighting';
import { mix } from './color';
import { BRASS } from './theme';
import { MOTIFS, MOTIF_ACCENT } from './labels';
import { WindowCapsules } from './WindowCapsules';
import { settledPile } from './pile';
import './cabinet.css';

export interface CabinetArtProps {
  machine: MachineDef;
  /** The scene's Windowlight (DESIGN §10.4). Defaults to day light from the left. */
  light?: Light;
  /** Replaces the window's capsules (interactive cabinets render their own); defaults to the settled pile. */
  capsules?: JSX.Element;
  /** The cabinet's root <svg>. */
  svgRef?: Ref<SVGSVGElement>;
  /** The grip bar that turns, and its cast shadow: both take the same `rotate()` writes. */
  handleRef?: Ref<SVGGElement>;
  handleShadowRef?: Ref<SVGGElement>;
  /** The slot plate (it nods toward the coin when the handle is tried before paying). */
  slotRef?: Ref<SVGGElement>;
  /** The chute flap, hinged along its top edge. */
  flapRef?: Ref<SVGGElement>;
  /** Drawn inside the chute port, behind the flap: a capsule on its way out. */
  chute?: JSX.Element;
  /** Drawn over everything: the coin going in. */
  children?: ComponentChildren;
  /** The grip's angle for a still frame (degrees; interactive cabinets turn it through `handleRef`). */
  handleAngle?: number;
  /** Hold the chute flap lifted (a still frame with a capsule waiting in the chute). */
  flapOpen?: boolean;
  /** The seasonal paper tag ("until Nov 10"); defaults to the edition's end date, null hides it. */
  tag?: string | null;
  /** Accessible label; decorative when omitted. */
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
  /** CSS height (width follows the 240:350 aspect). Defaults to filling the container width. */
  height?: number | string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "until Nov 10" for a seasonal edition. */
export function untilLabel(machine: MachineDef): string | null {
  const end = machine.seasonal?.end;
  return end ? `until ${MONTHS[end.month - 1]} ${end.day}` : null;
}

/** What the enamel plate and the printed label say. */
export function cabinetWords(machine: MachineDef): { plate: string; label: string } {
  return machine.number ? { plate: machine.number, label: machine.name } : { plate: 'Seasonal', label: machine.name.replace(/ Edition$/, '') };
}

interface Palette {
  body: string;
  plinth: string;
  plinthTop: string;
  bezel: string;
  dish: string;
  lip: string;
  glassBack: string;
  port: string;
  portFloor: string;
  flap: string;
  print: string;
  flapEdge: string;
  brass: string;
  brassDeep: string;
  brassLight: string;
  enamel: string;
  paper: string;
  ink: string;
  accent: string;
  chip: string;
  chipInk: string;
  slit: string;
  tagPaper: string;
  stamp: string;
}

const palettes = new Map<string, Palette>();

function palette(machine: MachineDef, L: Lighting): Palette {
  const key = `${machine.id}:${L.light.from}:${L.light.night ? 1 : 0}`;
  const hit = palettes.get(key);
  if (hit) return hit;
  const { body, trim, ink } = machine.theme;
  const lit = L.lit;
  const plinth = mix(body, ink, 0.26);
  const p: Palette = {
    body: lit(body),
    plinth: lit(plinth),
    plinthTop: lit(mix(plinth, '#FFFFFF', 0.22)),
    bezel: lit(mix(body, ink, 0.07)),
    dish: lit(mix(body, ink, 0.12)),
    lip: lit(mix(body, ink, 0.1)),
    glassBack: lit(mix(body, '#FFFFFF', 0.6)),
    port: lit(mix('#3A3140', body, 0.14)),
    portFloor: lit(mix('#3A3140', body, 0.3)),
    flap: lit(mix(body, ink, 0.24)),
    print: lit(mix(body, ink, 0.42)),
    flapEdge: lit(mix(body, '#FFFFFF', 0.35)),
    brass: lit(BRASS.base),
    brassDeep: lit(BRASS.deep),
    brassLight: lit(BRASS.light),
    enamel: lit('#FFFDF9'),
    paper: lit(trim),
    ink: lit(ink),
    accent: lit(MOTIF_ACCENT[machine.id]),
    chip: lit('#FFFDF9'),
    chipInk: lit('#3B3236'),
    slit: lit('#3B3236'),
    tagPaper: lit('#FBF3DA'),
    stamp: lit('#E7A2AE'),
  };
  palettes.set(key, p);
  return p;
}

/**
 * A tabletop capsule cabinet (DESIGN §7.1), drawn in the catkin language: a painted tin body
 * on a darker plinth, a glass window with the capsules inside, an enamel number plate, the
 * printed series label, a brass handle and slot, and a chute with a flap. Flat and matte,
 * lit by one light with hard shade crescents. Parts that move (the grip, the flap, the slot)
 * are exposed through refs so the pull can animate them without re-rendering.
 */
export function CabinetArt(props: CabinetArtProps) {
  const { machine, title, height } = props;
  const uid = `cab${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const L = lighting(props.light ?? DAY_LIGHT);
  const p = palette(machine, L);
  const px = typeof height === 'number' ? `${height}px` : height;
  const tag = props.tag === undefined ? untilLabel(machine) : props.tag;
  const words = cabinetWords(machine);
  const Motif = MOTIFS[machine.id];
  const toward = L.toward;
  const away: [number, number] = [-toward[0], -toward[1]];
  const shadeDir = L.side === 'right' ? 1 : L.side === 'left' ? -1 : 0;

  return (
    <svg
      ref={props.svgRef}
      class={['cabinet', `cabinet-${machine.id}`, L.light.night ? 'is-night' : '', props.class ?? ''].filter(Boolean).join(' ')}
      viewBox={VIEWBOX}
      width={px ? undefined : '100%'}
      height={px}
      style={props.style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {/* On the table: a flat contact shadow, nudged away from the light. */}
      <ellipse cx={120 + shadeDir * 7} cy={GROUND_Y} rx={104} ry={4.6} style={{ fill: L.contact }} />
      {FEET.xs.map((x) => (
        <rect key={x} x={x} y={FEET.y} width={FEET.w} height={FEET.h} rx={1.6} fill={p.brassDeep} />
      ))}
      <path d={rectPath(PLINTH)} fill={p.plinth} />
      <rect x={PLINTH.x + 2} y={PLINTH.y} width={PLINTH.w - 4} height={3.2} fill={p.plinthTop} />
      <path d={band(PLINTH, L.side, 7)} style={{ fill: L.shade }} />

      {/* Behind the body's openings: the window's back wall, the capsules, the chute port. */}
      <path d={rectPath(GLASS)} fill={p.glassBack} />
      <rect x={GLASS.x} y={GLASS.y + GLASS.h - 2.5} width={GLASS.w} height={2.5} style={{ fill: L.contact }} />
      {props.capsules ?? <WindowCapsules uid={uid} colors={machine.theme.capsules} bodies={settledPile(machine)} lighting={L} />}
      <path d={band(GLASS, litSide(L.side), 7)} style={{ fill: L.shade }} />
      <Reflections L={L} />

      <path d={rectPath(CHUTE)} fill={p.port} />
      <rect x={CHUTE.x + 2} y={CHUTE.y + CHUTE.h - 5} width={CHUTE.w - 4} height={5} rx={2} fill={p.portFloor} />
      {props.chute}

      {/* The painted tin, with its openings, and its side in shade. */}
      <path d={`${rectPath(BODY)} ${rectPath(GLASS)} ${rectPath(CHUTE)}`} fill={p.body} fill-rule="evenodd" />
      <path d={band(BODY, L.side, 7)} style={{ fill: L.shade }} />
      {L.rim && <path d={band(inset(BODY, 0), litSide(L.side), 1.6)} style={{ fill: L.rim }} />}

      <path d={`${rectPath(BEZEL)} ${rectPath(GLASS)}`} fill={p.bezel} fill-rule="evenodd" />
      <path d={band(BEZEL, L.side, 3)} style={{ fill: L.shade }} />

      <Plate p={p} L={L} text={words.plate} />
      <g class="cabinet-label">
        <path d={rectPath(LABEL)} fill={p.paper} />
        <rect x={LABEL.x} y={LABEL.y} width={LABEL.w} height={2.4} style={{ fill: L.shade }} />
        <g transform={`translate(${MOTIF.x} ${MOTIF.y})`}>
          <Motif ink={p.ink} accent={p.accent} paper={p.paper} />
        </g>
        <text class="cabinet-name" x={MOTIF.x + MOTIF.size + 7} y={LABEL.y + 24.5} fill={p.ink}>
          {words.label}
        </text>
      </g>

      <Handle p={p} L={L} away={away} angle={props.handleAngle ?? HANDLE_REST} handleRef={props.handleRef} shadowRef={props.handleShadowRef} />

      <g class="cabinet-slot" ref={props.slotRef}>
        <path d={rectPath(SLOT)} fill={p.brass} />
        <path d={band(SLOT, L.side, 3)} style={{ fill: L.shade }} />
        {machine.currency === 'stars' ? (
          <rect x={SLOT.cx - 8} y={SLOT.cy - 1.8} width={16} height={3.6} rx={1.8} fill={p.slit} />
        ) : (
          <rect x={SLOT.cx - 1.8} y={SLOT.cy - 9} width={3.6} height={18} rx={1.8} fill={p.slit} />
        )}
      </g>
      <g class="cabinet-price">
        <path d={rectPath(PRICE)} fill={p.chip} />
        {machine.currency === 'stars' ? (
          <g transform={`translate(${PRICE.x + 9} ${PRICE.y + PRICE.h / 2})`}>
            <circle r={5} fill={p.stamp} />
            <path d="M-2.2 0.1 -0.6 1.8 2.4-1.8" fill="none" stroke={p.chip} stroke-width={1.2} stroke-linecap="round" stroke-linejoin="round" />
          </g>
        ) : (
          <g transform={`translate(${PRICE.x + 9} ${PRICE.y + PRICE.h / 2})`}>
            <circle r={5} fill={p.brassDeep} />
            <circle r={3.7} fill={p.brass} />
            <path d="M-1.4 1.6C-1.6-0.4-0.4-1.8 1.6-2 1.8 0 0.6 1.4-1.4 1.6Z" fill={p.brassDeep} />
          </g>
        )}
        <text class="cabinet-price-text" x={PRICE.x + 17} y={PRICE.y + 11.6} fill={p.chipInk}>
          {machine.price}
        </text>
      </g>

      <path d={`${rectPath(CHUTE_LIP)} ${rectPath(CHUTE)}`} fill={p.lip} fill-rule="evenodd" />
      <path d={band(CHUTE_LIP, L.side, 3)} style={{ fill: L.shade }} />
      <g class="cabinet-flap" ref={props.flapRef} style={props.flapOpen ? { transform: 'scaleY(0.18)' } : undefined}>
        {/* Smoky clear plastic, hinged at the top, with a small tab to push. */}
        <path d={rectPath({ x: CHUTE.x, y: CHUTE.y, w: CHUTE.w, h: FLAP_H, r: [8, 8, 2, 2] })} fill={p.flap} opacity={0.9} />
        <path d={band({ x: CHUTE.x, y: CHUTE.y, w: CHUTE.w, h: FLAP_H, r: [8, 8, 2, 2] }, 'over', 2.2)} fill={p.flapEdge} opacity={0.55} />
        <rect x={CHUTE.x + CHUTE.w / 2 - 7} y={CHUTE.y + FLAP_H - 4.2} width={14} height={3} rx={1.5} fill={p.flapEdge} opacity={0.8} />
      </g>

      {tag && <SeasonTag p={p} L={L} text={tag} />}
      {props.children}
    </svg>
  );
}

/** The old name, kept for any importer. */
export { CabinetArt as MachineArt };
export type { CabinetArtProps as MachineArtProps };

/** Pale glints on the glass, on the side the light comes from. */
function Reflections({ L }: { L: Lighting }) {
  const { x, y, w, h } = GLASS;
  const fromRight = L.side === 'left';
  const band = (a: number, width: number, slant: number) => {
    const x0 = fromRight ? x + w - a : x + a;
    const d = fromRight ? -1 : 1;
    return `M${x0} ${y} H${x0 + d * width} L${x0 + d * (width - slant)} ${y + h} H${x0 - d * slant} Z`;
  };
  const fill = L.light.night ? '#FFE6C4' : '#FFFFFF';
  const k = L.light.night ? 0.5 : 1;
  return (
    <g class="cabinet-glass" style={{ pointerEvents: 'none' }}>
      <path d={band(30, 16, 24)} fill={fill} opacity={0.3 * k} />
      <path d={band(52, 5, 24)} fill={fill} opacity={0.24 * k} />
    </g>
  );
}

function Plate({ p, L, text }: { p: Palette; L: Lighting; text: string }) {
  const enamel = inset(PLATE, 2.2);
  return (
    <g class="cabinet-plate">
      <path d={rectPath(PLATE)} fill={p.brass} />
      <path d={band(PLATE, L.side, 2.4)} style={{ fill: L.shade }} />
      <path d={rectPath(enamel)} fill={p.enamel} />
      <path d={band(enamel, litSide(L.side), 1.4)} style={{ fill: L.shade }} />
      <text class="cabinet-plate-text" x={PLATE.x + PLATE.w / 2} y={PLATE.y + 16.4} fill={p.ink}>
        {text}
      </text>
    </g>
  );
}

/** A thin printed arc over the dish, clockwise, ending in an arrowhead. */
const TURN_R = HANDLE.dish + 5;
const turnPt = (deg: number, r = TURN_R) => {
  const t = (deg * Math.PI) / 180;
  return [HANDLE.cx + Math.cos(t) * r, HANDLE.cy + Math.sin(t) * r] as const;
};
const [ax0, ay0] = turnPt(-150);
const [ax1, ay1] = turnPt(-42);
const TURN_ARROW = `M${ax0.toFixed(2)} ${ay0.toFixed(2)} A${TURN_R} ${TURN_R} 0 0 1 ${ax1.toFixed(2)} ${ay1.toFixed(2)}`;
const TURN_HEAD = (() => {
  const t = (-36 * Math.PI) / 180;
  const [tx, ty] = turnPt(-36);
  const [bx, by] = turnPt(-45);
  const nx = Math.cos(t) * 2.8;
  const ny = Math.sin(t) * 2.8;
  return `M${tx.toFixed(2)} ${ty.toFixed(2)} L${(bx + nx).toFixed(2)} ${(by + ny).toFixed(2)} L${(bx - nx).toFixed(2)} ${(by - ny).toFixed(2)} Z`;
})();

function Handle({
  p,
  L,
  away,
  angle,
  handleRef,
  shadowRef,
}: {
  p: Palette;
  L: Lighting;
  away: readonly [number, number];
  angle: number;
  handleRef?: Ref<SVGGElement>;
  shadowRef?: Ref<SVGGElement>;
}) {
  const { cx, cy, dish, dial, gripW, gripH } = HANDLE;
  const len = Math.hypot(away[0], away[1]);
  const sx = (away[0] / len) * 2.6;
  const sy = (away[1] / len) * 2.6;
  const grip = <rect x={-gripW / 2} y={-gripH / 2} width={gripW} height={gripH} rx={gripH / 2} />;
  return (
    <g class="cabinet-handle">
      {/* The printed arrow that says which way it turns. */}
      <path d={TURN_ARROW} fill="none" stroke={p.print} stroke-width={1.5} stroke-linecap="round" />
      <path d={TURN_HEAD} fill={p.print} />
      {/* A dish pressed into the tin: its shadow sits on the side the light comes from. */}
      <circle cx={cx} cy={cy} r={dish} fill={p.dish} />
      <path d={moon(cx, cy, dish, away, 4)} style={{ fill: L.shade }} />
      <circle cx={cx} cy={cy} r={dial} fill={p.brass} />
      <path d={moon(cx, cy, dial, L.toward, 5)} style={{ fill: L.shade }} />
      <g transform={`translate(${(cx + sx).toFixed(2)} ${(cy + sy).toFixed(2)})`}>
        <g ref={shadowRef} transform={`rotate(${angle})`} style={{ fill: L.shade }}>
          {grip}
        </g>
      </g>
      <g transform={`translate(${cx} ${cy})`}>
        <g class="cabinet-grip" ref={handleRef} transform={`rotate(${angle})`}>
          <g fill={p.brassLight}>{grip}</g>
          <rect x={-gripW / 2 + 5} y={-1} width={gripW - 10} height={2} rx={1} fill={p.brass} />
        </g>
      </g>
      <circle cx={cx} cy={cy} r={4.2} fill={p.brassDeep} />
    </g>
  );
}

/** A seasonal edition's paper tag, hanging on a thread from a pin, its words the right way up. */
function SeasonTag({ p, L, text }: { p: Palette; L: Lighting; text: string }) {
  const hole = { x: 187, y: 115 };
  // The tag points left from its hole: a luggage-tag notch on the hole end.
  const tagPath = 'M-56 -8 H-4 L2 -2.6 V2.6 L-4 8 H-56 A3 3 0 0 1 -59 5 V-5 A3 3 0 0 1 -56 -8 Z';
  return (
    <g class="cabinet-tag">
      <path
        d={`M${TAG_PIN.x} ${TAG_PIN.y} C${TAG_PIN.x + 1} ${TAG_PIN.y + 6} ${hole.x + 3} ${hole.y - 6} ${hole.x} ${hole.y}`}
        fill="none"
        stroke={p.ink}
        stroke-width={0.8}
        opacity={0.7}
      />
      <circle cx={TAG_PIN.x} cy={TAG_PIN.y} r={2} fill={p.brassDeep} />
      <g transform={`translate(${hole.x} ${hole.y}) rotate(-7)`}>
        <path d={tagPath} fill={p.tagPaper} />
        <path d={band({ x: -59, y: -8, w: 61, h: 16, r: 3 }, 'under', 1.8)} style={{ fill: L.shade }} />
        <circle cx={-2.2} cy={0} r={1.5} fill={p.brassDeep} />
        <text class="cabinet-tag-text" x={-30} y={3} fill={p.ink}>
          {text}
        </text>
      </g>
    </g>
  );
}
