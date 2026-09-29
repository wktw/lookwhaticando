import type { JSX } from 'preact';
import type { ArtCtx, PatternId } from './types';

/**
 * Body-clipped pattern renderers. Each receives the ctx and draws in pet canvas
 * coordinates; the caller clips to BODY_PATH, so shapes can overflow the outline freely.
 * Patterns must leave the face readable: keep dark patches away from the eye anchors.
 */
export type PatternRenderer = (ctx: ArtCtx) => JSX.Element | null;

const tabby: PatternRenderer = ({ look }) => {
  const c = look.palette.pattern ?? '#E8955A';
  return (
    <g stroke={c} stroke-width={3} stroke-linecap="round" fill="none">
      {/* forehead "M" stripes */}
      <path d="M43.5 29 L44.5 36" />
      <path d="M50 28 L50 37.5" />
      <path d="M56.5 29 L55.5 36" />
      {/* flank stripes */}
      <path d="M13 64 Q19 65 22 69" />
      <path d="M13 72 Q18.5 73 21.5 77" />
      <path d="M87 64 Q81 65 78 69" />
      <path d="M87 72 Q81.5 73 78.5 77" />
    </g>
  );
};

const cow: PatternRenderer = ({ look }) => {
  const c = look.palette.pattern ?? '#6B4A48';
  return (
    <g fill={c}>
      {/* big patch hugging the top-right of the head (keeps eyes clear) */}
      <path d="M58 26 C68 25 80 31 83 41 C85 47 79 50 74 47 C70 45 71 40 66 39 C60 38 56 35 56.5 31 C57 28.5 57 26.5 58 26 Z" />
      {/* left flank */}
      <path d="M12 72 C15 67 22 67 24.5 71.5 C27 76 23 81 18.5 81 C14 81 10 77 12 72 Z" />
      {/* lower right */}
      <path d="M63 85 C65 80.5 72 80 75 83.5 C78 87 76 94 70 95 C65 95.5 61.5 90 63 85 Z" />
    </g>
  );
};

const calico: PatternRenderer = ({ look }) => {
  const orange = look.palette.pattern ?? '#F4B27A';
  const dark = look.palette.pattern2 ?? '#6E5250';
  return (
    <g>
      <path fill={orange} d="M14 36 C22 26 38 24 45 29 C48 32 45 38 40 40 C33 43 27 47 22 52 C17 57 10 50 14 36 Z" />
      <path fill={dark} d="M64 27 C71 27 80 32 83 40 C85 45 80 47 76 45 C72 43 70 39 66 37.5 C61.5 36 60.5 28 64 27 Z" />
      <path fill={orange} d="M76 64 C81 60 90 63 90 71 C90 78 83 82 78 79 C73 76 72 67 76 64 Z" />
      <path fill={dark} d="M10 78 C14 74 22 75 24 80 C26 86 20 92 14 91 C8 90 7 82 10 78 Z" />
    </g>
  );
};

const tuxedo: PatternRenderer = ({ look }) => {
  const bib = look.palette.belly ?? '#FFFFFF';
  return (
    <g fill={bib}>
      {/* muzzle + chest bib, a tuxedo shirt front */}
      <path d="M50 55.5 C57 55.5 62 60 62 65 C62 68 60 70 58 71.5 C63 75 66 82 64 94 L36 94 C34 82 37 75 42 71.5 C40 70 38 68 38 65 C38 60 43 55.5 50 55.5 Z" />
    </g>
  );
};

const bellyOnly: PatternRenderer = ({ look }) =>
  look.palette.belly ? <ellipse cx={50} cy={84} rx={19} ry={12} fill={look.palette.belly} /> : null;

export const PATTERNS: Partial<Record<PatternId, PatternRenderer>> = {
  none: () => null,
  tabby,
  cow,
  calico,
  tuxedo,
  'belly-only': bellyOnly,
};
