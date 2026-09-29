import type { MachineDef } from '@/catalog/types';
import { CapsuleSim, type DomeBody } from '@/fx/physics';
import { CAPSULE_COUNT, CAPSULE_R, EXIT_X, WINDOW_BOX } from './geometry';

/** Stable seed per series, so each cabinet always shows the same resting pile. */
export function machineSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A window sim for this cabinet, already settled (identical to the static art). */
export function createMachineSim(machine: MachineDef): CapsuleSim {
  const sim = new CapsuleSim({
    box: WINDOW_BOX,
    count: CAPSULE_COUNT,
    bodyRadius: CAPSULE_R,
    tints: machine.theme.capsules.length,
    seed: machineSeed(machine.id),
    exitX: EXIT_X,
  });
  sim.settle();
  return sim;
}

const cache = new Map<string, readonly DomeBody[]>();

/** The settled capsule pile for static renders (computed once per series). */
export function settledPile(machine: MachineDef): readonly DomeBody[] {
  let pile = cache.get(machine.id);
  if (!pile) {
    pile = createMachineSim(machine).bodies.map((b) => ({ ...b }));
    cache.set(machine.id, pile);
  }
  return pile;
}
