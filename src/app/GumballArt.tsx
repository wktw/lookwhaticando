import { FAMILY, MATERIAL, shadeOf } from '@/art/icons/palette';

/**
 * The small capsule cabinet mark (the raised Capsules tab, the sidebar): a strawberry-milk cabinet
 * with a glass front of capsules, a brass coin slot, the handle and the chute. Flat, matte, lit from
 * the window on the left. Kept under its old name because the shell imports `GumballArt`.
 */
const BODY = FAMILY.blush[500];
const BODY_SHADE = shadeOf(BODY, 0.2);
const GLASS = FAMILY.sky[100];
/** Capsules behind the glass: [x, y, lower-half colour]. Top halves are clear. */
const CAPSULES: [number, number, string][] = [
  [16.7, 11.4, FAMILY.lavender[500]],
  [23.3, 11.6, FAMILY.peach[500]],
  [13.6, 16.8, FAMILY.butter[500]],
  [20, 17, FAMILY.blush[700]],
  [26.4, 16.8, FAMILY.sage[500]],
];
const R = 3.3;

export function GumballArt({ size = 40, class: cls }: { size?: number; class?: string }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} class={cls} aria-hidden="true" focusable="false">
      <rect x={9} y={34.4} width={4.4} height={2.6} rx={1} fill={MATERIAL.brassDeep} />
      <rect x={26.6} y={34.4} width={4.4} height={2.6} rx={1} fill={MATERIAL.brassDeep} />
      <rect x={7} y={3.6} width={26} height={31.6} rx={4} fill={BODY} />
      <path d="M28.6 3.6H29a4 4 0 0 1 4 4v23.6a4 4 0 0 1-4 4h-.4z" fill={BODY_SHADE} />
      <rect x={10} y={6.6} width={20} height={14.2} rx={2.2} fill={GLASS} />
      {CAPSULES.map(([x, y, c]) => (
        <path key={`${x}-${y}`} d={`M${x - R} ${y}a${R} ${R} 0 0 0 ${2 * R} 0z`} fill={c} />
      ))}
      {CAPSULES.map(([x, y]) => (
        <path key={`t${x}-${y}`} d={`M${x - R} ${y}a${R} ${R} 0 0 1 ${2 * R} 0z`} fill="#FFFFFF" />
      ))}
      <rect x={10} y={19.4} width={20} height={1.4} fill={BODY_SHADE} />
      <circle cx={14.4} cy={27.4} r={4.4} fill="#FFFDF9" />
      <path d="M17 23.8a4.4 4.4 0 0 1-4.6 7.5 5.6 5.6 0 0 0 4.6-7.5z" fill="#E9DFDF" />
      <rect x={11.2} y={26.6} width={6.4} height={1.7} rx={0.85} fill={FAMILY.blush[700]} />
      <rect x={21.8} y={23.6} width={7.6} height={4.2} rx={1.2} fill={MATERIAL.brass} />
      <rect x={23.2} y={25.2} width={4.8} height={1} rx={0.5} fill={MATERIAL.brassDeep} />
      <rect x={21.8} y={29.4} width={7.6} height={3.6} rx={1.2} fill={BODY_SHADE} />
    </svg>
  );
}

/** The same mark under its catkin name. */
export const CabinetMark = GumballArt;
