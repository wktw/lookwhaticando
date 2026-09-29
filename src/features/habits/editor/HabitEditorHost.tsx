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
import { ConfirmDialog } from '@/ui/ConfirmDialog';
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
  // A form with something in it asks before closing ("Keep editing" is the default, and Esc).
  const dirty = useRef(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (!req) setLeaving(false);
  }, [req]);
  const close = () => {
    if (dirty.current) setLeaving(true);
    else closeHabitEditor();
  };
  const vm = shown ? selectHabitEditor(shown.id ?? null, shown.templateId).value : null;
  const title = vm?.mode === 'edit' ? fillLine(EDITOR_COPY.editTitle, { habit: vm.input.name }) : EDITOR_COPY.newTitle;
  return (
    <Sheet
      open={req !== null && vm !== null}
      onClose={close}
      onClosed={() => {
        dirty.current = false;
        setShown(null);
      }}
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
      {vm && (
        <HabitEditor
          key={`${opened.current}-${shown?.id ?? ''}-${shown?.templateId ?? ''}`}
          vm={vm}
          formId={FORM_ID}
          onDirty={(d) => (dirty.current = d)}
          onDone={() => {
            dirty.current = false;
            closeHabitEditor();
          }}
        />
      )}
      <ConfirmDialog
        open={leaving}
        title={EDITOR_COPY.leaveTitle}
        message={vm?.mode === 'edit' ? EDITOR_COPY.leaveEdit : EDITOR_COPY.leaveNew}
        tone="danger"
        confirmLabel={EDITOR_COPY.leave}
        cancelLabel={EDITOR_COPY.keepEditing}
        onCancel={() => setLeaving(false)}
        onConfirm={() => {
          setLeaving(false);
          dirty.current = false;
          closeHabitEditor();
        }}
      />
    </Sheet>
  );
}
