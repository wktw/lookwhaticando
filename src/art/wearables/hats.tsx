import type { WearableArt } from '../pets/types';
import { dropPath, starPath } from '../pets/shapes';
import { puffPath } from '../pets/species/parts';
import { headItem, INK, SW } from './kit';

/** Hats, drawn in head-local coordinates: (0, 0) is the top-center of a 40-wide head. */

const band = (y: number, w: number, h: number) => `M${-w} ${y} Q0 ${y - 3.6} ${w} ${y} L${w + 0.3} ${y + h} Q0 ${y + h - 3.6} ${-w - 0.3} ${y + h} Z`;

export const pomBeanie: WearableArt = headItem(
  (uid) => (
    <g stroke={INK} stroke-width={SW} stroke-linejoin="round">
      <clipPath id={`${uid}-beanie`}>
        <path d="M-21 7 C-22 -6 -12 -15.5 0 -15.5 C12 -15.5 22 -6 21 7 Z" />
      </clipPath>
      <path d="M-21 7 C-22 -6 -12 -15.5 0 -15.5 C12 -15.5 22 -6 21 7 Z" fill="#FFCFB0" />
      <g clip-path={`url(#${uid}-beanie)`} stroke="#F6AE8A" stroke-width={1.3} opacity={0.9}>
        {[-15, -9, -3, 3, 9, 15].map((x) => (
          <path key={x} d={`M${x} 8 C${x * 0.9} -2 ${x * 0.6} -10 ${x * 0.35} -16`} fill="none" />
        ))}
      </g>
      <path d={band(5, 22.4, 6.6)} fill="#FF9E8A" />
      <g stroke="#FFFFFF" stroke-width={1} opacity={0.55}>
        {[-18, -12, -6, 0, 6, 12, 18].map((x) => (
          <path key={x} d={`M${x} ${4.2 + (x * x) / 150} L${x} ${9.6 + (x * x) / 150}`} />
        ))}
      </g>
      <path d={puffPath(0, -17.4, 5.2, 8, 0.24)} fill="#FFF8F0" />
      <path d="M-14 -6 C-11 -10 -7 -12.4 -3.4 -13.2" fill="none" stroke="#FFFFFF" stroke-width={1.6} stroke-linecap="round" opacity={0.7} />
    </g>
  ),
  { dy: 0.5, iconY: 60, iconScale: 1.76 },
);

export const bakersHat: WearableArt = headItem(
  () => (
    <g stroke={INK} stroke-width={SW} stroke-linejoin="round">
      <path
        d="M-14.6 -4.6 C-21 -7.4 -20.4 -18 -12 -18.2 C-11 -25.6 -2.2 -27.8 1.8 -22.6 C6.6 -28 16.4 -25.4 14.8 -18 C21.8 -17.4 21.4 -7.4 14.6 -4.6 Z"
        fill="#FFFFFF"
      />
      <path
        d="M-6.4 -12 C-6.8 -14.6 -5.6 -17 -3.8 -18 M6 -11.4 C6.8 -13.6 6.4 -16 5 -17.6"
        fill="none"
        stroke-width={1.1}
        opacity={0.35}
        stroke-linecap="round"
      />
      <path d="M-13.6 5 L-14.8 -5.4 C-5 -3 5 -3 14.8 -5.4 L13.6 5 C5 7 -5 7 -13.6 5 Z" fill="#FFF8F0" />
      <path d="M-7 -3.2 L-7.4 5.8 M0 -2.6 L0 6.4 M7 -3.2 L7.4 5.8" fill="none" stroke-width={1} opacity={0.3} />
    </g>
  ),
  { dy: 2, iconX: 49, iconY: 69.6, iconScale: 2.06 },
);

