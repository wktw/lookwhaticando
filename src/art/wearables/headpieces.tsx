import type { JSX } from 'preact';
import type { ArtCtx, WearableArt } from '../pets/types';
import { crescentPath, heartPath, starPath } from '../pets/shapes';
import { Blossom, Daisy, Leaf, Rose, Sparkle } from '../pets/bits';
import { OutlinedStroke, puffPath } from '../pets/species/parts';
import { headTransform } from '../pets/placement';
import { headItem, iconWithUid, INK, SW } from './kit';

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
    <g transform="rotate(-14)" stroke={INK} stroke-width={SW * 0.85} stroke-linejoin="round">
      <path d="M0 0 C-4 -6 -12 -7.5 -12.5 -1.5 C-13 4.5 -5 5 0 0 Z" fill="#FF9FB8" />
      <path d="M0 0 C4 -6 12 -7.5 12.5 -1.5 C13 4.5 5 5 0 0 Z" fill="#FF9FB8" />
      <path d="M-1 1 L-4.5 8 L-1.2 7 L0 9.6 L1.6 1.2 Z" fill="#F58CAA" />
      <ellipse cx={0} cy={0} rx={3} ry={3.3} fill="#F58CAA" />
      <path d="M-8.5 -3.6 C-7 -4.6 -5.4 -4.4 -4.4 -3.6" fill="none" stroke="#fff" stroke-width={1.1} stroke-linecap="round" opacity={0.8} />
    </g>
  ),
  { clip: { x: -11.2, y: 4.5 }, iconX: 48.6, iconY: 44.6, iconScale: 2.6, overEars: true },
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
  { dy: 0.5, iconX: 49.3, iconY: 47.6, iconScale: 1.65, overEars: true },
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
  { dy: 0.5, iconY: 46.9, iconScale: 1.85, overEars: true },
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
  { dy: 0.5, iconY: 48, iconScale: 1.43, overEars: true },
);

export const sakuraClip: WearableArt = headItem(
  () => (
    <g>
      <g transform="translate(3 3) rotate(40)">
        <Leaf len={6} />
      </g>
      <g transform="rotate(-10)">
        <Blossom r={7} color="#FFC4D3" />
      </g>
    </g>
  ),
  { clip: { x: -11, y: 4 }, iconX: 49.9, iconY: 50.2, iconScale: 3.6, overEars: true },
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
  { iconY: 47.1, iconScale: 1.8, overEars: true },
);

export const crescentClip: WearableArt = headItem(
  () => (
    <g stroke={INK} stroke-linejoin="round">
      <path d={crescentPath(0, 0, 6.6)} transform="rotate(-30)" fill="#FFE593" stroke-width={SW * 0.85} />
      <path d={starPath(4.4, -3, 2.2)} fill="#FFF3B0" stroke-width={1} />
      <circle cx={-2} cy={-2.6} r={0.8} fill="#fff" stroke="none" opacity={0.9} />
    </g>
  ),
  { clip: { x: -11, y: 3.4 }, iconX: 54.8, iconY: 43.7, iconScale: 3.8, overEars: true },
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
  icon: iconWithUid((uid) => (
    <g transform="translate(50 50) scale(2.4)">
      <Halo uid={uid} />
    </g>
  )),
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
  { iconY: 63, iconScale: 1.9, overEars: true },
);

/**
 * Earmuffs cup the ears wherever a species keeps them: on top for cats, dogs, bears and hamsters,
 * at the bases of tall bunny ears, beside a frog's eye bumps, at the sides for cows and ducks. The
 * band arcs over the head from behind, so it never crosses the face or the eyes.
 */
function muffSpots(ctx: ArtCtx): { l: [number, number]; r: [number, number]; peak: number } {
  const { head, eyes, headFeatures, headWearBehindFeatures } = ctx.anchors;
  const peak = head.y - 7;
  const eyesOnTop = eyes.y < head.y + 12;
  const [fl, fr] = headFeatures;
  if (fl && fr && !eyesOnTop && (!headWearBehindFeatures || (ctx.anchors.crown ?? head.y) < head.y - 12)) {
    // Ears on the head (cat, dog, bear, hamster), or tall ears rising from it (bunny): cup their bases.
    const y = headWearBehindFeatures ? head.y + 3 : head.y + 5.5;
    return { l: [fl.x, y], r: [fr.x, y], peak };
  }
  const y = eyesOnTop ? eyes.y + 1 : eyes.y - 7;
  const w = ctx.body.halfWidthAt(y) + 0.5;
  return { l: [50 - w, y], r: [50 + w, y], peak };
}

