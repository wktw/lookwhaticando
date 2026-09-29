/** Emblems for capsule and collection badges. */
import { heartPath, starPath } from '@/art/icons/shapes';
import { Blush, Dots, EF, Gleam, Spark, type Emblem } from './kit';

const CAPSULE_STAR = starPath(20, 13.4, 4.6, 2.4, 5, 0.3);
const ULTRA_STAR = starPath(20, 21.4, 16.4, 8.8, 5, 0.3);
const TROPHY_STAR = starPath(20, 15.6, 4.4, 2.3, 5, 0.3);
const LOCK_HEART = heartPath(20, 21.6, 6.8);
const MUSEUM_HEART = heartPath(20, 11.4, 4.4);
const HOLO = ['#FFB3C7', '#FFE593', '#B3E6D6', '#BBDCF6', '#D6C8F8'];

export const COLLECTION_EMBLEMS: Record<string, Emblem> = {
  'first-capsule': ({ p }) => (
    <g>
      <path d="M7 19.6a13 13 0 0 1 26 0z" fill={p.lavender} />
      <path d={CAPSULE_STAR} fill={p.butter} stroke-width={EF} />
      <path d="M7 22.8a13 13 0 0 0 26 0z" fill={p.blushDeep} />
      <rect x={5.6} y={19.2} width={28.8} height={3.8} rx={1.9} fill={p.blush} />
      <Gleam d="M10.8 14.6a10 10 0 0 1 4-4.6" />
      <Spark x={6.4} y={7.6} r={2.8} fill={p.butter} />
      <Spark x={34} y={30} r={2.2} fill={p.white} />
    </g>
  ),
  'first-rare': ({ p }) => (
    <g>
      <path d="M10 15l5-6.6h10l5 6.6-10 18.4z" fill={p.sky} />
      <path d="M15 8.4L10 15h7.6z" fill={p.white} stroke="none" />
      <path d="M22.4 15H30L20 33.4z" fill={p.skyDeep} stroke="none" />
      <path d="M10 15l5-6.6h10l5 6.6-10 18.4z" fill="none" />
      <path d="M10 15h20M15 8.4l2.6 6.6L20 8.4l2.4 6.6L25 8.4M17.6 15L20 33.4 22.4 15" fill="none" stroke-width={EF} />
      <Spark x={31.4} y={6.4} r={3} fill={p.white} />
      <Spark x={7.6} y={26} r={2.4} fill={p.butter} />
    </g>
  ),
  'first-ultra': ({ p, uid, earned }) => {
    const holo = `${uid}-holo`;
    return (
      <g>
        {earned && (
          <defs>
            <linearGradient id={holo} x1="0" y1="0" x2="1" y2="1">
              {HOLO.map((c, i) => (
                <stop key={c} offset={i / (HOLO.length - 1)} stop-color={c} />
              ))}
            </linearGradient>
          </defs>
        )}
        <path d={ULTRA_STAR} fill={earned ? `url(#${holo})` : p.butter} />
        <Dots l={16.6} r={23.4} y={21} ink={p.ink} size={0.85} />
        <path d="M18.6 23.6q1.4 1.3 2.8 0" fill="none" stroke-width={EF} />
        <Blush l={14.6} r={25.4} y={24} color={p.cheek} />
        <Gleam d="M14.6 12.6c.6-1.4 1.3-2.5 2.2-3.4" />
        <Spark x={6} y={8} r={2.6} fill={p.white} />
        <Spark x={34.4} y={10.2} r={2.2} fill={p.butter} />
      </g>
    );
  },
  'collect-10': ({ p }) => (
    <g>
      <path d="M10.4 20c0-10.8 19.2-10.8 19.2 0" fill="none" stroke={p.ink} stroke-width={5.4} />
      <path d="M10.4 20c0-10.8 19.2-10.8 19.2 0" fill="none" stroke={p.wood} stroke-width={2} />
      <g stroke-width={EF}>
        <circle cx={14.6} cy={18.6} r={4} fill={p.blush} />
        <circle cx={25.4} cy={18.4} r={4} fill={p.mint} />
        <circle cx={20} cy={16} r={4} fill={p.butter} />
        <path d="M16 16h8M10.6 18.6h8M21.4 18.4h8" fill="none" />
      </g>
      <path d="M7.6 21.6h24.8l-2.4 11.2a2.6 2.6 0 0 1-2.6 2.1H12.6a2.6 2.6 0 0 1-2.6-2.1z" fill={p.wood} />
      <path d="M8.8 27h22.4M10 31.6h20M15 22.2v12M20 22.2v12.6M25 22.2v12" fill="none" stroke-width={EF} />
      <rect x={6.4} y={19.6} width={27.2} height={4} rx={2} fill={p.peachDeep} />
    </g>
  ),
  'collect-25': ({ p }) => (
    <g>
      <path d="M13.6 9.2L20 4l6.4 5.2" fill="none" stroke-width={EF} />
      <circle cx={20} cy={4} r={1.3} fill={p.gold} stroke-width={1.2} />
      <rect x={8} y={9} width={24} height={26.4} rx={3.4} fill={p.gold} />
      <rect x={12} y={13} width={16} height={18.4} rx={1.6} fill={p.mint} stroke-width={EF} />
      <path d="M14.8 22.4l.4-5.2 3.8 3.2h2l3.8-3.2.4 5.2" fill={p.white} stroke-width={EF} />
      <ellipse cx={20} cy={24.6} rx={5.8} ry={4.8} fill={p.white} stroke-width={EF} />
      <Dots l={17.8} r={22.2} y={24.2} ink={p.ink} size={0.7} />
      <path d="M18.8 26.4q.6.8 1.2 0 .6.8 1.2 0" fill="none" stroke-width={1.1} />
      <Blush l={16.4} r={23.6} y={26.4} color={p.cheek} />
      <Gleam d="M10.4 13.4v5" width={1.6} />
    </g>
  ),
  'collect-50': ({ p }) => (
    <g>
      <path d="M6.4 20.4V17c0-4.6 3.4-7.4 7.8-7.4h11.6c4.4 0 7.8 2.8 7.8 7.4v3.4z" fill={p.lilac} />
      <rect x={6.4} y={20.4} width={27.2} height={12.8} rx={2.4} fill={p.lilac} />
      <g fill="none">
        <path d="M12.6 10.2v23M27.4 10.2v23" stroke={p.ink} stroke-width={5.2} />
        <path d="M12.6 10.2v23M27.4 10.2v23" stroke={p.gold} stroke-width={1.8} />
      </g>
      <path d="M6.4 20.4h27.2" fill="none" />
      <path d={LOCK_HEART} fill={p.gold} stroke-width={EF} />
      <circle cx={20} cy={21.4} r={0.9} fill={p.ink} stroke="none" />
      <Gleam d="M9.4 15c.6-1.4 1.6-2.4 2.8-3" width={1.6} />
      <Spark x={6} y={6.6} r={2.6} fill={p.butter} />
      <Spark x={34} y={7.4} r={2.2} fill={p.white} />
    </g>
  ),
  'collect-100': ({ p }) => (
    <g>
      <path d="M5.6 14.6L20 5.4l14.4 9.2z" fill={p.white} />
      <path d={MUSEUM_HEART} fill={p.blushDeep} stroke="none" />
      <rect x={6.4} y={14.6} width={27.2} height={3.6} rx={1} fill={p.lavender} />
      <g fill={p.white}>
        {[9.4, 15.6, 21.8, 28].map((x) => (
          <rect key={x} x={x - 1.6} y={18.2} width={3.2} height={10.6} />
        ))}
      </g>
      <rect x={6.4} y={28.8} width={27.2} height={3} rx={1} fill={p.lavender} />
      <rect x={4.8} y={31.8} width={30.4} height={3} rx={1.2} fill={p.lavenderDeep} />
      <Spark x={33} y={7.4} r={2.4} fill={p.butter} />
    </g>
  ),
  'set-complete': ({ p }) => (
    <g>
      <path d="M11 10.6C5.6 10.6 5.4 18.6 12.2 19M29 10.6c5.4 0 5.6 8-1.2 8.4" fill="none" />
      <path d="M17.6 25h4.8l.6 4.4h-6z" fill={p.goldDeep} />
      <rect x={12.4} y={29.2} width={15.2} height={5.6} rx={1.6} fill={p.brown} />
      <rect x={16.6} y={30.8} width={6.8} height={2.4} rx={0.6} fill={p.goldLight} stroke-width={1.2} />
      <path d="M11 8h18v7.2c0 5.6-4 9.8-9 9.8s-9-4.2-9-9.8z" fill={p.gold} />
      <path d={TROPHY_STAR} fill={p.white} stroke-width={EF} />
      <Gleam d="M13.8 11v5.4" />
      <Spark x={6} y={26.6} r={2.4} fill={p.butter} />
      <Spark x={34} y={27} r={2} fill={p.white} />
    </g>
  ),
};
