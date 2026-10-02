/** Exercise Windows graph names on every host; filesystem reads still use this host's paths. */
import { afterAll, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('node:path', async (original) => {
  const native = await original<typeof import('node:path')>();
  return {
    ...native,
    relative: (from: string, to: string) => native.win32.relative(from.replaceAll('/', '\\'), to.replaceAll('/', '\\')),
  };
});

import { reached, staticGraph } from './staticGraph';

const fixture = mkdtempSync(join(tmpdir(), 'static-graph-'));
afterAll(() => rmSync(fixture, { recursive: true, force: true }));
mkdirSync(join(fixture, 'src', 'domain'), { recursive: true });
writeFileSync(join(fixture, 'src', 'main.ts'), `import { value } from './app';\nimport type { Type } from './types';\nconst lazy = () => import('./lazy');\nimport './paint.css';\n`);
writeFileSync(join(fixture, 'src', 'app.ts'), `export { value } from '@/domain/rule';\n`);
writeFileSync(join(fixture, 'src', 'domain', 'rule.ts'), `import '../forbidden';\nexport const value = 1;\n`);
for (const name of ['types', 'lazy', 'forbidden']) writeFileSync(join(fixture, 'src', `${name}.ts`), 'export const value = 1;\n');
writeFileSync(join(fixture, 'src', 'paint.css'), 'body { color: black; }\n');

describe('static graph with Windows relative-path semantics', () => {
  it('keeps value imports, aliases and re-exports reachable with portable complete chains', () => {
    const graph = staticGraph('src/main.ts', fixture);
    expect([...graph.keys()]).toEqual(['src/main.ts', 'src/app.ts', 'src/domain/rule.ts', 'src/forbidden.ts']);
    expect(reached(graph, ['src/forbidden.ts'])).toEqual(['src/main.ts → src/app.ts → src/domain/rule.ts → src/forbidden.ts']);
  });

  it('still excludes type-only imports, lazy imports and CSS', () => {
    const graph = staticGraph('src/main.ts', fixture);
    expect(reached(graph, ['src/types.ts', 'src/lazy.ts', 'src/paint.css'])).toEqual([]);
    expect(graph.size).toBe(4);
  });

  it('reaches the actual shell, first-paint halves and letters instead of passing empty negative guards', () => {
    const graph = staticGraph();
    for (const file of ['src/app/App.tsx', 'src/app/SheetHosts.tsx', 'src/ui/sheetStack.ts', 'src/fx/celebrationHostLoader.tsx', 'src/state/views/closestPet.ts', 'src/domain/rituals.ts', 'src/domain/checkins.ts']) {
      expect(graph.has(file), file).toBe(true);
    }
    expect(reached(graph, ['src/ui/Sheet.tsx', 'src/catalog/lines.ts', 'src/domain/insights.ts'])).toEqual([]);
  });
});
