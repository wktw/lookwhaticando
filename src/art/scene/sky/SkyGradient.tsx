import { useUid } from '../uid';
import s from './sky.module.css';

/** The sky: a vertical gradient that reaches its horizon color at `horizon` (0..1 of the height). */
export function SkyGradient({ colors, horizon }: { colors: readonly [string, string, string]; horizon: number }) {
  const id = useUid('sky');
  return (
    <svg class={s.fill} viewBox="0 0 10 10" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={colors[0]} />
          <stop offset={horizon * 0.55} stop-color={colors[1]} />
          <stop offset={horizon} stop-color={colors[2]} />
        </linearGradient>
      </defs>
      <rect width="10" height="10" fill={`url(#${id})`} />
    </svg>
  );
}
