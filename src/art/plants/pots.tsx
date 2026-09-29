/**
 * Pots (DESIGN §5.5), one per PotId. Every pot sits at the bottom center of the 100×100
 * canvas with its opening around y≈66, so any plant fits any pot.
 */
import type { JSX } from 'preact';
import type { PotId } from '@/catalog/types';
import type { PotArtDef } from './types';
import { BLUSH, EYE } from '../pets/geometry';
import { OUTLINE, SOIL, SPARKLE_D } from './parts';

const RIM = 'M27 69 Q27 66 30 66 L70 66 Q73 66 73 69 L73 72.5 Q73 75.5 70 75.5 L30 75.5 Q27 75.5 27 72.5 Z';
const BODY = 'M30.5 75 L69.5 75 L66.2 91.5 Q65.5 95 62 95 L38 95 Q34.5 95 33.8 91.5 Z';
/** Round "face" bowl shared by the kitty and frog pots. */
const BOWL = 'M27 67.5 Q27 66 28.5 66 L71.5 66 Q73 66 73 67.5 C73.5 84 66 95 50 95 C34 95 26.5 84 27 67.5 Z';

/** Classic pots wear their Evergreen ribbon just under the rim, bow tied on the right. */
const RIBBON = 'M30.8 76.6 L69.2 76.6 L68.4 80.6 L31.6 80.6 Z';
const RIBBON_BOW = { x: 66.6, y: 78.6 };

/** The soil mound peeking out of every pot. */
export function Soil({ sw }: { sw: number }) {
  return (
    <g>
      <path d="M29 71 C31 63 40 60.5 50 60.5 C60 60.5 69 63 71 71 Z" fill={SOIL} stroke={OUTLINE} stroke-width={sw} stroke-linejoin="round" />
      <g fill="#7E5A4D">
        <circle cx={40} cy={64.6} r={0.9} />
        <circle cx={58.5} cy={63.6} r={0.8} />
        <circle cx={63} cy={65.4} r={0.7} />
      </g>
      <path d="M37.6 65 Q41.4 63.4 45.4 63.1" fill="none" stroke="#fff" stroke-width={1.3} stroke-linecap="round" opacity={0.3} />
    </g>
  );
}

/** Soft shading shared by the classic tapered pots: under-rim shadow, bottom shade, left highlight. */
function Shading({ uid, body = BODY }: { uid: string; body?: string }) {
  return (
    <>
      <clipPath id={`${uid}-shade`}>
        <path d={body} />
      </clipPath>
      <g clip-path={`url(#${uid}-shade)`}>
        <rect x={20} y={74} width={60} height={4.4} fill={OUTLINE} opacity={0.09} />
        <ellipse cx={50} cy={100} rx={28} ry={8} fill={OUTLINE} opacity={0.07} />
      </g>
    </>
  );
}

function Highlights() {
  return (
    <g fill="none" stroke="#fff" stroke-linecap="round">
      <path d="M35.6 79.5 Q34.8 84.5 35.9 89" stroke-width={2.4} opacity={0.5} />
      <path d="M31 69.2 L37.5 69.2" stroke-width={1.6} opacity={0.75} />
    </g>
  );
}

interface ClassicProps {
  uid: string;
  sw: number;
  body: string;
  rim: string;
  /** Pattern on the body, clipped to it. */
  pattern?: JSX.Element;
  /** Drawn over the rim (glaze, snow). */
  over?: JSX.Element;
}

/** The classic tapered pot: body, rim, pattern, shading and highlight. */
function Classic({ uid, sw, body, rim, pattern, over }: ClassicProps) {
  return (
    <g stroke-linejoin="round">
      <path d={BODY} fill={body} />
      {pattern && (
        <>
          <clipPath id={`${uid}-body`}>
            <path d={BODY} />
          </clipPath>
          <g clip-path={`url(#${uid}-body)`}>{pattern}</g>
        </>
      )}
      <Shading uid={uid} />
      <path d={BODY} fill="none" stroke={OUTLINE} stroke-width={sw} />
      <path d={RIM} fill={rim} stroke={OUTLINE} stroke-width={sw} />
      {over}
      <Highlights />
    </g>
  );
}

/* ------------------------------------------------------------------ */

