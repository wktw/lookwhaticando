#!/usr/bin/env node
/**
 * First-paint size gate for the PWA build (DESIGN §11 gates). Run after `npm run build`:
 *   node scripts/size-budget.mjs [--dist=dist] [--json]
 *
 * It measures what the browser must fetch and evaluate before Today can paint: the entry script
 * in dist/index.html plus every chunk it imports statically (the modulepreload set), gzipped.
 * Lazy screens and art chunks are not counted. Fails (exit 1) when that is over ENTRY_BUDGET_KB.
 *
 * KNOWN_OVERAGE lets the gate land before the fix it guards: the entry may be up to
 * `ceilingKB` while `reason` is open. Once the entry is back under budget the gate fails again,
 * asking for KNOWN_OVERAGE to be deleted, so the allowance cannot outlive the fix.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

/** gzip KB (1 KB = 1000 B, as Vite reports) allowed for the first-paint JavaScript. */
export const ENTRY_BUDGET_KB = 150;

/**
 * TODO(m1-build → lead): delete once NOTES-m1-build.md request 1 lands (CelebrationArt loaded on
 * demand, NOTES-m1-build.lazy-celebration-art.patch); the entry then measures about 95 KB.
 * Set to null when there is no open allowance.
 */
export const KNOWN_OVERAGE = { reason: 'CelebrationArt is still imported statically by src/fx (NOTES-m1-build.md request 1)', ceilingKB: 320 };

/** Relative chunk paths a minified ES module loads statically: imports and re-exports, not `import()`. */
export function staticImports(code) {
  const out = new Set();
  const re = /\b(?:import|export)\s*(?:[^"'`()]*?\bfrom\s*)?["'](\.{1,2}\/[^"']+\.js)["']/g;
  for (const m of code.matchAll(re)) out.add(m[1]);
  return [...out];
}

/** The entry scripts and modulepreloads index.html names, relative to dist/. */
export function entryScripts(html) {
  const out = new Set();
  for (const m of html.matchAll(/<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"/g)) out.add(m[1]);
  for (const m of html.matchAll(/<link\b[^>]*\brel="modulepreload"[^>]*\bhref="([^"]+)"/g)) out.add(m[1]);
  return [...out].map((p) => posix.normalize(p.replace(/^\.?\//, '')));
}

/** Every chunk in the first-paint closure, with its raw and gzip sizes in bytes. */
export function measureEntry(dist) {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const queue = entryScripts(html);
  if (!queue.length) throw new Error(`${dist}/index.html has no module entry script`);
  const seen = new Map();
  while (queue.length) {
    const rel = queue.shift();
    if (seen.has(rel)) continue;
    const file = join(dist, rel);
    if (!existsSync(file)) throw new Error(`index.html or a chunk points at a missing file: ${rel}`);
    const code = readFileSync(file);
    seen.set(rel, { file: rel, raw: code.length, gzip: gzipSync(code, { level: 9 }).length });
    for (const dep of staticImports(code.toString('utf8'))) queue.push(posix.normalize(posix.join(posix.dirname(rel), dep)));
  }
  const chunks = [...seen.values()].sort((a, b) => b.gzip - a.gzip);
  return { chunks, raw: chunks.reduce((n, c) => n + c.raw, 0), gzip: chunks.reduce((n, c) => n + c.gzip, 0) };
}

/** The verdict: ok, and the lines to print. */
export function judge(gzipBytes, budgetKB = ENTRY_BUDGET_KB, overage = KNOWN_OVERAGE) {
  const kb = gzipBytes / 1000;
  const size = `${kb.toFixed(1)} KB gzip`;
  if (kb <= budgetKB) {
    if (overage) return { ok: false, message: `First-paint JS is ${size}, within the ${budgetKB} KB budget: the fix has landed. Delete KNOWN_OVERAGE in scripts/size-budget.mjs.` };
    return { ok: true, message: `First-paint JS is ${size} (budget ${budgetKB} KB).` };
  }
  if (overage && kb <= overage.ceilingKB) {
    return { ok: true, message: `First-paint JS is ${size}: over the ${budgetKB} KB budget, allowed up to ${overage.ceilingKB} KB while this is open: ${overage.reason}.` };
  }
  return { ok: false, message: `First-paint JS is ${size}, over the ${budgetKB} KB budget${overage ? ` (and the ${overage.ceilingKB} KB allowance)` : ''}. Move something behind import() (see the chunk list).` };
}

const isMain = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
  const dist = String(args.dist ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'dist'));
  const m = measureEntry(dist);
  const verdict = judge(m.gzip);
  if (args.json) console.log(JSON.stringify({ ...m, ...verdict }, null, 1));
  else {
    for (const c of m.chunks) console.log(`  ${(c.gzip / 1000).toFixed(1).padStart(7)} KB gz  ${(c.raw / 1000).toFixed(1).padStart(8)} KB  ${c.file}`);
    console.log(`${verdict.ok ? 'ok' : 'FAIL'}  ${verdict.message}`);
  }
  process.exit(verdict.ok ? 0 : 1);
}