export const strawberryHat: WearableArt = headItem(
  () => (
    <g stroke={INK} stroke-width={SW} stroke-linejoin="round" stroke-linecap="round">
      <path d="M-20.6 6 C-22 -8 -11 -18.4 0 -18.4 C11 -18.4 22 -8 20.6 6 C12.6 9.4 -12.6 9.4 -20.6 6 Z" fill="#FF94AC" />
      <g fill="#FFF1A8" stroke="none">
        {[
          [-12, -6],
          [-4, -9],
          [5, -8],
          [13, -4],
          [-15, 1],
          [-6, -1],
          [3, 0],
          [11, 2],
        ].map(([x, y]) => (
          <path key={`${x}${y}`} d={dropPath(x!, y!, 1.2)} />
        ))}
      </g>
      <path
        d="M-11 -14.4 C-7 -13 -4 -14 -2 -17 C0 -13.6 3 -12.6 6.4 -14.6 C6.4 -12 8.6 -10.6 11.6 -11.4 C9.4 -16.4 5 -19.6 0 -19.6 C-5 -19.6 -9 -17.6 -11 -14.4 Z"
        fill="#9CCB86"
      />
      <path d="M0 -19.4 C0.4 -22.4 1.8 -24.4 4 -25.4" fill="none" />
      <path d="M-15 -4 C-13.6 -8.4 -10.4 -11.6 -6.6 -13" fill="none" stroke="#FFFFFF" stroke-width={1.6} opacity={0.6} />
    </g>
  ),
  { dy: 0.5, iconY: 66.3, iconScale: 1.93 },
);

export const nightcap: WearableArt = headItem(
  (uid) => {
    const cone = 'M14.5 0.5 C14 -11 5 -19 -7 -18.4 C-15 -18 -21 -12 -24.4 -3.6 C-20.6 -6.8 -16.4 -8.6 -12.6 -7.6 C-13.6 -4.8 -14 -2 -14 0.5 Z';
    return (
      <g stroke-linejoin="round">
        <clipPath id={`${uid}-cap`}>
          <path d={cone} />
        </clipPath>
        <path d={cone} fill="#BBDCF6" />
        <g clip-path={`url(#${uid}-cap)`} fill="#FFF3B0" stroke={INK} stroke-width={0.8}>
          <path d={starPath(4, -11, 2.4)} />
          <path d={starPath(-9, -12, 1.8)} />
          <circle cx={-3} cy={-4} r={1.3} stroke="none" fill="#FFFFFF" />
          <circle cx={8} cy={-3} r={1} stroke="none" fill="#FFFFFF" />
        </g>
        <path d={cone} fill="none" stroke={INK} stroke-width={SW} />
        <path d="M-17 3.4 C-17 -1.6 17 -1.6 17 3.4 C9 6.2 -9 6.2 -17 3.4 Z" fill="#FFFFFF" stroke={INK} stroke-width={SW} />
        <path d={puffPath(-25, -2.4, 3.6, 7, 0.3)} fill="#FFF3B0" stroke={INK} stroke-width={SW * 0.9} />
      </g>
    );
  },
  { dy: 1.5, rotate: 6, iconX: 61, iconY: 60.1, iconScale: 1.67, iconRotate: -4 },
);

export const witchHat: WearableArt = headItem(
  () => (
    <g stroke={INK} stroke-width={SW} stroke-linejoin="round" stroke-linecap="round">
      <path d="M-26 5 C-26 0 26 0 26 5 C26 9.6 -26 9.6 -26 5 Z" fill="#A993EA" />
      <path d="M-12 3.4 C-9 -8 -5 -18 1 -27 C3.6 -30.6 8 -31 11 -28.6 C7.6 -28 5.6 -25.6 5.2 -22 C5 -13 8 -4 12 3.4 C4 5.6 -4 5.6 -12 3.4 Z" fill="#A993EA" />
      <path d="M-11 -0.4 C-4 1.6 4 1.6 11 -0.4 L12 3.2 C4 5.4 -4 5.4 -12 3.2 Z" fill="#7F68CF" />
      <rect x={-2.6} y={-0.4} width={5.2} height={4.6} rx={1} fill="#FFE08A" stroke-width={1.2} />
      <path d={starPath(-6, -12, 2.6)} fill="#FFE08A" stroke-width={1} />
      <path d="M-7 -4 C-5.4 -10 -3.2 -15.6 -0.4 -20.4" fill="none" stroke="#FFFFFF" stroke-width={1.4} opacity={0.5} />
    </g>
  ),
  { dy: 1, rotate: -4, iconY: 66.7, iconScale: 1.54 },
);

