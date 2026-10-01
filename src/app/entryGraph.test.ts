/**
 * The paper Sheet stays off the first paint. The shell needs a small sheet the moment a chunk
 * can't load (WP-C4), so whatever shows it has to be in the entry chunk; the kit's ConfirmDialog
 * brought the whole Sheet primitive (drag, detents, rubber band) with it (3.6 KB gzip of first
 * paint when WP-C4 added it, 2.9 KB at `f6f9a0d`). The shell's own `LoadSheet` (0.6 KB) does that
 * job instead. This walks the static imports from `src/main.tsx` (what Rollup puts in the entry
 * chunk: `import type` and `import()` are not followed) and checks the Sheet is not among them;
 * `npm run size` measures the result.
 *
 * The walk is `tests/unit/build/staticGraph.ts`. What the first-paint diet (1 October 2026,
 * 149.9 → 134.2 KB gzip) moved behind `import()`, and the copy deck, are kept out by
 * `tests/unit/build/firstPaintImports.test.ts`, on the same walk.
 */
import { describe, expect, it } from 'vitest';
import { reached, staticGraph } from '../../tests/unit/build/staticGraph';

describe('the first paint', () => {
  const graph = staticGraph();

  it('reaches the shell and its sheet loader (the walk follows real imports)', () => {
    expect(graph.has('src/app/App.tsx')).toBe(true);
    expect(graph.has('src/app/SheetHosts.tsx')).toBe(true);
    expect(graph.has('src/ui/sheetStack.ts')).toBe(true);
  });

  it('does not import the Sheet primitive or ConfirmDialog statically (WP-C4: the shell owns its small load sheet)', () => {
    expect(reached(graph, ['src/ui/Sheet.tsx', 'src/ui/ConfirmDialog.tsx', 'src/ui/sheetMotion.ts'])).toEqual([]);
  });
});
