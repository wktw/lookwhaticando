import type { MachineDef } from '@/catalog/types';
import { MOTIFS } from './motifs';

/** The palette a machine is drawn in: its catalog theme plus its motif's adjustments. */
export function machineTheme(machine: MachineDef): MachineDef['theme'] {
  const adjust = MOTIFS[machine.id].theme;
  return adjust ? { ...machine.theme, ...adjust } : machine.theme;
}

/** The machine's signature color (its body, or its trim when the body is white). */
export function machineHue(machine: MachineDef): string {
  const t = machineTheme(machine);
  return t.body.toUpperCase() === '#FFFFFF' ? t.trim : t.body;
}
