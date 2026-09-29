import { describe, expect, it } from 'vitest';
import { MAX_ACTIONS, MAX_VISIBLE, toastActions, toastDuration, upsertToast, visibleToasts, type ToastItem } from '@/ui/toast';

describe('toast queue', () => {
  it('appends toasts without a key', () => {
    let list: ToastItem[] = [];
    list = upsertToast(list, { message: 'a' }, 't1').list;
    list = upsertToast(list, { message: 'b' }, 't2').list;
    expect(list.map((t) => t.id)).toEqual(['t1', 't2']);
  });

  it('coalesces toasts with the same key in place and bumps the version', () => {
    let list: ToastItem[] = [];
    list = upsertToast(list, { key: 'wallet', message: '+5 coins' }, 't1').list;
    list = upsertToast(list, { message: 'Saved' }, 't2').list;
    const res = upsertToast(list, { key: 'wallet', message: '+10 coins' }, 't3');
    expect(res.id).toBe('t1');
    expect(res.list).toHaveLength(2);
    expect(res.list[0]).toMatchObject({ id: 't1', message: '+10 coins', version: 1 });
  });

  it('does not coalesce into a toast that is already leaving', () => {
    const list: ToastItem[] = [{ id: 't1', key: 'wallet', message: '+5', version: 0, leaving: true }];
    const res = upsertToast(list, { key: 'wallet', message: '+10' }, 't2');
    expect(res.id).toBe('t2');
    expect(res.list).toHaveLength(2);
  });

  it('shows at most MAX_VISIBLE, first come first served', () => {
    const list = Array.from({ length: 6 }, (_, i): ToastItem => ({ id: `t${i}`, message: String(i), version: 0 }));
    expect(visibleToasts(list).map((t) => t.id)).toEqual(list.slice(0, MAX_VISIBLE).map((t) => t.id));
  });

  it('gives toasts with actions more time, and honors explicit durations', () => {
    expect(toastDuration({ message: 'x' })).toBeLessThan(toastDuration({ message: 'x', action: { label: 'Undo', onAction: () => undefined } }));
    expect(toastDuration({ message: 'x', duration: 0 })).toBe(0);
  });

  it('holds up to two buttons ("Undo" and "Add a note"); the single `action` still works', () => {
    const noop = () => undefined;
    const undo = { label: 'Undo', onAction: noop };
    const note = { label: 'Add a note', onAction: noop };
    expect(MAX_ACTIONS).toBe(2);
    expect(toastActions({ action: undo }).map((a) => a.label)).toEqual(['Undo']);
    expect(toastActions({ actions: [undo, note] }).map((a) => a.label)).toEqual(['Undo', 'Add a note']);
    expect(toastActions({ action: undo, actions: [note, { label: 'Third', onAction: noop }] }).map((a) => a.label)).toEqual(['Undo', 'Add a note']);
    expect(toastDuration({ message: 'x', actions: [undo, note] })).toBe(4000);
  });
});
