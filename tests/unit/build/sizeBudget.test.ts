import { afterAll, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ENTRY_BUDGET_KB, entryScripts, judge, measureEntry, staticImports } from '../../../scripts/size-budget.mjs';

const dist = mkdtempSync(join(tmpdir(), 'size-budget-'));
afterAll(() => rmSync(dist, { recursive: true, force: true }));

describe('first-paint size gate (scripts/size-budget.mjs)', () => {
  it('reads static imports, not dynamic ones', () => {
    const code = 'import{a as b}from"./art-shade-x1.js";import"./side.js";const s=()=>import("./Screen-z.js");export{c}from"./re.js";';
    expect(staticImports(code).sort()).toEqual(['./art-shade-x1.js', './re.js', './side.js']);
  });

  it('starts from the module entry and its modulepreloads', () => {
    const html = '<script type="module" crossorigin src="./assets/index-A.js"></script><link rel="modulepreload" crossorigin href="./assets/pet-crescents-B.js"><link rel="stylesheet" href="./assets/index.css">';
    expect(entryScripts(html)).toEqual(['assets/index-A.js', 'assets/pet-crescents-B.js']);
  });

  it('counts the entry closure and leaves lazy chunks out', () => {
    mkdirSync(join(dist, 'assets'));
    writeFileSync(join(dist, 'index.html'), '<script type="module" src="./assets/index-A.js"></script>');
    writeFileSync(join(dist, 'assets/index-A.js'), `import{x}from"./shared-B.js";const l=()=>import("./Lazy-C.js");${'a'.repeat(1000)}`);
    writeFileSync(join(dist, 'assets/shared-B.js'), `export const x=1;${'b'.repeat(1000)}`);
    writeFileSync(join(dist, 'assets/Lazy-C.js'), 'c'.repeat(5000));
    const m = measureEntry(dist);
    expect(m.chunks.map((c) => c.file).sort()).toEqual(['assets/index-A.js', 'assets/shared-B.js']);
    expect(m.gzip).toBe(m.chunks.reduce((n, c) => n + c.gzip, 0));
  });

  it('passes under budget, fails over it, and retires its own allowance once the fix lands', () => {
    expect(ENTRY_BUDGET_KB).toBe(150);
    expect(judge(140_000, 150, null).ok).toBe(true);
    expect(judge(160_000, 150, null).ok).toBe(false);
    const open = { reason: 'the split is pending', ceilingKB: 320 };
    expect(judge(300_000, 150, open).ok).toBe(true);
    expect(judge(330_000, 150, open).ok).toBe(false);
    const landed = judge(95_000, 150, open);
    expect(landed.ok).toBe(false);
    expect(landed.message).toContain('Delete KNOWN_OVERAGE');
  });
});
