/**
 * The entry chunk's source modules, read from the source: a walk of the static imports from
 * `src/main.tsx`, which is what Rollup puts in the entry chunk (`import type` and `import()` are
 * not followed). Used by the first-paint import tests (`firstPaintImports.test.ts` and
 * `src/app/entryGraph.test.ts`); `npm run size` measures the result.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

/** The repository root. */
export const ROOT = join(__dirname, '..', '..', '..');

function resolve(root: string, from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = join(root, 'src', spec.slice(2));
  else if (spec.startsWith('.')) base = join(dirname(from), spec);
  else return null; // a package
  for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]) {
    if (/\.tsx?$/.test(c) && existsSync(c)) return c;
  }
  return null; // CSS, JSON, assets
}

/**
 * Every source module `entry` imports statically, as paths from `root`, with the chain that
 * reached each (`root` defaults to this repository; a test may walk another checkout).
 */
export function staticGraph(entry = 'src/main.tsx', root = ROOT): Map<string, string[]> {
  const start = join(root, entry);
  const seen = new Map<string, string[]>([[start, [start]]]);
  const queue = [start];
  while (queue.length) {
    const file = queue.shift()!;
    const src = readFileSync(file, 'utf8');
    // Whole statements, so a multi-line import is read as one.
    for (const m of src.matchAll(/^(?:import|export)\s(?:[^;'"]*?\sfrom\s)?\s*['"]([^'"]+)['"]/gms)) {
      if (/^(?:import|export)\s+type\s/.test(m[0])) continue;
      const dep = resolve(root, file, m[1]!);
      if (!dep || seen.has(dep)) continue;
      seen.set(dep, [...seen.get(file)!, dep]);
      queue.push(dep);
    }
  }
  return new Map([...seen].map(([f, chain]) => [relative(root, f), chain.map((c) => relative(root, c))]));
}

/** For each of `files` the graph reaches, the chain that reaches it ("a → b → c"). */
export function reached(graph: Map<string, string[]>, files: readonly string[]): string[] {
  return files.filter((f) => graph.has(f)).map((f) => graph.get(f)!.join(' → '));
}
