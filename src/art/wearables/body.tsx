import type { JSX } from 'preact';
import type { ArtCtx, WearableArt } from '../pets/types';
import { crescentPath, heartPath, starPath } from '../pets/shapes';
import { OutlinedStroke } from '../pets/species/parts';
import { garmentIcon, iconWithUid, INK, Neckline, SW, TOP_PATH } from './kit';

/**
 * Body wear. Each garment draws a "fabric" from the body-wear line (top) down across the whole
 * canvas; PetArt clips it to the silhouette. Icons reuse the fabric inside a flat-lay shape.
 */

const topOf = (ctx: ArtCtx) => ctx.anchors.body.top - 1;

/** Half-width of the body at the wear line, for placing straps, buttons and pockets. */
const halfAt = (ctx: ArtCtx, dy = 0) => ctx.body.halfWidthAt(ctx.anchors.body.top + dy);

/** The highest a bib, lapel or strap may reach: just above the collar line, but clear of the chin. */
const bibTopOf = (ctx: ArtCtx) => Math.max(topOf(ctx) - 3, (ctx.anchors.chin ?? ctx.anchors.mouth.y + 7) + 1);

/* ---------------- Cozy stripes sweater ---------------- */

const stripesFabric = (top: number) => (
  <g>
    <rect x={0} y={top} width={100} height={80} fill="#C3DFB4" />
    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
      <rect key={i} x={0} y={top + 6 + i * 6.5} width={100} height={2.8} fill="#FFFDF8" opacity={0.9} />
    ))}
  </g>
);

export const cozyStripes: WearableArt = {
  render: (ctx) => {
    const top = topOf(ctx);
    return (
      <g>
        {stripesFabric(top)}
        <Neckline top={top} color="#8EC07C" />
      </g>
    );
  },
  icon: garmentIcon(stripesFabric, { rib: '#8EC07C' }),
};

/* ---------------- Denim overalls ---------------- */

const DENIM = '#9EC3EA';
const DENIM_DARK = '#7FAEE0';

export const overalls: WearableArt = {
  render: (ctx) => {
    const bib = bibTopOf(ctx);
    const waist = Math.max(topOf(ctx) + 7, bib + 7);
    const bw = Math.min(12, Math.max(9, halfAt(ctx) * 0.34));
    // Straps run from the bib corners around the round sides, just under the cheeks.
    const cheekY = ctx.anchors.cheeks?.y ?? ctx.anchors.eyes.y + 6.5;
    const edgeY = Math.max(cheekY + 5.6, bib - 4);
    const edgeX = ctx.body.halfWidthAt(edgeY) + 2;
    const strap = (side: 1 | -1) =>
      `M${50 + side * (bw - 2.2)} ${bib + 2.2} C${50 + side * (bw + 4)} ${bib - 0.6} ${50 + side * (edgeX - 7)} ${edgeY - 0.6} ${50 + side * edgeX} ${edgeY + 1}`;
    return (
      <g stroke-linejoin="round" stroke-linecap="round">
        <OutlinedStroke d={strap(-1)} color={DENIM_DARK} width={3} />
        <OutlinedStroke d={strap(1)} color={DENIM_DARK} width={3} />
        <rect x={0} y={waist} width={100} height={40} fill={DENIM} />
        <path d={`M0 ${waist} L100 ${waist}`} stroke={INK} stroke-width={SW * 0.8} />
        <rect x={50 - bw} y={bib} width={bw * 2} height={waist - bib + 2} rx={2.4} fill={DENIM} stroke={INK} stroke-width={SW * 0.8} />
        <rect x={45} y={bib + 2.4} width={10} height={Math.max(3.4, waist - bib - 4.4)} rx={1.6} fill="none" stroke="#FFFFFF" stroke-width={0.9} stroke-dasharray="1.4 1.2" />
        <path d={`M50 ${waist + 2} L50 ${waist + 30}`} stroke={DENIM_DARK} stroke-width={1.2} />
        <g fill="#FFE08A" stroke={INK} stroke-width={1}>
          <circle cx={50 - bw + 2.2} cy={bib + 2.2} r={1.6} />
          <circle cx={50 + bw - 2.2} cy={bib + 2.2} r={1.6} />
        </g>
      </g>
    );
  },
  icon: () => (
    <g stroke={INK} stroke-width={SW} stroke-linejoin="round" stroke-linecap="round">
      <path d="M36 20 L40 40 M64 20 L60 40" stroke-width={SW * 2.8} />
      <path d="M36 20 L40 40 M64 20 L60 40" stroke={DENIM_DARK} stroke-width={3.2} />
      <path d="M36 36 L64 36 L66 54 L74 54 L77 84 L55 84 L50 70 L45 84 L23 84 L26 54 L34 54 Z" fill={DENIM} />
      <path d="M34 54 L66 54" stroke-width={SW * 0.8} />
      <rect x={42.5} y={40} width={15} height={8} rx={1.6} fill="none" stroke="#FFFFFF" stroke-width={1} stroke-dasharray="1.6 1.2" />
      <g fill="#FFE08A" stroke-width={1}>
        <circle cx={39} cy={38.4} r={2} />
        <circle cx={61} cy={38.4} r={2} />
      </g>
    </g>
  ),
};