function MuffBand({ l, r, peak, size = 1 }: { l: [number, number]; r: [number, number]; peak: number; size?: number }) {
  const ctrlY = 2 * peak - (l[1] + r[1]) / 2;
  return <OutlinedStroke d={`M${l[0]} ${l[1]} Q50 ${ctrlY} ${r[0]} ${r[1]}`} color="#BBDCF6" width={2.8 * size} />;
}

function Muffs({ l, r, size = 1 }: { l: [number, number]; r: [number, number]; size?: number }) {
  return (
    <g stroke-linejoin="round">
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
  overEars: true,
  behind: (ctx) => <MuffBand {...muffSpots(ctx)} />,
  render: (ctx) => <Muffs {...muffSpots(ctx)} />,
  icon: () => (
    <g>
      <MuffBand l={[25, 64]} r={[75, 64]} peak={24} size={1.6} />
      <Muffs l={[25, 64]} r={[75, 64]} size={1.6} />
    </g>
  ),
};

/*
 * The Evergreen Crown, earned by growing a plant to Evergreen: a wide golden circlet set with
 * evergreen-leaf spires, an emerald and Mochi's own sprout in gold. Its glow stays behind the pet
 * (so it never veils ears or horns), a gleam sweeps across the gold, and it sits behind ears and
 * horns with its spires stepping around them.
 */

/** Band half-width and its top edge in head-local units (wider than the 40-unit head). */
const CROWN_W = 22;
const crownTopY = (x: number) => -3.3 + 7.5 * (x / CROWN_W) ** 2;
const CROWN_BAND = `M${-CROWN_W} 4.2 Q0 -10.8 ${CROWN_W} 4.2 L${CROWN_W} 8.8 Q0 -6.2 ${-CROWN_W} 8.8 Z`;
/** Spire positions (head-local x) and heights, before stepping around features. */
const SPIRES: [number, number][] = [
  [-17.5, 10.5],
  [-9, 14],
  [9, 14],
  [17.5, 10.5],
];

/** A spire shaped like an evergreen tip, base centered on (0, 0), pointing up. */
const spirePath = (h: number) => {
  const w = h * 0.34;
  return `M${-w} 1 C${-w} ${-h * 0.36} ${-w * 0.42} ${-h * 0.74} 0 ${-h} C${w * 0.42} ${-h * 0.74} ${w} ${-h * 0.36} ${w} 1 Z`;
};
const spireTransform = (x: number) => {
  const tilt = (Math.atan((15 * x) / CROWN_W ** 2) * 180) / Math.PI;
  return `translate(${x} ${crownTopY(x) + 0.8}) rotate(${(tilt * 1.2).toFixed(1)})`;
};
const SPROUT_LEAVES = [
  'M1 -8.6 C-2.4 -13.4 -8 -13.6 -10.2 -10.8 C-7.2 -7 -2.2 -6.4 1 -8.6 Z',
  'M1.2 -9 C3.6 -14.4 9.4 -15.4 11.8 -12.8 C9.2 -8.6 4.6 -7.4 1.2 -9 Z',
];

/**
 * Spire positions for this pet. Ears and horns drawn in front of the crown (bunny, cow) would hide
 * a spire, so a blocked spire steps to the nearest free spot on the band, or bows out.
 */
function crownSpires(ctx?: ArtCtx): [number, number][] {
  const a = ctx?.anchors;
  const blocks = a && a.headWearBehindFeatures && (a.crown ?? a.head.y) < a.head.y - 4;
  if (!a || !blocks) return SPIRES;
  const k = a.head.width / 40;
  const spans = a.headFeatures.map((f) => [(f.x - a.head.x - f.width / 2) / k - 1.8, (f.x - a.head.x + f.width / 2) / k + 1.8] as const);
  const free = (x: number) => Math.abs(x) <= CROWN_W - 3 && Math.abs(x) >= 6 && spans.every(([l, r]) => x < l || x > r);
  const out: [number, number][] = [];
  for (const [x, h] of SPIRES) {
    const options = [x, ...spans.flatMap(([l, r]) => [l - 0.1, r + 0.1])].filter(free).sort((p, q) => Math.abs(p - x) - Math.abs(q - x));
    const spot = options[0];
    if (spot !== undefined && out.every(([o]) => Math.abs(o - spot) > 5)) out.push([spot, h]);
  }
  return out;
}

function EvergreenCrown({ uid, ctx }: { uid: string; ctx?: ArtCtx }) {
  const spires = crownSpires(ctx);
  const clip = `${uid}-evergreen`;
  const silhouette = (
    <>
      <path d={CROWN_BAND} />
      {spires.map(([x, h]) => (
        <path key={x} d={spirePath(h)} transform={spireTransform(x)} />
      ))}
      <g transform="translate(0 -2.6) scale(1.2)">
        {SPROUT_LEAVES.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </>
  );
  return (
    <g stroke-linejoin="round" stroke-linecap="round">
      <clipPath id={clip}>{silhouette}</clipPath>
      {spires.map(([x, h]) => (
        <g key={x} transform={spireTransform(x)} stroke={INK}>
          <path d={spirePath(h)} fill="#F6CF5A" stroke-width={SW * 0.75} />
          <path d={spirePath(h * 0.46)} transform={`translate(0 ${-h * 0.2})`} fill="#9FD48A" stroke-width={0.8} />
          <path d={`M${-h * 0.16} ${-h * 0.3} C${-h * 0.14} ${-h * 0.55} ${-h * 0.06} ${-h * 0.72} 0 ${-h * 0.82}`} fill="none" stroke="#FFF3B0" stroke-width={0.9} />
          <circle cy={-h - 0.9} r={1.45} fill="#FFF8E6" stroke-width={0.9} />
        </g>
      ))}
      {/* Mochi's sprout, in gold */}
      <g transform="translate(0 -2.6) scale(1.2)" stroke={INK} stroke-width={SW * 0.62}>
        <path d="M0 0 C0 -4 0.4 -7 1.2 -9.4" fill="none" stroke-width={SW * 0.75} />
        {SPROUT_LEAVES.map((d) => (
          <path key={d} d={d} fill="#FFD65C" />
        ))}
        <path d="M-1 -9.4 C-3.6 -10.4 -5.8 -10.6 -7.8 -10.4 M3 -10.6 C5.2 -12 7.4 -12.6 9.4 -12.6" fill="none" stroke="#D9A93A" stroke-width={0.9} />
      </g>
      <path d={CROWN_BAND} fill="#F6CF5A" stroke={INK} stroke-width={SW * 0.85} />
      <path d={`M${-CROWN_W + 2} 6.6 Q0 -7.6 ${CROWN_W - 2} 6.6`} fill="none" stroke="#FFF3B0" stroke-width={0.9} opacity={0.9} />
      <g fill="#FFF8E6" stroke={INK} stroke-width={0.7}>
        {[-14, -7, 7, 14].map((x) => (
          <circle key={x} cx={x} cy={crownTopY(x) + 4.1} r={1} />
        ))}
      </g>
      {/* the emerald */}
      <g transform="translate(0 -0.2)">
        <ellipse rx={3.6} ry={4} fill="#FFE08A" stroke={INK} stroke-width={SW * 0.6} />
        <ellipse rx={2.3} ry={2.7} fill="#6FCBA8" />
        <path d="M-1.2 -1.2 L0.2 -1.9" stroke="#FFFFFF" stroke-width={0.9} />
      </g>
      <g clip-path={`url(#${clip})`}>
        <g transform="rotate(22)">
          <rect class="pet-crown-gleam" x={-34} y={-30} width={4.5} height={60} fill="#FFFFFF" opacity={0} />
        </g>
      </g>
      <g transform="translate(-24.5 -8)">
        <Sparkle r={2.4} color="#FFF3B0" twinkle />
      </g>
      <g transform="translate(23 -13)">
        <Sparkle r={2} color="#FFF3B0" twinkle />
      </g>
    </g>
  );
}

/** Soft golden light around the crown, drawn behind the pet so it glows past the silhouette only. */
function CrownGlow({ uid, rx = 34, ry = 21 }: { uid: string; rx?: number; ry?: number }) {
  const id = `${uid}-crown-glow`;
  return (
    <g>
      <radialGradient id={id}>
        <stop offset="0%" stop-color="#FFF3B0" stop-opacity={0.95} />
        <stop offset="60%" stop-color="#FFE593" stop-opacity={0.4} />
        <stop offset="100%" stop-color="#FFE593" stop-opacity={0} />
      </radialGradient>
      <ellipse cx={0} cy={-4} rx={rx} ry={ry} fill={`url(#${id})`} />
    </g>
  );
}

export const evergreenCrown: WearableArt = {
  behind: (ctx) => (
    <g transform={headTransform(ctx.anchors, { dy: 0.5 })}>
      <CrownGlow uid={ctx.uid} />
    </g>
  ),
  render: (ctx) => (
    <g transform={headTransform(ctx.anchors, { dy: 0.5 })}>
      <EvergreenCrown uid={ctx.uid} ctx={ctx} />
    </g>
  ),
  icon: iconWithUid((uid) => (
    <g transform="translate(50 60) scale(1.6)">
      <CrownGlow uid={uid} rx={30} ry={24} />
      <EvergreenCrown uid={uid} />
    </g>
  )),
};
