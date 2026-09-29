import type { PastelKey } from '@/catalog/types';
import './tones.css';

export type Tone = PastelKey | 'danger';

/** Global class that scopes a pastel family onto --t100…--t700 (see tones.css). */
export function toneClass(tone: Tone): string {
  return `mm-tone-${tone}`;
}