/* ---------------- Cozy hoodie ---------------- */

const HOODIE = '#D6C8F8';
const HOODIE_DARK = '#B9A6EE';

const hoodieFabric = (top: number) => <rect x={0} y={top - 2} width={100} height={80} fill={HOODIE} />;

/** A roomy kangaroo pocket (top edge at `y`, `w` half-width) with curved hand openings. */
const hoodiePocket = (y: number, w: number) => (
  <g stroke={INK} stroke-linejoin="round" stroke-linecap="round">
    <path
      d={`M${50 - w + 4} ${y} L${50 + w - 4} ${y} C${50 + w - 1} ${y} ${50 + w} ${y + 3} ${50 + w + 1.4} ${y + 12} L${50 - w - 1.4} ${y + 12} C${50 - w} ${y + 3} ${50 - w + 1} ${y} ${50 - w + 4} ${y} Z`}
      fill={HOODIE_DARK}
      stroke-width={SW * 0.75}
    />
    <path d={`M${50 - w + 5} ${y + 1.4} Q${50 - w + 5} ${y + 7} ${50 - w} ${y + 10.6} M${50 + w - 5} ${y + 1.4} Q${50 + w - 5} ${y + 7} ${50 + w} ${y + 10.6}`} fill="none" stroke-width={1.1} opacity={0.6} />
  </g>
);

/** Drawstrings with white aglets, hanging from eyelets at `y`. */
const drawstrings = (y: number, len = 7) => (
  <g stroke={INK} stroke-linecap="round">
    <path d={`M46.6 ${y} C46.2 ${y + len * 0.4} 45.4 ${y + len * 0.7} 45.8 ${y + len} M53.4 ${y} C53.8 ${y + len * 0.4} 54.6 ${y + len * 0.7} 54.2 ${y + len}`} fill="none" stroke-width={1.4} />
    <g fill="#FFFFFF" stroke-width={0.9}>
      <rect x={44.8} y={y + len - 0.2} width={2} height={2.8} rx={0.9} />
      <rect x={53.2} y={y + len - 0.2} width={2} height={2.8} rx={0.9} />
      <circle cx={46.6} cy={y} r={1} />
      <circle cx={53.4} cy={y} r={1} />
    </g>
  </g>
);

/** The hood, down, gathered on both shoulders: soft lobes rising from the neckline, lining showing. */
function hoodDrapes(ctx: ArtCtx, top: number) {
  const cheekY = ctx.anchors.cheeks?.y ?? ctx.anchors.eyes.y + 6.5;
  const y0 = Math.max(cheekY + 3.4, top - 8);
  const hw = ctx.body.halfWidthAt(y0);
  const lobe = (side: 1 | -1) => {
    const edge = 50 + side * (hw + 3);
    return `M${edge} ${y0} C${50 + side * hw * 0.72} ${y0 - 1} ${50 + side * hw * 0.5} ${top - 2} ${50 + side * hw * 0.4} ${top + 3} L${edge} ${top + 3} Z`;
  };
  const lining = (side: 1 | -1) =>
    `M${50 + side * hw * 0.9} ${y0 + 1.6} C${50 + side * hw * 0.68} ${y0 + 1.2} ${50 + side * hw * 0.54} ${top - 0.6} ${50 + side * hw * 0.47} ${top + 2.6}`;
  return (
    <g stroke-linejoin="round" stroke-linecap="round">
      <g fill={HOODIE_DARK} stroke={INK} stroke-width={SW * 0.8}>
        <path d={lobe(-1)} />
        <path d={lobe(1)} />
      </g>
      <g fill="none" stroke="#EFE9FD" stroke-width={1.4}>
        <path d={lining(-1)} />
        <path d={lining(1)} />
      </g>
    </g>
  );
}

