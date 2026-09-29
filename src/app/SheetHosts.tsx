import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { habitDetailRequest, habitEditorRequest, petCardRequest } from '@/features/habits/open';
import { ritualRequest } from '@/features/rituals/open';

/** Loads a sheet host the first time it is asked for, then keeps it mounted. */
function useLazyHost(requested: boolean, load: () => Promise<{ default: ComponentType }>): ComponentType | null {
  const [Host, setHost] = useState<ComponentType | null>(null);
  useEffect(() => {
    if (requested && !Host) void load().then((m) => setHost(() => m.default));
  }, [requested, Host]);
  return Host;
}

/** The shared sheets any screen can open (src/features/habits/open.ts). */
export function SheetHosts() {
  const Editor = useLazyHost(habitEditorRequest.value !== null, () => import('@/features/habits/editor/HabitEditorHost'));
  const Detail = useLazyHost(habitDetailRequest.value !== null, () => import('@/features/habits/detail/HabitDetailHost'));
  const Pet = useLazyHost(petCardRequest.value !== null, () => import('@/features/pets/PetCardHost'));
  const Ritual = useLazyHost(ritualRequest.value !== null, () => import('@/features/rituals/RitualReaderHost'));
  return (
    <>
      {Editor && <Editor />}
      {Detail && <Detail />}
      {Pet && <Pet />}
      {Ritual && <Ritual />}
    </>
  );
}
