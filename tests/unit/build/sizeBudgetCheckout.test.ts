/** Actual Git Windows-checkout semantics and Vitest loading, without claiming a Windows host. */
import { expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './staticGraph';

it('loads the original budget suite and native CLI after a core.autocrlf checkout', () => {
  const checkout = mkdtempSync(join(tmpdir(), 'size-budget-checkout-'));
  const run = (command: string, args: string[]) => spawnSync(command, args, { cwd: checkout, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
  const okay = (result: ReturnType<typeof run>) => {
    expect(result.error).toBeUndefined();
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
  };
  try {
    mkdirSync(join(checkout, 'scripts'));
    mkdirSync(join(checkout, 'tests', 'unit', 'build'), { recursive: true });
    writeFileSync(join(checkout, 'package.json'), '{"type":"module"}');
    writeFileSync(join(checkout, 'scripts', 'size-budget.mjs'), readFileSync(join(ROOT, 'scripts', 'size-budget.mjs')));
    writeFileSync(join(checkout, '.gitattributes'), existsSync(join(ROOT, '.gitattributes')) ? readFileSync(join(ROOT, '.gitattributes')) : '');
    writeFileSync(join(checkout, 'tests', 'unit', 'build', 'sizeBudget.test.ts'), readFileSync(join(ROOT, 'tests', 'unit', 'build', 'sizeBudget.test.ts')));
    okay(run('git', ['init', '--quiet']));
    const git = ['-c', 'core.autocrlf=true', '-c', 'core.safecrlf=false'];
    okay(run('git', [...git, 'add', '--', '.gitattributes', 'scripts/size-budget.mjs']));
    unlinkSync(join(checkout, 'scripts', 'size-budget.mjs'));
    okay(run('git', [...git, 'checkout-index', '--', 'scripts/size-budget.mjs']));

    const script = join(checkout, 'scripts', 'size-budget.mjs');
    okay(run(process.execPath, ['--input-type=module', '-e', 'const m = await import(process.argv[1]); if (m.ENTRY_BUDGET_KB !== 150 || m.judge(160000).ok) process.exit(1);', pathToFileURL(script).href]));
    mkdirSync(join(checkout, 'dist', 'assets'), { recursive: true });
    writeFileSync(join(checkout, 'dist', 'index.html'), '<script type="module" src="./assets/entry.js"></script>');
    writeFileSync(join(checkout, 'dist', 'assets', 'entry.js'), 'export const value = 1;');
    const cli = run(process.execPath, [script, '--dist=dist', '--json']);
    okay(cli);
    expect(JSON.parse(cli.stdout)).toMatchObject({ ok: true, chunks: [{ file: 'assets/entry.js' }] });

    symlinkSync(join(ROOT, 'node_modules'), join(checkout, 'node_modules'), 'junction');
    writeFileSync(join(checkout, 'vitest.config.mjs'), `export default { test: { include: ['tests/unit/build/sizeBudget.test.ts'], environment: 'node' } };`);
    const suite = run(process.execPath, [join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'), 'run', '--config=vitest.config.mjs', '--maxWorkers=1']);
    okay(suite);
    expect(suite.stdout).toMatch(/4 passed/);
  } finally { rmSync(checkout, { recursive: true, force: true }); }
}, 20_000);
