/**
 * Found things (DESIGN §8.2, L6): on days she checks in, a pet who knows her well leaves something small on the sill.
 * Seven of them, picked by the found thing's seed: a button, a leaf, a glass bead, a bottle cap, an acorn, a thimble
 * and a sycamore key. Tiny, flat and matte, lying on the sill (y 92 of the 100 canvas).
 */
import { contact, paint, shapes, solid, thin, type DecorRenderer } from '../decor/kit';
import { dots, ell, smooth } from '../decor/geo';
import type { DecorEntry } from '../decor';

const button = shapes('found-button', { disc: ell(50, 80, 26, 10) });
const foundButton: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 91.4, 26, 1.6)}
      {solid(p, button.disc, '#C8BAE6', [<path d={ell(50, 79.4, 18, 6.6)} fill={p.c('#B7A6DC')} />, <path d={dots([[44, 78.2], [56, 78.2], [44, 81.2], [56, 81.2]], 1.6)} fill={p.c('#8E7CBE')} />])}
    </g>
  );
};

const leafShape = shapes('found-leaf', {
  blade: smooth([
    [16, 86],
    [30, 76],
    [52, 71],
    [80, 74],
    [90, 80],
    [72, 86.6],
    [46, 89.4],
  ]),
});
const foundLeaf: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 52, 91.4, 36, 1.4)}
      {solid(p, leafShape.blade, '#E0A15C', thin(p, 'M12 88C34 82 60 78 88 79.6', '#C9853F', 1.2))}
    </g>
  );
};

const bead = shapes('found-bead', { glass: ell(50, 76, 16, 14) });
const foundBead: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 91.4, 16, 1.8)}
      {solid(p, bead.glass, '#9ED3C1', [<path d={ell(50, 76, 4.4, 3.8)} fill={p.c('#6FAE98')} />, <path d={ell(43, 70, 3, 2)} fill={p.night ? '#FFE8C8' : '#F2FBF7'} />])}
    </g>
  );
};

const cap = shapes('found-cap', { rim: ell(50, 80, 24, 9.4), top: { d: ell(50, 78, 20, 7), k: 0 } });
const foundCap: DecorRenderer = (o) => {
  const p = paint(o);
  const teeth = Array.from({ length: 13 }, (_, i) => [28 + i * 3.7, 86 + Math.sin((i / 12) * Math.PI) * 2.2] as const);
  return (
    <g>
      {contact(p, 50, 91.4, 25, 1.6)}
      {solid(p, cap.rim, '#E07A6E', <path d={dots(teeth, 1.1)} fill={p.c('#C8665B')} />)}
      {solid(p, cap.top, '#EC9A8E')}
    </g>
  );
};

const acorn = shapes('found-acorn', { nut: ell(50, 78, 12, 13), cup: { d: ell(50, 68, 15, 7.4), k: 0.6 } });
const foundAcorn: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 91.4, 14, 1.8)}
      {solid(p, acorn.nut, '#C99A62')}
      {solid(p, acorn.cup, '#9C7A52', <path d={dots([[42, 67], [48, 65.6], [54, 66], [60, 67.6], [45, 70.4], [51, 70.8], [57, 70.4]], 0.9)} fill={p.c('#86673F')} />)}
      {thin(p, 'M50 61C50 58 51.6 56.4 53.4 56', '#86673F', 1.6)}
    </g>
  );
};

const thimble = shapes('found-thimble', { body: 'M34 90C34 74 38 62 50 62C62 62 66 74 66 90Z' });
const foundThimble: DecorRenderer = (o) => {
  const p = paint(o);
  const pits = Array.from({ length: 12 }, (_, i) => [40 + (i % 4) * 6.4 + (Math.floor(i / 4) % 2) * 3, 70 + Math.floor(i / 4) * 5.4] as const);
  return (
    <g>
      {contact(p, 50, 91.4, 18, 1.8)}
      {solid(p, thimble.body, '#CFCAD6', [<path d={dots(pits, 0.9)} fill={p.c('#AFA8BC')} />, <path d="M34 86H66V90H34Z" fill={p.c('#BDB6C8')} />])}
    </g>
  );
};

const key = shapes('found-sycamore', {
  wing: smooth([
    [30, 84],
    [44, 76],
    [66, 70],
    [86, 72],
    [80, 80],
    [58, 84],
  ]),
});
const foundSycamore: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 91.4, 32, 1.4)}
      {solid(p, key.wing, '#D9C08E', thin(p, 'M32 84C48 79 64 75 84 73', '#C4A56E', 0.9))}
      <path d={ell(27, 86, 7, 5)} fill={p.c('#B88E5E')} />
    </g>
  );
};

const thing = (art: DecorRenderer, bounds: readonly [number, number]): DecorEntry => ({ art, size: 4.6, bounds, deep: 8, flat: true });

/** The seven found things, in seed order. */
export const FOUND_ART: readonly DecorEntry[] = [
  thing(foundButton, [24, 76]),
  thing(foundLeaf, [14, 92]),
  thing(foundBead, [33, 67]),
  thing(foundCap, [26, 74]),
  thing(foundAcorn, [35, 65]),
  thing(foundThimble, [33, 67]),
  thing(foundSycamore, [20, 88]),
];

/** Which found thing a seed shows. */
export function foundFor(seed: number): DecorEntry {
  const i = ((Math.floor(seed) % FOUND_ART.length) + FOUND_ART.length) % FOUND_ART.length;
  return FOUND_ART[i]!;
}