export const santaHat: WearableArt = headItem(
  () => (
    <g stroke={INK} stroke-width={SW} stroke-linejoin="round">
      <path d="M-17 3 C-16 -10 -6 -19 6 -19 C14 -19 20 -14 24 -6 C21 -7.6 18 -8 15.6 -7 C16.6 -3 17 0 17 3 Z" fill="#F4808F" />
      <path d="M-10 -6 C-7 -12 -2 -15.4 3.6 -16.2" fill="none" stroke="#FFFFFF" stroke-width={1.5} stroke-linecap="round" opacity={0.5} />
      <path
        d="M-20.6 2.6 C-21.6 -1.6 -16 -2.2 -14 -1.2 C-11 -3 -6 -2.6 -3.6 -1.4 C-1 -2.8 3 -2.8 5.4 -1.4 C8 -2.8 12.4 -2.8 14.6 -1.2 C17 -2.4 21.8 -1.4 20.6 2.8 C21.8 6.6 17.6 8.4 14.8 7.2 C12 8.8 7.6 8.8 5.2 7.4 C2.6 8.8 -1.4 8.8 -3.8 7.4 C-6.4 8.8 -11 8.8 -13.8 7.2 C-16.6 8.6 -21.8 6.6 -20.6 2.6 Z"
        fill="#FFFFFF"
      />
      <path d={puffPath(25, -4.6, 4.2, 8, 0.26)} fill="#FFFFFF" />
    </g>
  ),
  { dy: 1.5, iconX: 43, iconY: 58.3, iconScale: 1.59 },
);

export const cowgirlHat: WearableArt = headItem(
  () => (
    <g stroke={INK} stroke-width={SW} stroke-linejoin="round" stroke-linecap="round">
      <path
        d="M-12.5 1 C-13.5 -7 -12 -14 -8 -16 C-5 -17.4 -2.4 -14.6 0 -14.6 C2.4 -14.6 5 -17.4 8 -16 C12 -14 13.5 -7 12.5 1 C5 3 -5 3 -12.5 1 Z"
        fill="#FFB8CB"
      />
      <path d="M-12.8 -3.4 C-5 -1.6 5 -1.6 12.8 -3.4 L12.6 0.4 C5 2.2 -5 2.2 -12.6 0.4 Z" fill="#F58CAA" />
      <path
        d="M-27 1 C-24 6 -12 8.4 0 8.4 C12 8.4 24 6 27 1 C29 -1 30.4 -4 29 -5.2 C25 -1.8 14 0.6 0 0.6 C-14 0.6 -25 -1.8 -29 -5.2 C-30.4 -4 -29 -1 -27 1 Z"
        fill="#FFB8CB"
      />
      <path d={starPath(0, -1.4, 2.4)} fill="#FFF3B0" stroke-width={1} />
      <path d="M-9 -8 C-8.4 -11 -7.2 -13 -5.4 -14" fill="none" stroke="#FFFFFF" stroke-width={1.4} opacity={0.6} />
    </g>
  ),
  { dy: 1, iconY: 55.4, iconScale: 1.35 },
);

export const bucketHat: WearableArt = headItem(
  () => (
    <g stroke={INK} stroke-width={SW} stroke-linejoin="round">
      <path d="M-13.5 2 C-14 -6 -10 -12.6 0 -12.6 C10 -12.6 14 -6 13.5 2 Z" fill="#FFE593" />
      <path
        d="M-21 7.6 C-19 2.4 -12 0.6 0 0.6 C12 0.6 19 2.4 21 7.6 C21.6 9.2 20.6 10.4 19 10 C13 8.2 7 7.6 0 7.6 C-7 7.6 -13 8.2 -19 10 C-20.6 10.4 -21.6 9.2 -21 7.6 Z"
        fill="#FFE593"
      />
      <g fill="none" stroke="#E0B94A" stroke-width={0.9} stroke-dasharray="1.6 1.4">
        <path d="M-12 -1.4 C-6 -0.2 6 -0.2 12 -1.4" />
        <path d="M-18 6.6 C-12 4.2 12 4.2 18 6.6" />
      </g>
      <path d="M-9 -4 C-8.4 -7.4 -6 -9.6 -3 -10.4" fill="none" stroke="#FFFFFF" stroke-width={1.4} stroke-linecap="round" opacity={0.7} />
    </g>
  ),
  { dy: 0, iconY: 52.4, iconScale: 1.89 },
);

