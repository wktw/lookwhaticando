import type { JSX } from 'preact';
import type { ArtCtx, WearableArt } from '../pets/types';
import { crescentPath, heartPath, starPath } from '../pets/shapes';
import { Blossom, Daisy, Leaf, Rose, Sparkle } from '../pets/bits';
import { OutlinedStroke, puffPath } from '../pets/species/parts';
import { headTransform } from '../pets/placement';
import { headItem, INK, SW } from './kit';

/** Bows, clips, crowns and bands, in head-local coordinates (see kit.headItem). */

/** Points along the crown line that hugs the top of the head, t in [-1, 1]. */
const crownPoint = (t: number): [number, number] => [19 * t, -1.5 + 7 * t * t];

/** A ring of motifs following the top of the head (flower crowns). */
function Wreath({ count, item }: { count: number; item: (i: number, x: number, y: number) => JSX.Element }) {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const [x, y] = crownPoint(-1 + (2 * i) / (count - 1));
        return <g key={i}>{item(i, x, y)}</g>;
      })}
    </g>
  );
}

const vine = <OutlinedStroke d="M-19.5 6 C-12 -2.6 12 -2.6 19.5 6" color="#9CCB86" width={2.2} />;

export const pinkBow: WearableArt = headItem(
  () => (
    <g transform="translate(-11.2 4.5) rotate(-14)" stroke={INK} stroke-width={SW * 0.85} stroke-linejoin="round">
      <path d="M0 0 C-4 -6 -12 -7.5 -12.5 -1.5 C-13 4.5 -5 5 0 0 Z" fill="#FF9FB8" />
      <path d="M0 0 C4 -6 12 -7.5 12.5 -1.5 C13 4.5 5 5 0 0 Z" fill="#FF9FB8" />
      <path d="M-1 1 L-4.5 8 L-1.2 7 L0 9.6 L1.6 1.2 Z" fill="#F58CAA" />
      <ellipse cx={0} cy={0} rx={3} ry={3.3} fill="#F58CAA" />
      <path d="M-8.5 -3.6 C-7 -4.6 -5.4 -4.4 -4.4 -3.6" fill="none" stroke="#fff" stroke-width={1.1} stroke-linecap="round" opacity={0.8} />
    </g>
  ),
  { iconX: 80, iconY: 42, iconScale: 2.7, overEars: true },
);

export const daisyCrown: WearableArt = headItem(
  () => (
    <g>
      {vine}
      <Wreath
        count={7}
        item={(i, x, y) =>
          i % 2 ? (
            <g transform={`translate(${x} ${y + 1}) rotate(${i * 40 - 120})`}>
              <Leaf len={5.4} />
            </g>
          ) : (
            <g transform={`translate(${x} ${y}) rotate(${i * 13})`}>
              <Daisy r={i === 2 ? 5.4 : 4.6} />
            </g>
          )
        }
      />
    </g>
  ),
  { dy: 0.5, iconY: 52, iconScale: 2, overEars: true },
);

export const roseCrown: WearableArt = headItem(
  () => (
    <g>
      {vine}
      <Wreath
        count={9}
        item={(i, x, y) =>
          i % 2 ? (
            <g transform={`translate(${x} ${y + 1.4}) rotate(${i * 45 - 150})`}>
              <Leaf len={5.6} />
            </g>
          ) : i % 4 === 2 ? (
            <g transform={`translate(${x} ${y})`}>
              <Rose r={4.8} color={i === 2 ? '#FFB3C7' : '#F58CAA'} />
            </g>
          ) : (
            <circle cx={x} cy={y} r={2.6} fill="#F7A8C0" stroke={INK} stroke-width={1.2} />
          )
        }
      />
    </g>
  ),
  { dy: 0.5, iconY: 52, iconScale: 2, overEars: true },
);

