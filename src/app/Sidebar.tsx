import { Icon } from '@/art/icons';
import { PetArt } from '@/art/pets/PetArt';
import { cx } from '@/ui/cx';
import { toneClass, type Tone } from '@/ui/tone';
import { navigate } from './router';
import { formatHash, ROUTES, type TabId } from './routes';
import { preloadScreen } from './screens';
import { GumballArt } from './GumballArt';
import { WalletSummary } from './WalletSummary';
import s from './Sidebar.module.css';

const TAB_TONE: Record<TabId, Tone> = { today: 'butter', progress: 'sky', capsules: 'blush', meadow: 'sage', you: 'lavender' };

/** Wide-screen navigation: brand lockup, the five destinations (with 1–5 key hints), wallet. */
export function Sidebar({ tab }: { tab: TabId }) {
  return (
    <aside class={s.sidebar}>
      <a class={s.brand} href={formatHash('today')} aria-label="Mochi Meadow, go to Today" onClick={(e) => (e.preventDefault(), navigate('today'))}>
        <span class={s.brandArt}>
          <PetArt petId="pet-mochi" size={62} animated />
        </span>
        <span class={s.wordmark} aria-hidden="true">
          <span>Mochi</span>
          <span>Meadow</span>
        </span>
      </a>

      <nav aria-label="Main">
        <ul class={s.list}>
          {ROUTES.map((r, i) => {
            const active = r.id === tab;
            return (
              <li key={r.id}>
                <a
                  href={formatHash(r.id)}
                  class={cx(s.link, active && s.active, toneClass(TAB_TONE[r.id]))}
                  aria-current={active ? 'page' : undefined}
                  aria-keyshortcuts={String(i + 1)}
                  onClick={(e) => (e.preventDefault(), navigate(r.id))}
                  onPointerEnter={() => preloadScreen(r.id)}
                >
                  <span class={s.tile}>{r.id === 'capsules' ? <GumballArt size={28} /> : <Icon name={r.icon} size={22} />}</span>
                  <span class={s.label}>{r.label}</span>
                  <kbd class={s.kbd} aria-hidden="true">
                    {i + 1}
                  </kbd>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div class={s.spacer} />
      <WalletSummary />
    </aside>
  );
}
