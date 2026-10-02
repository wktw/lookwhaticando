import { expect, it } from 'vitest';
import config from '../../../playwright.config';

it.each(['webkit-phone', 'chromium-motion'])('%s includes the inherited handoff and storage capability journeys', (name) => {
  const project = config.projects!.find((p) => p.name === name)!;
  expect(project).toBeDefined();
  const patterns = Array.isArray(project.testMatch) ? project.testMatch : [project.testMatch];
  for (const file of ['capsules.spec.ts', 'recovery-platform.spec.ts']) {
    expect(patterns.some((pattern) => pattern instanceof RegExp && pattern.test(file)), `${name} must execute ${file}`).toBe(true);
  }
});

it('keeps real WebKit and ordinary motion in the inherited journey projects', () => {
  const webkit = config.projects!.find((p) => p.name === 'webkit-phone')!;
  const chromium = config.projects!.find((p) => p.name === 'chromium-motion')!;
  expect(webkit.use?.browserName).toBe('webkit');
  expect(chromium.use?.browserName ?? chromium.use?.defaultBrowserType ?? 'chromium').toBe('chromium');
  for (const project of [webkit, chromium]) expect(project.use?.contextOptions?.reducedMotion).toBe('no-preference');
});