export const cozyHoodie: WearableArt = {
  render: (ctx) => {
    const top = topOf(ctx);
    return (
      <g>
        {hoodieFabric(top)}
        {hoodiePocket(top + 10, Math.min(15, halfAt(ctx, 10) * 0.46))}
        <Neckline top={top} color={HOODIE_DARK} />
        {hoodDrapes(ctx, top)}
        {drawstrings(top + 4.6, 6.4)}
      </g>
    );
  },
  icon: garmentIcon(hoodieFabric, {
    rib: HOODIE_DARK,
    extra: (
      <g>
        <path
          d="M31 25 C30 13 40 7.4 50 7.4 C60 7.4 70 13 69 25 L62.6 27.4 C61 19.6 56 15.4 50 15.4 C44 15.4 39 19.6 37.4 27.4 Z"
          fill={HOODIE_DARK}
          stroke={INK}
          stroke-width={SW}
          stroke-linejoin="round"
        />
        <path
          d="M37.4 27.4 C39 19.6 44 15.4 50 15.4 C56 15.4 61 19.6 62.6 27.4 C57 29 43 29 37.4 27.4 Z"
          fill="#EFE9FD"
          stroke={INK}
          stroke-width={SW * 0.8}
          stroke-linejoin="round"
        />
        {hoodiePocket(56, 16)}
        {drawstrings(30, 12)}
      </g>
    ),
  }),
};

/* ---------------- Tiny backpack ---------------- */

const PACK = '#FFE08A';
const PACK_FLAP = '#F7A8C0';

export const tinyBackpack: WearableArt = {
  behind: (ctx) => {
    const top = topOf(ctx);
    const x = 50 + halfAt(ctx, -4) - 7;
    return (
      <g stroke={INK} stroke-width={SW} stroke-linejoin="round" stroke-linecap="round">
        <path d={`M${x + 9} ${top - 15} C${x + 11} ${top - 19} ${x + 15} ${top - 20} ${x + 16} ${top - 17}`} fill="none" stroke-width={SW * 2.2} />
        <path d={`M${x + 9} ${top - 15} C${x + 11} ${top - 19} ${x + 15} ${top - 20} ${x + 16} ${top - 17}`} fill="none" stroke="#F2C98A" stroke-width={2.6} />
        <rect x={x} y={top - 14} width={21} height={25} rx={7} fill={PACK} />
        <path
          d={`M${x} ${top - 6} C${x} ${top - 12} ${x + 4} ${top - 14} ${x + 10.5} ${top - 14} C${x + 17} ${top - 14} ${x + 21} ${top - 12} ${x + 21} ${top - 6} C${x + 14} ${top - 3.4} ${x + 7} ${top - 3.4} ${x} ${top - 6} Z`}
          fill={PACK_FLAP}
        />
        <rect x={x + 4.5} y={top + 1} width={12} height={7} rx={2.6} fill="#FFF3C4" stroke-width={SW * 0.8} />
      </g>
    );
  },
  render: (ctx) => {
    const top = topOf(ctx);
    const cheekY = ctx.anchors.cheeks?.y ?? ctx.anchors.eyes.y + 6.5;
    const y0 = Math.max(cheekY + 4.5, top - 7);
    const chest = Math.max(top + 3, bibTopOf(ctx) + 3);
    const hw = ctx.body.halfWidthAt;
    // Straps come over the shoulders and slant out around the sides to the underarms: / \
    const strap = (side: 1 | -1) => {
      const y1 = chest + 12;
      return `M${50 + side * hw(y0) * 0.5} ${y0} C${50 + side * hw(y0) * 0.56} ${y0 + 5} ${50 + side * hw(y1) * 0.8} ${y1 - 3} ${50 + side * (hw(y1) + 1.5)} ${y1}`;
    };
    const strapAt = (y: number) => {
      const t = (y - y0) / (chest + 12 - y0);
      return hw(y) * (0.5 + 0.45 * t);
    };
    const cx = strapAt(chest);
    return (
      <g stroke-linejoin="round" stroke-linecap="round">
        <OutlinedStroke d={strap(-1)} color="#F2C98A" width={2.6} />
        <OutlinedStroke d={strap(1)} color="#F2C98A" width={2.6} />
        <path d={`M${50 - cx} ${chest + 1} L${50 + cx} ${chest + 1}`} stroke={PACK_FLAP} stroke-width={1.6} />
        <rect x={47.6} y={chest - 0.6} width={4.8} height={3.2} rx={1} fill="#FFFFFF" stroke={INK} stroke-width={0.9} />
      </g>
    );
  },
  icon: () => (
    <g stroke={INK} stroke-width={SW} stroke-linejoin="round" stroke-linecap="round">
      <path d="M40 22 C40 14 60 14 60 22" fill="none" stroke-width={SW * 2.4} />
      <path d="M40 22 C40 14 60 14 60 22" fill="none" stroke="#F2C98A" stroke-width={3} />
      <rect x={27} y={21} width={46} height={62} rx={16} fill={PACK} />
      <path d="M27 42 C27 29 36 21 50 21 C64 21 73 29 73 42 C58 48 42 48 27 42 Z" fill={PACK_FLAP} />
      <circle cx={50} cy={44} r={2.6} fill="#FFFFFF" stroke-width={1.2} />
      <rect x={36} y={56} width={28} height={17} rx={6} fill="#FFF3C4" />
      <path d="M40 61 L60 61" stroke="#E8C06A" stroke-width={1.2} />
      <path d="M33 32 C35 27 39 24.4 43 23.4" fill="none" stroke="#FFFFFF" stroke-width={1.8} opacity={0.6} />
    </g>
  ),
};

