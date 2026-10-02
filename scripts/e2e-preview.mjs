/** Run the production-preview journeys without platform-specific shell syntax. */
process.env.E2E_TARGET = 'preview';
process.argv.splice(2, 0, 'test');
// Run the exported CLI in this process: argv, output, exit codes and signals stay intact.
await import('@playwright/test/cli');
