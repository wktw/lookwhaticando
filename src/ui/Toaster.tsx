import type { JSX, Ref } from 'preact';
import { createPortal } from 'preact/compat';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { cx } from './cx';
import { toneClass } from './tone';
import { onInterrupt } from './gesture';
import { overlayRoot } from './overlay';
import { anyLayerOpen, momentOpen, onLayersChange, topNotesSlot } from './sheetStack';
import { announceToast, dismissToast, runToastAction, runToastClock, toastActions, toastLaneTop, toasts, toastsHeld, visibleToasts, type ToastAction, type ToastItem } from './toast';
import s from './Toaster.module.css';

/**
 * Mount once near the app root. Notes sit at the bottom, above the tab bar, where the thumb
 * can reach Undo. While a sheet is open its notes slot owns them, below the header and inside
 * its Tab cycle. Layers without a slot retain the old top lane, clear of any banner or header.
 * While a full-screen moment is open (the capsule
 * reveal, the epic card) they wait, unseen and with their timers stopped, and arrive after it.
 */
export function Toaster() {
  const items = visibleToasts(toasts.value);
  const bannerBottom = toastLaneTop.value;
  const [lifted, setLifted] = useState(anyLayerOpen);
  const [waiting, setWaiting] = useState(() => momentOpen());
  const [slot, setSlot] = useState(topNotesSlot);
  const [hidden, setHidden] = useState(() => document.hidden);
  const stackRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const sync = () => {
      setLifted(anyLayerOpen());
      setWaiting(momentOpen());
      setSlot(topNotesSlot());
    };
    sync();
    return onLayersChange(sync);
  }, []);

  useEffect(() => {
    const sync = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  // At the top, keep clear of a banner and of the open sheet's header (transform only). The sheet
  // may still be sliding in, so it is measured again once it has settled.
  useLayoutEffect(() => {
    const el = stackRef.current;
    if (!el) return;
    const place = () => {
      const clearOf = lifted && !slot ? Math.max(bannerBottom ?? 0, topSheetHeaderBottom(el.offsetTop + el.offsetHeight)) : 0;
      el.style.setProperty('--lane-shift', clearOf ? `${Math.max(0, clearOf + 10 - el.offsetTop)}px` : '0px');
    };
    place();
    if (!lifted) return;
    const timer = setTimeout(place, 400);
    return () => clearTimeout(timer);
  }, [items.length, bannerBottom, lifted, slot]);

  if (!items.length || waiting || typeof document === 'undefined') return null;
  return createPortal(
    <section ref={stackRef} class={s.stack} data-at={lifted ? 'top' : 'bottom'} data-owned={slot ? '' : undefined} aria-label="Notes">
      {items.map((t) => (
        <ToastCard key={t.id} item={t} hidden={hidden} />
      ))}
    </section>,
    slot ?? overlayRoot(),
  );
}

/**
 * The bottom of the top sheet's header (title and close), when the sheet's top edge is above
 * `laneBottom` (the notes would cover it); 0 otherwise.
 */
function topSheetHeaderBottom(laneBottom: number): number {
  const headers = document.querySelectorAll<HTMLElement>('[data-state="open"] [data-sheet-header]');
  const header = headers[headers.length - 1];
  if (!header) return 0;
  const r = header.getBoundingClientRect();
  return r.top < laneBottom ? r.bottom : 0;
}

/** Keep the durable origin when Tab moves directly between two transient notes. */
const focusOrigins = new WeakMap<HTMLElement, HTMLElement | null>();

function ToastCard({ item, hidden }: { item: ToastItem; hidden: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const held = toastsHeld.value > 0;
  const cardRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const drag = useRef<{ y: number; id: number } | null>(null);

  useLayoutEffect(() => {
    if (hovered || focused || dragging || hidden || held || item.leaving) return;
    return runToastClock(item);
  }, [item, hovered, focused, dragging, hidden, held]);

  useLayoutEffect(() => {
    if (!hidden && !held && !item.leaving) announceToast(item);
  }, [item, hidden, held]);

  // A flick (up or down) puts the note away; a cancelled one (pointercancel, a capture lost
  // without a pointerup, the window losing focus) puts it back where it was and leaves it up.
  const unwatch = useRef<(() => void) | null>(null);
  const endDrag = () => {
    const d = drag.current;
    drag.current = null;
    unwatch.current?.();
    unwatch.current = null;
    return d;
  };
  useEffect(() => () => void endDrag(), []);

  const onPointerDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    endDrag();
    drag.current = { y: e.clientY, id: e.pointerId };
    unwatch.current = onInterrupt(abort);
    const el = cardRef.current;
    el?.setPointerCapture(e.pointerId);
    if (el) el.style.transition = 'none';
    setDragging(true);
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    const el = cardRef.current;
    if (!d || !el || e.pointerId !== d.id) return;
    el.style.transform = `translateY(${e.clientY - d.y}px)`;
  };
  const onPointerUp = (e: PointerEvent) => {
    const d = endDrag();
    const el = cardRef.current;
    setDragging(false);
    if (!d || !el) return;
    const dy = e.clientY - d.y;
    el.style.transition = '';
    // A flick keeps its offset, so the exit continues from where the finger left it.
    if (Math.abs(dy) > 24) return dismissToast(item.id);
    el.style.transform = '';
    if (Math.abs(dy) < 4 && !toastActions(item).length) dismissToast(item.id);
  };
  const abort = (e?: PointerEvent) => {
    if (!drag.current || (e && e.pointerId !== drag.current.id)) return;
    endDrag();
    setDragging(false);
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = '';
    el.style.transform = '';
  };

  return (
    <ToastNote
      item={item}
      noteRef={cardRef}
      onAction={(a) => {
        const active = document.activeElement;
        // An action can open another sheet. Its focus return must point at a durable control.
        const panel = cardRef.current?.closest<HTMLElement>('[role="dialog"], [role="alertdialog"]');
        if (active && cardRef.current?.contains(active)) {
          const previous = returnTo.current;
          const target = previous?.isConnected && (!panel || panel.contains(previous)) ? previous : panel;
          target?.focus({ preventScroll: true });
        }
        runToastAction(item.id, a);
      }}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHovered(false)}
      onFocusIn={(e) => {
        if (e.relatedTarget instanceof HTMLElement && !cardRef.current?.contains(e.relatedTarget)) {
          const fromNote = e.relatedTarget.closest<HTMLElement>('[data-toast-id]');
          returnTo.current = fromNote ? focusOrigins.get(fromNote) ?? null : e.relatedTarget;
          if (cardRef.current) focusOrigins.set(cardRef.current, returnTo.current);
        }
        setFocused(true);
      }}
      onFocusOut={(e) => { if (!cardRef.current?.contains(e.relatedTarget as Node | null)) setFocused(false); }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={abort}
      onLostPointerCapture={abort}
    />
  );
}

export interface ToastNoteProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'ref'> {
  item: Pick<ToastItem, 'message' | 'note' | 'art' | 'tone' | 'action' | 'actions' | 'version' | 'leaving'> & { id?: string };
  noteRef?: Ref<HTMLDivElement>;
  /** A button was pressed (the Toaster runs it and puts the note away). */
  onAction?: (action: ToastAction) => void;
}

/** One paper note, as drawn (the Toaster adds timing and gestures; the gallery shows it still). */
export function ToastNote({ item, noteRef, onAction, class: cls, ...rest }: ToastNoteProps) {
  const actions = toastActions(item);
  return (
    <div {...rest} ref={noteRef} class={cx(s.toast, item.leaving && s.leaving, toneClass(item.tone ?? 'blush'), cls as string)} data-toast-id={item.id} data-toast-leaving={item.leaving ? '' : undefined}>
      {item.art && (
        <span class={s.art} data-toast-art>
          {item.art}
        </span>
      )}
      <div key={item.version} class={cx(s.text, (item.version ?? 0) > 0 && s.updated)}>
        <p class={s.message}>{item.message}</p>
        {item.note && <p class={s.note}>{item.note}</p>}
      </div>
      {actions.length > 0 && (
        <div class={s.actions}>
          {actions.map((a) => (
            <button key={a.label} type="button" class={s.action} disabled={item.leaving} onClick={() => (onAction ? onAction(a) : a.onAction())}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