/* ---------------- Aprons ---------------- */

/** Bib-and-skirt apron sized to the pet: the bib starts clear of the chin, the skirt flares from the waist. */
function apronFit(ctx: ArtCtx) {
  const bib = bibTopOf(ctx);
  const waist = Math.max(topOf(ctx) + 5, bib + 6);
  const bw = Math.min(12.5, Math.max(8.5, ctx.body.halfWidthAt(bib) * 0.36));
  const sx = ctx.body.halfWidthAt(waist) * 0.74;
  const path = `M${50 - bw} ${bib} L${50 + bw} ${bib} L${50 + bw + 0.6} ${waist} C${50 + sx - 4} ${waist} ${50 + sx - 1} ${waist + 2} ${50 + sx} ${waist + 5} L${50 + sx + 5} 100 L${50 - sx - 5} 100 L${50 - sx} ${waist + 5} C${50 - sx + 1} ${waist + 2} ${50 - sx + 4} ${waist} ${50 - bw - 0.6} ${waist} Z`;
  const ties = `M0 ${waist + 3.6} C30 ${waist + 1} 70 ${waist + 1} 100 ${waist + 3.6}`;
  return { bib, waist, path, ties };
}

export const gardenApron: WearableArt = {
  render: (ctx) => {
    const { bib, waist, path, ties } = apronFit(ctx);
    const pocket = waist + 7;
    return (
      <g stroke={INK} stroke-linejoin="round" stroke-linecap="round">
        <path d={ties} fill="none" stroke="#A9CF97" stroke-width={2.2} />
        <path d={path} fill="#C3DFB4" stroke-width={SW * 0.85} />
        <path d={`M${50 - 12} ${waist + 3} C45 ${waist + 1.6} 55 ${waist + 1.6} ${50 + 12} ${waist + 3}`} fill="none" stroke="#A9CF97" stroke-width={2.2} />
        <path d={starPath(50, bib + 3.4, 2)} fill="#FFF3B0" stroke-width={0.9} />
        <path d={`M47.6 ${pocket + 1} L46.4 ${pocket - 5} C46.2 ${pocket - 6.4} 47.6 ${pocket - 7} 48.2 ${pocket - 5.8} L50.4 ${pocket + 1}`} fill="#FFB27A" stroke-width={1.1} />
        <rect x={41} y={pocket} width={18} height={9} rx={2} fill="#A9CF97" stroke-width={SW * 0.75} />
        <path d={`M43.4 ${pocket + 2.6} L56.6 ${pocket + 2.6}`} stroke="#FFFFFF" stroke-width={0.9} stroke-dasharray="1.4 1.2" />
      </g>
    );
  },
  icon: () => (
    <g stroke={INK} stroke-width={SW} stroke-linejoin="round" stroke-linecap="round">
      <path d="M38 22 C38 12 62 12 62 22" fill="none" stroke="#A9CF97" stroke-width={2.4} />
      <path d="M30 46 C22 46 16 50 14 54 M70 46 C78 46 84 50 86 54" fill="none" stroke="#A9CF97" stroke-width={2.4} />
      <path d="M36 21 L64 21 L65 42 C71 42 74 45 75 48 L78 86 L22 86 L25 48 C26 45 29 42 35 42 Z" fill="#C3DFB4" />
      <path d="M25 47 C40 44 60 44 75 47" fill="none" stroke="#A9CF97" stroke-width={2.6} />
      <path d="M46 62 L44 50 C43.6 48 46 47 46.8 49 L50 62" fill="#FFB27A" stroke-width={1.4} />
      <rect x={38} y={60} width={24} height={14} rx={3} fill="#A9CF97" />
      <path d={starPath(50, 30, 3.2)} fill="#FFF3B0" stroke-width={1.1} />
    </g>
  ),
};

