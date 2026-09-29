/**
 * A note waiting on the sill (DESIGN §9.1, §13): the Sunday Note, a Herbarium page, a moving-in anniversary note or a
 * story, clipped with a brass paper clip and leaning against the frame. Nothing opens by itself: it opens on a tap.
 * Drawn on a 100 canvas standing on y 92, flat and matte, the card's shade on the side away from the light.
 */
import type { JSX } from 'preact';
import type { Light } from '@/art/light';
import { nightTone } from '../decor/kit';

export type NoteKind = 'sundayNote' | 'herbarium' | 'anniversary' | 'story';

const CARD = { paper: '#FFFBF3', edge: '#EFE5D5', ink: '#CDBFAB', clip: '#C9A45A', clipDeep: '#A98640', flower: '#C8BAE6', stem: '#9CB58A', bow: '#EFB4C1' };

/** The card leans back a little; its face and the sliver of its edge on the shade side. */
export function NoteArt({ kind, light }: { kind: NoteKind; light: Light }): JSX.Element {
  const c = (hex: string) => (light.night ? nightTone(hex) : hex);
  const away = light.from === 'left' ? 1 : light.from === 'right' ? -1 : 0;
  const tall = kind === 'herbarium';
  const [x0, x1, y0] = tall ? [28, 72, 30] : [22, 78, 46];
  const face = `M${x0} 90L${x1} 90L${x1 - 2} ${y0}L${x0 + 2} ${y0}Z`;
  const edge = away >= 0 ? `M${x1} 90L${x1 + 2.4} 89L${x1 + 0.4} ${y0 + 1}L${x1 - 2} ${y0}Z` : `M${x0} 90L${x0 - 2.4} 89L${x0 - 0.4} ${y0 + 1}L${x0 + 2} ${y0}Z`;
  const mid = (x0 + x1) / 2;
  return (
    <g>
      <ellipse cx={mid + away * 2} cy={91} rx={(x1 - x0) / 2 + 3} ry={1.8} fill="var(--contact)" />
      <path d={edge} fill={c(CARD.edge)} />
      <path d={face} fill={c(CARD.paper)} />
      <path d={away >= 0 ? `M${x1 - 5} 90L${x1} 90L${x1 - 2} ${y0}L${x1 - 6.4} ${y0}Z` : `M${x0} 90L${x0 + 5} 90L${x0 + 6.4} ${y0}L${x0 + 2} ${y0}Z`} fill="var(--shade)" />
      {kind === 'herbarium' ? (
        <g>
          <path d={`M${mid} 80C${mid - 1} 70 ${mid + 1} 60 ${mid} 52`} fill="none" stroke={c(CARD.stem)} stroke-width={1.2} stroke-linecap="round" />
          <path d={`M${mid} 70C${mid - 6} 68 ${mid - 8} 64 ${mid - 8} 62C${mid - 4} 62 ${mid - 1} 65 ${mid} 70Z`} fill={c(CARD.stem)} />
          <path d={`M${mid - 3.4} 50a3.4 3.4 0 1 0 6.8 0a3.4 3.4 0 1 0 -6.8 0ZM${mid - 5} 55a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0ZM${mid} 55a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0Z`} fill={c(CARD.flower)} />
          <path d={`M${x0 + 8} 85H${mid + 4}`} stroke={c(CARD.ink)} stroke-width={1.2} stroke-linecap="round" />
        </g>
      ) : kind === 'anniversary' ? (
        <g>
          <path d={`M${mid} 64l-7 -4l0.4 8.6Z M${mid} 64l7 -4l-0.4 8.6Z`} fill={c(CARD.bow)} />
          <path d={`M${mid - 1.6} 62.4h3.2v3.2h-3.2Z`} fill={c('#E29AAD')} />
          <path d={`M${x0 + 9} 78H${x1 - 9}M${x0 + 12} 83H${x1 - 14}`} stroke={c(CARD.ink)} stroke-width={1.2} stroke-linecap="round" />
        </g>
      ) : (
        <path d={`M${x0 + 8} 60H${x1 - 10}M${x0 + 8} 67H${x1 - 8}M${x0 + 8} 74H${x1 - 14}M${x0 + 8} 81H${mid}`} stroke={c(CARD.ink)} stroke-width={1.2} stroke-linecap="round" />
      )}
      {kind === 'story' && <path d={`M${x1 - 12} 80a3 3 0 1 0 6 0a3 3 0 1 0 -6 0Z`} fill={c('#B5CC9C')} />}
      {/* the paper clip over the top edge */}
      <path d={`M${mid - 3} ${y0 + 12}V${y0 - 5}a3 3 0 0 1 6 0V${y0 + 9}a1.8 1.8 0 0 1 -3.6 0V${y0 - 2}`} fill="none" stroke={c(CARD.clip)} stroke-width={1.4} stroke-linecap="round" />
      <path d={`M${mid - 3} ${y0}V${y0 + 12}`} fill="none" stroke={c(CARD.clipDeep)} stroke-width={1.4} stroke-linecap="round" />
    </g>
  );
}
