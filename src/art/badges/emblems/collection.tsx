/** Emblems for capsules and the collection: capsules, a foil insert, frames, tins, a bell jar, a book. */
import { E, shade } from '../palette';
import { Capsule, Detail, Flower, LoafCat, Paw, glintPath, type Emblem } from './kit';

const GLINT = glintPath(35.4, 10.4, 5.2);

export const COLLECTION_EMBLEMS: Record<string, Emblem> = {
  /** The first capsule: one clear half, and someone inside. */
  'first-capsule': () => <Capsule color={E.blush} cat />,
  /** Rare: the folded paper insert with its foil edge, and one glint. */
  'first-rare': () => (
    <g>
      <g transform="rotate(-8 22 22)">
        <rect x={7.6} y={8.6} width={28.8} height={26} rx={2} fill={E.brass} />
        <rect x={9.8} y={10.8} width={24.4} height={21.6} rx={1.2} fill={E.paper} />
        <rect x={13} y={14.4} width={13} height={2.8} rx={1.4} fill={E.lavenderDeep} />
        <rect x={13} y={19.6} width={18} height={1.8} rx={0.9} fill={E.lavender} />
        <rect x={13} y={23.4} width={14} height={1.8} rx={0.9} fill={E.lavender} />
        <Detail>
          <rect x={9.8} y={27.4} width={24.4} height={0.9} fill={shade(E.paper)} />
          <rect x={33.8} y={8.6} width={2.6} height={26} rx={1} fill={E.brassDeep} />
        </Detail>
      </g>
      <path d={GLINT} fill={E.paper} />
    </g>
  ),
  /** Super rare: a capsule in holographic stripes. */
  'first-ultra': () => <Capsule holo />,
  /** Ten: three capsule toys in a little wooden tray (a 64 × 40 box). */
  'collect-10': () => (
    <g>
      <Capsule x={18} y={19.4} r={8.4} color={E.blush} a={-10} />
      <Capsule x={32} y={18.4} r={8.4} color={E.sky} a={6} />
      <Capsule x={46} y={19.4} r={8.4} color={E.butter} a={18} />
      <rect x={3} y={23} width={58} height={3.4} rx={1.4} fill={E.woodDeep} />
      <path d="M4.4 26.4h55.2l-3 9.2a2 2 0 0 1-1.9 1.4H9.3a2 2 0 0 1-1.9-1.4z" fill={E.wood} />
      <Detail>
        <path d="M52 26.4h7.6l-3 9.2a2 2 0 0 1-1.9 1.4H50z" fill={shade(E.wood)} />
      </Detail>
    </g>
  ),
  /** Twenty-five: a framed portrait on the wall. */
  'collect-25': () => (
    <g>
      <path d="M15 9.6L22 3.6l7 6" fill="none" stroke={E.brassDeep} stroke-width={1.2} stroke-linecap="round" stroke-linejoin="round" />
      <rect x={9} y={9} width={26} height={30} rx={1.6} fill={E.brass} />
      <Detail>
        <rect x={32} y={9} width={3} height={30} rx={1} fill={E.brassDeep} />
      </Detail>
      <rect x={12.4} y={12.4} width={19.2} height={23.2} fill={E.paper} />
      <rect x={12.4} y={31} width={19.2} height={4.6} fill={E.mint} />
      <LoafCat x={21.4} y={31.4} s={1.1} />
    </g>
  ),
  /** Fifty: a keepsake tin, lid on. */
  'collect-50': () => (
    <g>
      <path d="M9 20h26v12.4a4.6 4.6 0 0 1-4.6 4.6H13.6A4.6 4.6 0 0 1 9 32.4z" fill={E.sky} />
      <rect x={7.4} y={13.4} width={29.2} height={7.6} rx={2.6} fill={E.skyDeep} />
      <rect x={14} y={24} width={16} height={8.6} rx={1.6} fill={E.paper} />
      <Flower x={22} y={28.3} r={3.2} color={E.blush} />
      <Detail>
        <path d="M30.6 21H35v11.4a4.6 4.6 0 0 1-4.4 4.6z" fill={shade(E.sky)} />
        <rect x={31.6} y={13.4} width={5} height={7.6} rx={2.4} fill={shade(E.skyDeep)} />
      </Detail>
    </g>
  ),
  /** A hundred: a bell jar on a stand, with a small cat under it. */
  'collect-100': () => (
    <g>
      <path d="M11 35.6V21a11 11 0 0 1 22 0v14.6z" fill={E.glass} />
      <circle cx={22} cy={8.6} r={2.3} fill={E.glass} />
      <LoafCat x={22.4} y={35.6} s={1.05} />
      <Detail>
        <path d="M28.8 35.6V21c0-3.2-1.3-6-3.4-8a11 11 0 0 1 7.6 8v14.6z" fill={E.lavender} fill-opacity={0.5} />
      </Detail>
      <rect x={7.6} y={35.2} width={28.8} height={4.4} rx={1.6} fill={E.wood} />
      <Detail>
        <rect x={7.6} y={38} width={28.8} height={1.6} rx={0.8} fill={E.woodDeep} />
      </Detail>
    </g>
  ),
  /** Set complete: the lineup leaflet, every box ticked (a 64 × 40 box). */
  'set-complete': () => (
    <g transform="rotate(-3 32 20)">
      <rect x={8} y={2.6} width={48} height={35} rx={2.4} fill={E.paper} />
      <rect x={13} y={7.4} width={20} height={3} rx={1.5} fill={E.blushInk} />
      <rect x={37} y={7.4} width={8} height={3} rx={1.5} fill={E.butter} />
      {[0, 1, 2, 3].flatMap((i) =>
        [0, 1].map((j) => {
          const x = 13 + i * 10.2;
          const y = 14.6 + j * 11;
          return (
            <g key={`${i}-${j}`}>
              <rect x={x} y={y} width={8} height={8} rx={1.6} fill={E.cream} />
              <path d={`M${x + 1.9} ${y + 4.2}l1.9 1.9 3.3-3.6`} fill="none" stroke={E.leafDeep} stroke-width={1.6} stroke-linecap="round" stroke-linejoin="round" />
            </g>
          );
        }),
      )}
    </g>
  ),
  /** Album complete: the Field Guide, with its ribbon. */
  'album-complete': () => (
    <g>
      <path d="M12 36.2h22.6v3.6H12a1.8 1.8 0 0 1 0-3.6z" fill={E.paper} />
      <rect x={10} y={6} width={24.6} height={31} rx={2.2} fill={E.sage} />
      <rect x={10} y={6} width={4.2} height={31} rx={1.6} fill={E.leafDeep} />
      <rect x={17.4} y={11.6} width={13.2} height={9.6} rx={1.2} fill={E.paper} />
      <Paw x={24} y={16.6} a={0} s={0.52} color={E.peachInk} />
      <Detail>
        <rect x={31.4} y={6} width={3.2} height={31} rx={1.2} fill={shade(E.sage)} />
      </Detail>
      <path d="M27.6 36.6h3.4v7.4l-1.7-1.5-1.7 1.5z" fill={E.blushInk} />
    </g>
  ),
};
