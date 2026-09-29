import { wallet } from '@/state/store';
import { CoinIcon, StarIcon, TicketIcon, StardustIcon } from '@/art/icons';
import { AnimatedNumber } from '@/ui/AnimatedNumber';
import { cx } from '@/ui/cx';
import s from './WalletSummary.module.css';

/** The sidebar wallet. Its counters are coin/star flight targets and count up as sprites land. */
export function WalletSummary({ class: cls }: { class?: string }) {
  const w = wallet.value;
  return (
    <section class={cx(s.wallet, cls)} aria-label="Wallet">
      <div class={s.coins} data-wallet-target="coins">
        <CoinIcon size={30} />
        <span class={s.big}>
          <AnimatedNumber value={w.coins} walletKind="coins" />
        </span>
        <span class={s.unit}>coins</span>
      </div>
      <div class={s.row}>
        <span class={s.mini} data-wallet-target="stars">
          <StarIcon size={20} />
          <AnimatedNumber value={w.stars} walletKind="stars" />
          <span class="sr-only">stars</span>
        </span>
        <span class={s.mini}>
          <TicketIcon size={20} />
          <AnimatedNumber value={w.tickets} />
          <span class="sr-only">tickets</span>
        </span>
        <span class={s.mini} title="Stardust: every 10 becomes a star">
          <StardustIcon size={20} />
          <span>
            {w.stardust}
            <small>/10</small>
          </span>
          <span class="sr-only">stardust</span>
        </span>
      </div>
    </section>
  );
}
