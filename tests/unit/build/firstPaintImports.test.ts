/**
 * The copy deck stays off the first paint. Rollup keeps a module whole in the chunk that first
 * imports it, with every export a lazy screen uses, so when the domain, the store or the fx layer
 * imported `@/catalog/lines` the whole deck (80 KB) sat in the entry chunk. First-paint code imports
 * the deck's small first-paint modules (lineKit, linesCore, formatCore) instead. This pins that
 * rule where it is cheap to check; `npm run size` measures the result.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Code the entry chunk pulls in: the domain, the store and its top-level modules, the fx layer's copy and plan. */
const FIRST_PAINT: readonly string[] = [
  'src/domain',
  'src/state/store.ts',
  'src/state/persist.ts',
  'src/state/decode.ts',
  'src/state/migrate.ts',
  'src/state/validate.ts',
  'src/state/handoff.ts',
  'src/state/demo.ts',
  'src/state/views/common.ts',
  'src/state/views/pets.ts',
  'src/state/views/company.ts',
  'src/fx/copy.ts',
  'src/fx/celebrationPlan.ts',
  'src/fx/celebrations.tsx',
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
