/**
 * The Habit Editor sheet, mounted once by src/app/SheetHosts.tsx and opened from any screen with
 * `openHabitEditor({ id?, templateId? })` (src/features/habits/open.ts). A large sheet on phones (the
 * keyboard lifts it), a dialog on wide screens; the primary button stays in reach in its footer.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { SETTINGS, fillLine } from '@/catalog/lines';
import { selectHabitEditor } from '@/state/selectors';
import { Sheet } from '@/ui/Sheet';
import { Button } from '@/ui/Button';
import { closeHabitEditor, habitEditorRequest, type HabitEditorRequest } from '../open';
import { HabitEditor } from './HabitEditor';
import { EDITOR_COPY } from './copy';

const FORM_ID = 'habit-editor-form';

export default function HabitEditorHost() {
  const req = habitEditorRequest.value;
  // Keep the last request while the sheet slides away, so its contents don't vanish mid-close.
  const [shown, setShown] = useState<HabitEditorRequest | null>(req);
  const opened = useRef(0);
  useEffect(() => {
    if (req) {
      opened.current++;
      setShown(req);
    }
  }, [req]);
  const vm = shown ? selectHabitEditor(shown.id ?? null, shown.templateId).value : null;
  const title = vm?.mode === 'edit' ? fillLine(EDITOR_COPY.editTitle, { habit: vm.input.name }) : EDITOR_COPY.newTitle;
  return (
    <Sheet
      open={req !== null && vm !== null}
      onClose={closeHabitEditor}
      onClosed={() => setShown(null)}
      title={title}
      detents={['large']}
      size="lg"
      initialFocus="[data-autofocus]"
      footer={
        <Button block size="lg" type="submit" form={FORM_ID}>
          {vm?.mode === 'edit' ? SETTINGS.editor.save : SETTINGS.editor.create}
        </Button>
      }
    >
      {vm && <HabitEditor key={`${opened.current}-${shown?.id ?? ''}-${shown?.templateId ?? ''}`} vm={vm} formId={FORM_ID} onDone={() => closeHabitEditor()} />}
    </Sheet>
  );
}