const terracotta: PotArtDef = {
  charm: RIBBON_BOW,
  ribbon: RIBBON,
  render: (uid, sw) => (
    <Classic
      uid={uid}
      sw={sw}
      body="#EFA07F"
      rim="#F6B597"
      pattern={<path d="M28 89.5 L72 89.5" stroke="#D98563" stroke-width={1.4} opacity={0.55} />}
    />
  ),
};

const cream: PotArtDef = {
  charm: RIBBON_BOW,
  ribbon: RIBBON,
  render: (uid, sw) => (
    <Classic
      uid={uid}
      sw={sw}
      body="#FFF1DA"
      rim="#FFF9EE"
      pattern={
        <g>
          <path d="M29 84 q2.6 -2.6 5.2 0 t5.2 0 t5.2 0 t5.2 0 t5.2 0 t5.2 0 t5.2 0 t5.2 0" fill="none" stroke="#E6C8A4" stroke-width={1.5} stroke-linecap="round" />
          <g fill="#E6C8A4">
            {[36.8, 47.2, 57.6].map((x) => (
              <circle key={x} cx={x} cy={87.6} r={0.95} />
            ))}
          </g>
        </g>
      }
    />
  ),
};

const blush: PotArtDef = {
  charm: RIBBON_BOW,
  ribbon: RIBBON,
  render: (uid, sw) => (
    <Classic
      uid={uid}
      sw={sw}
      body="#FFC6D4"
      rim="#FFDAE3"
      pattern={
        <g fill="#fff" opacity={0.9}>
          {[
            [37, 81],
            [47, 80],
            [57, 81],
            [66.5, 80],
            [42, 88],
            [52, 88.5],
            [62, 88],
          ].map(([x, y]) => (
            <circle key={`${x}`} cx={x} cy={y} r={1.9} />
          ))}
        </g>
      }
    />
  ),
};

/** Glaze poured over the top, dripping down onto bare clay. */
const GLAZE =
  'M20 74 L80 74 L80 79.5 Q71 79.4 70 81.5 Q68.8 86.5 66.8 86.3 Q64.8 86.1 64.6 82.2 Q64 80 60.2 80.4 Q57.6 80.7 57.2 84 Q56.6 89.6 54 89.4 Q51.6 89.2 51.4 84.6 Q51 81 47.6 81 Q44.6 81.2 44.2 83 Q43.6 85.4 41.8 85.2 Q40 85 39.6 82.6 Q39 80.6 35.4 80.8 Q31 81.2 20 81 Z';

const sage: PotArtDef = {
  charm: RIBBON_BOW,
  ribbon: RIBBON,
  render: (uid, sw) => (
    <Classic
      uid={uid}
      sw={sw}
      body="#F6EADB"
      rim="#B3D7A2"
      pattern={
        <g>
          <path d={GLAZE} fill="#A6CF94" stroke={OUTLINE} stroke-width={sw * 0.6} stroke-linejoin="round" />
          <path d="M60.4 83.5 Q60.2 81.8 61.6 81.6" fill="none" stroke="#fff" stroke-width={1} stroke-linecap="round" opacity={0.6} />
        </g>
      }
    />
  ),
};

const cowprint: PotArtDef = {
  charm: RIBBON_BOW,
  ribbon: RIBBON,
  render: (uid, sw) => (
    <Classic
      uid={uid}
      sw={sw}
      body="#FFFDF7"
      rim="#FFC4D3"
      pattern={
        <g fill="#6E5250">
          <path d="M26 79 C30 76.5 35.5 77.5 37 81 C38.5 84.5 36 88 32 87.6 C29 87.3 27.5 89 25 88 Z" />
          <path d="M55 80.5 C57.5 77.8 62.5 78.4 63.2 81.4 C63.8 84.2 60.6 86.4 57.6 85.8 C54.8 85.3 53.4 82.4 55 80.5 Z" />
          <path d="M70 84 C67 84.5 65.6 87.6 66.8 90.4 C67.8 92.6 70.5 93.2 73 92 Z" />
          <path d="M41.5 92.4 C43 89.8 47.6 89.6 49.4 91.8 C50.6 93.4 50 96 48 97 L41 97 C40.4 95.6 40.6 93.8 41.5 92.4 Z" />
          <ellipse cx={47.4} cy={80.4} rx={1.6} ry={1.3} />
        </g>
      }
    />
  ),
};

