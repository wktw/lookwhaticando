/**
 * The Balcony Box's planting through the year (DESIGN §8.4), as a few layered paths: spring tulips
 * and grape hyacinths, summer geraniums, autumn heather and cyclamen, winter fir sprigs and berries
 * under a cap of snow. Botanically plain, no faces. Deterministic per season, built once.
 */
import type { Season } from '../time';
import { seeded } from '../sill/scenery';
import { disc } from './kit';

export interface Planting {
  /** Thin stems and needles (stroked: genuinely thin things). */
  stems: string;
  leavesDeep: string;
  leaves: string;
  /** Markings on the leaves (a zonal geranium's dark horseshoe), drawn even-odd in the deep leaf tone. */
  marks: string;
  flowers: string;
  /** A second flower tone (muscari, cyclamen's eye, berries) or null. */
  accents: string;
  /** Snow lying on top (winter). */
  snow: string;
}

export interface PlantingPaint {
  stem: string;
  leafDeep: string;
  leaf: string;
  flower: string;
  accent: string;
}

export const PLANTING_PAINT: Record<Season, PlantingPaint> = {
  spring: { stem: '#88AE7E', leafDeep: '#86AE85', leaf: '#A3C59A', flower: '#F2A2B2', accent: '#8E92D8' },
  summer: { stem: '#7FA571', leafDeep: '#7FA36A', leaf: '#9CBF84', flower: '#EE8C86', accent: '#F7C2BD' },
  autumn: { stem: '#6F8F62', leafDeep: '#5E8660', leaf: '#7C9E73', flower: '#C99AD0', accent: '#E58FB4' },
  winter: { stem: '#5C7F5A', leafDeep: '#4F7555', leaf: '#6E9468', flower: '#D9786E', accent: '#FFFFFF' },
};

const f = (n: number) => +n.toFixed(2);

/** A pointed leaf from (x, y) along `angle` (degrees, 0 = up), `len` long and `w` wide. */
export function blade(x: number, y: number, angle: number, len: number, w: number): string {
  const a = (angle * Math.PI) / 180;
  const ux = Math.sin(a);
  const uy = -Math.cos(a);
  const nx = -uy;
  const ny = ux;
  const tip = [x + ux * len, y + uy * len];
  const m = [x + ux * len * 0.45, y + uy * len * 0.45];
  return `M${f(x)} ${f(y)}Q${f(m[0]! + nx * w)} ${f(m[1]! + ny * w)} ${f(tip[0]!)} ${f(tip[1]!)}Q${f(m[0]! - nx * w)} ${f(m[1]! - ny * w)} ${f(x)} ${f(y)}Z`;
}

/** A tulip's cup: a rounded bowl with three petal tips, opening upward at (x, y) (its base). */
function tulip(x: number, y: number, s: number): string {
  return `M${f(x - 1.9 * s)} ${f(y - 3.4 * s)}L${f(x - 1)} ${f(y - 2.4 * s)}L${f(x)} ${f(y - 3.8 * s)}L${f(x + 1 * s)} ${f(y - 2.4 * s)}L${f(x + 1.9 * s)} ${f(y - 3.4 * s)}Q${f(x + 2.1 * s)} ${f(y)} ${f(x)} ${f(y)}Q${f(x - 2.1 * s)} ${f(y)} ${f(x - 1.9 * s)} ${f(y - 3.4 * s)}Z`;
}

/** Cyclamen: three narrow petals swept back and up from a nodding eye at (x, y). */
function cyclamen(x: number, y: number): { petals: string; eye: string } {
  const petals = [-24, 0, 24].map((a) => blade(x + a * 0.02, y, a, 3.6, 0.9)).join('');
  return { petals, eye: disc(x, y + 0.3, 0.6) };
}

const cache = new Map<string, Planting>();