/** A five-lobed maple leaf, centered. */
const MAPLE = 'M0 -6.4 L1.5 -3.2 L4 -4.4 L3.4 -1.2 L6.4 0 L3.6 1.5 L4.2 4.2 L1.1 3 L0 5.6 L-1.1 3 L-4.2 4.2 L-3.6 1.5 L-6.4 0 L-3.4 -1.2 L-4 -4.4 L-1.5 -3.2 Z';
const MAPLE_COLORS = ['#FFB26B', '#F4808F', '#FFD36B', '#F79A6A', '#FFB26B'];

export const mapleCrown: WearableArt = headItem(
  () => (
    <g>
      <OutlinedStroke d="M-19.5 6 C-12 -2.6 12 -2.6 19.5 6" color="#C99A74" width={2} />
      <Wreath
        count={5}
        item={(i, x, y) => (
          <g transform={`translate(${x} ${y - 1}) rotate(${(i - 2) * 22}) scale(${i === 2 ? 1.2 : 1})`} stroke={INK} stroke-width={1.3} stroke-linejoin="round">
            <path d={MAPLE} fill={MAPLE_COLORS[i]} />
            <path d="M0 -3.6 L0 5" fill="none" stroke-width={0.8} opacity={0.5} />
          </g>
        )}
      />
    </g>
  ),
  { dy: 0.5, iconY: 54, iconScale: 2, overEars: true },
);

export const sakuraClip: WearableArt = headItem(
  () => (
    <g transform="translate(-11 4)">
      <g transform="translate(3 3) rotate(40)">
        <Leaf len={6} />
      </g>
      <g transform="rotate(-10)">
        <Blossom r={7} color="#FFC4D3" />
      </g>
    </g>
  ),
  { iconX: 83, iconY: 40, iconScale: 3, overEars: true },
);

/** A pair of cherries on joined stems. */
function Cherries() {
  return (
    <g stroke={INK} stroke-linejoin="round" stroke-linecap="round">
      <path d="M-3 1 C-2.4 -3 -0.4 -6 1.6 -7.6 M3 1.6 C2.6 -2 2 -5 1.6 -7.6" fill="none" stroke-width={1.3} />
      <g transform="translate(2.4 -7.4) rotate(-30)">
        <Leaf len={4.6} />
      </g>
      <g fill="#F0607F" stroke-width={SW * 0.7}>
        <circle cx={-3.2} cy={3.2} r={3.2} />
        <circle cx={3.4} cy={3.8} r={3.2} />
      </g>
      <g fill="#fff" stroke="none" opacity={0.85}>
        <circle cx={-4.2} cy={2.2} r={0.9} />
        <circle cx={2.4} cy={2.8} r={0.9} />
      </g>
    </g>
  );
}

export const cherryClips: WearableArt = headItem(
  () => (
    <g>
      <g transform="translate(-13 3.6) rotate(-16)">
        <Cherries />
      </g>
      <g transform="translate(13 3.6) rotate(16) scale(-1 1)">
        <Cherries />
      </g>
    </g>
  ),
  { iconY: 50, iconScale: 2.4, overEars: true },
);

export const crescentClip: WearableArt = headItem(
  () => (
    <g transform="translate(-11 3.4)" stroke={INK} stroke-linejoin="round">
      <path d={crescentPath(0, 0, 6.6)} transform="rotate(-30)" fill="#FFE593" stroke-width={SW * 0.85} />
      <path d={starPath(4.4, -3, 2.2)} fill="#FFF3B0" stroke-width={1} />
      <circle cx={-2} cy={-2.6} r={0.8} fill="#fff" stroke="none" opacity={0.9} />
    </g>
  ),
  { iconX: 90, iconY: 38, iconScale: 3.6, overEars: true },
);

function Halo({ uid }: { uid: string }) {
  return (
    <g>
      <radialGradient id={`${uid}-halo`}>
        <stop offset="0%" stop-color="#FFF3B0" stop-opacity={0.9} />
        <stop offset="100%" stop-color="#FFE593" stop-opacity={0} />
      </radialGradient>
      <ellipse rx={20} ry={8.4} fill={`url(#${uid}-halo)`} />
      <ellipse rx={12} ry={3.6} fill="none" stroke={INK} stroke-width={2.4 + SW * 1.4} />
      <ellipse rx={12} ry={3.6} fill="none" stroke="#FFD65C" stroke-width={2.4} />
      <path d="M-7.4 -2.8 C-4 -3.8 0 -4 3.2 -3.6" fill="none" stroke="#FFF8D6" stroke-width={1} stroke-linecap="round" />
    </g>
  );
}

