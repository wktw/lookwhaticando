import { expect } from 'vitest';

/** Compare derived historical facts across an operation; copy before to catch in-place changes. */
export function preserveFacts<T>(operation: string, read: () => T, change: () => unknown): void {
  const before = structuredClone(read());
  change();
  expect(read(), `Historical facts changed after ${operation}`).toEqual(before);
}
