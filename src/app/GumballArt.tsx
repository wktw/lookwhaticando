import type { Light } from '@/art/light';
import css from '@/art/icons/cabinet.module.css';

/**
 * The small capsule cabinet mark (the raised Capsules tab, the sidebar): a strawberry-milk cabinet
 * with a glass front of capsules, a brass coin slot, the handle and the chute. Flat and matte, with
 * the shade on the side away from the light. Its inks live in cabinet.module.css, so the mark follows
 * the theme into lamplight (dimmed, warmed toward the lamp) unless `light` pins it.
 * Kept under its old name because the shell imports `GumballArt`.
 */

/** Capsules behind the glass: [x, y, lower-half ink class]. Top halves are clear. */
const CAPSULES: [number, number, string][] = [
  [16.7, 11.4, css.c0!],
  [23.3, 11.6, css.c1!],
  [13.6, 16.8, css.c2!],
  [20, 17, css.c3!],
  [26.4, 16.8, css.c4!],
];
const R = 3.3;
const bottom = (x: number, y: number) => `M${x - R} ${y}a${R} ${R} 0 0 0 ${2 * R} 0z`;
const TOPS = CAPSULES.map(([x, y]) => `M${x - R} ${y}a${R} ${R} 0 0 1 ${2 * R} 0z`).join('');

export interface GumballArtProps {
  size?: number;
  class?: string;
  /** Pin the lighting (day or lamplight, and the side it comes from). By default it follows the theme. */
  light?: Light;
}

const SIDE = { left: css.fromLeft, right: css.fromRight, top: css.fromTop } as const;

export function GumballArt({ size = 40, class: cls, light }: GumballArtProps) {
  const tone = light === undefined ? css.auto : light.night ? css.night : css.day;
  const side = light === undefined ? undefined : SIDE[light.from];
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      class={[css.cab, tone, side, cls].filter(Boolean).join(' ')}
      aria-hidden="true"
      focusable="false"
    >
      <rect class={css.brassDeep} x={9} y={34.4} width={4.4} height={2.6} rx={1} />
      <rect class={css.brassDeep} x={26.6} y={34.4} width={4.4} height={2.6} rx={1} />
      <rect class={css.body} x={7} y={3.6} width={26} height={31.6} rx={4} />
      <path class={css.shadeR} d="M28.6 3.6H29a4 4 0 0 1 4 4v23.6a4 4 0 0 1-4 4h-.4z" />
      <path class={css.shadeL} d="M11.4 3.6H11a4 4 0 0 0-4 4v23.6a4 4 0 0 0 4 4h.4z" />
      <rect class={css.glass} x={10} y={6.6} width={20} height={14.2} rx={2.2} />
      {CAPSULES.map(([x, y, c]) => (
        <path key={`${x}-${y}`} class={c} d={bottom(x, y)} />
      ))}
      <path class={css.top} d={TOPS} />
      <rect class={css.recess} x={10} y={19.4} width={20} height={1.4} />
      <circle class={css.knob} cx={14.4} cy={27.4} r={4.4} />
      <path class={css.knobShade} d="M17 23.8a4.4 4.4 0 0 1-4.6 7.5 5.6 5.6 0 0 0 4.6-7.5z" />
      <rect class={css.print} x={11.2} y={26.6} width={6.4} height={1.7} rx={0.85} />
      <rect class={css.brass} x={21.8} y={23.6} width={7.6} height={4.2} rx={1.2} />
      <rect class={css.brassDeep} x={23.2} y={25.2} width={4.8} height={1} rx={0.5} />
      <rect class={css.recess} x={21.8} y={29.4} width={7.6} height={3.6} rx={1.2} />
    </svg>
  );
}

/** The same mark under its catkin name. */
export const CabinetMark = GumballArt;
