import { useId } from 'preact/hooks';

/** A document-unique id prefix for this component instance (for gradients, patterns, <use>). */
export function useUid(prefix: string): string {
  return prefix + useId().replace(/[^a-zA-Z0-9_-]/g, '');
}
