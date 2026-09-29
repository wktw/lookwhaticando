import type { JSX } from 'preact';
import { SPARKLE, seeded } from '../paths';
import { useUid } from '../uid';
import s from './sky.module.css';

/** Three star fields with different tile widths, so the repeat never lines up. */
const LAYERS = [
  { tile: 700, seed: 3, dur: 4.2, delay: -1.3 },
  { tile: 860, seed: 7, dur: 5.8, delay: -3.1 },
  { tile: 1010, seed: 13, dur: 3.3, delay: -0.4 },
];

function starField(tile: number, seed: number, bottom: number, size: number) {
  const rand = seeded(seed);
  const stars: JSX.Element[] = [];
  for (let k = 0; k < 6; k++) {
    const x = 20 + rand() * (tile - 40);
    const y = 24 + rand() * (bottom - 48);
    if (k < 2) {
      const r = (6 + rand() * 4) * size;
      stars.push(<path key={k} d={SPARKLE} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${r.toFixed(2)})`} fill="#FFF3C2" />);
    } else {
      stars.push(<circle key={k} cx={x.toFixed(1)} cy={y.toFixed(1)} r={((2 + rand() * 1.6) * size).toFixed(2)} fill="#FFF9E8" />);
    }
  }
  return stars;
}

export interface StarsProps {
  /** Stars fill the band from the top down to this line, on a view 1000 units high. */
  bottom: number;
  /** Size multiplier (small views want bigger stars). */
  size?: number;
}

/** Twinkling night stars across the full width of the container. */
export function Stars({ bottom, size = 1 }: StarsProps) {
  const uid = useUid('stars');
  return (
    <>
      {LAYERS.map((layer, i) => {
        const id = `${uid}-${i}`;
        return (
          <svg
            key={id}
            class={s.stars}
            style={{ height: `${bottom / 10}%`, '--dur': `${layer.dur}s`, '--delay': `${layer.delay}s` }}
            viewBox={`0 0 6000 ${bottom}`}
            preserveAspectRatio="xMidYMin slice"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <pattern id={id} width={layer.tile} height={bottom} patternUnits="userSpaceOnUse">
                {starField(layer.tile, layer.seed, bottom, size)}
              </pattern>
            </defs>
            <rect width="6000" height={bottom} fill={`url(#${id})`} />
          </svg>
        );
      })}
    </>
  );
}
