import { POSES, type Pose } from '../types';
import { SHADE_FOR, TOWARD, type LitKey, type SpeciesRig } from '../rig';

/**
 * The list of crescents to precompute, derived from the rigs. The generator runs these through
 * the Bézier booleans; a unit test hashes this list and compares it with the hash stored next to
 * the generated data, so an edited rig without regenerated crescents fails loudly.
 *
 * Keys: `<rig>/<pose>/<part>/<kind>` where part is body | tail | tailCurl | cast | front<i> (a
 * near leg) | chest (kind `pale`: the pale chest marking), and `<rig>/head/<kind>` for the head (in its own frame). Kind is the shade side
 * (left | right | under), or `rim-<light>` for the lamp-side rim of dark coats (torso and head:
 * the silhouette that must not sink into the night).
 */

export interface Job {
  key: string;
  op: 'difference' | 'intersection';
  /** Path data for the shape. */
  a: string;
  /** Path data for the second operand (defaults to `a`), with transforms applied by the generator. */
  b?: string;
  /** Transform for `a` (and for `b` when `b` is absent) as [x, y, scale, rotateDeg]. */
  at?: readonly [number, number, number, number];
  /** Transform for `b` only. */
  bAt?: readonly [number, number, number, number];
  /** Offset for `b`, in the frame after `at` (canvas units). */
  shift: readonly [number, number];
  /** A second boolean applied to the result (to split a crescent at a tail's joint). */
  clip?: { op: 'difference' | 'intersection'; d: string };
}

const LIGHTS: readonly LitKey[] = ['left', 'top', 'right'];
const RIM = 1.25;
const HEAD = 3.4;
const LEG = 1.9;

const r2 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * The pale chest and belly, per pose: the torso minus itself shifted back and up, which leaves a
 * crescent hugging the front of the chest (sitting) or the chest and underside (standing). A
 * curled sleeper shows no chest.
 */
export const CHEST: Readonly<Record<Pose, readonly [number, number] | null>> = {
  sit: [-9, -1.5],
  loaf: [-7, -4],
  stand: [-6, -3.6],
  walk: [-6, -3.6],
  sleep: null,
};

export function crescentJobs(rigs: Readonly<Record<string, SpeciesRig>>): Job[] {
  const jobs: Job[] = [];
  for (const [id, rig] of Object.entries(rigs)) {
    // The head is drawn once in its own frame, so its crescents are shared by every pose (they tilt with it).
    for (const lit of LIGHTS) {
      const [tx, ty] = TOWARD[lit];
      jobs.push({ key: `${id}/head/${SHADE_FOR[lit]}`, op: 'difference', a: rig.head.d, shift: [r2(tx * HEAD), r2(ty * HEAD)] });
      jobs.push({ key: `${id}/head/rim-${lit}`, op: 'difference', a: rig.head.d, shift: [r2(-tx * RIM), r2(-ty * RIM)] });
    }
    for (const pose of POSES) {
      const p = rig.poses[pose];
      const body = p.depth?.body ?? 4.2;
      const tail = p.depth?.tail ?? 2.2;
      const at = [p.head.x, p.head.y, p.head.s, p.head.r ?? 0] as const;
      if (p.tail?.end) jobs.push({ key: `${id}/${pose}/tailShaft/shape`, op: 'difference', a: p.tail.d, b: p.tail.end.cut, shift: [0, 0] });
      const chest = p.chest === undefined ? CHEST[pose] : p.chest;
      if (chest) jobs.push({ key: `${id}/${pose}/chest/pale`, op: 'difference', a: p.body, shift: chest });
      for (const lit of LIGHTS) {
        const [tx, ty] = TOWARD[lit];
        const side = SHADE_FOR[lit];
        jobs.push({ key: `${id}/${pose}/body/${side}`, op: 'difference', a: p.body, shift: [r2(tx * body), r2(ty * body)] });
        jobs.push({ key: `${id}/${pose}/body/rim-${lit}`, op: 'difference', a: p.body, shift: [r2(-tx * RIM), r2(-ty * RIM)] });
        // The head's cast shadow on the torso: falls away from the light, mostly downward.
        jobs.push({
          key: `${id}/${pose}/cast/${side}`,
          op: 'intersection',
          a: p.body,
          b: rig.head.d,
          bAt: at,
          shift: [r2(-tx * 3), lit === 'top' ? 5 : 4.2],
        });
        const litLegs = [...(p.front ?? []).map((l, i) => [`front${i}`, l] as const), ...(p.frameB?.front ?? []).map((l, i) => [`frontB${i}`, l] as const)];
        // Small parts get no crescent from overhead light: it would only be a sliver under the paw.
        for (const [part, l] of litLegs) {
          if (!l.lit || lit === 'top') continue;
          jobs.push({ key: `${id}/${pose}/${part}/${side}`, op: 'difference', a: l.d, shift: [r2(tx * LEG), r2(ty * LEG)] });
        }
        for (const [part, tr] of [['tail', p.tail], ['tailCurl', p.tailCurl]] as const) {
          if (!tr || tr.lit === false || lit === 'top') continue;
          const shift = [r2(tx * tail), r2(ty * tail)] as const;
          jobs.push({ key: `${id}/${pose}/${part}/${side}`, op: 'difference', a: tr.d, shift });
          // A flicking tail: the same crescent, split at the joint.
          if (tr.end && part === 'tail') {
            jobs.push({ key: `${id}/${pose}/tailShaft/${side}`, op: 'difference', a: tr.d, shift, clip: { op: 'difference', d: tr.end.cut } });
            jobs.push({ key: `${id}/${pose}/tailEnd/${side}`, op: 'difference', a: tr.d, shift, clip: { op: 'intersection', d: tr.end.cut } });
          }
        }
      }
    }
  }
  return jobs;
}

/** FNV-1a over the job list: the freshness stamp for the generated data. */
export function jobsHash(jobs: readonly Job[]): string {
  const s = JSON.stringify(jobs);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
