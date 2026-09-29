import type { ComponentChildren } from 'preact';
import { createPortal } from 'preact/compat';
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { Icon } from '@/art/icons';
import { sfx } from '@/fx/sound';
import { useFocusTrap } from './useFocusTrap';
import { cx } from './CandyButton';
import s from './ui.module.css';

export interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Extra header content (e.g. a count). */
  aside?: ComponentChildren;
  children: ComponentChildren;
  class?: string;
}

const EXIT_MS = 280;

/**
 * Accessible bottom sheet (a centered dialog on wide screens): modal, focus-trapped, closes
 * on Esc, the scrim or the close button, and hands focus back to the opener.
 */
export function Sheet({ open, title, onClose, aside, children, class: cls }: SheetProps) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      sfx.play('whoosh', { volume: 0.4 });
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const t = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = prev;
    };
  }, [mounted]);

  useFocusTrap(panel, mounted && !closing, onClose);

  if (!mounted) return null;
  return createPortal(
    <div class={cx(s.scrim, closing && s.closing)} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} class={cx(s.sheet, cls)} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div class={s.grabber} aria-hidden="true" />
        <header class={s.sheetHead}>
          <h2 id={titleId} class={s.sheetTitle}>
            {title}
          </h2>
          {aside}
          <button type="button" class={s.iconButton} onClick={onClose} aria-label="Close">
            <Icon name="close" size={22} />
          </button>
        </header>
        <div class={s.sheetBody}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
