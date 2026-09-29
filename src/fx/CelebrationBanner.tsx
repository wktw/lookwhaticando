import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { CoinIcon, StarIcon, TicketIcon, StardustIcon } from '@/art/icons';
import { IconButton } from '@/ui/IconButton';
import { Sparkle } from '@/ui/Sparkle';
import { cx } from '@/ui/cx';
import { toneClass } from '@/ui/tone';
import { toastLaneTop } from '@/ui/toast';
import { burst } from './confetti';
import { flyPayout } from './coinFly';
import { CelebrationArt } from './CelebrationArt';
import type { BannerSpec, Tally } from './celebrationPlan';
import type { Payout } from './walletLedger';
import s from './CelebrationBanner.module.css';

const EXIT_MS = 260;
/** Rewards hop out once the card has settled. */
const FLY_AFTER_MS = 650;

export function RewardChips({ rewards, chipsRef }: { rewards: Tally; chipsRef?: { current: HTMLDivElement | null } }) {
  return (
    <div class={s.chips} ref={chipsRef}>
      {rewards.coins > 0 && (
        <span class={s.chip}>
          <CoinIcon size={18} /> +{rewards.coins}
        </span>
      )}
      {rewards.stars > 0 && (
        <span class={s.chip}>
          <StarIcon size={18} /> +{rewards.stars}
        </span>
      )}
      {rewards.tickets > 0 && (
        <span class={s.chip}>
          <TicketIcon size={18} /> +{rewards.tickets}
        </span>
      )}
      {rewards.stardust > 0 && (
        <span class={s.chip}>
          <StardustIcon size={18} /> +{rewards.stardust}
        </span>
      )}
    </div>
  );
}

/** The same rewards as a compact inline tag at the end of a toast's line. */
export function RewardInline({ rewards }: { rewards: Tally }) {
  const parts: [number, typeof CoinIcon][] = [
    [rewards.coins, CoinIcon],
    [rewards.stars, StarIcon],
    [rewards.tickets, TicketIcon],
    [rewards.stardust, StardustIcon],
  ];
  return (
    <span class={s.inline} aria-hidden="true">
      {parts.map(([n, Icon], i) =>
        n > 0 ? (
          <span key={i}>
            <Icon size={16} />+{n}
          </span>
        ) : null,
      )}
    </span>
  );
}

const overlaps = (a: DOMRect, b: DOMRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/** True when a visible wallet counter sits under the card (the Today header on phones). */
function coversWallet(card: DOMRect): boolean {
  return [...document.querySelectorAll('[data-wallet-target]')].some((el) => overlaps(card, el.getBoundingClientRect()));
}

/** A banner card that drops in from the top for big (but not epic) moments. */
export function CelebrationBanner({ spec, payouts = [], onDone }: { spec: BannerSpec; payouts?: Payout[]; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
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
    // Coins still aboard leave with the card, straight into the wallet it was covering.
    fly();
    setLeaving(true);
  };

  // While the card is here, toasts slide below it. Confetti never covers its words: big moments
  // fire the corner cannons, others spill from behind the card's lower edge (visible even
  // on phones, where the card spans the screen).
  useLayoutEffect(() => {
    const anchor = anchorRef.current?.getBoundingClientRect();
    if (anchor) {
      toastLaneTop.value = anchor.bottom;
      if (spec.confetti === 'big' || spec.confetti === 'epic') burst({ intensity: spec.confetti });
      else burst({ x: anchor.left + anchor.width / 2, y: anchor.bottom - 16, intensity: spec.confetti, spread: Math.PI });
    }
    return () => {
      toastLaneTop.value = 0;
    };
  }, []);

  useEffect(() => {
    if (!leaving) return;
    toastLaneTop.value = 0;
    const t = setTimeout(onDone, EXIT_MS);
    return () => clearTimeout(t);
  }, [leaving]);

  useEffect(() => {
    if (paused || leaving) return;
    const t = setTimeout(leave, 4600 + spec.also.length * 900);
    return () => clearTimeout(t);
  }, [paused, leaving]);

  // Rewards hop from the card into the wallet once it has landed, unless the card is sitting
  // on top of that wallet (phones): then they go when the card lifts away.
  useEffect(() => {
    const t = setTimeout(() => {
      const card = cardRef.current?.getBoundingClientRect();
      if (card && !coversWallet(card)) fly();
    }, FLY_AFTER_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div class={s.anchor} ref={anchorRef}>
      <div
        ref={cardRef}
        class={cx(s.banner, leaving && s.leaving, toneClass(spec.tone))}
        role="group"
        aria-label={`${spec.eyebrow}: ${spec.title}`}
        onPointerEnter={(e) => e.pointerType === 'mouse' && setPaused(true)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setPaused(false)}
        onFocusIn={() => setPaused(true)}
        onFocusOut={() => setPaused(false)}
        onClick={(e) => !(e.target as HTMLElement).closest('button') && leave()}
      >
        <span class={s.shine} aria-hidden="true" />
        <div class={s.artTile} aria-hidden="true">
          <Sparkle size={12} class={cx(s.spark, s.spark1)} />
          <Sparkle size={9} class={cx(s.spark, s.spark2)} />
          <div class={s.art}>
            <CelebrationArt art={spec.art} size={78} />
          </div>
        </div>
        <div class={s.copy}>
          <p class={s.eyebrow}>{spec.eyebrow}</p>
          <p class={s.title}>
            {spec.title}
            <Sparkle size={13} class={s.titleSpark} />
          </p>
          <p class={s.text}>{spec.text}</p>
          {spec.also.length > 0 && (
            <ul class={s.also}>
              {spec.also.map((line) => (
                <li key={line}>
                  <Sparkle size={9} /> {line}
                </li>
              ))}
            </ul>
          )}
          {hasRewards && <RewardChips rewards={spec.rewards} chipsRef={chipsRef} />}
        </div>
        <IconButton class={s.close} icon="close" label="Dismiss" size="sm" onClick={leave} />
      </div>
    </div>
  );
}
