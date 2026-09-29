import { useEffect, useId, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { Button } from '@/ui/Button';
import { isTopLayer, pushLayer, removeLayer, trapTab } from '@/ui/sheetStack';
import { holdToasts } from '@/ui/toast';
import { flyPayout } from './coinFly';
import { LazyCelebrationArt } from './celebrationArtLoader';
import { RewardChips } from './CelebrationBanner';
import { SparkleBurst } from './SparkleBurst';
import { EXCLUSIVE } from './copy';
import type { BannerSpec } from './celebrationPlan';
import type { Payout } from './walletLedger';
import s from './EpicMoment.module.css';

const EXIT_MS = 260;
/** The foil glint catches the item once it has settled on the card. */
const GLINT_AFTER_MS = 620;

/**
 * The rare, special moment (exclusives like the Window Seat or the Laurel Sprig): the room dims,
 * the item sits on a paper card, one line of copy, one foil glint. Calm, never loud. Its rewards
 * wait on the card and go to the wallet when she keeps it.
 */
export function EpicMoment({ spec, payouts = [], onDone }: { spec: BannerSpec; payouts?: Payout[]; onDone: () => void }) {
  const id = useId();
  const [leaving, setLeaving] = useState(false);
  const [glint, setGlint] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const restore = useRef<HTMLElement | null>(null);

  const close = () => {
    if (leaving) return;
    const from = chipsRef.current?.getBoundingClientRect() ?? cardRef.current?.getBoundingClientRect();
    // The page comes back first, so the wallet the coin aims for is really there.
    removeLayer(id);
    if (from) for (const p of payouts) flyPayout(p, from);
    setLeaving(true);
  };

  useLayoutEffect(() => {
    restore.current = document.activeElement as HTMLElement | null;
    pushLayer(id, { moment: true });
    // Notes that arrive meanwhile wait under the dimmed room instead of expiring unseen.
    const release = holdToasts();
    // Focus lands on the card itself (named by its title), so no ring shows until she uses the keyboard.
    cardRef.current?.focus({ preventScroll: true });
    const t = setTimeout(() => setGlint(1), GLINT_AFTER_MS);
    return () => {
      clearTimeout(t);
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
  const hasRewards = spec.rewards.coins + spec.rewards.stars + spec.rewards.tickets + spec.rewards.stardust > 0;
  return (
    <div class={s.layer} data-leaving={leaving || undefined}>
      <div class={s.scrim} onClick={close} aria-hidden="true" />
      <div class={s.center}>
        <div ref={cardRef} class={s.card} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onKeyDown={(e) => cardRef.current && trapTab(e, cardRef.current)}>
          <div class={s.stage} aria-hidden="true">
            <div class={s.art}>
              <LazyCelebrationArt art={spec.art} size={132} />
            </div>
            <span class={s.contact} />
            <span class={s.glint}>
              <SparkleBurst trigger={glint} />
            </span>
          </div>
          <p class={s.eyebrow}>{spec.eyebrow}</p>
          <h2 class={s.title} id={titleId}>
            {spec.title}
          </h2>
          {spec.text && <p class={s.text}>{spec.text}</p>}
          {(hasRewards || spec.also.length > 0) && (
            <div class={s.extras}>
              {spec.also.length > 0 && <p class={s.also}>{spec.also.join(' · ')}</p>}
              {hasRewards && <RewardChips rewards={spec.rewards} chipsRef={chipsRef} />}
            </div>
          )}
          <Button size="lg" tone="butter" block class={s.cta} onClick={close}>
            {EXCLUSIVE.button}
          </Button>
        </div>
      </div>
    </div>
  );
}