/** A frilled hem: a scalloped ruffle hanging below a line. */
function Frills({ y, x0, x1, color }: { y: number; x0: number; x1: number; color: string }) {
  const n = Math.max(2, Math.round((x1 - x0) / 5.2));
  const step = (x1 - x0) / n;
  const scallops = Array.from({ length: n }, (_, i) => `Q${x1 - step * (i + 0.5)} ${y + 6.4} ${x1 - step * (i + 1)} ${y + 1.4}`).join(' ');
  return <path d={`M${x0} ${y - 1.8} L${x1} ${y - 1.8} L${x1} ${y + 1.4} ${scallops} Z`} fill={color} stroke={INK} stroke-width={SW * 0.7} stroke-linejoin="round" />;
}

export const frillyApron: WearableArt = {
  render: (ctx) => {
    const { waist, path, ties } = apronFit(ctx);
    const hem = ctx.anchors.body.bottom - 5.5;
    const hx = ctx.body.halfWidthAt(hem) * 0.8;
    return (
      <g stroke={INK} stroke-linejoin="round" stroke-linecap="round">
        <path d={ties} fill="none" stroke="#FFC4D3" stroke-width={2.4} />
        <path d={path} fill="#FFFFFF" stroke-width={SW * 0.85} />
        <Frills y={hem} x0={50 - hx} x1={50 + hx} color="#FFD6E0" />
        <path d={`M${50 - 12} ${waist + 3} C45 ${waist + 1.6} 55 ${waist + 1.6} ${50 + 12} ${waist + 3}`} fill="none" stroke="#FFC4D3" stroke-width={2.4} />
        <path d={heartPath(50, Math.min(waist + 9, hem - 6), 4.2)} fill="#FFC4D3" stroke-width={SW * 0.7} />
      </g>
    );
  },
  icon: () => (
    <g stroke={INK} stroke-width={SW} stroke-linejoin="round" stroke-linecap="round">
      <path d="M38 22 C38 12 62 12 62 22" fill="none" stroke="#FFC4D3" stroke-width={2.4} />
      <path d="M30 46 C22 46 16 50 14 54 M70 46 C78 46 84 50 86 54" fill="none" stroke="#FFC4D3" stroke-width={2.4} />
      <Frills y={21} x0={36} x1={64} color="#FFD6E0" />
      <path d="M36 21 L64 21 L65 42 C71 42 74 45 75 48 L78 82 L22 82 L25 48 C26 45 29 42 35 42 Z" fill="#FFFFFF" />
      <Frills y={83} x0={22} x1={78} color="#FFD6E0" />
      <path d="M25 47 C40 44 60 44 75 47" fill="none" stroke="#FFC4D3" stroke-width={2.6} />
      <path d={heartPath(50, 62, 6.4)} fill="#FFC4D3" />
    </g>
  ),
};

/* ---------------- Starry pajamas ---------------- */

const PJ = '#C7C2F4';

