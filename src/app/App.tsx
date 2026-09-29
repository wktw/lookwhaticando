import { useEffect } from 'preact/hooks';
import { cx } from '@/ui/cx';
import { currentTab } from './router';
import { routeFor } from './routes';
import { preloadAllWhenIdle } from './screens';
import { ScreenHost } from './ScreenHost';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import s from './App.module.css';

/**
 * The responsive shell. Phones: content + floating bottom tab bar. ≥ 900px: left sidebar +
 * a centered content column (720px; Meadow and Capsules get more room).
 */
export function App() {
  const tab = currentTab.value;
  const route = routeFor(tab);

  useEffect(() => {
    document.title = tab === 'today' ? 'Mochi Meadow' : `${route.label} · Mochi Meadow`;
  }, [tab]);

  useEffect(preloadAllWhenIdle, []);

  return (
    <div class={s.shell}>
      <a class={s.skip} href="#main" onClick={(e) => (e.preventDefault(), document.getElementById('main')?.focus())}>
        Skip to content
      </a>
      <Sidebar tab={tab} />
      <main id="main" class={cx(s.main, route.wide && s.wide)} tabIndex={-1} aria-label={route.label}>
        <ScreenHost tab={tab} />
      </main>
      <TabBar tab={tab} />
    </div>
  );
}
