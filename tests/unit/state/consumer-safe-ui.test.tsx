// @vitest-environment jsdom
/**
 * WP-A5 in the interface (P-persistence-06): choosing a backup file past the import bound says so
 * from its size alone, and never reads it. Cases marked "failed before" failed against the code
 * before WP-A5 (416f43d).
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act } from 'preact/test-utils';
import * as store from '@/state/store';
import { ERRORS } from '@/catalog/lines';
import { ImportSheet } from '@/features/you/ImportSheet';
import { installDom, mount, until } from '@/features/capsules/testing';
import { fakeBrowser } from './fixtures';

beforeAll(() => installDom());

let view: ReturnType<typeof mount> | null = null;
afterEach(() => {
  view?.unmount();
  view = null;
  store.configureStore({ locks: null });
  localStorage.clear();
});

/** Chooses `file` in the sheet's hidden file input. */
async function choose(file: unknown): Promise<void> {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe('Import a backup: a file too big to be one', () => {
  it('says it is too big, and never reads it (failed before)', async () => {
    fakeBrowser();
    store.hydrate();
    view = mount(<ImportSheet open onClose={() => undefined} />);
    const text = vi.fn(async () => '{}');
    await choose({ name: 'huge.json', size: 64 * 1024 * 1024 + 1, type: 'application/json', text });
    const alert = await until(() => document.querySelector('[role="alert"]'), 'the error line');
    expect(alert.textContent).toBe(ERRORS.tooLarge);
    expect(text).not.toHaveBeenCalled();
  });
});