const pajamaFabric = (top: number) => (
  <g>
    <rect x={0} y={top - 2} width={100} height={80} fill={PJ} />
    <g fill="#FFE08A">
      {[
        [14, 8],
        [30, 16],
        [72, 7],
        [86, 15],
        [22, 27],
        [64, 25],
        [44, 34],
        [80, 33],
        [10, 40],
      ].map(([x, dy], i) =>
        i % 3 === 1 ? (
          <path key={i} d={crescentPath(x!, top + dy!, 2.4)} transform={`rotate(-30 ${x} ${top + dy!})`} />
        ) : (
          <path key={i} d={starPath(x!, top + dy!, 2.4)} stroke-linejoin="round" />
        ),
      )}
    </g>
    <g fill="#FFFFFF" opacity={0.8}>
      {[
        [22, 10],
        [56, 12],
        [40, 22],
        [88, 24],
        [34, 38],
        [66, 40],
      ].map(([x, dy], i) => (
        <circle key={i} cx={x} cy={top + dy!} r={0.8} />
      ))}
    </g>
  </g>
);

/** Rounded pajama collar and a button placket. */
const pajamaCollar = (top: number) => (
  <g stroke={INK} stroke-width={SW * 0.75} stroke-linejoin="round">
    <path d={`M50 ${top + 5.4} C44 ${top + 9} 36 ${top + 8} 33 ${top + 3} C38 ${top + 1.4} 44 ${top + 2} 50 ${top + 5.4} Z`} fill="#FFFFFF" />
    <path d={`M50 ${top + 5.4} C56 ${top + 9} 64 ${top + 8} 67 ${top + 3} C62 ${top + 1.4} 56 ${top + 2} 50 ${top + 5.4} Z`} fill="#FFFFFF" />
    <path d={`M50 ${top + 6} L50 ${top + 40}`} fill="none" stroke-width={1} opacity={0.5} />
    {[11, 17, 23].map((dy) => (
      <circle key={dy} cx={52.6} cy={top + dy} r={1.2} fill="#FFFFFF" stroke-width={0.9} />
    ))}
  </g>
);

export const starryPajamas: WearableArt = {
  render: (ctx) => {
    const top = topOf(ctx);
    return (
      <g>
        {pajamaFabric(top)}
        <path d={`M0 ${top - 2.2} Q50 ${top + 4.8} 100 ${top - 2.2}`} fill="none" stroke={INK} stroke-width={SW * 0.8} />
        {pajamaCollar(top)}
      </g>
    );
  },
  icon: garmentIcon(pajamaFabric, { rib: '#B0A8EE', extra: pajamaCollar(22) }),
};

/* ---------------- Pumpkin cardigan ---------------- */

const CARDI = '#FFB27A';
const CARDI_DARK = '#F59A64';

/** Oversized cardigan: two front panels open over the tummy, buttons and patch pockets. */
function cardiganPanels(top: number, gap: number, bottom = 100): JSX.Element {
  const l = 50 - gap;
  const r = 50 + gap;
  return (
    <g stroke-linejoin="round" stroke-linecap="round">
      <path
        d={`M0 ${top - 3} L${l - 6} ${top - 3} C${l - 2} ${top + 6} ${l} ${top + 14} ${l} ${bottom} L0 ${bottom} Z`}
        fill={CARDI}
        stroke={INK}
        stroke-width={SW * 0.85}
      />
      <path
        d={`M100 ${top - 3} L${r + 6} ${top - 3} C${r + 2} ${top + 6} ${r} ${top + 14} ${r} ${bottom} L100 ${bottom} Z`}
        fill={CARDI}
        stroke={INK}
        stroke-width={SW * 0.85}
      />
      <g fill="none" stroke={CARDI_DARK} stroke-width={1.1}>
        {[-26, -18, -10, 10, 18, 26].map((dx) => (
          <path key={dx} d={`M${50 + dx} ${top + 4} L${50 + dx} ${bottom}`} />
        ))}
      </g>
      <g fill="#FFF1D6" stroke={INK} stroke-width={1}>
        {[6, 13, 20].map((dy) => (
          <circle key={dy} cx={l - 2.6} cy={top + dy} r={1.5} />
        ))}
      </g>
      <rect x={l - 17} y={top + 12} width={10} height={8} rx={2} fill={CARDI_DARK} stroke={INK} stroke-width={SW * 0.7} />
      <rect x={r + 7} y={top + 12} width={10} height={8} rx={2} fill={CARDI_DARK} stroke={INK} stroke-width={SW * 0.7} />
    </g>
  );
}

