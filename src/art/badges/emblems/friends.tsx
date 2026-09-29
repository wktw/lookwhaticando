/** Emblems for pet-care, dress-up and time-of-day badges. */
import { crescentPath, heartPath } from '@/art/icons/shapes';
import { Blush, EF, Gleam, Spark, type Emblem } from './kit';

const COOKIE = 'M23.36 8.44A13 13 0 1 0 32.56 17.64a4 4 0 0 1-5.91-3.29 4 4 0 0 1-3.29-5.91z';
const LENS_HEART = heartPath(16.6, 17.4, 11);
const HEART_A = heartPath(14.6, 21.4, 17);
const HEART_B = heartPath(26.2, 17.8, 13);
const OWL_MOON = crescentPath(7.2, 11.4, 4.2, 9.8, 8.8, 3.6);

/** A small morning sun at (10, 11.6) with four short rays, kept inside the medal face. */
const SUN_RAYS = [150, 195, 240, 285].map((deg) => {
  const a = (deg * Math.PI) / 180;
  const p = (r: number) => `${(10 + r * Math.cos(a)).toFixed(2)} ${(11.6 + r * Math.sin(a)).toFixed(2)}`;
  return `M${p(5.4)}L${p(6.8)}`;
}).join('');

export const FRIEND_EMBLEMS: Record<string, Emblem> = {
  'first-treat': ({ p }) => (
    <g>
      <path d={COOKIE} fill={p.wood} />
      <g fill={p.brown} stroke="none">
        <ellipse cx={14.2} cy={15.6} rx={1.9} ry={1.6} />
        <ellipse cx={21.6} cy={20.6} rx={1.8} ry={1.6} />
        <ellipse cx={13} cy={25} rx={1.8} ry={1.5} />
        <ellipse cx={19.4} cy={28.6} rx={1.9} ry={1.6} />
        <ellipse cx={26.4} cy={26.4} rx={1.7} ry={1.5} />
        <ellipse cx={27.4} cy={20.8} rx={1.3} ry={1.2} />
      </g>
      <g fill={p.wood} stroke-width={1.3}>
        <circle cx={31.4} cy={9.4} r={1.3} />
        <circle cx={34.4} cy={13} r={0.9} />
      </g>
      <Gleam d="M9.4 16.4a12 12 0 0 1 3.4-5" />
    </g>
  ),
  'favorite-found': ({ p }) => (
    <g>
      <path d="M25 25l6.4 6.4" fill="none" stroke={p.ink} stroke-width={7.4} />
      <path d="M25 25l6.4 6.4" fill="none" stroke={p.wood} stroke-width={3.2} />
      <circle cx={16.6} cy={16.6} r={11.6} fill={p.white} />
      <circle cx={16.6} cy={16.6} r={8.8} fill={p.sky} stroke="none" opacity={0.55} />
      <path d={LENS_HEART} fill={p.blushDeep} />
      <Gleam d="M8.8 13.4a8.4 8.4 0 0 1 3.6-4.2" />
      <Spark x={32.4} y={8.8} r={2.8} fill={p.butter} />
    </g>
  ),
  'first-outfit': ({ p }) => (
    <g>
      <path d="M18.6 21.4l-4.2 10.4 3.2-1 1.2 3 2.6-11.8zM21.4 21.4l4.2 10.4-3.2-1-1.2 3-2.6-11.8z" fill={p.blushDeep} />
      <path d="M20 19.4c-5-7-14.2-8-13.6-.8.5 6.6 8.6 6.1 13.6.8zM20 19.4c5-7 14.2-8 13.6-.8-.5 6.6-8.6 6.1-13.6.8z" fill={p.blush} />
      <path d="M10.4 16.6c2-.4 4.2.4 5.8 2M29.6 16.6c-2-.4-4.2.4-5.8 2" fill="none" stroke-width={EF} />
      <ellipse cx={20} cy={19.6} rx={3.4} ry={3.9} fill={p.blushDeep} />
      <Gleam d="M9.2 14.4c.6-1 1.5-1.6 2.6-1.8" width={1.6} />
      <Spark x={33} y={29.4} r={2.4} fill={p.butter} />
    </g>
  ),
  'best-friends': ({ p }) => (
    <g>
      <path d={HEART_A} transform="rotate(-14 14.6 21.4)" fill={p.blush} />
      <path d={HEART_B} transform="rotate(14 26.2 17.8)" fill={p.blushDeep} />
      <Gleam d="M8 17.6c.3-1.6 1.2-2.8 2.6-3.4" />
      <Spark x={8.4} y={7.6} r={2.8} fill={p.butter} />
      <Spark x={32.6} y={31} r={2.4} fill={p.white} />
    </g>
  ),
  'early-bird': ({ p }) => (
    <g>
      <path d={SUN_RAYS} fill="none" stroke-width={EF} />
      <circle cx={10} cy={11.6} r={3.8} fill={p.peach} />
      <path d="M17.4 33.6v2.2M23.4 33.6v2.2" fill="none" stroke={p.peachDeep} stroke-width={2} />
      <path d="M19.6 12.2c-.9-2.4-.1-4.2 1.7-4.8M21.4 12c.1-1.8 1.3-3 3-3.3" fill="none" stroke-width={EF} />
      <path d="M20.6 12c6.6 0 10.4 4.8 10.4 11 0 6.8-4.4 10.8-10.4 10.8S10.2 29.8 10.2 23c0-6.2 3.8-11 10.4-11z" fill={p.gold} />
      <path d="M12.6 24.4c1.4 3.4 4.8 4.6 7 3.2-.9-2.8-4-4.2-7-3.2z" fill={p.peach} stroke-width={EF} />
      <circle cx={23.6} cy={20.2} r={1.5} fill={p.ink} stroke="none" />
      <circle cx={24.1} cy={19.6} r={0.55} fill="#fff" stroke="none" />
      <path d="M27.8 21.2l4 1.4-4 1.5z" fill={p.peachDeep} stroke-width={EF} />
      <ellipse cx={25.6} cy={25} rx={1.8} ry={1.1} fill={p.cheek} opacity={0.8} stroke="none" />
      <Gleam d="M13.2 17.4a8 8 0 0 1 3.4-3.4" />
    </g>
  ),
  'night-owl': ({ p }) => (
    <g>
      <path d={OWL_MOON} fill={p.butter} stroke-width={EF} />
      <Spark x={33} y={10.6} r={2.4} fill={p.white} />
      <path d="M12.2 12.8l-1-5.2 4.8 2.8M27.8 12.8l1-5.2-4.8 2.8" fill={p.lavender} />
      <path d="M20 8.6c7 0 9.6 5.4 9.6 12 0 7-3.6 11.4-9.6 11.4s-9.6-4.4-9.6-11.4c0-6.6 2.6-12 9.6-12z" fill={p.lavender} />
      <path d="M10.6 20c-1.8 4-1 8 1.4 9.6.8-3.6.6-7.1-1.4-9.6zM29.4 20c1.8 4 1 8-1.4 9.6-.8-3.6-.6-7.1 1.4-9.6z" fill={p.lavenderDeep} stroke-width={EF} />
      <ellipse cx={20} cy={25} rx={5.6} ry={5.4} fill={p.white} stroke-width={EF} />
      <path d="M17.2 23.4l1 1 1-1M20.8 23.4l1 1 1-1M19 26.4l1 1 1-1" fill="none" stroke-width={1.2} />
      <circle cx={16.2} cy={16.4} r={3.8} fill={p.white} stroke-width={EF} />
      <circle cx={23.8} cy={16.4} r={3.8} fill={p.white} stroke-width={EF} />
      <path d="M14.6 16.6q1.6 1.5 3.2 0M22.2 16.6q1.6 1.5 3.2 0" fill="none" stroke-width={EF} />
      <path d="M18.8 19.4h2.4L20 21.6z" fill={p.gold} stroke-width={1.3} />
      <path d="M6.6 32.4c7.4-1.4 19.6-1.3 26.8.2" fill="none" stroke={p.ink} stroke-width={5.2} />
      <path d="M6.6 32.4c7.4-1.4 19.6-1.3 26.8.2" fill="none" stroke={p.wood} stroke-width={1.8} />
      <path d="M16.4 31.6v1.6M18.2 31.6v1.6M21.8 31.6v1.6M23.6 31.6v1.6" fill="none" stroke={p.peachDeep} stroke-width={1.4} />
    </g>
  ),
};
