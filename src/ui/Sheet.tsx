import type { ComponentChildren } from 'preact';
import { createPortal } from 'preact/compat';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { sfx } from '@/fx/sound';
import { cx } from './cx';
import { IconButton } from './IconButton';
import { overlayRoot, Z_SHEET } from './overlay';
import { isTopLayer, layerDepth, layerIndex, onLayersChange, pushLayer, removeLayer, trapTab } from './sheetStack';
import { pickSnap, rubberBand, velocityOf } from './sheetMotion';
import s from './Sheet.module.css';

export type SheetDetent = 'content' | 'medium' | 'large';

export interface SheetProps {
  open: boolean;
  /** Called on Esc, scrim tap, close button or a dismissing drag. Set `open` to false in response. */
  onClose: () => void;
  /** Dialog title (labels the dialog; can be visually hidden). */
  title: string;
  hideTitle?: boolean;
  description?: ComponentChildren;
  /** Id of an element inside the sheet that describes it (when there is no `description`). */
  describedBy?: string;
  children?: ComponentChildren;
  /** Sticky action area at the bottom. */
  footer?: ComponentChildren;
  /** Phone snap heights, smallest first. 'content' hugs the content; 'medium' ≈ 56% of the screen. */
  detents?: SheetDetent[];
  /** Dialog width on wide screens. */
  size?: 'sm' | 'md' | 'lg';
  /** false = no Esc/scrim/drag dismissal (the sheet asks for an explicit choice). */
  dismissible?: boolean;
  showClose?: boolean;
  role?: 'dialog' | 'alertdialog';
  /** Art that peeks over the sheet's top edge (a pet, a plant). */
  peek?: ComponentChildren;
  /** Selector of the element to focus on open (default: [data-autofocus], else the sheet itself). */
  initialFocus?: string;
  /** After the close animation has finished and focus was restored. */
  onClosed?: () => void;
  class?: string;
}

type Phase = 'closed' | 'enter' | 'open' | 'exit';

const EXIT_MS = 320;
const WIDE = '(min-width: 900px)';
const isWide = () => typeof matchMedia === 'function' && matchMedia(WIDE).matches;

/**
 * Bottom sheet on phones (drag to dismiss, detents, rubber-band), centered dialog on wide screens.
 * Portals into #overlay-root, traps focus, restores it, closes on Esc, locks page scroll and stacks.
 */