const starlight: PotArtDef = {
  charm: RIBBON_BOW,
  ribbon: RIBBON,
  render: (uid, sw) => (
    <Classic
      uid={uid}
      sw={sw}
      body="#A396E6"
      rim="#FFDC73"
      pattern={
        <g>
          <path d="M53.6 80.2 A5.4 5.4 0 1 0 57.8 88.6 A4.3 4.3 0 1 1 53.6 80.2 Z" fill="#FFE08A" stroke={OUTLINE} stroke-width={1.1} stroke-linejoin="round" />
          <g fill="#FFE08A" stroke={OUTLINE} stroke-width={0.8} stroke-linejoin="round">
            <path d={SPARKLE_D} transform="translate(38.5 81) scale(0.8)" />
            <path d={SPARKLE_D} transform="translate(64.2 80.4) scale(0.62)" />
            <path d={SPARKLE_D} transform="translate(43 90) scale(0.55)" />
          </g>
          <g fill="#FFF3C4">
            <circle cx={45.6} cy={79.6} r={0.8} />
            <circle cx={34.6} cy={87} r={0.75} />
            <circle cx={62} cy={89.6} r={0.9} />
            <circle cx={66.8} cy={85.4} r={0.6} />
            <circle cx={49} cy={86} r={0.6} />
          </g>
        </g>
      }
      over={<path d="M30.5 72.6 L69.5 72.6" stroke="#F2B93B" stroke-width={1.2} stroke-linecap="round" opacity={0.8} />}
    />
  ),
};

const SNOW_CAP =
  'M25.8 70.4 C25.2 65.6 28.6 63.8 32 64.4 C36 62.6 41 64.2 45 63.6 C50 62.6 54.6 64 58.6 63.4 C63 62.6 67.4 64 70 63.8 C73.6 63.8 75.2 66.6 74.4 70 C74.2 72.6 72.8 73.6 71.4 73 C70.8 76.4 67.4 77.2 66.4 74.4 C65.2 73.2 62.8 73.8 61.8 74.2 C58.6 75.4 55.8 74.4 54.8 73.8 C53 73 51.4 74.8 50.6 77 C49.6 79.6 46.2 79.4 45.8 76.4 C45.4 74 43 73.6 40.6 74.2 C37.6 75 35.8 73.8 35 73.4 C33.4 72.8 32.2 73.6 31.8 75.6 C31.2 78.4 27.4 78.4 27.4 75.2 C26 74.6 25.8 72.6 25.8 70.4 Z';

const snowy: PotArtDef = {
  // Just below the snow drips.
  charm: { x: 66, y: 80.6 },
  ribbon: 'M31.5 80 L68.5 80 L67.7 84 L32.3 84 Z',
  render: (uid, sw) => (
    <Classic
      uid={uid}
      sw={sw}
      body="#D2E8F8"
      rim="#E6F3FD"
      pattern={
        <g stroke="#8FC0E8" stroke-width={1.5} stroke-linecap="round" fill="none">
          <path d="M50 80.2 L50 91.4 M45.1 83 L54.9 88.6 M45.1 88.6 L54.9 83" />
          <path d="M48.2 81.2 L50 82.8 L51.8 81.2 M48.2 90.4 L50 88.8 L51.8 90.4" stroke-width={1.1} />
          <circle cx={37.5} cy={84} r={0.9} fill="#fff" stroke="none" />
          <circle cx={62.5} cy={87.6} r={1.1} fill="#fff" stroke="none" />
          <circle cx={40.5} cy={90.6} r={0.7} fill="#fff" stroke="none" />
        </g>
      }
      over={
        <g>
          <path d={SNOW_CAP} fill="#FFFFFF" stroke={OUTLINE} stroke-width={sw} stroke-linejoin="round" />
          <path d="M33 70.8 Q34 72.4 36.4 72.6 M58 71.4 Q61 72.8 64 72" fill="none" stroke="#BBDCF6" stroke-width={1.2} stroke-linecap="round" />
        </g>
      }
    />
  ),
};

/* ------------------------------------------------------------------ */
/* Character pots                                                      */
/* ------------------------------------------------------------------ */