export const frogHat: WearableArt = headItem(
  () => (
    <g stroke={INK} stroke-width={SW} stroke-linejoin="round" stroke-linecap="round">
      <circle cx={-7} cy={-11.6} r={4.6} fill="#A9D98F" />
      <circle cx={7} cy={-11.6} r={4.6} fill="#A9D98F" />
      <path d="M-13.5 2 C-14 -6 -10 -11.4 0 -11.4 C10 -11.4 14 -6 13.5 2 Z" fill="#A9D98F" />
      <path
        d="M-21 7.6 C-19 2.4 -12 0.6 0 0.6 C12 0.6 19 2.4 21 7.6 C21.6 9.2 20.6 10.4 19 10 C13 8.2 7 7.6 0 7.6 C-7 7.6 -13 8.2 -19 10 C-20.6 10.4 -21.6 9.2 -21 7.6 Z"
        fill="#A9D98F"
      />
      <g fill={INK} stroke="none">
        <ellipse cx={-7} cy={-12} rx={1.6} ry={1.9} />
        <ellipse cx={7} cy={-12} rx={1.6} ry={1.9} />
      </g>
      <g fill="#fff" stroke="none">
        <circle cx={-6.4} cy={-12.8} r={0.6} />
        <circle cx={7.6} cy={-12.8} r={0.6} />
      </g>
      <path d="M-4.4 -5 Q0 -2.4 4.4 -5" fill="none" stroke-width={1.3} />
      <g fill="#FF9FB8" stroke="none" opacity={0.7}>
        <ellipse cx={-9.6} cy={-4.6} rx={2.2} ry={1.3} />
        <ellipse cx={9.6} cy={-4.6} rx={2.2} ry={1.3} />
      </g>
    </g>
  ),
  { dy: 0, iconY: 55.8, iconScale: 1.89 },
);

export const sunHat: WearableArt = headItem(
  () => (
    <g stroke={INK} stroke-width={SW} stroke-linejoin="round" stroke-linecap="round">
      <path d="M-30 4.6 C-30 -1.4 30 -1.4 30 4.6 C30 9.8 -30 9.8 -30 4.6 Z" fill="#FFE9B8" />
      <path d="M-24 4.4 C-12 6.8 12 6.8 24 4.4" fill="none" stroke="#E8C98A" stroke-width={0.9} />
      <path d="M-13 3 C-14 -6 -9 -12 0 -12 C9 -12 14 -6 13 3 C5 4.6 -5 4.6 -13 3 Z" fill="#FFE9B8" />
      <path d="M-13.4 -1.6 C-5 0.4 5 0.4 13.4 -1.6 L13.2 2.6 C5 4.6 -5 4.6 -13.2 2.6 Z" fill="#F7A8C0" />
      <path d="M11.6 1.6 C14.6 4.6 16 8.4 15 12.4 L12.8 11 L11 13.4 C11.6 9.4 11 5.6 9.4 2.4 Z" fill="#F7A8C0" stroke-width={SW * 0.8} />
      <ellipse cx={11.4} cy={0.8} rx={2.4} ry={2.2} fill="#F58CAA" stroke-width={SW * 0.8} />
      <path d="M-8 -5 C-7 -7.8 -5 -9.6 -2.4 -10.2" fill="none" stroke="#FFFFFF" stroke-width={1.4} opacity={0.7} />
    </g>
  ),
  { dy: 1.5, iconY: 49.1, iconScale: 1.33 },
);

