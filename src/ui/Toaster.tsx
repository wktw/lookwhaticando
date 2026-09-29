import { createPortal } from 'preact/compat';
import { useEffect, useRef, useState } from 'preact/hooks';
import { cx } from './cx';
import { toneClass } from './tone';
import { overlayRoot } from './overlay';
import { dismissToast, toastDuration, toasts, visibleToasts, type ToastItem } from './toast';
import s from './Toaster.module.css';

/** Mount once near the app root. Renders the toast queue at the top of the screen. */
export function Toaster() {
  const items = visibleToasts(toasts.value);
  if (!items.length || typeof document === 'undefined') return null;
  return createPortal(
    <section class={s.stack} aria-label="Notifications">
      {items.map((t) => (
        <ToastCard key={t.id} item={t} />
      ))}
    </section>,
    overlayRoot(),
  );
}

function ToastCard({ item }: { item: ToastItem }) {
  const [paused, setPaused] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; id: number } | null>(null);

  useEffect(() => {
    const ms = toastDuration(item);
    if (paused || item.leaving || !ms) return;
    const timer = setTimeout(() => dismissToast(item.id), ms);
    return () => clearTimeout(timer);
  }, [item.version, paused, item.leaving]);

  // Flick up to dismiss.
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
    const dy = e.clientY - d.y;
    el.style.transform = `translateY(${dy < 0 ? dy : dy * 0.2}px)`;
  };
  const onPointerUp = (e: PointerEvent) => {
    const d = drag.current;
    const el = cardRef.current;
    drag.current = null;
    setPaused(false);
    if (!d || !el) return;
    const dy = e.clientY - d.y;
    el.style.transition = '';
    // A flick keeps its offset so the exit animation continues from where the finger left it.
    if (dy < -24) return dismissToast(item.id);
    el.style.transform = '';
    if (Math.abs(dy) < 4 && !item.action) dismissToast(item.id);
  };

  return (
    <div
      ref={cardRef}
      class={cx(s.toast, item.leaving && s.leaving, toneClass(item.tone ?? 'blush'))}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setPaused(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && !drag.current && setPaused(false)}
      onFocusIn={() => setPaused(true)}
      onFocusOut={() => setPaused(false)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {item.art && <span class={s.art}>{item.art}</span>}
      <p key={item.version} class={cx(s.message, item.version > 0 && s.updated)}>
        {item.message}
      </p>
      {item.action && (
        <button
          type="button"
          class={s.action}
          onClick={() => {
            item.action!.onAction();
            dismissToast(item.id);
          }}
        >
          {item.action.label}
        </button>
      )}
    </div>
  );
}
