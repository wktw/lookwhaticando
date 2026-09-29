/** Emblems for looking after the animals: a treat bowl, a strawberry, a small sweater, a collar tag, a harvest. */
import { circlePath } from '@/art/icons/shapes';
import { E, shade } from '../palette';
import { Detail, Paw, type Emblem } from './kit';

/** The brass tag's shade (computed offline, committed). */
const TAG_SHADE = 'M17.14 35.26A6.2 6.2 0 1 0 25.86 26.54A6.2 6.2 0 0 1 17.14 35.26Z';

const BERRY = 'M0-9c4.6 0 8 2.6 8 6.6C8 3.2 3.4 7.8 0 9.6-3.4 7.8-8 3.2-8-2.4-8-6.4-4.6-9 0-9z';
const BERRY_SHADE = 'M3.4-8.4C6.2-7.4 8-5.2 8-2.4 8 3.2 3.4 7.8 0 9.6c3.4-5.4 4.6-12.4 3.4-18z';
const CALYX = 'M0-8.2l-4.6-2.6 3.4-.6-1.6-3.4 2.8 2 2.8-2-1.6 3.4 3.4.6z';
const SEEDS: [number, number][] = [
  [-3.6, -4],
  [0, -5.4],
  [3.4, -3.2],
  [-3.8, 0.6],
  [0, -0.8],
  [3.2, 1.6],
  [-1, 3.8],
];

/** A strawberry centred at (x, y), scaled by s. */
function Strawberry({ x, y, s = 1, a = 0 }: { x: number; y: number; s?: number; a?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`}>
      <path d={BERRY} fill={E.strawberry} />
      <Detail>
        <path d={BERRY_SHADE} fill={shade(E.strawberry)} />
        <g fill={E.butter}>
          {SEEDS.map(([sx, sy]) => (
            <ellipse key={`${sx}-${sy}`} cx={sx} cy={sy} rx={0.55} ry={0.85} />
          ))}
        </g>
      </Detail>
      <path d={CALYX} fill={E.leafDeep} />
    </g>
  );
}

export const FRIEND_EMBLEMS: Record<string, Emblem> = {
  /** The first treat: a bowl of biscuits. */
  'first-treat': () => (
    <g>
      <circle cx={15.8} cy={22.4} r={3.6} fill={E.wood} />
      <circle cx={22} cy={20.2} r={3.9} fill={E.wood} />
      <circle cx={28.2} cy={22.6} r={3.4} fill={E.wood} />
      <Detail>
        <g fill={E.woodDeep}>
          <circle cx={21.2} cy={19.4} r={0.8} />
          <circle cx={16.2} cy={21.8} r={0.7} />
          <circle cx={28.6} cy={22} r={0.7} />
        </g>
      </Detail>
      <path d="M7.4 24h29.2c0 7.4-6.4 12.4-14.6 12.4S7.4 31.4 7.4 24z" fill={E.sky} />
      <rect x={6.4} y={22.6} width={31.2} height={3.4} rx={1.7} fill={E.skyDeep} />
      <rect x={16.4} y={35} width={11.2} height={3.4} rx={1.2} fill={E.skyDeep} />
      <Detail>
        <path d="M30.8 26h5.4c-.8 4.8-4.4 8.6-9.4 10 2.4-2.8 3.8-6.2 4-10z" fill={shade(E.sky)} />
      </Detail>
    </g>
  ),
  /** A favourite found: one strawberry. */
  'favorite-found': () => <Strawberry x={22} y={24} s={1.5} a={-10} />,
  /** Dress up: a small knit sweater on a hanger. */
  'first-outfit': () => (
    <g>
      <path d="M22 11.4V9.8a2.6 2.6 0 1 0-2.6-2.6" fill="none" stroke={E.brassDeep} stroke-width={1.5} stroke-linecap="round" />
      <path d="M22 11.4L8.6 19.6M22 11.4l13.4 8.2" fill="none" stroke={E.brassDeep} stroke-width={1.5} stroke-linecap="round" />
      <path d="M15.4 14.6l-7.6 5 2.8 5.8 4.2-2.4V38h14.4V23l4.2 2.4 2.8-5.8-7.6-5h-3.4a3.2 3.2 0 0 1-6.4 0z" fill={E.blush} />
      <rect x={14.8} y={35} width={14.4} height={3} fill={E.blushDeep} />
      <rect x={14.8} y={26} width={14.4} height={2.6} fill={E.paper} />
      <Detail>
        <g fill={E.blushDeep}>
          <rect x={8.4} y={23} width={3.4} height={2.2} rx={0.6} transform="rotate(-28 10.1 24.1)" />
          <rect x={32.2} y={23} width={3.4} height={2.2} rx={0.6} transform="rotate(28 33.9 24.1)" />
        </g>
        <rect x={25.6} y={17.6} width={3.6} height={20.4} fill={shade(E.blush)} fill-opacity={0.6} />
      </Detail>
    </g>
  ),
  /** Best friends: a collar with a tiny brass tag. */
  'best-friends': () => (
    <g>
      <path d="M5 14.6c10.6 8.2 23.4 8.2 34 0l1.8 4.4c-11.4 8.8-26.2 8.8-37.6 0z" fill={E.lavender} />
      <Detail>
        <path d="M5 14.6c10.6 8.2 23.4 8.2 34 0l.6 1.4c-10.8 8.2-24.4 8.2-35.2 0z" fill={E.lavenderDeep} />
      </Detail>
      <path d={`${circlePath(22, 24.6, 2.4)}${circlePath(22, 24.6, 1.1)}`} fill={E.brassDeep} fill-rule="evenodd" />
      <circle cx={22} cy={31.4} r={6.2} fill={E.brass} />
      <Detail>
        <path d={TAG_SHADE} fill={E.brassDeep} />
      </Detail>
      <Paw x={22} y={31.6} a={0} s={0.42} color={E.brassDeep} />
    </g>
  ),
  /** First harvest: a small basket of strawberries from the sill. */
  'first-harvest': () => (
    <g>
      <path d="M10.8 24.4C10.8 4.4 33.2 4.4 33.2 24.4" fill="none" stroke={E.woodDeep} stroke-width={2.4} stroke-linecap="round" />
      <Strawberry x={15.8} y={22.6} s={0.6} a={-24} />
      <Strawberry x={28.2} y={22.8} s={0.6} a={22} />
      <Strawberry x={22} y={21.4} s={0.66} />
      <path d="M9 25.4h26l-2.6 11.4a2.4 2.4 0 0 1-2.4 1.9H14a2.4 2.4 0 0 1-2.4-1.9z" fill={E.wood} />
      <rect x={7.6} y={22.6} width={28.8} height={3.6} rx={1.6} fill={E.woodDeep} />
      <Detail>
        <path d="M11 30.2h22M12.2 34.4h19.6" fill="none" stroke={E.woodDeep} stroke-width={1.1} stroke-linecap="round" />
        <path d="M29.6 26.2H35l-2.6 10.6a2.4 2.4 0 0 1-2.4 1.9h-2.4z" fill={shade(E.wood)} fill-opacity={0.8} />
      </Detail>
    </g>
  ),
};
