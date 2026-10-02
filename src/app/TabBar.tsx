import { Icon } from '@/art/icons';
import { cx } from '@/ui/cx';
import { sfx } from '@/fx/sound';
import { haptic } from '@/fx/haptics';
import { navigate } from './router';
import { formatHash, visibleRoutes, type TabId } from './routes';
import { state } from '@/state/store';
import { preloadScreen } from './screens';
import { tabSpecies } from './shelfTab';
import s from './TabBar.module.css';

/**
 * Phone navigation: a paper bar along the bottom with a hairline top edge and safe-area padding.
 * Today · Progress · Capsules · Shelf · You, each with its tab drawing (filled when current).
 */
export function TabBar({ tab }: { tab: TabId }) {
  const onTap = (id: TabId) => (e: MouseEvent) => {
    e.preventDefault();
    if (id !== tab) {
      sfx.play('pop', { volume: 0.35 });
      haptic('tick');
    }
    navigate(id);
  };

  return (
    <nav class={s.bar} aria-label="Main">
      <ul class={s.list}>
        {visibleRoutes(state.value.settings.quietRewards).map((r) => {
          const active = r.id === tab;
          return (
            <li key={r.id} class={s.item}>
              <a
                href={formatHash(r.id)}
                class={cx(s.tab, active && s.active)}
                aria-current={active ? 'page' : undefined}
                onClick={onTap(r.id)}
                onPointerDown={() => preloadScreen(r.id)}
              >
                <span class={s.icon}>
                  <Icon name={r.icon} size={26} filled={active} species={tabSpecies(r.id)} />
                </span>
                <span class={s.label}>{r.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
