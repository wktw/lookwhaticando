import type { JSX } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { CoinIcon, StampIcon, SwapIcon, TicketIcon } from '@/art/icons';
import { IconButton } from '@/ui/IconButton';
import { cx } from '@/ui/cx';
import { toneClass } from '@/ui/tone';
import { toastLaneTop } from '@/ui/toast';
import { layerCount, onLayersChange } from '@/ui/sheetStack';
import { burst } from './confetti';
import { flyPayout } from './coinFly';
import { LazyCelebrationArt } from './celebrationArtLoader';
import { FX_UI } from './copy';
import type { BannerSpec, Tally } from './celebrationPlan';
import type { Payout } from './walletLedger';
import s from './CelebrationBanner.module.css';

const EXIT_MS = 220;
/** Rewards leave the note once it has settled. */
const FLY_AFTER_MS = 650;

/**
 * Screens mark where celebration notes belong with this attribute (Today: the windowsill band).
 * The note pins itself over the bottom edge of that element, like a card tucked on the sill.
 */
export const CELEBRATION_ANCHOR = 'data-celebration-anchor';

const TOKENS: [keyof Tally, (p: { size?: number }) => JSX.Element][] = [
  ['coins', CoinIcon],
  ['stars', StampIcon],
  ['tickets', TicketIcon],
  ['stardust', SwapIcon],
];

/** The rewards as a row of currency tokens ("{coin} +10 · {stamp} +1"). */
export function RewardChips({ rewards, chipsRef }: { rewards: Tally; chipsRef?: { current: HTMLDivElement | null } }) {
  return (
    <div class={s.chips} ref={chipsRef}>
      {TOKENS.map(([k, Icon]) =>
        rewards[k] > 0 ? (
          <span key={k} class={s.chip}>
            <Icon size={16} />+{rewards[k]}
          </span>
        ) : null,
      )}
    </div>
  );
}

/** The same rewards inline at the end of a note's line ("Everything kept. +20 {coin}"). */
export function RewardInline({ rewards }: { rewards: Tally }) {
  return (
    <span class={s.inline} aria-hidden="true">
      {TOKENS.map(([k, Icon]) =>
        rewards[k] > 0 ? (
          <span key={k}>
            +{rewards[k]}
            <Icon size={14} />
          </span>
        ) : null,
      )}
    </span>
  );
}

const overlaps = (a: DOMRect, b: DOMRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/** True when a visible wallet counter sits under the note (the Today header on phones). */
function coversWallet(card: DOMRect): boolean {
  return [...document.querySelectorAll('[data-wallet-target]')].some((el) => overlaps(card, el.getBoundingClientRect()));
}

/** Where the note sits: over the bottom edge of the band when a screen marks one, else at the top. */
function placement(): JSX.CSSProperties | undefined {
  for (const el of document.querySelectorAll<HTMLElement>(`[${CELEBRATION_ANCHOR}]`)) {
    const r = el.getBoundingClientRect();
    if (!r.width || r.bottom <= 0 || r.top >= innerHeight) continue;
    const width = Math.min(440, r.width - 24);
    const top = Math.max(8, Math.min(r.bottom - 34, innerHeight - 220));
    return { top: `${Math.round(top)}px`, left: `${Math.round(r.left + r.width / 2)}px`, width: `${Math.round(width)}px` };
  }
  return undefined;
}

/**
 * A paper note for the big-but-not-epic moments (a bloom, a perfect day, showing up), tucked
 * over the windowsill band. Petals drift from it; its rewards arc into the wallet.
 */
export function CelebrationBanner({ spec, payouts = [], onDone }: { spec: BannerSpec; payouts?: Payout[]; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const [place] = useState(placement);
  const anchorRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const flown = useRef(false);
  const hasRewards = spec.rewards.coins + spec.rewards.stars + spec.rewards.tickets + spec.rewards.stardust > 0;

  const fly = () => {
    const from = chipsRef.current?.getBoundingClientRect() ?? cardRef.current?.getBoundingClientRect();
    if (flown.current || !from) return;
    flown.current = true;
    for (const p of payouts) flyPayout(p, from);
  };

  const leave = () => {
    // Rewards still on the note leave with it, straight into the wallet it was covering.
    fly();
    setLeaving(true);
  };

  // While the note is up, lifted toasts slide below it. A perfect day lets petals fall past the
  // whole window; other moments let them drift from the note's lower edge.
  useLayoutEffect(() => {
    const card = cardRef.current?.getBoundingClientRect();
    if (card) {
      toastLaneTop.value = card.bottom;
      const petals = { intensity: spec.confetti, ...spec.petals };
      if (spec.kind === 'perfectDay') burst(petals);
      else burst({ x: card.left + card.width / 2, y: card.bottom - 12, ...petals });
    }
    return () => {
      toastLaneTop.value = 0;
    };
  }, []);

  // A sheet opened while the note is up (a check-in, then ⋯ → Details) would sit under it, header
  // and close button covered: the note is put away instead. One already open when the note arrived
  // (a moment from inside a sheet) keeps it.
  useEffect(() => {
    let open = layerCount();
    return onLayersChange(() => {
      const now = layerCount();
      if (now > open) leave();
      open = now;
    });
  }, []);

  useEffect(() => {
    if (!leaving) return;
    toastLaneTop.value = 0;
    const t = setTimeout(onDone, EXIT_MS);
    return () => clearTimeout(t);
  }, [leaving]);

  useEffect(() => {
    if (paused || leaving) return;
    const t = setTimeout(leave, 5200 + spec.also.length * 900);
    return () => clearTimeout(t);
  }, [paused, leaving]);

  // Rewards arc from the note into the wallet once it has settled, unless the note sits on top
  // of that wallet (phones): then they go when the note is put away.
  useEffect(() => {
    const t = setTimeout(() => {
      const card = cardRef.current?.getBoundingClientRect();
      if (card && !coversWallet(card)) fly();
    }, FLY_AFTER_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    // A landmark of its own (axe: all content in a region), named for the moment.
    <div class={cx(s.anchor, place && s.placed)} ref={anchorRef} style={place} role="region" aria-label={`${spec.eyebrow}: ${spec.title}`}>
      <div
        ref={cardRef}
        class={cx(s.note, leaving && s.leaving, toneClass(spec.tone))}
        onPointerEnter={(e) => e.pointerType === 'mouse' && setPaused(true)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setPaused(false)}
        onFocusIn={() => setPaused(true)}
        onFocusOut={() => setPaused(false)}
        onClick={(e) => !(e.target as HTMLElement).closest('button') && leave()}
      >
        <div class={s.artTile} aria-hidden="true">
          <LazyCelebrationArt art={spec.art} size={64} />
        </div>
        <div class={s.copy}>
          <p class={s.eyebrow}>{spec.eyebrow}</p>
          <p class={s.title}>{spec.title}</p>
          {spec.text && <p class={s.text}>{spec.text}</p>}
          {spec.also.length > 0 && (
            <ul class={s.also}>
              {spec.also.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          {hasRewards && <RewardChips rewards={spec.rewards} chipsRef={chipsRef} />}
        </div>
        <IconButton class={s.close} icon="close" label={FX_UI.dismiss} size="sm" onClick={leave} />
      </div>
    </div>
  );
}
