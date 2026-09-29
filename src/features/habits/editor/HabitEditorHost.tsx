/**
 * The Habit Editor sheet, mounted once by src/app/SheetHosts.tsx and opened from any screen with
 * `openHabitEditor({ id?, templateId? })` (src/features/habits/open.ts). A large sheet on phones (the
 * keyboard lifts it), a dialog on wide screens; the primary button stays in reach in its footer.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { SETTINGS, fillLine } from '@/catalog/lines';
import { selectHabitEditor } from '@/state/selectors';
import { Sheet } from '@/ui/Sheet';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { dismissToast, toasts } from '@/ui/toast';
import { closeHabitEditor, habitEditorRequest, type HabitEditorRequest } from '../open';
import { HabitEditor } from './HabitEditor';
import { EDITOR_COPY } from './copy';

const FORM_ID = 'habit-editor-form';
let sessions = 0;

export default function HabitEditorHost() {
  const req = habitEditorRequest.value;
  // Keep the last request while the sheet slides away, so its contents don't vanish mid-close.
  const [shown, setShown] = useState<HabitEditorRequest | null>(req);
  useEffect(() => {
    if (!req) return;
    setShown(req);
    // A check-in note still up would sit over the sheet's title and close button: it goes.
    for (const n of toasts.value) if (n.key && /^(checkin|uncheck)-/.test(n.key)) dismissToast(n.id);
  }, [req]);
  // A fresh form per request (each open is a new request object); a re-render never remounts it.
  const session = useMemo(() => ++sessions, [shown]);
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
  // The question is a sibling of the sheet, not inside it: a portal nested in the sheet's own portal
  // would remount the form under it.
  return (
    <>
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
            key={session}
            vm={vm}
            formId={FORM_ID}
            onDirty={(d) => (dirty.current = d)}
            onDone={() => {
              dirty.current = false;
              closeHabitEditor();
            }}
          />
        )}
      </Sheet>
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
    </>
  );
}
