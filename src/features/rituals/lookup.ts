import type { AppState } from '@/state/types';
import type { RitualLookup } from './words';

/** The ritual words' view of the save: habits (archived ones too) and pets by id. */
export function ritualLookup(s: Pick<AppState, 'habits' | 'pets' | 'settings'>): RitualLookup {
  return {
    habit: (id) => {
      const h = s.habits.find((x) => x.id === id);
      return h ? { name: h.name, plant: h.plant, icon: h.icon } : null;
    },
    pet: (id) => {
      const p = s.pets[id];
      return p ? { name: p.name } : null;
    },
    weekStart: s.settings.weekStart,
    quoteNotes: s.settings.quoteNotes,
  };
}
