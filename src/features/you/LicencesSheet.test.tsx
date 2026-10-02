// @vitest-environment jsdom
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { installDom, mount, until } from '@/features/capsules/testing';
import { LicencesSheet } from './LicencesSheet';

let view: ReturnType<typeof mount> | undefined;
beforeAll(installDom);
afterEach(() => { view?.unmount(); vi.unstubAllGlobals(); });

it.each(['success', 'failure'] as const)('ignores an old request %s after close and reopen', async (ending) => {
  const pending: Array<{ resolve: (r: unknown) => void; reject: (r: unknown) => void; signal: AbortSignal }> = [];
  vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise((resolve, reject) => pending.push({ resolve, reject, signal: options.signal }))));
  view = mount(<LicencesSheet open onClose={() => undefined} />);
  expect(pending).toHaveLength(1);
  await act(() => render(<LicencesSheet open={false} onClose={() => undefined} />, view!.root));
  expect(pending[0]!.signal.aborted).toBe(true);
  await act(() => render(<LicencesSheet open onClose={() => undefined} />, view!.root));
  expect(pending).toHaveLength(2);
  await act(async () => {
    if (ending === 'success') pending[0]!.resolve({ ok: true, text: async () => 'OLD NOTICES' });
    else pending[0]!.reject(new Error('old failed'));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(document.body.textContent).not.toContain('OLD NOTICES');
  expect(document.body.textContent).not.toContain('Try again');
  await act(async () => { pending[1]!.resolve({ ok: true, text: async () => 'CURRENT NOTICES' }); await Promise.resolve(); });
  await until(() => document.body.textContent?.includes('CURRENT NOTICES'), 'current notice request');
});