/** A halo floats above the head, and above tall ears too. */
export const halo: WearableArt = {
  overEars: true,
  render: ({ anchors, uid }) => {
    const y = Math.min(anchors.head.y - 8, (anchors.crown ?? anchors.head.y) - 3);
    return (
      <g transform={headTransform(anchors, { dy: y - anchors.head.y })}>
        <g class="pet-halo">
          <Halo uid={uid} />
        </g>
      </g>
    );
  },
  icon: () => (
    <g transform="translate(50 50) scale(2.6)">
      <Halo uid="icon" />
    </g>
  ),
};

export const heartHeadband: WearableArt = headItem(
  () => (
    <g stroke-linejoin="round" stroke-linecap="round">
      <g fill="none" stroke={INK} stroke-width={1.2}>
        <path d="M-6 -0.6 L-8.4 -3.4 L-6 -5.6 L-8.6 -8 L-6.4 -10.4 L-8.6 -12.6" />
        <path d="M6 -0.6 L8.4 -3.4 L6 -5.6 L8.6 -8 L6.4 -10.4 L8.6 -12.6" />
      </g>
      <OutlinedStroke d="M-21 7 C-17 -3.4 17 -3.4 21 7" color="#F58CAA" width={2.8} />
      <g stroke={INK} stroke-width={SW * 0.75}>
        <path d={heartPath(-9, -15.4, 4.4)} fill="#FF9FB8" transform="rotate(-12 -9 -15.4)" />
        <path d={heartPath(9, -15.4, 4.4)} fill="#FF9FB8" transform="rotate(12 9 -15.4)" />
      </g>
      <g fill="#fff" stroke="none" opacity={0.85}>
        <ellipse cx={-10.6} cy={-17} rx={1.2} ry={0.8} />
        <ellipse cx={7.6} cy={-17.4} rx={1.2} ry={0.8} />
      </g>
    </g>
  ),
  { iconY: 64, iconScale: 2.3, overEars: true },
);

/**
 * Earmuffs sit over the ears wherever a species keeps them: on top for cats, dogs, bears and
 * hamsters; at the sides of the head for bunnies, cows, frogs and ducks.
 */
function muffSpots(ctx: ArtCtx): { l: [number, number]; r: [number, number]; peak: number } {
  const { head, eyes, headFeatures, headWearBehindFeatures } = ctx.anchors;
  const peak = Math.min(head.y - 4, eyes.y - 14);
  const eyesOnTop = eyes.y < head.y + 12;
  if (!headWearBehindFeatures && !eyesOnTop && headFeatures.length >= 2) {
    const y = head.y + 5.5;
    return { l: [headFeatures[0]!.x, y], r: [headFeatures[1]!.x, y], peak };
  }
  const y = eyesOnTop ? eyes.y + 9 : eyes.y - 7;
  const w = ctx.body.halfWidthAt(y) + 0.5;
  return { l: [50 - w, y], r: [50 + w, y], peak };
}

function Earmuffs({ l, r, peak, size = 1 }: { l: [number, number]; r: [number, number]; peak: number; size?: number }) {
  const ctrlY = 2 * peak - (l[1] + r[1]) / 2;
  return (
    <g stroke-linejoin="round">
      <OutlinedStroke d={`M${l[0]} ${l[1]} Q50 ${ctrlY} ${r[0]} ${r[1]}`} color="#BBDCF6" width={2.8 * size} />
      {[l, r].map(([x, y]) => (
        <g key={x}>
          <path d={puffPath(x, y, 6.6 * size, 9, 0.16)} fill="#FFFFFF" stroke={INK} stroke-width={SW} />
          <circle cx={x} cy={y} r={3.4 * size} fill="#FFD6E0" />
        </g>
      ))}
    </g>
  );
}

