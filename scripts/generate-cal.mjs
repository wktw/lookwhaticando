#!/usr/bin/env node
/**
 * Writes the static "watering time" calendar files (DESIGN §11.1, VOICE §20) to public/cal:
 * one per Today block and 15-minute time on offer (src/features/you/calendar.ts), e.g.
 * public/cal/morning-0730.ics. An installed iPhone app can't hand a generated file to Calendar,
 * so there "Add to calendar" links to these. Each is exactly what `wateringTimeIcs()` writes for
 * a block with no habit names ("Morning plants."), from a fixed start day, so the files only
 * change when the event format does. tests/unit/you-calendar.test.ts checks they are current.
 *
 *   node scripts/generate-cal.mjs
 */
import { build } from 'esbuild';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'cal');

const entry = `
export { wateringTimeIcs } from '@/domain/profile';
export { WATERING_SLOTS, slotTimes, staticCalPath } from '@/features/you/calendar';
export { STATIC_CAL } from '@/features/you/calendarStatic';
`;

const result = await build({
  stdin: { contents: entry, resolveDir: root, loader: 'ts' },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'error',
  tsconfig: join(root, 'tsconfig.json'),
});
const mod = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);

mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir)) if (f.endsWith('.ics')) rmSync(join(outDir, f));
let n = 0;
for (const slot of mod.WATERING_SLOTS) {
  for (const time of mod.slotTimes(slot)) {
    const text = mod.wateringTimeIcs(slot, time, [], mod.STATIC_CAL);
    writeFileSync(join(root, 'public', mod.staticCalPath(slot, time)), text);
    n++;
  }
}
console.log(`wrote ${n} calendar files to public/cal`);
