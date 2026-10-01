/**
 * The paper Sheet stays off the first paint. The shell needs a small sheet the moment a chunk
 * can't load (WP-C4), so whatever shows it has to be in the entry chunk; the kit's ConfirmDialog
 * brought the whole Sheet primitive (drag, detents, rubber band) with it (3.6 KB gzip of first
 * paint when WP-C4 added it, 2.9 KB at `f6f9a0d`). The shell's own `LoadSheet` (0.6 KB) does that
 * job instead. This walks the static imports from `src/main.tsx` (what Rollup puts in the entry
 * chunk: `import type` and `import()` are not followed) and checks the Sheet is not among them;
 * `npm run size` measures the result.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const ROOT = join(__dirname, '..', '..');

function resolve(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = join(ROOT, 'src', spec.slice(2));
  else if (spec.startsWith('.')) base = join(dirname(from), spec);
  else return null; // a package
  for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]) {
    if (/\.tsx?$/.test(c) && existsSync(c)) return c;
  }
  return null; // CSS, JSON, assets
}

/** Every source module the entry imports statically, as paths from the repository root, with the chain that reached each. */
function staticGraph(entry: string): Map<string, string[]> {
  const seen = new Map<string, string[]>([[entry, [entry]]]);
  const queue = [entry];
  while (queue.length) {
    const file = queue.shift()!;
    const src = readFileSync(file, 'utf8');
    // Whole statements, so a multi-line import is read as one.
    for (const m of src.matchAll(/^(?:import|export)\s(?:[^;'"]*?\sfrom\s)?\s*['"]([^'"]+)['"]/gms)) {
      if (/^(?:import|export)\s+type\s/.test(m[0])) continue;
      const dep = resolve(file, m[1]!);
      if (!dep || seen.has(dep)) continue;
      seen.set(dep, [...seen.get(file)!, dep]);
      queue.push(dep);
    }
  }
  return new Map([...seen].map(([f, chain]) => [relative(ROOT, f), chain.map((c) => relative(ROOT, c))]));
}

describe('the first paint', () => {
  const graph = staticGraph(join(ROOT, 'src', 'main.tsx'));

  it('reaches the shell and its sheet loader (the walk follows real imports)', () => {
    expect(graph.has('src/app/App.tsx')).toBe(true);
    expect(graph.has('src/app/SheetHosts.tsx')).toBe(true);
    expect(graph.has('src/ui/sheetStack.ts')).toBe(true);
  });

  it('does not import the Sheet primitive or ConfirmDialog statically (WP-C4: the shell owns its small load sheet)', () => {
    const offenders = ['src/ui/Sheet.tsx', 'src/ui/ConfirmDialog.tsx', 'src/ui/sheetMotion.ts'].filter((f) => graph.has(f)).map((f) => graph.get(f)!.join(' → '));
    expect(offenders).toEqual([]);
  });
});
