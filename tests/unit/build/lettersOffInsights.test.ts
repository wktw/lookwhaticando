/**
 * The letters stay off the Progress screen's insights (WP-B6 review). The Sunday Note, the
 * Herbarium page and the Season Review are written on every open, so they are in the first-paint
 * chunk; they read only `checkinCounts`, which lives in `domain/checkins.ts`. Rollup keeps a module
 * whole in the chunk that first imports it, so a first-paint import of `domain/insights.ts` would
 * bring every Progress insight (about 1 KB gzip) back into first paint. This walks the entry's
 * static imports (type-only imports and `import()` excluded) and checks it never reaches it.
 */
import { describe, expect, it } from 'vitest';
import { reached, staticGraph } from './staticGraph';

describe('the letters stay off the Progress insights', () => {
  it('the entry reaches the letters and checkinCounts, and never domain/insights.ts', () => {
    const graph = staticGraph('src/main.tsx');
    // A control: the walk does see the letters and what they count with.
    expect(graph.has('src/domain/rituals.ts')).toBe(true);
    expect(graph.has('src/domain/checkins.ts')).toBe(true);
    expect(reached(graph, ['src/domain/insights.ts'])).toEqual([]);
  });
});
