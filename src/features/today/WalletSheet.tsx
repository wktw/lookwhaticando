/**
 * "What can I get?" (VOICE §4): the wallet pill opens it. Each currency, what she has, where it
 * comes from and what it buys, in the deck's words.
 */
import type { ComponentChildren } from 'preact';
import { CoinIcon, StampIcon, SwapIcon, TicketIcon } from '@/art/icons';
import { COUNTS, WALLET } from '@/catalog/lines';
import { counted } from '@/catalog/format';
import { walletView } from '@/state/selectors';
import { Sheet } from '@/ui/Sheet';
import s from './TodaySheets.module.css';

/** "142 coins", or with none just "Coins" (never a count of 0, VOICE §10). */
export function amountHead(n: number, forms: { readonly one: string; readonly other: string }): string {
  if (n > 0) return counted(n, forms);
  const word = forms.other.replace('{count} ', '');
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function Row({ icon, head, text }: { icon: ComponentChildren; head: string; text: string }) {
  return (
    <li class={s.walletRow}>
      <span class={s.walletIcon} aria-hidden="true">
        {icon}
      </span>
      <div>
        <p class={s.walletHead}>{head}</p>
        <p class={s.walletText}>{text}</p>
      </div>
    </li>
  );
}

export function WalletSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const w = walletView.value;
  return (
    <Sheet open={open} onClose={onClose} title={WALLET.title} detents={['content']} size="sm">
      <ul class={s.walletList}>
        <Row icon={<CoinIcon size={22} />} head={amountHead(w.coins, COUNTS.coins)} text={WALLET.coins} />
        <Row icon={<StampIcon size={22} />} head={amountHead(w.stars, COUNTS.stamps)} text={WALLET.stamps} />
        <Row icon={<SwapIcon size={22} count={w.dust.have % w.dust.of} />} head={amountHead(w.dust.have % w.dust.of, COUNTS.swaps)} text={WALLET.swaps} />
        <Row icon={<TicketIcon size={22} />} head={amountHead(w.tickets, COUNTS.tickets)} text={WALLET.tickets} />
      </ul>
    </Sheet>
  );
}