function Blush({ y = 86, dx = 15.5 }: { y?: number; dx?: number }) {
  return (
    <g fill={BLUSH} opacity={0.6}>
      <ellipse cx={50 - dx} cy={y} rx={3.6} ry={2.1} />
      <ellipse cx={50 + dx} cy={y} rx={3.6} ry={2.1} />
    </g>
  );
}

function Eye({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={2.3} ry={2.8} fill={EYE} />
      <circle cx={x + 0.8} cy={y - 1} r={0.85} fill="#fff" />
    </g>
  );
}

const kitty: PotArtDef = {
  charm: { x: 69.4, y: 61 },
  render: (uid, sw) => (
    <g stroke-linejoin="round" stroke-linecap="round">
      {[false, true].map((m) => (
        <g key={String(m)} transform={m ? 'translate(100 0) scale(-1 1)' : undefined}>
          <path d="M28.6 72 C28.4 66 29.4 60.4 31.2 57.6 C31.9 56.5 33.1 56.3 34.2 57.1 C37.4 59.6 40.8 63 43 66.6" fill="#FFDDBE" stroke={OUTLINE} stroke-width={sw} />
          <path d="M31.8 65.4 C31.8 63 32.3 61.2 33.1 60.2 C34.9 61.5 36.8 63.4 38.2 65.2 Z" fill="#FFB9C6" />
        </g>
      ))}
      <path d={BOWL} fill="#FFDDBE" />
      <clipPath id={`${uid}-bowl`}>
        <path d={BOWL} />
      </clipPath>
      <g clip-path={`url(#${uid}-bowl)`}>
        <path d="M45 66 L46 70.4 M50 66 L50 71.4 M55 66 L54 70.4" stroke="#F4B283" stroke-width={2.2} fill="none" />
        <ellipse cx={50} cy={101} rx={28} ry={9} fill={OUTLINE} opacity={0.07} />
      </g>
      <path d={BOWL} fill="none" stroke={OUTLINE} stroke-width={sw} />
      <Blush y={85.4} />
      <Eye x={41.2} y={80.8} />
      <Eye x={58.8} y={80.8} />
      <path d="M48.6 83.6 L51.4 83.6 L50 85 Z" fill="#F58CAA" stroke="#F58CAA" stroke-width={1} />
      <path d="M46.6 85.4 Q48.3 87.6 50 85.4 Q51.7 87.6 53.4 85.4" fill="none" stroke={OUTLINE} stroke-width={1.4} />
      <g stroke={OUTLINE} stroke-width={1.1} opacity={0.5}>
        <path d="M25.2 81.4 L31 82.6 M25.6 86 L31.2 85.2 M74.8 81.4 L69 82.6 M74.4 86 L68.8 85.2" />
      </g>
      <path d="M31.5 71 Q31 76 32.8 80" fill="none" stroke="#fff" stroke-width={2.2} opacity={0.5} />
    </g>
  ),
};

const frog: PotArtDef = {
  charm: { x: 71, y: 69.6 },
  render: (uid, sw) => (
    <g stroke-linejoin="round" stroke-linecap="round">
      <g fill="#AEDB95" stroke={OUTLINE} stroke-width={sw}>
        <circle cx={36.4} cy={66.2} r={7} />
        <circle cx={63.6} cy={66.2} r={7} />
      </g>
      <path d={BOWL} fill="#AEDB95" />
      <clipPath id={`${uid}-bowl`}>
        <path d={BOWL} />
      </clipPath>
      <g clip-path={`url(#${uid}-bowl)`}>
        <ellipse cx={50} cy={96} rx={16} ry={9} fill="#D9F0C9" />
        <ellipse cx={50} cy={101} rx={28} ry={9} fill={OUTLINE} opacity={0.07} />
      </g>
      <path d={BOWL} fill="none" stroke={OUTLINE} stroke-width={sw} />
      {/* Re-fill the bumps so the bowl's top edge doesn't cut through them. */}
      <g fill="#AEDB95">
        <circle cx={36.4} cy={66.2} r={7 - sw / 2} />
        <circle cx={63.6} cy={66.2} r={7 - sw / 2} />
      </g>
      <g fill="#fff" stroke={OUTLINE} stroke-width={1.3}>
        <circle cx={36.4} cy={65.6} r={4.3} />
        <circle cx={63.6} cy={65.6} r={4.3} />
      </g>
      <g fill={EYE}>
        <circle cx={37} cy={66} r={2.4} />
        <circle cx={63} cy={66} r={2.4} />
      </g>
      <g fill="#fff">
        <circle cx={37.8} cy={65} r={0.85} />
        <circle cx={63.8} cy={65} r={0.85} />
      </g>
      <Blush y={82.6} dx={16} />
      <path d="M41 80 Q50 87.6 59 80" fill="none" stroke={OUTLINE} stroke-width={1.6} />
      <path d="M31.4 73 Q31 77.4 32.6 81" fill="none" stroke="#fff" stroke-width={2.2} opacity={0.5} />
    </g>
  ),
};

