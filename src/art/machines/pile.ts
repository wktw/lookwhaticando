import type { MachineDef } from '@/catalog/types';
import { DomeSim, type DomeBody } from '@/fx/physics';
import { CAPSULE_COUNT, CAPSULE_R, DOME, DOME_FLOOR, DOME_INNER } from './geometry';

/** Stable seed per machine, so each machine always shows the same resting pile. */
export function machineSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A dome sim for this machine, already settled (identical to the static art). */
export function createMachineSim(machine: MachineDef): DomeSim {
  const sim = new DomeSim({
    cx: DOME.cx,
    cy: DOME.cy,
    radius: DOME_INNER,
    floor: DOME_FLOOR,
    count: CAPSULE_COUNT,
    bodyRadius: CAPSULE_R,
    tints: machine.theme.capsules.length,
    seed: machineSeed(machine.id),
  });
  sim.settle();
  return sim;
}

const cache = new Map<string, readonly DomeBody[]>();

/** The settled capsule pile for static renders (computed once per machine). */
export function settledPile(machine: MachineDef): readonly DomeBody[] {
  let pile = cache.get(machine.id);
  if (!pile) {
    pile = createMachineSim(machine).bodies.map((b) => ({ ...b }));
    cache.set(machine.id, pile);
  }
  return pile;
}
