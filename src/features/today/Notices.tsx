import { forwardRef } from 'preact/compat';
import type { Ref } from 'preact';
import { useImperativeHandle } from 'preact/hooks';
import type { TodayVM } from '@/state/selectors';

export interface NoticesHandle {
  /** The note or story on the sill was tapped: open it. */
  openSill(): void;
}

export const Notices = forwardRef(function Notices(_props: { vm: TodayVM }, ref: Ref<NoticesHandle>) {
  useImperativeHandle(ref, () => ({ openSill() {} }), []);
  return null;
});
