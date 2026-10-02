import type { ComponentChildren } from 'preact';
import { createPortal } from 'preact/compat';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { sfx } from '@/fx/sound';
import { Button } from '@/ui/Button';
import { overlayRoot, Z_SHEET } from '@/ui/overlay';
import { isTopLayer, layerDepth, layerIndex, onLayersChange, pushLayer, removeLayer, restoreLayerFocus, trapTab } from '@/ui/sheetStack';
import s from './LoadSheet.module.css';

export interface LoadSheetProps {
  open: boolean;
  /** Shown as the dialog's h2, and its name. */
  title: string;
  /** A line under the title, and the dialog's description. */
  message?: ComponentChildren;
  retryLabel: string;
  closeLabel: string;
  /** Try again shows its quiet dots and ignores presses. */
  busy?: boolean;
  onRetry: () => void;
  /** Close, Esc and a tap on the dimmed page. Set `open` to false in response. */
  onClose: () => void;
}

type Phase = 'closed' | 'enter' | 'open' | 'exit';

/** As long as the paper Sheet takes to slide away (src/ui/Sheet.tsx). */
const EXIT_MS = 320;

/**
 * The shell's small alertdialog for a shared sheet that hasn't opened yet (WP-C4): a slow first load
 * or a chunk that can't load, with "Try again" and "Close". It is in the entry chunk because it shows
 * exactly when a chunk can't load, so it is the shell's own rather than the kit's ConfirmDialog, which
 * would bring the paper Sheet's drag, detents and rubber band into the first paint for a sheet that
 * never needs them.
 *
 * It keeps the Sheet's contract where it matters: a paper sheet at the foot of a phone and a small
 * centred dialog on a wide screen; a layer on the shared stack (src/ui/sheetStack: the page behind it
 * inert and still, a sheet under it inert, it on top); focus on Try again as it opens and back to what
 * had it as it starts to close; Tab kept inside; Esc (when it is on top) and a tap on the dimmed page
 * are Close. Its layer carries `data-state` (enter, open, exit) as the Sheet's does.
 */
export function LoadSheet({ open, title, message, retryLabel, closeLabel, busy, onRetry, onClose }: LoadSheetProps) {
  const id = useId();
  const [phase, setPhase] = useState<Phase>(open ? 'enter' : 'closed');
  const layerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  /** Holds the stack slot and the focus to give back (released as soon as closing starts). */
  const active = useRef(false);
  const close = useRef(onClose);
  close.current = onClose;

  useLayoutEffect(() => {
    if (open && (phase === 'closed' || phase === 'exit')) setPhase('enter');
    else if (!open && (phase === 'enter' || phase === 'open')) setPhase('exit');
  }, [open]);

  const release = () => {
    if (!active.current) return;
    active.current = false;
    const ownedFocus = isTopLayer(id);
    removeLayer(id);
    const target = restoreTo.current;
    restoreTo.current = null;
    if (ownedFocus) restoreLayerFocus(target);
  };

  useLayoutEffect(() => {
    if (phase === 'enter') {
      if (!active.current) {
        active.current = true;
        restoreTo.current = document.activeElement as HTMLElement | null;
        pushLayer(id, { notesSlot: notesRef.current });
        // A quick reopen can reuse the exiting layer. Browsers ignore focus while it is inert.
        if (layerRef.current) layerRef.current.inert = false;
        (retryRef.current ?? panelRef.current)?.focus({ preventScroll: true });
        sfx.play('whoosh', { volume: 0.35 });
      }
      let raf = requestAnimationFrame(() => (raf = requestAnimationFrame(() => setPhase('open'))));
      return () => cancelAnimationFrame(raf);
    }
    if (phase === 'exit') {
      release();
      const t = setTimeout(() => setPhase('closed'), EXIT_MS);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [phase]);

  // Unmounting (the sheet asked for has arrived in its place) hands the page back at once.
  useEffect(() => release, []);

  /* Stacking: on top of whatever was open, and inert under anything opened over it. */
  useLayoutEffect(() => {
    if (phase === 'closed') return;
    const sync = () => {
      const layer = layerRef.current;
      if (!layer) return;
      layer.inert = phase === 'exit' || layerDepth(id) > 0;
      layer.toggleAttribute('data-over', layerIndex(id) > 0);
      layer.style.zIndex = String(Z_SHEET + Math.max(0, layerIndex(id)) * 2);
    };
    sync();
    return onLayersChange(sync);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'enter' && phase !== 'open') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !isTopLayer(id)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      close.current();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [phase]);

  if (phase === 'closed' || typeof document === 'undefined') return null;

  return createPortal(
    <div ref={layerRef} class={s.layer} data-state={phase} aria-hidden={phase === 'exit' ? 'true' : undefined}>
      <div class={s.scrim} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        class={s.panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={message ? `${id}-text` : undefined}
        tabIndex={-1}
        onKeyDown={(e) => panelRef.current && isTopLayer(id) && trapTab(e, panelRef.current)}
      >
        <h2 id={`${id}-title`} class={s.title}>
          {title}
        </h2>
        <div ref={notesRef} class={s.notes} data-notes-slot />
        {message && (
          <p id={`${id}-text`} class={s.text}>
            {message}
          </p>
        )}
        <div class={s.actions}>
          <Button variant="primary" size="lg" block loading={busy} onClick={onRetry} buttonRef={retryRef}>
            {retryLabel}
          </Button>
          <Button variant="secondary" size="lg" block onClick={onClose}>
            {closeLabel}
          </Button>
        </div>
      </div>
    </div>,
    overlayRoot(),
  );
}
