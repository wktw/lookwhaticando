import { wallet } from '@/state/store';
import { CoinIcon, StampIcon, SwapIcon, TicketIcon } from '@/art/icons';
import { AnimatedNumber } from '@/ui/AnimatedNumber';
import { cx } from '@/ui/cx';
import { SHELL_COPY } from './copy';
import s from './WalletSummary.module.css';

/**
 * The sidebar wallet on a paper card: coins (brass, in the jar), stamps, tickets and swaps
 * (DESIGN §6 display names). Its counters are coin and stamp flight targets, and roll as they land.
 */
export function WalletSummary({ class: cls }: { class?: string }) {
  const w = wallet.value;
  return (
    <section class={cx(s.wallet, cls)} aria-label={SHELL_COPY.wallet}>
      <p class={s.caption} aria-hidden="true">
        {SHELL_COPY.wallet}
      </p>
      <div class={s.coins} data-wallet-target="coins">
        <CoinIcon size={26} />
        <span class={s.big}>
          <AnimatedNumber value={w.coins} walletKind="coins" />
        </span>
        <span class={s.unit}>coins</span>
      </div>
      <dl class={s.row}>
        <div class={s.mini} data-wallet-target="stars">
          <dt>
            <StampIcon size={18} />
            <span class="sr-only">Stamps</span>
          </dt>
          <dd>
            <AnimatedNumber value={w.stars} walletKind="stars" />
          </dd>
        </div>
        <div class={s.mini}>
          <dt>
            <TicketIcon size={18} />
            <span class="sr-only">Tickets</span>
          </dt>
          <dd>
            <AnimatedNumber value={w.tickets} />
          </dd>
        </div>
        <div class={s.mini} title={SHELL_COPY.swapsHint}>
          <dt>
            <SwapIcon size={18} count={Math.min(10, w.stardust % 10)} />
            <span class="sr-only">Swaps, every 10 become a stamp</span>
          </dt>
          <dd>
            {w.stardust}
            <small>/10</small>
          </dd>
        </div>
      </dl>
    </section>
  );
}