export const earmuffs: WearableArt = {
  render: (ctx) => <Earmuffs {...muffSpots(ctx)} />,
  icon: () => <Earmuffs l={[25, 64]} r={[75, 64]} peak={24} size={1.6} />,
};

/**
 * The Evergreen Crown, earned by growing a plant to Evergreen: a golden band set with evergreen
 * leaves and tiny blossoms, crowned by a golden sprout (Mochi's own), in a soft glow with twinkles.
 */
export const evergreenCrown: WearableArt = headItem(
  (uid) => {
    const leaf = (t: number, h: number, i: number) => {
      const [x, y] = crownPoint(t);
      return (
        <g key={`l${i}`} transform={`translate(${x} ${y}) rotate(${t * 38})`}>
          <path
            d={`M0 0.6 C-4 -2.4 -4.2 ${-h * 0.72} 0 ${-h} C4.2 ${-h * 0.72} 4 -2.4 0 0.6 Z`}
            fill={i % 2 ? '#A9D98F' : '#8EC07C'}
            stroke={INK}
            stroke-width={SW * 0.7}
            stroke-linejoin="round"
          />
          <path d={`M0 -1.4 L0 ${-h * 0.72}`} stroke="#E4F4D6" stroke-width={0.9} stroke-linecap="round" />
        </g>
      );
    };
    const bud = (t: number) => {
      const [x, y] = crownPoint(t);
      return <circle key={`b${t}`} cx={x} cy={y - 0.2} r={2.1} fill="#FFB3C7" stroke={INK} stroke-width={1} />;
    };
    return (
      <g stroke-linejoin="round" stroke-linecap="round">
        <radialGradient id={`${uid}-evergreen`}>
          <stop offset="0%" stop-color="#FFF3B0" stop-opacity={0.9} />
          <stop offset="65%" stop-color="#FFE593" stop-opacity={0.3} />
          <stop offset="100%" stop-color="#FFE593" stop-opacity={0} />
        </radialGradient>
        <ellipse cx={0} cy={-6} rx={28} ry={17} fill={`url(#${uid}-evergreen)`} />
        {leaf(-0.9, 10, 0)}
        {leaf(-0.52, 13, 1)}
        {leaf(0.52, 13, 1)}
        {leaf(0.9, 10, 0)}
        {/* the golden sprout at the center */}
        <g transform="translate(0 -1) scale(1.15)" stroke={INK} stroke-width={SW * 0.65}>
          <path d="M0 0 C0 -4 0.4 -7 1.2 -9.4" fill="none" stroke-width={SW * 0.8} />
          <path d="M1 -8.6 C-2.4 -13.4 -8 -13.6 -10.2 -10.8 C-7.2 -7 -2.2 -6.4 1 -8.6 Z" fill="#FFD65C" />
          <path d="M1.2 -9 C3.6 -14.4 9.4 -15.4 11.8 -12.8 C9.2 -8.6 4.6 -7.4 1.2 -9 Z" fill="#FFD65C" />
          <path d="M-1 -9.4 C-3.6 -10.4 -5.8 -10.6 -7.8 -10.4 M3 -10.6 C5.2 -12 7.4 -12.6 9.4 -12.6" fill="none" stroke="#E0A93A" stroke-width={0.9} />
        </g>
        <OutlinedStroke d="M-19.5 6 C-12 -3 12 -3 19.5 6" color="#F6CF5A" width={2.6} />
        <path d="M-15 1.6 C-9 -1.2 -3 -2 2 -2" fill="none" stroke="#FFF3B0" stroke-width={0.9} />
        {[-0.72, -0.26, 0.26, 0.72].map(bud)}
        <g transform="translate(-19 -10)">
          <Sparkle r={2.6} color="#FFF3B0" twinkle />
        </g>
        <g transform="translate(19 -13)">
          <Sparkle r={2.1} color="#FFF3B0" twinkle />
        </g>
        <g transform="translate(-4 -17)">
          <Sparkle r={1.5} color="#FFFFFF" twinkle />
        </g>
      </g>
    );
  },
  { dy: 0.5, iconY: 60, iconScale: 2, overEars: true },
);
