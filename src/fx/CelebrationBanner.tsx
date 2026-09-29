import { useEffect, useRef, useState } from 'preact/hooks';
import { CoinIcon, StarIcon, TicketIcon, StardustIcon } from '@/art/icons';
import { IconButton } from '@/ui/IconButton';
import { Sparkle } from '@/ui/Sparkle';
import { cx } from '@/ui/cx';
import { toneClass } from '@/ui/tone';
import { flyCoins } from './coinFly';
import { CelebrationArt } from './CelebrationArt';
import type { BannerSpec, Tally } from './celebrationPlan';
import s from './CelebrationBanner.module.css';

const EXIT_MS = 260;

export function RewardChips({ rewards, coinRef }: { rewards: Tally; coinRef?: { current: HTMLSpanElement | null } }) {
  return (
    <div class={s.chips}>
      {rewards.coins > 0 && (
        <span class={s.chip} ref={coinRef}>
          <CoinIcon size={18} /> +{rewards.coins}
        </span>
      )}
      {rewards.stars > 0 && (
        <span class={s.chip} data-kind="stars">
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

/** A banner card that drops in from the top for big (but not epic) moments. */
export function CelebrationBanner({ spec, onDone }: { spec: BannerSpec; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const coinRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hasRewards = spec.rewards.coins + spec.rewards.stars + spec.rewards.tickets + spec.rewards.stardust > 0;

  const leave = () => setLeaving(true);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(onDone, EXIT_MS);
    return () => clearTimeout(t);
  }, [leaving]);

  useEffect(() => {
    if (paused || leaving) return;
    const t = setTimeout(leave, 4600 + spec.also.length * 900);
    return () => clearTimeout(t);
  }, [paused, leaving]);

  // Rewards hop from the card into the wallet once the card has landed.
  useEffect(() => {
    const t = setTimeout(() => {
      const from = coinRef.current?.getBoundingClientRect() ?? cardRef.current?.getBoundingClientRect();
      if (!from) return;
      if (spec.rewards.coins > 0) void flyCoins({ from, amount: spec.rewards.coins, kind: 'coins' });
      if (spec.rewards.stars > 0) void flyCoins({ from, amount: spec.rewards.stars, kind: 'stars' });
    }, 650);
    return () => clearTimeout(t);
  }, []);

  return (
    <div class={s.anchor}>
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
          <p class={s.title}>{spec.title}</p>
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
          {hasRewards && <RewardChips rewards={spec.rewards} coinRef={coinRef} />}
        </div>
        <IconButton class={s.close} icon="close" label="Dismiss" size="sm" onClick={leave} />
      </div>
    </div>
  );
}
