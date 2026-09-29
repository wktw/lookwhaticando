import { useEffect } from 'preact/hooks';
import { cx } from '@/ui/cx';
import { currentTab } from './router';
import { routeFor } from './routes';
import { preloadAllWhenIdle } from './screens';
import { ScreenHost } from './ScreenHost';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { SHELL_COPY } from './copy';
import s from './App.module.css';

/**
 * The responsive shell. Phones: the screen over a paper tab bar. ≥ 900 px: an oat sidebar and a
 * centred content column (720 px; the Shelf and Capsules get more room).
 */
export function App() {
  const tab = currentTab.value;
  const route = routeFor(tab);

  useEffect(() => {
    document.title = tab === 'today' ? SHELL_COPY.appName : `${route.label} · ${SHELL_COPY.appName}`;
  }, [tab]);

  useEffect(preloadAllWhenIdle, []);

  return (
    <div class={s.shell}>
      <a class={s.skip} href="#main" onClick={(e) => (e.preventDefault(), document.getElementById('main')?.focus())}>
        {SHELL_COPY.skip}
      </a>
      <Sidebar tab={tab} />
      <main id="main" class={cx(s.main, route.wide && s.wide)} tabIndex={-1} aria-label={route.label}>
        <ScreenHost tab={tab} />
      </main>
      <TabBar tab={tab} />
    </div>
  );
}
