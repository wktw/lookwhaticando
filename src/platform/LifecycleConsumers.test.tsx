// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRef } from 'preact/hooks';
import { act } from 'preact/test-utils';
import { setPlatform, type LifecycleEvent } from './capabilities';
import { onInterrupt } from '@/ui/gesture';
import { useVisible } from '@/art/scene/hooks';
import { retainWindowClock, windowClock } from '@/art/scene/moment';
import { useDome, type DomeController } from '@/features/capsules/useDome';
import { MACHINES } from '@/catalog/machines';
import { burst } from '@/fx/confetti';
import { ProfileSection } from '@/features/you/ProfileSection';
import { TodayScreen } from '@/features/today/TodayScreen';
import { selectDay, selectedDay, HIDDEN_RESET_MS } from '@/features/today/state';
import { state } from '@/state/store';
import { createInitialState } from '@/state/defaults';
import { mount, installDom, useState_, NOW } from '@/features/progress/testing';

let view: ReturnType<typeof mount> | undefined;
let restore: () => void;
let hidden = false;
const listeners = new Set<(event: LifecycleEvent) => void>();
const send = (event: LifecycleEvent) => act(() => { hidden = event === 'pause'; for (const listener of [...listeners]) listener(event); });
beforeEach(() => {
  installDom();
  hidden = false;
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  restore = setPlatform({ lifecycle: { get hidden() { return hidden; }, subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; } } });
  useState_(createInitialState(NOW));
});
afterEach(() => {
  view?.unmount(); view = undefined;
  restore(); listeners.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('UI consumers use injected lifecycle events', () => {
  it('aborts an active gesture on pause, then detaches', () => {
    const abort = vi.fn();
    const stop = onInterrupt(abort);
    send('pause');
    expect(abort).toHaveBeenCalledTimes(1);
    send('resume');
    expect(abort).toHaveBeenCalledTimes(1);
    stop(); send('pause');
    expect(abort).toHaveBeenCalledTimes(1);
    expect(listeners.size).toBe(0);
  });

  it('pauses a scene and resumes it after process restore, then detaches', () => {
    const changed = vi.fn();
    function Scene() { const ref = useRef<HTMLDivElement>(null); const visible = useVisible(ref, changed); return <div ref={ref} data-visible={String(visible)} />; }
    view = mount(<Scene />);
    send('pause');
    expect(view.root.querySelector('[data-paused]')).not.toBeNull();
    expect(changed).toHaveBeenLastCalledWith(false);
    send('restore');
    expect(view.root.querySelector('[data-paused]')).toBeNull();
    expect(changed).toHaveBeenLastCalledWith(true);
    view.unmount(); view = undefined;
    expect(listeners.size).toBe(0);
  });

  it('refreshes the shared art clock on injected resume/restore and releases the listener', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    const stop = retainWindowClock();
    send('pause');
    vi.setSystemTime(NOW + 60_000);
    send('resume');
    expect(windowClock.value.getTime()).toBe(NOW + 60_000);
    vi.setSystemTime(NOW + 120_000);
    send('restore');
    expect(windowClock.value.getTime()).toBe(NOW + 120_000);
    stop();
    expect(listeners.size).toBe(0);
  });

  it('stops and resumes capsule physics and cancels its frame on unmount', () => {
    document.documentElement.dataset.motion = 'full';
    const frame = vi.fn(() => 42);
    const cancel = vi.fn();
    vi.stubGlobal('requestAnimationFrame', frame);
    vi.stubGlobal('cancelAnimationFrame', cancel);
    let dome!: DomeController;
    function Cabinet() { dome = useDome(MACHINES[0]!, true); return <div />; }
    view = mount(<Cabinet />);
    act(() => dome.stir(1));
    expect(frame).toHaveBeenCalled();
    send('pause');
    expect(cancel).toHaveBeenCalledWith(42);
    frame.mockClear();
    act(() => dome.stir(1));
    expect(frame).not.toHaveBeenCalled();
    send('resume');
    expect(frame).toHaveBeenCalledTimes(1);
    view.unmount(); view = undefined;
    expect(listeners.size).toBe(0);
  });

  it('does not start celebration petals while the injected platform is hidden', () => {
    const animate = vi.spyOn(Element.prototype, 'animate');
    send('pause');
    burst();
    expect(animate).not.toHaveBeenCalled();
    send('resume');
    burst();
    expect(animate).toHaveBeenCalled();
  });

  it('commits the typed profile name on injected pause and unsubscribes on unmount', () => {
    view = mount(<ProfileSection />);
    const input = view.root.querySelector<HTMLInputElement>('input[autocomplete="given-name"]')!;
    act(() => { input.value = 'River'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(state.value.profile.name).not.toBe('River');
    send('pause');
    expect(state.value.profile.name).toBe('River');
    view.unmount(); view = undefined;
    expect(listeners.size).toBe(0);
  });

  it('clears Today’s selected past day after an injected long pause and detaches when leaving Today', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    view = mount(<TodayScreen />);
    act(() => selectDay('2026-09-28', '2026-09-29'));
    expect(selectedDay.value).toBe('2026-09-28');
    send('pause');
    vi.setSystemTime(NOW + HIDDEN_RESET_MS + 1);
    send('resume');
    expect(selectedDay.value).toBeNull();
    view.unmount(); view = undefined;
    expect(listeners.size).toBe(0);
  });
});