export const pumpkinCardigan: WearableArt = {
  render: (ctx) => cardiganPanels(topOf(ctx), 6.5),
  icon: iconWithUid((uid) => (
    <g>
      <clipPath id={`${uid}-cardigan`}>
        <path d={TOP_PATH} />
      </clipPath>
      <path d={TOP_PATH} fill="#FFF6EC" />
      <g clip-path={`url(#${uid}-cardigan)`}>
        {cardiganPanels(24, 5, 86)}
        <path d="M13 36 L20 49 M87 36 L80 49 M28 84.4 L44 84.4 M56 84.4 L72 84.4" fill="none" stroke={CARDI_DARK} stroke-width={3.4} />
      </g>
      <path d={TOP_PATH} fill="none" stroke={INK} stroke-width={SW} stroke-linejoin="round" />
    </g>
  )),
};

/* ---------------- Festive sweater ---------------- */

const FESTIVE = '#F7A6B4';

function Snowflake({ x, y, s = 2.6 }: { x: number; y: number; s?: number }) {
  return (
    <path
      d={`M${x - s} ${y} L${x + s} ${y} M${x - s / 2} ${y - s * 0.87} L${x + s / 2} ${y + s * 0.87} M${x - s / 2} ${y + s * 0.87} L${x + s / 2} ${y - s * 0.87}`}
      stroke="#FFFFFF"
      stroke-width={1.1}
      stroke-linecap="round"
    />
  );
}

const festiveFabric = (top: number) => (
  <g>
    <rect x={0} y={top - 2} width={100} height={80} fill={FESTIVE} />
    <rect x={0} y={top + 7} width={100} height={6} fill="#FFFFFF" />
    <path
      d={`M0 ${top + 10} ${Array.from({ length: 17 }, (_, i) => `L${i * 6 + 3} ${top + (i % 2 ? 8.2 : 11.8)}`).join(' ')}`}
      fill="none"
      stroke="#8FD0B4"
      stroke-width={1.6}
      stroke-linejoin="round"
    />
    {[14, 32, 50, 68, 86].map((x, i) => (
      <Snowflake key={x} x={x} y={top + (i % 2 ? 22 : 18)} />
    ))}
    {[23, 41, 59, 77].map((x) => (
      <circle key={x} cx={x} cy={top + 27} r={1} fill="#FFFFFF" />
    ))}
  </g>
);

export const festiveSweater: WearableArt = {
  render: (ctx) => {
    const top = topOf(ctx);
    return (
      <g>
        {festiveFabric(top)}
        <Neckline top={top} color="#FFFFFF" />
      </g>
    );
  },
  icon: garmentIcon(festiveFabric, { rib: '#FFFFFF' }),
};

/* ---------------- Yellow raincoat ---------------- */

const RAIN = '#FFE08A';
const RAIN_DARK = '#F6C544';

const raincoatFront = (top: number, bottom = 100) => (
  <g stroke={INK} stroke-linejoin="round" stroke-linecap="round">
    <path d={`M48 ${top - 3} L48 ${bottom}`} fill="none" stroke-width={SW * 0.8} />
    {[5, 13, 21].map((dy) => (
      <g key={dy}>
        <rect x={51} y={top + dy - 1.2} width={6} height={2.4} rx={1.2} fill="#FFFFFF" stroke-width={0.9} />
        <path d={`M48 ${top + dy} L51 ${top + dy}`} stroke-width={0.9} />
      </g>
    ))}
    <path d={`M28 ${top + 16} L40 ${top + 16}`} stroke={RAIN_DARK} stroke-width={3} />
    <path d={`M60 ${top + 16} L72 ${top + 16}`} stroke={RAIN_DARK} stroke-width={3} />
  </g>
);

export const raincoat: WearableArt = {
  render: (ctx) => {
    const top = topOf(ctx);
    const bib = bibTopOf(ctx);
    // Pointed storm-collar tips meeting just under the chin.
    const tip = (side: 1 | -1) => `M${50 + side * 1.2} ${bib + 0.8} L${50 + side * 14} ${bib - 2.2} L${50 + side * 5.4} ${bib + 8.4} Z`;
    return (
      <g>
        <rect x={0} y={top - 2} width={100} height={80} fill={RAIN} />
        {raincoatFront(bib + 4)}
        <Neckline top={top} color={RAIN_DARK} dip={5} />
        <g fill={RAIN_DARK} stroke={INK} stroke-width={SW * 0.8} stroke-linejoin="round">
          <path d={tip(-1)} />
          <path d={tip(1)} />
        </g>
      </g>
    );
  },
  icon: garmentIcon((top) => <rect x={0} y={top - 4} width={100} height={80} fill={RAIN} />, {
    rib: RAIN_DARK,
    extra: (
      <g>
        <path
          d="M31 21 C36 31 44 31 50 27 C56 31 64 31 69 21 C62 26 56 27 50 27 C44 27 38 26 31 21 Z"
          fill={RAIN_DARK}
          stroke={INK}
          stroke-width={SW * 0.9}
          stroke-linejoin="round"
        />
        {raincoatFront(26, 86)}
      </g>
    ),
  }),
};

