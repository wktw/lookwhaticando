import type { JSX, Ref } from 'preact';
import { createPortal } from 'preact/compat';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { cx } from './cx';
import { toneClass } from './tone';
import { overlayRoot } from './overlay';
import { anyLayerOpen, momentOpen, onLayersChange } from './sheetStack';
import { dismissToast, runToastAction, toastActions, toastDuration, toastLaneTop, toasts, toastsHeld, visibleToasts, type ToastAction, type ToastItem } from './toast';
import s from './Toaster.module.css';

/**
 * Mount once near the app root. Notes sit at the bottom, above the tab bar, where the thumb
 * can reach Undo. While a sheet is open they move to the top, so they never cover its buttons,
 * and slide below a celebration banner there, and below the sheet's own header (its title and
 * close button) when the sheet reaches that high. While a full-screen moment is open (the capsule
 * reveal, the epic card) they wait, unseen and with their timers stopped, and arrive after it.
 */
export function Toaster() {
  const items = visibleToasts(toasts.value);
  const bannerBottom = toastLaneTop.value;
  const [lifted, setLifted] = useState(anyLayerOpen);
  const [waiting, setWaiting] = useState(() => momentOpen());
  const stackRef = useRef<HTMLElement>(null);

  useEffect(
    () =>
      onLayersChange(() => {
        setLifted(anyLayerOpen());
        setWaiting(momentOpen());
      }),
    [],
  );

  // At the top, keep clear of a banner and of the open sheet's header (transform only). The sheet
  // may still be sliding in, so it is measured again once it has settled.
  useLayoutEffect(() => {
    const el = stackRef.current;
    if (!el) return;
    const place = () => {
      const clearOf = lifted ? Math.max(bannerBottom ?? 0, topSheetHeaderBottom(el.offsetTop + el.offsetHeight)) : 0;
      el.style.setProperty('--lane-shift', clearOf ? `${Math.max(0, clearOf + 10 - el.offsetTop)}px` : '0px');
    };
    place();
    if (!lifted) return;
    const timer = setTimeout(place, 400);
    return () => clearTimeout(timer);
  }, [items.length, bannerBottom, lifted]);

  if (!items.length || waiting || typeof document === 'undefined') return null;
  return createPortal(
    <section ref={stackRef} class={s.stack} data-at={lifted ? 'top' : 'bottom'} aria-label="Notes">
      {items.map((t) => (
        <ToastCard key={t.id} item={t} />
      ))}
    </section>,
    overlayRoot(),
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

function ToastCard({ item }: { item: ToastItem }) {
  const [paused, setPaused] = useState(false);
  const held = toastsHeld.value > 0;
  const cardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; id: number } | null>(null);

  useEffect(() => {
    const ms = toastDuration(item);
    if (paused || held || item.leaving || !ms) return;
    const timer = setTimeout(() => dismissToast(item.id), ms);
    return () => clearTimeout(timer);
  }, [item.version, paused, held, item.leaving]);

  // A flick (up or down) puts the note away.
  const onPointerDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    drag.current = { y: e.clientY, id: e.pointerId };
    const el = cardRef.current;
    el?.setPointerCapture(e.pointerId);
    if (el) el.style.transition = 'none';
    setPaused(true);
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    const el = cardRef.current;
    if (!d || !el || e.pointerId !== d.id) return;
    el.style.transform = `translateY(${e.clientY - d.y}px)`;
  };
  const onPointerUp = (e: PointerEvent) => {
    const d = drag.current;
    const el = cardRef.current;
    drag.current = null;
    setPaused(false);
    if (!d || !el) return;
    const dy = e.clientY - d.y;
    el.style.transition = '';
    // A flick keeps its offset, so the exit continues from where the finger left it.
    if (Math.abs(dy) > 24) return dismissToast(item.id);
    el.style.transform = '';
    if (Math.abs(dy) < 4 && !toastActions(item).length) dismissToast(item.id);
  };

  return (
    <ToastNote
      item={item}
      noteRef={cardRef}
      onAction={(a) => runToastAction(item.id, a)}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setPaused(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && !drag.current && setPaused(false)}
      onFocusIn={() => setPaused(true)}
      onFocusOut={() => setPaused(false)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
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
    <div {...rest} ref={noteRef} class={cx(s.toast, item.leaving && s.leaving, toneClass(item.tone ?? 'blush'), cls as string)} data-toast-id={item.id}>
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
            <button key={a.label} type="button" class={s.action} onClick={() => (onAction ? onAction(a) : a.onAction())}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
