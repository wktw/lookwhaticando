/** Types for scripts/size-budget.mjs (used by tests/unit/build/sizeBudget.test.ts). */
export declare const ENTRY_BUDGET_KB: number;
export declare const KNOWN_OVERAGE: { reason: string; ceilingKB: number } | null;
export declare function staticImports(code: string): string[];
export declare function entryScripts(html: string): string[];
export interface ChunkSize {
  file: string;
  raw: number;
  gzip: number;
}
export declare function measureEntry(dist: string): { chunks: ChunkSize[]; raw: number; gzip: number };
export declare function judge(gzipBytes: number, budgetKB?: number, overage?: { reason: string; ceilingKB: number } | null): { ok: boolean; message: string };