/* ---------------- Duck floatie ---------------- */

const FLOAT = '#FFE591';

function floatGeometry(ctx: ArtCtx) {
  const y = ctx.anchors.body.top + 4;
  const rx = ctx.body.halfWidthAt(y + 4) + 6.5;
  return { y, rx, ry: 7, tube: 8 };
}

/** The floatie's little duck head, looking up from the ring. */
function FloatDuck({ x, y }: { x: number; y: number }) {
  return (
    <g stroke={INK} stroke-width={SW * 0.85} stroke-linejoin="round">
      <path
        d={`M${x - 5.6} ${y + 2} C${x - 7} ${y - 6} ${x - 2} ${y - 10} ${x + 2} ${y - 9} C${x + 6} ${y - 8} ${x + 7} ${y - 3} ${x + 5.4} ${y + 2} Z`}
        fill={FLOAT}
      />
      <path
        d={`M${x + 4.6} ${y - 5.4} C${x + 8.4} ${y - 6.6} ${x + 10.6} ${y - 5} ${x + 9.6} ${y - 3} C${x + 8.4} ${y - 1.6} ${x + 6} ${y - 2.4} ${x + 4.4} ${y - 2.6} Z`}
        fill="#FFB877"
      />
      <circle cx={x + 1.6} cy={y - 5.4} r={1.2} fill={INK} stroke="none" />
      <ellipse cx={x - 1.4} cy={y - 2.6} rx={1.6} ry={1} fill="#FF9FB8" stroke="none" opacity={0.7} />
    </g>
  );
}

export const duckFloat: WearableArt = {
  behind: (ctx) => {
    const { y, rx, ry, tube } = floatGeometry(ctx);
    return <ellipse cx={50} cy={y} rx={rx} ry={ry + tube / 2} fill={FLOAT} stroke={INK} stroke-width={SW} />;
  },
  render: () => null,
  over: (ctx) => {
    const { y, rx, ry, tube } = floatGeometry(ctx);
    const outer = `M${50 - rx - tube / 2} ${y} A${rx + tube / 2} ${ry + tube / 2} 0 0 0 ${50 + rx + tube / 2} ${y}`;
    const inner = `L${50 + rx - tube / 2} ${y} A${rx - tube / 2} ${ry - tube / 2} 0 0 1 ${50 - rx + tube / 2} ${y} Z`;
    return (
      <g stroke-linejoin="round">
        <path d={`${outer} ${inner}`} fill={FLOAT} stroke={INK} stroke-width={SW} />
        <path
          d={`M${50 - rx * 0.6} ${y + ry + 1.6} Q50 ${y + ry + 3.6} ${50 + rx * 0.2} ${y + ry + 2}`}
          fill="none"
          stroke="#FFFFFF"
          stroke-width={1.6}
          stroke-linecap="round"
          opacity={0.8}
        />
        <g transform={`translate(${50 + rx * 0.6} ${y + ry * 0.75}) scale(1.25)`}>
          <FloatDuck x={0} y={0} />
        </g>
      </g>
    );
  },
  icon: () => (
    <g transform="translate(-2.4 -9)" stroke={INK} stroke-width={SW} stroke-linejoin="round">
      <ellipse cx={50} cy={60} rx={36} ry={20} fill={FLOAT} />
      <ellipse cx={50} cy={58} rx={19} ry={8} fill="#FFF9EC" />
      <path d="M22 66 Q50 80 70 70" fill="none" stroke="#FFFFFF" stroke-width={2} stroke-linecap="round" opacity={0.8} />
      <g transform="translate(76 52) scale(1.5)">
        <FloatDuck x={0} y={0} />
      </g>
    </g>
  ),
};
