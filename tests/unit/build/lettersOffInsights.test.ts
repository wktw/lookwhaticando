/**
 * The letters stay off the Progress screen's insights (WP-B6 review). The Sunday Note, the
 * Herbarium page and the Season Review are written on every open, so they are in the first-paint
 * chunk; they read only `checkinCounts`, which lives in `domain/checkins.ts`. Rollup keeps a module
 * whole in the chunk that first imports it, so a first-paint import of `domain/insights.ts` would
 * bring every Progress insight (about 1 KB gzip) back into first paint. This walks the entry's
 * static imports (type-only imports and `import()` excluded) and checks it never reaches it.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const ROOT = join(__dirname, '../../..');

function resolveSpec(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = join('src', spec.slice(2));
  else if (spec.startsWith('.')) base = normalize(join(dirname(from), spec));
  else return null;
  for (const c of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx'), base]) {
    const p = join(ROOT, c);
    if (existsSync(p) && statSync(p).isFile()) return c;
  }
  return null;
}

/** Each module the entry reaches through static value imports and re-exports, with the module that first reached it. */
function staticGraph(entry: string): Map<string, string | null> {
  const seen = new Map<string, string | null>([[entry, null]]);
  const queue = [entry];
  while (queue.length) {
    const file = queue.shift()!;
    if (!/\.tsx?$/.test(file)) continue;
    const src = readFileSync(join(ROOT, file), 'utf8');
    for (const m of src.matchAll(/^(?:import|export)\s[^;]*?from\s*'([^']+)';|^import\s*'([^']+)';/gms)) {
      if (/^(?:import|export)\s+type\s/.test(m[0])) continue;
      const to = resolveSpec(file, (m[1] ?? m[2])!);
      if (to && !seen.has(to)) {
        seen.set(to, file);
        queue.push(to);
      }
    }
  }
  return seen;
}

function chain(graph: Map<string, string | null>, file: string): string {
  const out = [file];
  for (let at = graph.get(file); at; at = graph.get(at)) out.unshift(at);
  return out.join(' → ');
}

describe('the letters stay off the Progress insights', () => {
  it('the entry reaches the letters and checkinCounts, and never domain/insights.ts', () => {
    const graph = staticGraph('src/main.tsx');
    // A control: the walk does see the letters and what they count with.
    expect(graph.has('src/domain/rituals.ts')).toBe(true);
    expect(graph.has('src/domain/checkins.ts')).toBe(true);
    expect(graph.has('src/domain/insights.ts') ? chain(graph, 'src/domain/insights.ts') : null).toBeNull();
  });
});
