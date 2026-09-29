import type { JSX } from 'preact';
import type { MachineId } from '@/catalog/types';
import { moon } from './crescent';

/**
 * The printed series labels (DESIGN §7.1): each series has one simple motif, printed in two
 * colours on its label paper like a real blind-box card. The ink is the series' own ink, the
 * second colour is its accent, and the paper shows through where a print would leave it bare.
 * Motifs are flat silhouettes on a 28-unit square, never cartoons: no faces, no sparkles.
 */
export interface PrintColours {
  ink: string;
  accent: string;
  paper: string;
}

type Motif = (c: PrintColours) => JSX.Element;

/** The second print colour of each series. */
export const MOTIF_ACCENT: Record<MachineId, string> = {
  cats: '#E896A9',
  cows: '#EFA5B5',
  dogs: '#8DB4D6',
  pond: '#8FC4AC',
  garden: '#9CBC84',
  pantry: '#E4BC5E',
  night: '#EFD27E',
  autumn: '#D48C6C',
  winter: '#9CC0E0',
  valentine: '#D98DB9',
  spring: '#EFA6B8',
  summer: '#F09AA6',
};

const NIGHT_MOON = moon(17.5, 9.5, 7.5, [-1, 0.55], 5.2);
const petal = (cx: number, cy: number, r: number) =>
  [0, 72, 144, 216, 288]
    .map((a) => {
      const t = ((a - 90) * Math.PI) / 180;
      return `M${(cx + Math.cos(t) * r * 0.95).toFixed(2)} ${(cy + Math.sin(t) * r * 0.95).toFixed(2)}m${(-r * 0.62).toFixed(2)} 0a${(r * 0.62).toFixed(2)} ${(r * 0.62).toFixed(2)} 0 1 0 ${(r * 1.24).toFixed(2)} 0a${(r * 0.62).toFixed(2)} ${(r * 0.62).toFixed(2)} 0 1 0 ${(-r * 1.24).toFixed(2)} 0`;
    })
    .join('');

