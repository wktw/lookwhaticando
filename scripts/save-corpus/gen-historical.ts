/**
 * Runs inside a checkout of one historical commit (see ./build.mjs) and writes what that build's
 * own code wrote: a fresh save and a populated one (its reducer-driven demo) as save envelopes,
 * and, for the oldest build, a backup file, a daily copy and a clipboard payload. Nothing here is
 * written by hand, so the corpus is exactly the shapes a real save could hold (DEC-E1).
 *
 * It is bundled against that commit's `src` (never today's), so it may use only what every build
 * since the first one that could run (f6ed7ea) exports.
 */
import { createInitialState } from '@/state/defaults';
import { buildDemo } from '@/state/demo';
import * as persist from '@/state/persist';
import * as handoff from '@/state/handoff';
import * as snaps from '@/state/snapshots';
import { mkdirSync, writeFileSync } from 'node:fs';

const out = process.argv[2]!;
const wrappers = process.argv[3] === 'wrappers';
mkdirSync(out, { recursive: true });
const NOW = Date.UTC(2026, 8, 29, 18, 0);
const GEN = '0123456789abcdef0123456789abcdef';
// Builds with save identity take a lineage; older ones take four arguments and write none.
const envelope = (s: unknown, rev: number): string => (persist.encodeEnvelope as (...a: unknown[]) => string)(s, rev, NOW, 'history', ...('mintGen' in persist ? [GEN] : []));
const fresh = createInitialState(NOW);
const demo = buildDemo({ today: '2026-09-29', now: NOW, seed: 7, days: 40, name: 'Sam' });
writeFileSync(`${out}/main-fresh.json`, envelope(fresh, 1));
writeFileSync(`${out}/main-demo.json`, envelope(demo, 57));
if (wrappers) {
  writeFileSync(`${out}/backup-demo.json`, JSON.stringify(handoff.makeBackup(demo, { now: NOW, appVersion: 'history', device: 'iPhone · Safari' })));
  const meta = (snaps.snapshotMeta as (...a: unknown[]) => object)(demo, 'daily', 'daily-2026-09-29', '2026-09-29', NOW, 'history');
  writeFileSync(`${out}/snapshot-demo.json`, JSON.stringify({ ...meta, state: demo }));
  writeFileSync(`${out}/payload-fresh.txt`, await handoff.encodePayload(JSON.stringify(handoff.makeBackup(fresh, { now: NOW, appVersion: 'history', device: 'iPhone · Safari' })), { compress: false }));
}
