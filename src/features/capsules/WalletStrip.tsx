import type { ComponentChildren } from 'preact';
import { state } from '@/state/store';
import { STARDUST_PER_STAR } from '@/catalog/machines';
import { CoinIcon, TicketIcon } from '@/art/icons';
import { SwapRing } from './SwapRing';
import s from './CapsulesScreen.module.css';

function Chip({ icon, value, label, children }: { icon: ComponentChildren; value: number; label: string; children?: ComponentChildren }) {
  return (
    <li class={s.chip} title={label}>
      {icon}
      <span class={`num ${s.chipValue}`} aria-hidden="true">
        {value}
        {children}
      </span>
      <span class="sr-only">{label}</span>
    </li>
  );
}

/**
 * The wallet strip at the top of the Capsules screen (DESIGN §9.3): coins · stamps, with the ten-
 * segment swap ring around the stamp · tickets. (Internally stamps are `stars` and swaps are
 * `stardust`.)
 */
export function WalletStrip() {
  const w = state.value.wallet;
  const swaps = w.stardust % STARDUST_PER_STAR;
  return (
    <ul class={s.wallet} aria-label="Your wallet">
      <Chip icon={<CoinIcon size={22} />} value={w.coins} label={`${w.coins} ${w.coins === 1 ? 'coin' : 'coins'}`} />
      <Chip
        icon={<SwapRing swaps={swaps} size={30} />}
        value={w.stars}
        label={`${w.stars} ${w.stars === 1 ? 'stamp' : 'stamps'}, and ${swaps} of ${STARDUST_PER_STAR} swaps toward the next`}
      >
        <small class={s.chipOf}>
          {' '}
          · {swaps}/{STARDUST_PER_STAR} swaps
        </small>
      </Chip>
      <Chip icon={<TicketIcon size={22} />} value={w.tickets} label={`${w.tickets} ${w.tickets === 1 ? 'ticket' : 'tickets'}`} />
    </ul>
  );
}