export const MOTIFS: Record<MachineId, Motif> = {
  /** A cat sitting with its tail round its feet, in a collar. */
  cats: ({ ink, accent }) => (
    <g>
      <path
        fill={ink}
        d="M7.4 7.6 7 2.2 11.1 5.4C11.7 5.2 12.3 5.1 13 5.1S14.3 5.2 14.9 5.4L19 2.2 18.6 7.6C19.2 8.4 19.5 9.4 19.5 10.4 19.5 11.9 18.8 13.2 17.7 14.1 19.6 15.9 20.6 19.1 20.1 22.4 21.3 22.6 22.3 21.8 22.4 20.3 22.5 19 23.8 18.6 24.3 19.8 25.1 22.4 23.2 25.2 19.7 25.3 19.4 25.8 18.9 26.2 18.2 26.2H8.3C7.1 26.2 6.1 25.2 6.2 24 6.2 20.1 6.8 16.3 8.4 14.1 7.3 13.2 6.5 11.9 6.5 10.4 6.5 9.4 6.9 8.4 7.4 7.6Z"
      />
      <path fill={accent} d="M8.3 13.6C9.6 14.6 11.2 15.1 13 15.1S16.4 14.6 17.7 13.6L18.3 15.4C16.8 16.4 15 16.9 13 16.9S9.2 16.4 7.7 15.4Z" />
      <circle cx={13} cy={17.9} r={1.35} fill={accent} />
    </g>
  ),
  /** A cow's head: short horns, ears out to the sides, a white blaze and a pink muzzle. */
  cows: ({ ink, accent, paper }) => (
    <g>
      <path fill={ink} d="M9.6 7.4C8.1 6.6 7.3 5 7.7 3.1 8.9 3.9 10 5.1 10.8 6.4ZM18.4 7.4C19.9 6.6 20.7 5 20.3 3.1 19.1 3.9 18 5.1 17.2 6.4Z" />
      <path fill={ink} d="M9.1 9.8C6.7 9 3.7 9.6 2.4 11.6 4.4 12.8 7.3 12.6 9.3 11.8ZM18.9 9.8C21.3 9 24.3 9.6 25.6 11.6 23.6 12.8 20.7 12.6 18.7 11.8Z" />
      <path fill={ink} d="M8.6 9.2C8.6 6.7 10.8 5.6 14 5.6S19.4 6.7 19.4 9.2L19.2 15.4H8.8Z" />
      <path fill={paper} d="M12.5 5.9C13.1 7.5 14.9 7.5 15.5 5.9 15.2 9 14.6 11.2 14 12.8 13.4 11.2 12.8 9 12.5 5.9Z" />
      <path fill={accent} d="M7.8 17.8C7.8 14.8 10.4 13.4 14 13.4S20.2 14.8 20.2 17.8C20.2 21.2 17.6 23.4 14 23.4S7.8 21.2 7.8 17.8Z" />
      <circle cx={11.8} cy={18.4} r={1} fill={ink} />
      <circle cx={16.2} cy={18.4} r={1} fill={ink} />
    </g>
  ),
  /** A dachshund, one ear and the collar in the second colour. */
  dogs: ({ ink, accent }) => (
    <g>
      <path fill={ink} d="M5.6 12.1C3.6 11.1 2.3 9.2 2.4 7.1 3.4 8.6 4.9 10 6.6 10.7Z" />
      <path
        fill={ink}
        d="M5.2 13.4C5.2 11.8 6.6 10.7 8.8 10.7H18.6L19.5 12.1C18.8 8.7 20.5 6.4 23 6.4 24.9 6.4 26 7.5 26.3 9L27.5 10.2C27.8 11 27.2 11.7 26.3 11.7H24C23.3 12.7 22.3 13.3 21.9 13.4V16.2C21.9 17 21.4 17.6 20.8 17.8V20.6C20.8 21.2 20.3 21.6 19.8 21.6S18.8 21.2 18.8 20.6V18H17.4V20.6C17.4 21.2 16.9 21.6 16.4 21.6S15.4 21.2 15.4 20.6V18H11.4V20.6C11.4 21.2 10.9 21.6 10.4 21.6S9.4 21.2 9.4 20.6V18H8.2V20.6C8.2 21.2 7.7 21.6 7.2 21.6S6.2 21.2 6.2 20.6V17.4C5.6 16.9 5.2 16.2 5.2 15.4Z"
      />
      <path fill={accent} d="M21.3 7.6C19.9 8.3 19.8 10.8 20.6 12.4 21.9 11.8 22.5 9.7 22.1 8.1Z" />
      <path fill={accent} d="M18.9 11.2 20.2 10.3 22.4 13.6 21.1 14.5Z" />
    </g>
  ),
  /** A lily pad with its notch, and a frog sitting on it. */
  pond: ({ ink, accent }) => (
    <g>
      <path fill={accent} d="M14 19.4 25.8 17.9A12 6.6 0 1 0 25.3 21.6Z" />
      <path fill={ink} d="M8.6 20.2C8.6 16 10.8 13.2 14 13.2S19.4 16 19.4 20.2Z" />
      <circle cx={11.1} cy={13.4} r={2.3} fill={ink} />
      <circle cx={16.9} cy={13.4} r={2.3} fill={ink} />
    </g>
  ),
  /** A cutting potted up: two leaves on a stem in a little pot. */
  garden: ({ ink, accent }) => (
    <g>
      <path fill={accent} d="M13.3 11C9.2 11 6 8.4 5.4 4.6 9.6 4.1 13 6.4 13.3 11ZM14.7 9.4C18.6 9.6 21.9 7.4 22.6 3.6 18.3 3 15.2 5.2 14.7 9.4Z" />
      <path fill={ink} d="M13.2 8.8H14.8V16H13.2Z" />
      <path fill={ink} d="M6.6 15.4H21.4V18.6H6.6ZM8 18.6H20L18.6 26.4H9.4Z" />
    </g>
  ),
  /** A jam jar with a cloth tied over its lid, and a blank paper label. */
  pantry: ({ ink, accent, paper }) => (
    <g>
      <path
        fill={ink}
        d="M9.2 8.6H18.8V10.8C19.9 11.4 20.4 12.4 20.4 13.6V23.8C20.4 25.3 19.2 26.4 17.8 26.4H10.2C8.8 26.4 7.6 25.3 7.6 23.8V13.6C7.6 12.4 8.1 11.4 9.2 10.8Z"
      />
      <path fill={accent} d="M6.2 9.6C6.2 6 9.1 4.2 14 4.2S21.8 6 21.8 9.6L19.9 11 18 9.8 16 11 14 9.8 12 11 10 9.8 8.1 11Z" />
      <path fill={paper} d="M9.8 15H18.2V20.6H9.8Z" />
    </g>
  ),
  /** A crescent moon over a cat asleep, curled nose to tail. */
  night: ({ ink, accent }) => (
    <g>
      <path fill={accent} d={NIGHT_MOON} />
      <path fill={ink} d="M4.8 24.2C4.8 20.4 8.4 17.6 13.6 17.6 18.8 17.6 23 20.1 23 23.4 23 25.2 21.6 26.4 19.2 26.4H7C5.8 26.4 4.8 25.4 4.8 24.2Z" />
      <path fill={ink} d="M6.4 19.8 6.2 15.8 9.2 18.2ZM10.2 18.1 11 14.4 12.9 17.6Z" />
      <path fill={accent} d="M15.4 22.8C18.4 22.4 20.6 23.1 21.4 24.6 18.8 25.4 16.4 24.8 15.4 22.8Z" />
    </g>
  ),
  /** An acorn in its cup. */
  autumn: ({ ink, accent }) => (
    <g>
      <path fill={accent} d="M8.8 12.4H19.2C19.2 19.2 17.2 23.8 14 25.6 10.8 23.8 8.8 19.2 8.8 12.4Z" />
      <path fill={ink} d="M7.2 13.2C7.2 8.4 9.9 6.1 14 6.1S20.8 8.4 20.8 13.2Z" />
      <path fill={ink} d="M13.2 6.4 13.9 2.4 15.4 2.7 14.8 6.4Z" />
    </g>
  ),
  /** A knitted mitten, tipped as if just taken off: thumb, a Fair Isle band, a ribbed cuff. */
  winter: ({ ink, accent, paper }) => (
    <g transform="rotate(-14 14 15)">
      <path fill={accent} d="M9 20.4V11.8C7 11.6 5.2 10 5.4 8 5.6 6.6 7 6.1 8.1 6.9L9.2 7.9C9.8 5 12.2 3.2 15.2 3.2 18.8 3.2 21.4 5.8 21.4 9.4V20.4Z" />
      <path fill={paper} d="M9.2 12 11.3 13.8 13.4 12 15.4 13.8 17.4 12 19.4 13.8 21.4 12V13.8L19.4 15.6 17.4 13.8 15.4 15.6 13.4 13.8 11.3 15.6 9.2 13.8Z" />
      <path fill={ink} d="M8.2 19.8H22.2V25.8H8.2Z" />
      <path fill={paper} d="M10.4 20.8H11.4V24.8H10.4ZM13.2 20.8H14.2V24.8H13.2ZM16 20.8H17V24.8H16ZM18.8 20.8H19.8V24.8H18.8Z" />
    </g>
  ),
  /** A letter with its flap folded down and a wax seal. */
  valentine: ({ ink, accent, paper }) => (
    <g>
      <path fill={ink} d="M4.6 8H23.4C24.1 8 24.6 8.5 24.6 9.2V21.8C24.6 22.5 24.1 23 23.4 23H4.6C3.9 23 3.4 22.5 3.4 21.8V9.2C3.4 8.5 3.9 8 4.6 8Z" />
      <path fill={paper} d="M3.9 9.3 5 8.2 14 15.4 23 8.2 24.1 9.3 14 17.6Z" />
      <circle cx={14} cy={17.2} r={3.3} fill={accent} />
    </g>
  ),
  /** A blossom branch: a twig and three five-petal flowers. */
  spring: ({ ink, accent }) => (
    <g>
      <path
        fill={ink}
        d="M3 25.4C7.8 20.6 13.4 15.6 23.8 5.6L24.8 6.6C14.6 16.8 9 21.8 4.2 26.4ZM16.4 14.2C18 15 19.8 16.4 20.8 18.2L19.8 18.8C18.9 17.2 17.4 16 15.8 15.2Z"
      />
      <path fill={accent} d={petal(10, 18.4, 3) + petal(18.6, 9.4, 3.2) + petal(21.4, 19.6, 2.6)} />
      <circle cx={10} cy={18.4} r={1} fill={ink} />
      <circle cx={18.6} cy={9.4} r={1.05} fill={ink} />
      <circle cx={21.4} cy={19.6} r={0.9} fill={ink} />
    </g>
  ),
  /** A slice of watermelon: rind, flesh and seeds. */
  summer: ({ ink, accent }) => (
    <g transform="rotate(-12 14 14)">
      <path fill={ink} d="M1.6 11.6H26.4A12.4 12.4 0 0 1 1.6 11.6Z" />
      <path fill={accent} d="M4 11.6H24A10 10 0 0 1 4 11.6Z" />
      <path
        fill={ink}
        d="M9 14.6 10 16.8 8.6 16.4ZM14 16 15 18.2 13.6 17.8ZM19 14.6 18.4 16.8 17.6 15.6ZM11.6 19 12.4 20.6 11.2 20.4ZM16.6 19.2 16.2 20.8 15.4 20Z"
      />
    </g>
  ),
};
