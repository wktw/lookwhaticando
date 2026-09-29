import type { ComponentChildren } from 'preact';
import { useId } from 'preact/hooks';
import { Button } from './Button';
import { Sheet } from './Sheet';
import s from './ConfirmDialog.module.css';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: ComponentChildren;
  /** Optional small drawing above the title (a plant, an object). */
  art?: ComponentChildren;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = a terracotta confirm button, and the cancel button gets initial focus. */
  tone?: 'primary' | 'danger';
  /** Shows loading dots on the confirm button. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** "Are you sure?" as a compact paper sheet (phones) or small dialog (wide). Uses alertdialog semantics. */
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
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} size="lg" block loading={busy} onClick={onConfirm} data-confirm>
            {confirmLabel}
          </Button>
          <Button variant="secondary" size="lg" block onClick={onCancel} data-cancel>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
