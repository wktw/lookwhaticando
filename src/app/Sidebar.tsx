import { Icon, Wordmark } from '@/art/icons';
import { themeLight } from '@/ui/art/objects';
import { cx } from '@/ui/cx';
import { navigate } from './router';
import { digitForTab, formatHash, visibleRoutes, type TabId } from './routes';
import { preloadScreen } from './screens';
import { tabSpecies } from './shelfTab';
import { state } from '@/state/store';
import { WalletSummary } from './WalletSummary';
import { SHELL_COPY } from './copy';
import s from './Sidebar.module.css';

/**
 * Wide-screen navigation (≥ 900 px, Mac/PC): the wordmark, the five destinations (with 1–5 key
 * hints on hover) and the wallet (not with Quiet rewards), on an oat paper column with a hairline edge.
 */
export function Sidebar({ tab }: { tab: TabId }) {
  return (
    <aside class={s.sidebar}>
      <a class={s.brand} href={formatHash('today')} aria-label={SHELL_COPY.brandLabel} onClick={(e) => (e.preventDefault(), navigate('today'))}>
        <span class={s.wordmark} aria-hidden="true">
          <Wordmark size={30} light={themeLight()} />
        </span>
        <span class={s.tagline} aria-hidden="true">
          {SHELL_COPY.tagline}
        </span>
      </a>

      <nav aria-label="Main">
        <ul class={s.list}>
          {visibleRoutes(state.value.settings.quietRewards).map((r) => {
            const active = r.id === tab;
            return (
              <li key={r.id}>
                <a
                  href={formatHash(r.id)}
                  class={cx(s.link, active && s.active)}
                  aria-current={active ? 'page' : undefined}
                  aria-keyshortcuts={digitForTab(r.id)}
                  onClick={(e) => (e.preventDefault(), navigate(r.id))}
                  onPointerEnter={() => preloadScreen(r.id)}
                >
                  <span class={s.icon}>
                    <Icon name={r.icon} size={24} filled={active} species={tabSpecies(r.id)} />
                  </span>
                  <span class={s.label}>{r.label}</span>
                  <kbd class={s.kbd} aria-hidden="true">
                    {digitForTab(r.id)}
                  </kbd>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div class={s.spacer} />
      {/* Quiet rewards: just the tracker, so no wallet. */}
      {!state.value.settings.quietRewards && <WalletSummary />}
    </aside>
  );
}
