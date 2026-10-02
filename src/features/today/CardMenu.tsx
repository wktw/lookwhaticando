/**
 * The card's ⋯ menu (DESIGN §9.1): Tiny version · Rest day · Add a note · Details · Edit. A small
 * paper menu anchored to the button: a real `menu` with arrow keys, Home/End, Esc (focus goes back
 * to ⋯), and it closes on a tap outside or a scroll.
 */
import { createPortal } from 'preact/compat';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { Icon, type IconName } from '@/art/icons';
import { overlayRoot } from '@/ui/overlay';
import { cx } from '@/ui/cx';
import s from './CardMenu.module.css';

export interface MenuItem {
  id: string;
  label: string;
  icon: IconName;
  /** A toggle (Rest day): shown with its check, read as a menuitemcheckbox. */
  checked?: boolean;
  /** A line under the label (the tiny version's words). */
  hint?: string;
  onSelect: () => void;
}

export interface CardMenuProps {
  anchor: HTMLElement;
  label: string;
  items: readonly MenuItem[];
  onClose: (restoreFocus: boolean) => void;
}

const WIDTH = 236;

export function CardMenu({ anchor, label, items, onClose }: CardMenuProps) {
  const menu = useRef<HTMLDivElement>(null);
  const placedAt = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);

  useLayoutEffect(() => {
    placedAt.current = { x: scrollX, y: scrollY };
    const r = anchor.getBoundingClientRect();
    const h = menu.current?.offsetHeight ?? 44 * items.length + 12;
    const up = r.bottom + h + 12 > innerHeight && r.top - h - 8 > 0;
    const left = Math.max(8, Math.min(innerWidth - WIDTH - 8, r.right - WIDTH));
    setPos({ top: up ? r.top - h - 6 : r.bottom + 6, left, up });
  }, [anchor, items.length]);

  useEffect(() => {
    menu.current?.querySelector<HTMLElement>('[role^="menuitem"]')?.focus({ preventScroll: true });
    const onDown = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose(false);
    };
    // Scrolling the anchor into view can queue an event that arrives after this menu opens.
    // Its position already accounts for that scroll; only later movement dismisses it.
    const onScroll = () => {
      if (scrollX !== placedAt.current.x || scrollY !== placedAt.current.y) onClose(false);
    };
    const onResize = () => onClose(false);
    document.addEventListener('pointerdown', onDown, true);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onResize);
    };
  }, [anchor]);

  const onKey = (e: KeyboardEvent) => {
    const all = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []);
    const i = all.indexOf(document.activeElement as HTMLElement);
    const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: all.length - 1 }[e.key];
    if (to !== undefined) {
      e.preventDefault();
      all[(to + all.length) % all.length]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose(true);
    } else if (e.key === 'Tab') {
      onClose(false);
    }
  };

  return createPortal(
    <div
      ref={menu}
      class={cx(s.menu, pos?.up && s.up)}
      role="menu"
      aria-label={label}
      style={{ top: `${pos?.top ?? -9999}px`, left: `${pos?.left ?? 0}px`, width: `${WIDTH}px` }}
      onKeyDown={onKey}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
          aria-checked={item.checked}
          tabIndex={-1}
          class={s.item}
          onClick={() => {
            onClose(true);
            item.onSelect();
          }}
        >
          <span class={s.icon} aria-hidden="true">
            <Icon name={item.icon} size={20} />
          </span>
          <span class={s.words}>
            <span class={s.label}>{item.label}</span>
            {item.hint && <span class={s.hint}>{item.hint}</span>}
          </span>
          {item.checked && (
            <span class={s.check} aria-hidden="true">
              <Icon name="check" size={18} />
            </span>
          )}
        </button>
      ))}
    </div>,
    overlayRoot(),
  );
}
