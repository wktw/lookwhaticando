/** Exercise the Node runner itself, including argument and nonzero-exit forwarding. */
import { expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ROOT } from './staticGraph';

const run = promisify(execFile);
it('selects the production preview projects without shell environment syntax', async () => {
  const { stdout } = await run(process.execPath, ['scripts/e2e-preview.mjs', '--list', '--project=pwa'], { cwd: ROOT, env: { ...process.env, E2E_TARGET: 'dev' } });
  expect(stdout).toContain('[pwa]');
  expect(stdout).not.toContain('[screens-phone-light]');
});

it('forwards Playwright failure as a failing process exit', async () => {
  await expect(run(process.execPath, ['scripts/e2e-preview.mjs', '--definitely-not-a-playwright-option'], { cwd: ROOT })).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining('unknown option') });
});
