import type { MachineDef } from '@/catalog/types';
import { Sheet } from './ui/Sheet';
import { LeafletFull } from './Leaflet';

export interface LineupSheetProps {
  machine: MachineDef;
  open: boolean;
  onClose: () => void;
}

/** The lineup leaflet, full size (DESIGN §7.1): every item numbered and ticked, the Secret a "?". */
export function LineupSheet({ machine, open, onClose }: LineupSheetProps) {
  return (
    <Sheet open={open} title="Lineup" onClose={onClose}>
      <LeafletFull machine={machine} />
    </Sheet>
  );
}
