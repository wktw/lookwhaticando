import type { MachineDef } from '@/catalog/types';
import { luminance } from './color';
import { MOTIF_ACCENT } from './labels';

/** The palette a cabinet is drawn in: its catalog theme (each series already has its own body colour). */
export function machineTheme(machine: MachineDef): MachineDef['theme'] {
  return machine.theme;
}

/** The cabinet's signature colour: its painted body. */
export function machineHue(machine: MachineDef): string {
  return machine.theme.body;
}

/** Brass fittings: the handle, the slot plate, the plate rim and the feet. */
export const BRASS = { base: '#D8B769', deep: '#B8954A', light: '#EBD39A' } as const;

/**
 * The fill for a series' primary pill (graphite label): its painted colour, or, for the palest
 * bodies (oat, ice, cream), the second colour of its printed label, so the pill still reads
 * as a button on paper.
 */
export function pillFace(machine: MachineDef): string {
  return luminance(machine.theme.body) > 0.72 ? MOTIF_ACCENT[machine.id] : machine.theme.body;
}
