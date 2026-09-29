import { useEffect, useId, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { CandyButton } from '@/ui/CandyButton';
import { Pill } from '@/ui/Pill';
import { Sparkle } from '@/ui/Sparkle';
import { isTopLayer, pushLayer, removeLayer, trapTab } from '@/ui/sheetStack';
import { holdToasts } from '@/ui/toast';
import { burst } from './confetti';
import { flyPayout } from './coinFly';
import { CelebrationArt } from './CelebrationArt';
import { RewardChips } from './CelebrationBanner';
import type { BannerSpec } from './celebrationPlan';
import type { Payout } from './walletLedger';
import s from './EpicMoment.module.css';

const EXIT_MS = 280;

/**
 * The once-in-a-long-while moment (exclusive rewards): light rays, a big reveal, one warm
 * button. Its rewards wait on the card and fly to the wallet when she treasures it.
 */
export function EpicMoment({ spec, payouts = [], onDone }: { spec: BannerSpec; payouts?: Payout[]; onDone: () => void }) {
  const id = useId();
  const [leaving, setLeaving] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const restore = useRef<HTMLElement | null>(null);

  const close = () => {
    if (leaving) return;
    const from = chipsRef.current?.getBoundingClientRect() ?? cardRef.current?.getBoundingClientRect();
    // The page comes back first, so the wallet the coins aim for is really there.
    removeLayer(id);
    if (from) for (const p of payouts) flyPayout(p, from);
    setLeaving(true);
  };

  useLayoutEffect(() => {
    restore.current = document.activeElement as HTMLElement | null;
    pushLayer(id);
    // Toasts that arrive meanwhile wait under the scrim instead of expiring unseen.
    const release = holdToasts();
    cardRef.current?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
    burst({ intensity: spec.confetti });
    return () => {
      release();
      removeLayer(id);
      if (restore.current?.isConnected) restore.current.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTopLayer(id)) {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [leaving]);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(onDone, EXIT_MS);
    return () => clearTimeout(t);
  }, [leaving]);

  const titleId = `${id}-t`;
  return (
    <div class={s.layer} data-leaving={leaving || undefined}>
      <div class={s.scrim} onClick={close} aria-hidden="true" />
      <div class={s.center}>
        <div ref={cardRef} class={s.card} role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={(e) => cardRef.current && trapTab(e, cardRef.current)}>
          <div class={s.stage} aria-hidden="true">
            <span class={s.rays} />
            <span class={s.halo} />
            <Sparkle size={18} class={s.s1} />
            <Sparkle size={12} class={s.s2} />
            <Sparkle size={14} class={s.s3} />
            <div class={s.art}>
              <CelebrationArt art={spec.art} size={156} />
            </div>
          </div>
          <p class={s.eyebrow}>
            <Sparkle size={11} /> {spec.eyebrow} <Sparkle size={11} />
          </p>
          <h2 class={s.title} id={titleId}>
            {spec.title}
          </h2>
          <Pill tone="butter" variant="solid" size="sm" class={s.pill}>
            Exclusive · yours forever
          </Pill>
          {spec.text && <p class={s.text}>{spec.text}</p>}
          {spec.also.length > 0 && <p class={s.also}>{spec.also.join(' · ')}</p>}
          {spec.rewards.coins + spec.rewards.stars + spec.rewards.tickets + spec.rewards.stardust > 0 && (
            <div class={s.rewards}>
              <RewardChips rewards={spec.rewards} chipsRef={chipsRef} />
            </div>
          )}
          <CandyButton size="lg" tone="butter" block class={s.cta} onClick={close}>
            Treasure it
          </CandyButton>
        </div>
      </div>
    </div>
  );
}