export const leafUmbrella: WearableArt = headItem(
  () => (
    <g stroke={INK} stroke-width={SW} stroke-linejoin="round" stroke-linecap="round">
      <path d="M0 -26 C0.4 -29 2 -31 4.4 -32" fill="none" />
      <path
        d="M-26 -2 C-24 -16 -11 -26 1 -26 C13 -26 26 -16 27 -2.4 C23 -5.6 17 -5.6 13.2 -1.8 C9 -5.8 4 -5.8 0.6 -1.8 C-3.4 -5.8 -9 -5.8 -13 -1.8 C-17 -5.8 -22 -5.6 -26 -2 Z"
        fill="#9FD18B"
      />
      <g fill="none" stroke="#6FA35C" stroke-width={1.1}>
        <path d="M1 -25 L0.6 -3.4 M1 -24 C-5 -18 -10 -10 -13 -3.2 M1 -24 C7 -18 11 -10 13.2 -3.2 M-6 -20 C-14 -15 -21 -9 -24.6 -3.6 M8 -20 C16 -15 22 -9 25.6 -3.6" />
      </g>
      <path d="M-18 -13 C-14 -18.6 -8 -22 -3 -23" fill="none" stroke="#FFFFFF" stroke-width={1.5} opacity={0.6} />
      <path d={dropPath(15, -14, 2)} fill="#BBDCF6" stroke-width={1} />
    </g>
  ),
  { dy: -2, iconX: 49.3, iconY: 75.5, iconScale: 1.51 },
);

export const fishHat: WearableArt = headItem(
  () => (
    <g stroke={INK} stroke-width={SW} stroke-linejoin="round" stroke-linecap="round">
      <path d="M-4 -12.6 C-2 -16.4 3 -17.4 6 -15 C4.6 -13.6 4.2 -12 4.4 -10.8 Z" fill="#8FC3F0" />
      <path
        d="M-16 -4 C-14 -13 -2 -17 8 -13 C12 -11.4 14 -9 15.6 -7 L22 -12.4 C23.4 -13.4 25 -12.6 24.6 -11 L22.6 -4 L24.6 3 C25 4.6 23.4 5.4 22 4.4 L15.6 -1 C14 1 12 3.4 8 5 C-2 9 -14 5 -16 -4 Z"
        fill="#A7CDF2"
      />
      <path d="M-13 -1 C-8 3.6 2 4.6 9 1.8" fill="none" stroke="#FFFFFF" stroke-width={2.4} opacity={0.7} />
      <g fill="none" stroke="#7DB7E8" stroke-width={1.4}>
        <path d="M2 -12.6 C4 -9 4 -4 2 0.6" />
        <path d="M7.4 -11.4 C9 -8.4 9 -4.6 7.4 -1.2" />
      </g>
      <circle cx={-9} cy={-7} r={3} fill="#FFFFFF" stroke-width={1.4} />
      <circle cx={-9.6} cy={-6.8} r={1.5} fill={INK} stroke="none" />
      <ellipse cx={-15.4} cy={-3.2} rx={1.2} ry={1.5} fill="#F58CAA" stroke-width={1.1} />
      <ellipse cx={-8} cy={-2} rx={1.8} ry={1} fill="#FF9FB8" stroke="none" opacity={0.7} />
    </g>
  ),
  { dy: 1, rotate: -4, iconX: 42.1, iconY: 59.5, iconScale: 1.94 },
);

export const milkCarton: WearableArt = headItem(
  () => (
    <g stroke={INK} stroke-width={SW} stroke-linejoin="round">
      <path d="M9 4.4 L14.4 1.4 L14.4 -21.6 L9 -19.6 Z" fill="#CFE3F8" />
      <path d="M9 -19.6 L14.4 -21.6 L5.4 -29.4 L0 -27.4 Z" fill="#E7F3FD" />
      <path d="M-9 -19.6 L0 -27.4 L9 -19.6 Z" fill="#FFFFFF" />
      <path d="M-2.6 -29.6 L2.6 -29.6 L2.6 -26.4 L-2.6 -26.4 Z" fill="#FFFFFF" stroke-width={SW * 0.7} />
      <rect x={-9} y={-19.6} width={18} height={24} fill="#FFFFFF" />
      <rect x={-9} y={-12} width={18} height={8.4} fill="#A7CDF2" stroke-width={SW * 0.7} />
      <path d={dropPath(0, -8, 2.6)} fill="#FFFFFF" stroke-width={1} />
      <path
        d="M-9 -16.4 C-6 -18 -3 -16.4 -4.4 -14.6 C-6 -12.6 -9 -13.6 -9 -13.6 Z M6 0 C4.6 -1.6 6.6 -3.4 9 -2.4 L9 2 C7.6 2.2 6.6 1.2 6 0 Z"
        fill="#5E4B55"
        stroke="none"
      />
    </g>
  ),
  { dy: 1.5, rotate: -8, iconX: 44, iconY: 78.2, iconScale: 2.24 },
);
