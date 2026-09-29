import { useEffect, useRef, useState } from 'preact/hooks';
import { selectHabitDetail } from '@/state/selectors';
import { Sheet } from '@/ui/Sheet';
import { closeHabitDetail, habitDetailRequest } from '../open';
import { HabitDetail } from './HabitDetail';
import s from './HabitDetail.module.css';

/**
 * The Habit Detail sheet (DESIGN §9.2), opened from any screen with `openHabitDetail(id)`; mounted
 * once by the app shell (src/app/SheetHosts.tsx) and loaded lazily the first time it is asked for.
 * It keeps the last habit on the page while the sheet slides away, and closes itself if the habit
 * is deleted.
 */
export default function HabitDetailHost() {
  const requested = habitDetailRequest.value;
  const [shown, setShown] = useState<string | null>(requested);
  useEffect(() => {
    if (requested) setShown(requested);
  }, [requested]);
  const id = requested ?? shown;
  const vm = id ? selectHabitDetail(id).value : null;
  const open = requested !== null && vm !== null;
  // The last page stays on the sheet while it slides away (a deleted habit's too).
  const last = useRef(vm);
  if (vm) last.current = vm;
  const page = vm ?? last.current;

  // A habit deleted from under the sheet: close it.
  useEffect(() => {
    if (requested && !vm) closeHabitDetail();
  }, [requested, vm]);

  return (
    <Sheet open={open} onClose={closeHabitDetail} title={page?.habit.name ?? ''} hideTitle size="lg" detents={['large']} class={s.sheet}>
      {page && <HabitDetail key={page.habit.id} vm={page} onGone={closeHabitDetail} />}
    </Sheet>
  );
}