/** The planting along a window box whose soil runs from x0 to x1 at y. */
export function plantingFor(season: Season, x0: number, x1: number, y: number): Planting {
  const key = `${season}|${x0}|${x1}|${y}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const r = seeded(season.length * 13 + 5);
  const out: Record<keyof Planting, string[]> = { stems: [], leavesDeep: [], leaves: [], marks: [], flowers: [], accents: [], snow: [] };
  if (season === 'spring') {
    // Tulips in a loose row, grape hyacinths tucked between them.
    for (let x = x0 + 3; x < x1 - 2; x += 7 + r() * 2) {
      const h = 9 + r() * 3;
      out.stems.push(`M${f(x)} ${y}Q${f(x + 0.6)} ${f(y - h * 0.5)} ${f(x + 0.2)} ${f(y - h)}`);
      out.leavesDeep.push(blade(x - 0.4, y + 0.3, -18 - r() * 10, 7 + r() * 2, 1.3));
      out.leaves.push(blade(x + 0.4, y + 0.3, 14 + r() * 12, 6 + r() * 2, 1.2));
      out.flowers.push(tulip(x + 0.2, y - h + 0.4, 0.95 + r() * 0.15));
      const mx = x + 3.5 + r();
      if (mx < x1 - 1) {
        out.leavesDeep.push(blade(mx, y + 0.2, -8, 4, 0.5), blade(mx, y + 0.2, 10, 3.6, 0.5));
        for (let k = 0; k < 6; k++) out.accents.push(disc(mx + (k % 2 ? 0.45 : -0.45) * (1 - k / 7), y - 3.6 - k * 0.72, 0.55 - k * 0.04));
      }
    }
  } else if (season === 'summer') {
    // Geraniums: round leaves low down, umbels of five-petalled florets held up on stalks.
    // Three plants, each a mound of big round leaves with the zonal mark, spilling over the lip.
    const plants = [x0 + 11, (x0 + x1) / 2, x1 - 11];
    for (const px of plants) {
      for (let k = 0; k < 7; k++) {
        const lx = px + (k - 3) * 3.4 + (r() - 0.5) * 1.4;
        const ly = y - 1.6 - Math.cos(((k - 3) / 3.6) * 1.2) * 3.2 - r() * 0.8;
        const lr = 2.5 + r() * 0.7;
        (k % 2 ? out.leavesDeep : out.leaves).push(disc(lx, ly, lr));
        if (k % 2 === 0) out.marks.push(disc(lx + 0.2, ly + 0.3, lr * 0.62), disc(lx + 0.2, ly + 0.3, lr * 0.44));
      }
      // Umbels held above the leaves on bare stalks: a dome of florets, a paler bud or two.
      for (const dx of [-4.5, 3.8]) {
        const ux = px + dx + (r() - 0.5);
        const top = y - 10.5 - r() * 2;
        out.stems.push(`M${f(px + dx * 0.4)} ${f(y - 3)}Q${f(ux - 0.6)} ${f((y + top) / 2)} ${f(ux)} ${f(top + 1.8)}`);
        out.flowers.push(disc(ux, top, 1.15));
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          out.flowers.push(disc(ux + Math.cos(a) * 2, top + Math.sin(a) * 1.5, 1.05));
        }
        out.accents.push(disc(ux - 0.7, top - 0.5, 0.45), disc(ux + 0.8, top + 0.2, 0.4));
      }
    }
  } else if (season === 'autumn') {
    // Heather in upright sprays at the back, cyclamen with heart leaves in front.
    for (let x = x0 + 2; x < x1; x += 2.6 + r() * 1.4) {
      const h = 6 + r() * 3;
      const lean = (r() - 0.5) * 3;
      out.stems.push(`M${f(x)} ${y}L${f(x + lean)} ${f(y - h)}`);
      for (let k = 1; k < 7; k++) out.flowers.push(disc(x + lean * (k / 7) + (k % 2 ? 0.45 : -0.45), y - h * (0.35 + (k / 7) * 0.65), 0.46));
      out.leavesDeep.push(blade(x, y, -30 + r() * 60, 3, 0.5));
    }
    for (let x = x0 + 6; x < x1 - 3; x += 12 + r() * 4) {
      out.leaves.push(blade(x - 1.6, y + 0.4, -60, 3.4, 1.7), blade(x + 1.6, y + 0.4, 60, 3.4, 1.7));
      out.stems.push(`M${f(x)} ${y}Q${f(x + 1.2)} ${f(y - 3)} ${f(x + 0.6)} ${f(y - 5.4)}`);
      const c = cyclamen(x + 0.6, y - 5.2);
      out.accents.push(c.petals);
      out.leavesDeep.push(c.eye);
    }
  } else {
    // Fir sprigs fanned along the box, a few red berries, snow lying along the tops.
    for (let x = x0 + 2; x < x1 - 1; x += 5 + r() * 2) {
      const a = (r() - 0.5) * 40;
      const len = 9 + r() * 3;
      const rad = (a * Math.PI) / 180;
      const ex = x + Math.sin(rad) * len;
      const ey = y - Math.cos(rad) * len;
      out.stems.push(`M${f(x)} ${y}L${f(ex)} ${f(ey)}`);
      for (let k = 1; k <= 6; k++) {
        const t = k / 7;
        const px = x + (ex - x) * t;
        const py = y + (ey - y) * t;
        const reach = 3 * (1 - t * 0.55);
        (k % 2 ? out.leaves : out.leavesDeep).push(blade(px, py, a - 58, reach, 0.45), blade(px, py, a + 58, reach, 0.45));
      }
      // Snow lies along the upper side of the sprig, heaviest at the tip.
      out.snow.push(blade(x + (ex - x) * 0.45, y + (ey - y) * 0.45 - 0.5, a, len * 0.58, 0.9));
      if (r() < 0.5) out.flowers.push(disc(x + 1.4, y - 2.6, 0.6), disc(x + 2.2, y - 2.1, 0.55));
    }
  }
  const res: Planting = {
    stems: out.stems.join(''),
    leavesDeep: out.leavesDeep.join(''),
    leaves: out.leaves.join(''),
    marks: out.marks.join(''),
    flowers: out.flowers.join(''),
    accents: out.accents.join(''),
    snow: out.snow.join(''),
  };
  cache.set(key, res);
  return res;
}

/**
 * A fallen leaf lying flat on the tiles at (x, y), pointing along `angle` (degrees, 0 = right) in the
 * floor's plane (foreshortened), `len` long: [the leaf, its midrib].
 */
export function fallenLeaf(x: number, y: number, angle: number, len: number): [string, string] {
  const a = (angle * Math.PI) / 180;
  const flat = 0.6;
  const ux = Math.cos(a);
  const uy = Math.sin(a) * flat;
  const nx = -Math.sin(a) * len * 0.4;
  const ny = Math.cos(a) * len * 0.4 * flat;
  const tip = [x + ux * len, y + uy * len];
  const m = [x + ux * len * 0.45, y + uy * len * 0.45];
  const leaf = `M${f(x)} ${f(y)}Q${f(m[0]! + nx)} ${f(m[1]! + ny)} ${f(tip[0]!)} ${f(tip[1]!)}Q${f(m[0]! - nx)} ${f(m[1]! - ny)} ${f(x)} ${f(y)}Z`;
  return [leaf, `M${f(x - ux * 0.8)} ${f(y - uy * 0.8)}L${f(tip[0]! - ux * 0.6)} ${f(tip[1]! - uy * 0.6)}`];
}
