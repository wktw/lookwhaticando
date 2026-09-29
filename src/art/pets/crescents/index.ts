import { DATA } from './data';

/**
 * Precomputed Windowlight crescents (see generate.ts), by key parts: `rig, pose, part, kind` for
 * torso, tail, cast shadow and chest, or `rig, 'head', kind` for the head. `kind` is a shade side
 * (left | right | under), `rim-<light>`, `pale` (the chest) or `shape` (a split tail's shaft).
 * Returns '' when there is no such part.
 */
export function crescentPath(rig: string, pose: string, ...rest: string[]): string {
  const i = DATA.k[rig]?.[pose]?.[rest.join('/')];
  return i === undefined ? '' : DATA.p[i]!;
}

/** Every crescent by its full key, `rig/pose/part/kind` (tests and tools). */
export const CRESCENTS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(DATA.k).flatMap(([rig, poses]) =>
    Object.entries(poses).flatMap(([pose, parts]) => Object.entries(parts).map(([k, i]) => [`${rig}/${pose}/${k}`, DATA.p[i]!] as const)),
  ),
);
