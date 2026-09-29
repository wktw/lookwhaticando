import s from './meadow.module.css';

/**
 * [left %, top %, loop seconds]: a loose drift of fireflies over the meadow and around the tree.
 * The last few only show on wide scenes, where there is more dark meadow to light.
 */
const FLIES: readonly (readonly [x: number, y: number, dur: number])[] = [
  [12, 58, 13],
  [31, 46, 17],
  [46, 70, 11],
  [63, 52, 15],
  [78, 64, 12.5],
  [89, 44, 16],
  [22, 82, 14],
  [70, 86, 13.5],
  [38, 90, 15.5],
  [55, 60, 12],
  [8, 74, 16.5],
  [94, 78, 14.5],
];

/**
 * A few slow, glowing fireflies (night only): small SVGs painted with attributes, so a snapshot
 * keeps them; their wander and glow are CSS transform/opacity loops.
 */
export function Fireflies() {
  return (
    <div class={s.critters} aria-hidden="true">
      {FLIES.map(([x, y, dur], i) => (
        <svg
          key={i}
          class={s.firefly}
          style={{ left: `${x}%`, top: `${y}%`, '--dur': `${dur}s`, '--delay': `${-i * 2.3}s`, '--dir': i % 2 ? 1 : -1 }}
          viewBox="-10 -10 20 20"
          focusable="false"
        >
          <circle r={10} fill="#FFE593" opacity={0.16} />
          <circle r={5.6} fill="#FFEC9C" opacity={0.42} />
          <circle r={2.3} fill="#FFFBE0" />
        </svg>
      ))}
    </div>
  );
}
