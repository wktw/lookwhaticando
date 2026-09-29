import type { ComponentChildren } from 'preact';
import { useId } from 'preact/hooks';
import { CandyButton } from './CandyButton';
import { Sheet } from './Sheet';
import s from './ConfirmDialog.module.css';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: ComponentChildren;
  /** Optional art above the title (a worried-but-cute pet, a plant). */
  art?: ComponentChildren;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = gentle coral confirm button; the cancel button gets initial focus. */
  tone?: 'primary' | 'danger';
  /** Shows loading dots on the confirm button. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** "Are you sure?" as a compact sheet (phones) or small dialog (wide). Uses alertdialog semantics. */
export function ConfirmDialog({ open, title, message, art, confirmLabel = 'Yes', cancelLabel = 'Never mind', tone = 'primary', busy, onConfirm, onCancel }: ConfirmDialogProps) {
  const messageId = useId();
  return (
    <Sheet
      open={open}
      onClose={onCancel}
      title={title}
      hideTitle
      describedBy={message ? messageId : undefined}
      size="sm"
      role="alertdialog"
      showClose={false}
      initialFocus={tone === 'danger' ? '[data-cancel]' : '[data-confirm]'}
    >
      <div class={s.content}>
        {art && <div class={s.art}>{art}</div>}
        <p class={s.title} aria-hidden="true">
          {title}
        </p>
        {message && (
          <p class={s.message} id={messageId}>
            {message}
          </p>
        )}
        <div class={s.actions}>
          <CandyButton variant={tone === 'danger' ? 'danger' : 'primary'} size="lg" block loading={busy} onClick={onConfirm} data-confirm>
            {confirmLabel}
          </CandyButton>
          <CandyButton variant="secondary" size="lg" block onClick={onCancel} data-cancel>
            {cancelLabel}
          </CandyButton>
        </div>
      </div>
    </Sheet>
  );
}