export function Sheet(props: SheetProps) {
  const {
    open,
    onClose,
    title,
    hideTitle,
    description,
    describedBy,
    children,
    footer,
    detents,
    size = 'md',
    dismissible = true,
    showClose = true,
    role = 'dialog',
    peek,
    initialFocus,
    class: cls,
  } = props;
  const id = useId();
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;
  const [phase, setPhase] = useState<Phase>(open ? 'enter' : 'closed');
  const [detentIdx, setDetentIdx] = useState(0);
  const [depth, setDepth] = useState(0);
  const layerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  /** Holds the layer stack slot, focus return and scroll lock (released as soon as closing starts). */
  const active = useRef(false);
  const shown = useRef(false);
  const latest = useRef(props);
  latest.current = props;

  const list: SheetDetent[] = detents?.length ? detents : ['content'];
  const tall = list.some((d) => d !== 'content');

  /* ---------- open/close state machine ---------- */
  useLayoutEffect(() => {
    if (open && (phase === 'closed' || phase === 'exit')) {
      setDetentIdx(0);
      setPhase('enter');
    } else if (!open && (phase === 'enter' || phase === 'open')) {
      setPhase('exit');
    }
  }, [open]);

  const release = () => {
    if (!active.current) return;
    active.current = false;
    removeLayer(id);
    const target = restoreTo.current;
    restoreTo.current = null;
    if (target?.isConnected) target.focus({ preventScroll: true });
  };

  useLayoutEffect(() => {
    if (phase === 'enter') {
      shown.current = true;
      if (!active.current) {
        active.current = true;
        restoreTo.current = document.activeElement as HTMLElement | null;
        pushLayer(id);
        const panel = panelRef.current;
        const target = panel?.querySelector<HTMLElement>(initialFocus ?? '[data-autofocus]');
        (target ?? panel)?.focus({ preventScroll: true });
        sfx.play('whoosh', { volume: 0.35 });
      }
      let raf = requestAnimationFrame(() => (raf = requestAnimationFrame(() => setPhase('open'))));
      return () => cancelAnimationFrame(raf);
    }
    if (phase === 'exit') {
      // Hand the page back right away; the sheet just finishes sliding out on its own.
      release();
      const t = setTimeout(() => setPhase('closed'), EXIT_MS);
      return () => clearTimeout(t);
    }
    if (phase === 'closed' && shown.current) {
      shown.current = false;
      release();
      latest.current.onClosed?.();
    }
    return undefined;
  }, [phase]);

  useEffect(() => release, []);

  /* ---------- stacking ---------- */
  useEffect(() => {
    if (phase === 'closed') return;
    const sync = () => {
      setDepth(layerDepth(id));
      const layer = layerRef.current;
      if (layer) {
        layer.inert = layerDepth(id) > 0;
        layer.style.zIndex = String(Z_SHEET + Math.max(0, layerIndex(id)) * 2);
      }
    };
    sync();
    return onLayersChange(sync);
  }, [phase === 'closed']);

  /* ---------- Esc ---------- */
  useEffect(() => {
    if (phase === 'closed' || phase === 'exit') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !isTopLayer(id)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (latest.current.dismissible !== false) latest.current.onClose();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [phase]);

  /* ---------- resting position (phones): detent offset ---------- */
  const detentOffset = (d: SheetDetent): number => {
    const panel = panelRef.current;
    if (!panel || isWide() || d !== 'medium') return 0;
    return Math.max(0, panel.offsetHeight - Math.round(window.innerHeight * 0.56));
  };

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const offset = phase === 'open' ? detentOffset(list[detentIdx] ?? 'content') : 0;
    panel.style.transform = offset ? `translateY(${offset}px)` : '';
  }, [phase, detentIdx]);

  /* ---------- keyboard avoidance (iOS): lift the sheet above the on-screen keyboard ---------- */
  useEffect(() => {
    const vv = window.visualViewport;
    const layer = layerRef.current;
    if (phase === 'closed' || !vv || !layer) return;
    const update = () => layer.style.setProperty('--kb', `${Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))}px`);
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [phase === 'closed']);

  /* ---------- drag: touch (with native scroll hand-off) + mouse on the handle ---------- */
  useEffect(() => {
    const panel = panelRef.current;
    if (phase === 'closed' || !panel) return;

    type Drag = { startY: number; startX: number; base: number; y: number; samples: { y: number; t: number }[]; state: 'pending' | 'drag' | 'scroll'; handle: boolean };
    let drag: Drag | null = null;

    const offsets = () => list.map(detentOffset);
    const current = () => offsets()[detentIdx] ?? 0;

    const begin = (target: EventTarget | null, x: number, y: number): boolean => {
      if (isWide() || phase !== 'open') return false;
      const el = target as HTMLElement | null;
      if (el?.closest('[data-sheet-nodrag], input[type="range"], textarea, [contenteditable="true"]')) return false;
      drag = { startY: y, startX: x, base: current(), y: current(), samples: [{ y, t: performance.now() }], state: 'pending', handle: !!el?.closest('[data-sheet-handle]') };
      return true;
    };

    const decide = (d: Drag, dx: number, dy: number, target: EventTarget | null) => {
      if (Math.abs(dy) < 6 || Math.abs(dy) < Math.abs(dx)) return;
      const inBody = bodyRef.current?.contains(target as Node) ?? false;
      const body = bodyRef.current;
      const atTop = !body || body.scrollTop <= 0;
      const canExpand = d.base > Math.min(...offsets());
      d.state = d.handle || !inBody || (dy > 0 && atTop) || (dy < 0 && canExpand) ? 'drag' : 'scroll';
      if (d.state === 'drag') {
        panel.style.transition = 'none';
        if (scrimRef.current) scrimRef.current.style.transition = 'none';
      }
    };

    const move = (d: Drag, y: number) => {
      const pts = offsets();
      const top = Math.min(...pts);
      const bottom = Math.max(...pts);
      const h = panel.offsetHeight;
      let next = d.base + (y - d.startY);
      if (next < top) next = top - rubberBand(top - next, h);
      else if (next > bottom && latest.current.dismissible === false) next = bottom + rubberBand(next - bottom, h);
      d.y = next;
      d.samples.push({ y, t: performance.now() });
      if (d.samples.length > 8) d.samples.shift();
      panel.style.transform = `translateY(${next}px)`;
      if (scrimRef.current) scrimRef.current.style.opacity = String(Math.min(1, Math.max(0, 1 - (next - bottom) / Math.max(1, h - bottom))));
    };

    const end = (d: Drag) => {
      panel.style.transition = '';
      if (scrimRef.current) {
        scrimRef.current.style.transition = '';
        scrimRef.current.style.opacity = '';
      }
      const pts = offsets();
      const dismissAt = panel.offsetHeight;
      const candidates = latest.current.dismissible === false ? pts : [...pts, dismissAt];
      const i = pickSnap(candidates, d.y, velocityOf(d.samples));
      if (i >= pts.length) {
        panel.style.transform = `translateY(${dismissAt}px)`;
        latest.current.onClose();
        return;
      }
      if (i !== detentIdx) setDetentIdx(i);
      panel.style.transform = pts[i] ? `translateY(${pts[i]}px)` : '';
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (e.touches.length !== 1 || !t) return;
      begin(e.target, t.clientX, t.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!drag || !t) return;
      if (drag.state === 'pending') decide(drag, t.clientX - drag.startX, t.clientY - drag.startY, e.target);
      if (drag.state !== 'drag') return;
      e.preventDefault();
      move(drag, t.clientY);
    };
    const onTouchEnd = () => {
      if (drag?.state === 'drag') end(drag);
      drag = null;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      if (!(e.target as HTMLElement).closest('[data-sheet-handle]') || (e.target as HTMLElement).closest('button')) return;
      if (!begin(e.target, e.clientX, e.clientY)) return;
      const onMove = (ev: PointerEvent) => {
        if (!drag) return;
        if (drag.state === 'pending') decide(drag, ev.clientX - drag.startX, ev.clientY - drag.startY, e.target);
        if (drag.state === 'drag') move(drag, ev.clientY);
      };
      const onUp = () => {
        if (drag?.state === 'drag') end(drag);
        drag = null;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };

    panel.addEventListener('touchstart', onTouchStart, { passive: true });
    panel.addEventListener('touchmove', onTouchMove, { passive: false });
    panel.addEventListener('touchend', onTouchEnd);
    panel.addEventListener('touchcancel', onTouchEnd);
    panel.addEventListener('pointerdown', onPointerDown);
    return () => {
      panel.removeEventListener('touchstart', onTouchStart);
      panel.removeEventListener('touchmove', onTouchMove);
      panel.removeEventListener('touchend', onTouchEnd);
      panel.removeEventListener('touchcancel', onTouchEnd);
      panel.removeEventListener('pointerdown', onPointerDown);
    };
  }, [phase, detentIdx, list.join()]);

  if (phase === 'closed' || typeof document === 'undefined') return null;

  return createPortal(
    <div ref={layerRef} class={cx(s.layer, depth > 0 && s.behind)} data-state={phase}>
      <div ref={scrimRef} class={s.scrim} onClick={() => dismissible && onClose()} aria-hidden="true" />
      <div
        ref={panelRef}
        class={cx(s.sheet, s[size], tall && s.tall, !!peek && s.hasPeek, !!footer && s.hasFooter, cls)}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : describedBy}
        tabIndex={-1}
        onKeyDown={(e) => panelRef.current && isTopLayer(id) && trapTab(e, panelRef.current)}
      >
        {peek && (
          <div class={s.peek} aria-hidden="true">
            {peek}
          </div>
        )}
        <div class={s.grabber} data-sheet-handle aria-hidden="true">
          <span />
        </div>
        <header class={s.header} data-sheet-handle>
          <div class={cx(s.titles, hideTitle && 'sr-only')}>
            <h2 id={titleId} class={s.title}>
              {title}
            </h2>
            {description && (
              <p id={descId} class={s.desc}>
                {description}
              </p>
            )}
          </div>
          {showClose && dismissible && <IconButton class={s.close} icon="close" label="Close" variant="soft" size="sm" tone="lavender" onClick={onClose} />}
        </header>
        <div ref={bodyRef} class={s.body}>
          {children}
        </div>
        {footer && <footer class={s.footer}>{footer}</footer>}
      </div>
    </div>,
    overlayRoot(),
  );
}
