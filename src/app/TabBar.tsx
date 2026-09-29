import { Icon } from '@/art/icons';
import { cx } from '@/ui/cx';
import { sfx } from '@/fx/sound';
import { haptic } from '@/fx/haptics';
import { navigate } from './router';
import { formatHash, ROUTES, type TabId } from './routes';
import { preloadScreen } from './screens';
import { GumballArt } from './GumballArt';
import s from './TabBar.module.css';

/** Phone navigation: a floating bar with four tabs and a raised, candy-round Capsules button. */
export function TabBar({ tab }: { tab: TabId }) {
  const onTap = (id: TabId) => (e: MouseEvent) => {
    e.preventDefault();
    if (id !== tab) {
      sfx.play('pop', { volume: 0.5, pitch: id === 'capsules' ? 1.25 : 1 });
      haptic('tick');
    }
    navigate(id);
  };

  return (
    <nav class={s.bar} aria-label="Main">
      <ul class={s.list}>
        {ROUTES.map((r) => {
          const active = r.id === tab;
          const center = r.id === 'capsules';
          return (
            <li key={r.id} class={cx(s.item, center && s.centerItem)}>
              <a
                href={formatHash(r.id)}
                class={cx(s.tab, center && s.center, active && s.active)}
                aria-current={active ? 'page' : undefined}
                onClick={onTap(r.id)}
                onPointerDown={() => preloadScreen(r.id)}
              >
                {center ? (
                  <span class={s.bubble}>
                    <span class={s.lip} aria-hidden="true" />
                    <span class={s.face}>
                      <GumballArt size={36} class={s.gumball} />
                    </span>
                  </span>
                ) : (
                  <span class={s.pill}>
                    <Icon name={r.icon} size={24} />
                  </span>
                )}
                <span class={s.label}>{r.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
