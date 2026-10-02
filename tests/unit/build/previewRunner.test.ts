/** Exercise the Node runner itself, including argument and nonzero-exit forwarding. */
import { expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from './staticGraph';

const run = promisify(execFile);
it('selects the production preview projects without shell environment syntax', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'catkin-preview-runner-'));
  const output = join(directory, 'report.json');
  try {
    await run(process.execPath, ['scripts/e2e-preview.mjs', '--list', '--project=pwa', '--reporter=json'], { cwd: ROOT, env: { ...process.env, E2E_TARGET: 'dev', PLAYWRIGHT_JSON_OUTPUT_NAME: output } });
    const report = JSON.parse(await readFile(output, 'utf8')) as { suites: Array<{ specs: Array<{ tests: Array<{ projectName: string }> }> }> };
    const projects = report.suites.flatMap((suite) => suite.specs.flatMap((spec) => spec.tests.map((test) => test.projectName)));
    expect(projects.length).toBeGreaterThan(0);
    expect(new Set(projects)).toEqual(new Set(['pwa']));
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 20_000);

it('forwards Playwright failure as a failing process exit', async () => {
  await expect(run(process.execPath, ['scripts/e2e-preview.mjs', '--definitely-not-a-playwright-option'], { cwd: ROOT })).rejects.toMatchObject({ code: 1 });
}, 20_000);
