// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'preact/test-utils';
import { zonedLocalTime } from '@/domain/dates';
import { completeOnboarding, configureStore, flushSaves, hydrate, state } from '@/state/store';
import { fakeBrowser } from '../../../tests/unit/state/fixtures';
import { installDom, mount, type } from '@/features/capsules/testing';
import { ProfileSection } from './ProfileSection';

let view: ReturnType<typeof mount> | null = null;
beforeAll(installDom);
beforeEach(() => {
  fakeBrowser();
  hydrate();
  completeOnboarding({ name: 'Sam', templateIds: [] });
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-29T12:00:00Z'));
});
afterEach(() => {
  view?.unmount();
  view = null;
  flushSaves();
  vi.useRealTimers();
});

describe('Profile name composition (WP-03)', () => {
  it.each([
    ['composition flag', { isComposing: true }],
    ['Safari composition key code', { keyCode: 229 }],
  ])('%s: confirming a candidate keeps the unfinished name and focus in the field', async (_label, composing) => {
    view = mount(<ProfileSection />);
    const input = view.root.querySelector<HTMLInputElement>('input[autocomplete="given-name"]')!;
    await act(() => {
      input.focus();
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    });
    await type(input, 'さ');
    await act(() => void input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, ...composing })));
    expect(state.value.profile.name).toBe('Sam');
    expect(document.activeElement).toBe(input);
    await type(input, 'さくら');
    await act(() => void input.dispatchEvent(new CompositionEvent('compositionend', { data: 'さくら', bubbles: true })));
    expect(state.value.profile.name).toBe('Sam');
    await act(() => void input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(state.value.profile.name).toBe('さくら');
    expect(document.activeElement).not.toBe(input);
  });
});

describe('Profile moving-in day (WP-B6 follow-up)', () => {
  it('shows the recorded app day across a day-start change and travel, including the previous year', async () => {
    state.value = { ...state.value, profile: { ...state.value.profile, createdAt: Date.parse('2026-01-01T02:00:00Z'), createdOn: '2025-12-31' } };
    view = mount(<ProfileSection />);
    expect(view.root.textContent).toContain('Dec 31, 2025');
    expect(view.root.textContent).not.toContain('Jan 1');
    configureStore({ local: zonedLocalTime('Pacific/Auckland') });
    await act(() => {
      state.value = { ...state.value, settings: { ...state.value.settings, dayStartsAt: 360 } };
    });
    expect(view.root.textContent).toContain('Dec 31, 2025');
  });

  it('uses the save’s app-day boundary for a legacy profile without a frozen day', () => {
    const { createdOn: _createdOn, ...legacy } = state.value.profile;
    state.value = { ...state.value, profile: { ...legacy, createdAt: Date.parse('2026-09-29T02:00:00Z') } };
    view = mount(<ProfileSection />);
    expect(view.root.textContent).toContain('Sep 28');
    expect(view.root.textContent).not.toContain('Sep 29');
  });
});