const pumpkin: PotArtDef = {
  charm: { x: 70.5, y: 71 },
  render: (_uid, sw) => (
    <g stroke-linejoin="round" stroke-linecap="round">
      <g stroke={OUTLINE} stroke-width={sw}>
        <ellipse cx={36.6} cy={81} rx={11.6} ry={14} fill="#FFB27B" />
        <ellipse cx={63.4} cy={81} rx={11.6} ry={14} fill="#FFB27B" />
        <ellipse cx={50} cy={80.6} rx={12} ry={14.6} fill="#FFC08F" />
      </g>
      <path d="M50 67.4 Q52.6 74 52.6 81" fill="none" stroke="#FFA56A" stroke-width={1.6} opacity={0.7} />
      <path d="M29.2 74 Q27.6 79.4 29.6 85" fill="none" stroke="#fff" stroke-width={2.2} opacity={0.5} />
      <path d="M44.4 70.4 Q42.6 74 43 78" fill="none" stroke="#fff" stroke-width={1.8} opacity={0.55} />
      <path d="M64 66.6 C66.8 63.2 70.6 63.2 71.6 65.8 C72.4 67.8 70 69 69.2 67.4" fill="none" stroke={OUTLINE} stroke-width={1.3} />
      <path d="M60.5 67.8 C61.6 63.6 66.4 62.2 68.8 63.6 C67.6 67 63.6 68.8 60.5 67.8 Z" fill="#9CCB86" stroke={OUTLINE} stroke-width={1.6} />
    </g>
  ),
};

const HEART = 'M50 70.6 C46.2 64.4 39.6 62 33.6 63.2 C27.2 64.4 24.8 70.4 26 76 C27.6 84 38 89 46 93.8 Q50 96.2 54 93.8 C62 89 72.4 84 74 76 C75.2 70.4 72.8 64.4 66.4 63.2 C60.4 62 53.8 64.4 50 70.6 Z';

const heart: PotArtDef = {
  charm: { x: 70.5, y: 72 },
  render: (uid, sw) => (
    <g stroke-linejoin="round" stroke-linecap="round">
      <path d={HEART} fill="#FFB3C7" />
      <clipPath id={`${uid}-heart`}>
        <path d={HEART} />
      </clipPath>
      <g clip-path={`url(#${uid}-heart)`}>
        <ellipse cx={50} cy={100} rx={22} ry={12} fill={OUTLINE} opacity={0.08} />
      </g>
      <path d={HEART} fill="none" stroke={OUTLINE} stroke-width={sw} />
      <path d="M30 70.6 Q31.2 66.6 35.4 66" fill="none" stroke="#fff" stroke-width={2.2} opacity={0.7} />
      <g fill="#fff" opacity={0.9}>
        <path d="M60.6 78.6 C59.8 77.2 57.4 77.6 57.6 79.4 C57.8 80.8 59.6 81.8 60.6 82.6 C61.6 81.8 63.4 80.8 63.6 79.4 C63.8 77.6 61.4 77.2 60.6 78.6 Z" />
        <circle cx={40.4} cy={80.4} r={1.1} />
        <circle cx={51} cy={84.6} r={0.9} />
      </g>
    </g>
  ),
};

export const POTS: Record<PotId, PotArtDef> = {
  terracotta,
  cream,
  blush,
  sage,
  cowprint,
  kitty,
  frog,
  pumpkin,
  snowy,
  heart,
  starlight,
};
