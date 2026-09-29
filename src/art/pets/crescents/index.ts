import { CRESCENTS } from './data';

/**
 * Precomputed Windowlight crescents (see generate.ts), by key parts: `rig, pose, part, kind` for
 * torso, tail and cast shadow, or `rig, 'head', kind` for the head. `kind` is a shade side
 * (left | right | under) or `rim-<light>`. Returns '' when there is no such part.
 */
export function crescentPath(...parts: string[]): string {
  return CRESCENTS[parts.join('/')] ?? '';
}

export { CRESCENTS };
