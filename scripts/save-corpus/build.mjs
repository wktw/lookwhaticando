/**
 * Rebuilds tests/fixtures/saves from the git history (WP-A4, DEC-E1): for each build that changed
 * the save's shape, its own code writes the saves (gen-historical.ts). Dev-only; run from the repo:
 *   TZ=UTC node scripts/save-corpus/build.mjs
 *
 * The builds, oldest first. Earlier commits (the "mochi-meadow" era: 45eff40, 27d3898, f783fc8 and
 * their merges) never built: their domain imports catalog names that did not exist yet, so no save
 * of theirs can exist (checked 30 Sep 2026).
 * - f6ed7ea: the first build that ran (catkin keys, `shelf`); no showCompanions/compactToday/quoteNotes.
 * - 57c0faa: those three settings.
 * - cf30bcf: the M1 audit pass (pending reveal in the demo).
 * - 5e4fa89: the last change to types.ts.
 * - b053e0a: the envelope's `gen` (save identity, WP-A2).
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '../..');
const BUILDS = ['f6ed7ea', '57c0faa', 'cf30bcf', '5e4fa89', 'b053e0a'];
const esbuild = join(repo, 'node_modules/.bin/esbuild');
for (const commit of BUILDS) {
  const dir = mkdtempSync(join(tmpdir(), `catkin-${commit}-`));
  const tar = join(dir, 'src.tar');
  execFileSync('git', ['-C', repo, 'archive', '-o', tar, commit, 'src']);
  execFileSync('tar', ['-xf', tar, '-C', dir]);
  copyFileSync(join(import.meta.dirname, 'gen-historical.ts'), join(dir, 'gen.ts'));
  execFileSync(esbuild, [join(dir, 'gen.ts'), '--bundle', '--platform=node', '--format=esm', `--alias:@=${join(dir, 'src')}`, `--outfile=${join(dir, 'gen.mjs')}`, '--log-level=error', '--define:__SINGLE_FILE__=false']);
  const out = join(repo, 'tests/fixtures/saves', commit);
  mkdirSync(out, { recursive: true });
  execFileSync('node', [join(dir, 'gen.mjs'), out, commit === BUILDS[0] ? 'wrappers' : ''], { env: { ...process.env, TZ: 'UTC' }, stdio: 'inherit' });
  rmSync(dir, { recursive: true, force: true });
}
