import type { ComponentChildren } from 'preact';
import { state } from '@/state/store';
import { STARDUST_PER_STAR } from '@/catalog/machines';
import { CoinIcon, StarIcon, StardustIcon, TicketIcon } from '@/art/icons';
import s from './CapsulesScreen.module.css';

function Chip({ icon, value, label, children }: { icon: ComponentChildren; value: number; label: string; children?: ComponentChildren }) {
  return (
    <li class={s.chip} title={label}>
      {icon}
      {/* keyed so the number does a tiny bounce whenever it changes */}
      <span key={value} class={`num ${s.chipValue}`} aria-hidden="true">
        {value}
        {children}
      </span>
      <span class="sr-only">{label}</span>
    </li>
  );
}

/** Coins, stars, tickets and the stardust jar (DESIGN §9.3). */
export function WalletStrip() {
  const w = state.value.wallet;
  return (
    <ul class={s.wallet} aria-label="Your wallet">
      <Chip icon={<CoinIcon size={24} />} value={w.coins} label={`${w.coins} coins`} />
      <Chip icon={<StarIcon size={24} />} value={w.stars} label={`${w.stars} stars`} />
      <Chip icon={<TicketIcon size={24} />} value={w.tickets} label={`${w.tickets} ${w.tickets === 1 ? 'ticket' : 'tickets'}`} />
      <Chip icon={<StardustIcon size={24} />} value={w.stardust} label={`${w.stardust} of ${STARDUST_PER_STAR} stardust toward your next star`}>
        <small class={s.chipOf}>/{STARDUST_PER_STAR}</small>
      </Chip>
    </ul>
  );
}
