// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createRef, render } from 'preact';
import { act } from 'preact/test-utils';
import { Band, type BandHandle } from './Band';
import { todayVM } from '@/state/views/today';
import { createInitialState } from '@/state/defaults';
import { runtimeLocalTime } from '@/domain/dates';
import { habit } from '../../../tests/unit/domain/helpers';
const pours = vi.hoisted(() => vi.fn());
vi.mock('@/art/scene', async () => {
 const { forwardRef } = await import('preact/compat');
 const { useImperativeHandle } = await import('preact/hooks');
 return { BAND_CLOSED_PX:64, BAND_MAX_POTS:6, BAND_OPEN_PX:168, WindowsillBand:forwardRef((_p, ref) => { useImperativeHandle(ref, () => ({pour:pours,react() {}})); return <div role="group" aria-label="Plants"><div data-habit="walk" /></div>; }) };
});
let host:HTMLElement;
const advance = (ms:number) => act(()=>{vi.advanceTimersByTime(ms);});
beforeEach(()=>{vi.useFakeTimers();pours.mockClear();document.documentElement.dataset.motion='full';host=document.createElement('div');document.body.append(host);});
afterEach(()=>{act(()=>render(null,host));host.remove();vi.useRealTimers();delete document.documentElement.dataset.motion;});
function rig() {
 const ref=createRef<BandHandle>();const now=new Date('2026-10-02T12:00:00Z').getTime();const state=createInitialState(now);state.habits=[habit({id:'walk',startedOn:'2026-10-02'})];const vm=todayVM(state,{now,today:'2026-10-02',local:runtimeLocalTime});
 const show=(damp:boolean)=>act(()=>render(<Band ref={ref} vm={{...vm,sill:[{...vm.sill[0]!,damp,pulse:damp?1:0}]}} state={state} coins={0} onWallet={()=>undefined}/>,host));
 show(true);
 const row=host.querySelector<HTMLElement>('[role="group"]')!;
 row.scrollTo=vi.fn();row.getBoundingClientRect=()=>new DOMRect(0,0,390,100);
 row.querySelector<HTMLElement>('[data-habit]')!.getBoundingClientRect=()=>new DOMRect(500,0,100,100);
 return {show,pour:()=>act(()=>ref.current!.pour('walk'))};
}
it('review: undo while scrolling cancels the waiting outer Band pour',()=>{const r=rig();r.pour();advance(100);r.show(false);advance(220);expect(pours).not.toHaveBeenCalled();});
it('review: a re-check waits for its own scroll delay instead of dispatching an earlier undone pour',()=>{const r=rig();r.pour();advance(100);r.show(false);advance(40);r.show(true);r.pour();advance(180);expect(pours).not.toHaveBeenCalled();advance(140);expect(pours).toHaveBeenCalledTimes(1);});
it('review: unmount clears the outer Band scroll-delay timer',()=>{const r=rig();r.pour();act(()=>render(null,host));expect(vi.getTimerCount()).toBe(0);});
