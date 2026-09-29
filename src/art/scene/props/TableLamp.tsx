/**
 * The table lamp at the right end of the sill: a glazed clay base, a brass stem and a pleated paper
 * shade. By day it is just a lamp; after dark it is the light source (DESIGN §10.1 Lamplight) and
 * its shade glows. Its own shade crescents follow the light like everything else.
 */
import type { JSX } from 'preact';
import { DAY_LIGHT, type Light } from '@/art/light';
import { CRESCENTS } from '../crescent/data';
import { LAMP_COLORS as C } from '../palette';
import { LAMP } from './shapes';

export interface TableLampProps {
  light?: Light;
  /** Lit: the shade glows (defaults to the night light). */
  on?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
}

const PLEATS = 'M42.4 17.6L37.4 41M47.2 17.6L45.6 41M52.8 17.6L54.4 41M57.6 17.6L62.6 41';

export function TableLamp({ light = DAY_LIGHT, on = light.night, class: cls, style }: TableLampProps) {
  // Lit, the lamp is its own source: its base is lit from above, its shade from within.
  const from = on ? 'top' : light.from;
  return (
    <svg class={cls} style={style} viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true" focusable="false" overflow="visible">
      <ellipse cx={50} cy={94} rx={15} ry={2} fill="var(--contact)" />
      <path d={LAMP.stem} fill={C.stem} />
      <path d={LAMP.foot} fill={C.base} />
      <path d={CRESCENTS['lamp.foot']![from]} fill="var(--shade)" />
      <path d={LAMP.base} fill={C.base} />
      <path d={CRESCENTS['lamp.base']![from]} fill="var(--shade)" />
      {on && <path d="M42 70.2C45 67.8 55 67.8 58 70.2C55 69.4 45 69.4 42 70.2Z" fill={C.shadeLit} opacity={0.7} />}
      <path d={LAMP.shade} fill={on ? C.shadeLit : C.shade} />
      <path d={PLEATS} fill="none" stroke={on ? C.pleatLit : C.pleat} stroke-width={0.9} stroke-linecap="round" />
      {!on && <path d={CRESCENTS['lamp.shade']![from]} fill="var(--shade)" />}
      <path d={LAMP.rim} fill={on ? C.rimLit : C.rim} />
    </svg>
  );
}
