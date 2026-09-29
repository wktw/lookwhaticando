import s from './meadow.module.css';

/** [left %, top %, loop seconds]: a loose drift of fireflies over the meadow and around the tree. */
const FLIES: readonly [number, number, number][] = [
  [12, 58, 13],
  [31, 46, 17],
  [46, 70, 11],
  [63, 52, 15],
  [78, 64, 12.5],
  [89, 44, 16],
  [22, 82, 14],
];

/** A few slow, glowing fireflies (night only). Pure CSS transform/opacity loops. */
export function Fireflies() {
  return (
    <div class={s.fireflies} aria-hidden="true">
      {FLIES.map(([x, y, dur], i) => (
        <span
          key={i}
          class={s.firefly}
          style={{ left: `${x}%`, top: `${y}%`, '--dur': `${dur}s`, '--delay': `${-i * 2.3}s`, '--dir': i % 2 ? 1 : -1 }}
        />
      ))}
    </div>
  );
}
