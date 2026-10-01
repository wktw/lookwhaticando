/**
 * What stays off the first paint (`npm run size` measures the result; these pin it where it is
 * cheap to check).
 *
 * The copy deck. Rollup keeps a module whole in the chunk that first imports it, with every export
 * a lazy screen uses, so when the domain, the store or the fx layer imported `@/catalog/lines` the
 * whole deck (80 KB) sat in the entry chunk. First-paint code imports the deck's small first-paint
 * modules (lineKit, linesCore, formatCore) instead.
 *
 * What the first-paint diet moved behind `import()` (1 October 2026, 149.9 → 134.2 KB gzip): the
 * celebration host with everything only it brings, and the pets view. A static import of any of
 * them from first-paint code would quietly bring it back, so the entry's real static graph
 * (`staticGraph`: what Rollup puts in the entry chunk) must not reach them.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { reached, staticGraph } from './staticGraph';

/**
 * Code the entry chunk pulls in: the domain, the store and its top-level modules, the event bus,
 * the Shelf tab's closest pet and the celebration host's loader. The pets view and the fx layer's
 * host, plan and copy left the first paint on 1 October 2026 (`src/app/entryGraph.test.ts` keeps
 * them out); they stay listed, so coming back would not bring the deck with them.
 */
const FIRST_PAINT: readonly string[] = [
  'src/domain',
  'src/state/store.ts',
  'src/state/persist.ts',
  'src/state/decode.ts',
  'src/state/migrate.ts',
  'src/state/validate.ts',
  'src/state/handoff.ts',
  'src/state/demo.ts',
  'src/state/events.ts',
  'src/state/views/closestPet.ts',
  'src/state/views/common.ts',
  'src/state/views/pets.ts',
  'src/state/views/company.ts',
  'src/fx/copy.ts',
  'src/fx/celebrationPlan.ts',
  'src/fx/celebrations.tsx',
  'src/fx/celebrationHostLoader.tsx',
  'src/catalog/lineKit.ts',
  'src/catalog/linesCore.ts',
  'src/catalog/formatCore.ts',
];

/** The deck's full modules and the barrel that re-exports them. */
const WHOLE_DECK = /from\s+'(@\/catalog|@\/catalog\/lines|@\/catalog\/format|@\/catalog\/captionMatrix|\.\/lines|\.\/format|\.\/captionMatrix)'/;

function files(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((name) => files(join(path, name))).filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));
}

describe('first-paint code imports only the first-paint copy', () => {
  it('never imports lines.ts, format.ts, the caption matrix or the @/catalog barrel (type-only imports are fine)', () => {
    const offenders: string[] = [];
    for (const file of FIRST_PAINT.flatMap(files)) {
      const src = readFileSync(file, 'utf8');
      // Whole import statements, so a multi-line import is read as one.
      for (const m of src.matchAll(/^(import|export)\s[^;]*?;/gms)) {
        const stmt = m[0];
        if (/^import\s+type\s/.test(stmt)) continue;
        if (WHOLE_DECK.test(stmt)) offenders.push(`${file}: ${stmt.split('\n')[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('the entry chunk’s static graph', () => {
  const graph = staticGraph();

  it('reaches the small first-paint halves of what moved out (a control: the walk sees them)', () => {
    expect(graph.has('src/fx/celebrationHostLoader.tsx')).toBe(true);
    expect(graph.has('src/state/views/closestPet.ts')).toBe(true);
    expect(graph.has('src/state/events.ts')).toBe(true);
  });

  it('never reaches the whole copy deck (the rule above, checked on the real graph rather than a list)', () => {
    expect(reached(graph, ['src/catalog/lines.ts', 'src/catalog/format.ts', 'src/catalog/captionMatrix.ts', 'src/catalog/index.ts'])).toEqual([]);
  });

  it('does not reach anything the first-paint diet moved out: the celebration host and what only it brings, the pets view', () => {
    // Every module the entry reached on 44107a3 and no longer does. One coming back is a change to
    // the first-paint budget: measure it (`npm run size`) and say so in the plan, then move it here.
    const movedOut = [
      // <CelebrationHost/> is mounted from its own chunk (fx/celebrationHostLoader.tsx).
      'src/fx/celebrations.tsx',
      'src/fx/celebrationPlan.ts',
      'src/fx/copy.ts',
      'src/fx/celebrationArtLoader.tsx',
      'src/fx/CelebrationBanner.tsx',
      'src/fx/EpicMoment.tsx',
      'src/fx/SparkleBurst.tsx',
      'src/ui/SecretSparkle.tsx',
      'src/fx/petalColours.ts',
      // The coin flight and the confetti, with the fixed sprite layer (and its CSS) they draw on.
      'src/fx/coinFly.ts',
      'src/fx/confetti.ts',
      'src/fx/particles.ts',
      'src/fx/arc.ts',
      'src/fx/layer.ts',
      // The pets view: the tab bar needs only the closest pet (state/views/closestPet.ts).
      'src/state/views/pets.ts',
      'src/state/views/company.ts',
      'src/state/views/common.ts',
    ];
    expect(reached(graph, movedOut)).toEqual([]);
  });
});
