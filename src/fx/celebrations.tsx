/**
 * <CelebrationHost/>: listens to game events and turns them into the right-sized joy.
 * Events from one action are batched (they arrive synchronously), planned by the pure
 * planCelebration(), then shown: calm toasts for small things, a banner for big ones,
 * an epic moment for exclusives. Sounds, haptics and confetti fire when a moment appears.
 */
import { createPortal } from 'preact/compat';
import { useEffect, useState } from 'preact/hooks';
import { onGameEvent } from '@/state/events';
import { state } from '@/state/store';
import type { GameEvent } from '@/state/api';
import { getCollectible, MOCHI_ID } from '@/catalog/collectibles';
import { BADGE_BY_ID } from '@/catalog/badges';
import { CoinIcon } from '@/art/icons';
import { overlayRoot } from '@/ui/overlay';
import { findToast, toast } from '@/ui/toast';
import { announce } from '@/ui/announce';
import { addTally, EMPTY_TALLY, enqueueBanner, formatTally, isEmptyTally, planCelebration, type BannerSpec, type CelebrationContext, type CelebrationPlan, type Tally } from './celebrationPlan';
import { CelebrationArt } from './CelebrationArt';
import { CelebrationBanner } from './CelebrationBanner';
import { EpicMoment } from './EpicMoment';
import { burst } from './confetti';
import { sfx } from './sound';
import { haptic } from './haptics';
import { flyCoins } from './coinFly';

/** How long after an action its events are gathered into one batch. */
const BATCH_MS = 40;
/** A local check-in flourish claims that habit's coin event for this long. */
const CLAIM_MS = 1500;

const claims = new Map<string, number>();

/**
 * Screens that play their own check-in flourish (see celebrateCheckIn) call this so the host
 * doesn't celebrate the same coins twice.
 */
export function markCelebratedLocally(habitId: string): void {
  claims.set(habitId, performance.now());
}

function context(): CelebrationContext {
  const s = state.value;
  const now = performance.now();
  for (const [id, t] of claims) if (now - t > CLAIM_MS) claims.delete(id);
  return {
    habit: (id) => {
      const h = s.habits.find((x) => x.id === id);
      return h && { name: h.name, plant: h.plant, pot: h.pot };
    },
    petName: (id) => {
      const def = getCollectible(id);
      return s.pets[id]?.name ?? (def?.category === 'pet' ? def.defaultName : 'Your friend');
    },
    itemName: (id) => getCollectible(id)?.name ?? 'A surprise',
    itemFlavor: (id) => getCollectible(id)?.flavor ?? '',
    badge: (id) => BADGE_BY_ID.get(id),
    buddy: s.profile.buddy ?? MOCHI_ID,
    locallyCelebrated: new Set(claims.keys()),
  };
}

/** Toasts and banners center on the content column (right of the sidebar on wide screens). */
function contentCenterX(): number {
  const sidebar = innerWidth >= 900 ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-w')) || 0 : 0;
  return sidebar + (innerWidth - sidebar) / 2;
}

let walletTally: Tally = { ...EMPTY_TALLY };

function showWallet(add: Tally) {
  if (isEmptyTally(add)) return;
  walletTally = findToast('wallet') ? addTally(walletTally, add) : add;
  toast({ key: 'wallet', message: formatTally(walletTally), art: <CoinIcon size={24} />, tone: 'butter' });
  // Coins hop from the toast into the wallet.
  if (add.coins > 0) void flyCoins({ from: { x: contentCenterX(), y: 44 }, amount: add.coins, kind: 'coins' });
  else sfx.play('sparkle', { volume: 0.7 });
}

type Queued = BannerSpec & { id: number };
let bannerSeq = 0;

export function CelebrationHost() {
  const [queue, setQueue] = useState<Queued[]>([]);

  useEffect(() => {
    let pending: GameEvent[] = [];
    let timer = 0;
    const apply = (plan: CelebrationPlan) => {
      plan.toasts.forEach((t, i) => {
        toast({ key: t.key, message: t.message, tone: t.tone, art: <CelebrationArt art={t.art} size={34} animated={false} /> });
        if (i === 0 && !plan.banner && t.sound) sfx.play(t.sound);
      });
      if (plan.toasts.length && !plan.banner) haptic('light');
      showWallet(plan.wallet);
      if (plan.banner) {
        const next = { ...plan.banner, id: ++bannerSeq };
        setQueue((q) => enqueueBanner(q, next));
      }
    };
    const flush = () => {
      timer = 0;
      const batch = pending;
      pending = [];
      apply(planCelebration(batch, context()));
    };
    const off = onGameEvent((e) => {
      pending.push(e);
      if (!timer) timer = window.setTimeout(flush, BATCH_MS);
    });
    return () => {
      off();
      clearTimeout(timer);
    };
  }, []);

  const current = queue[0];

  // The moment a banner appears: its sound, confetti, haptic and announcement.
  useEffect(() => {
    if (!current) return;
    sfx.play(current.sound);
    burst({ intensity: current.confetti, ...(current.epic ? {} : { x: contentCenterX(), y: 90 }) });
    haptic('success');
    announce(`${current.eyebrow}. ${current.title}. ${current.text} ${formatTally(current.rewards)}`);
  }, [current?.id]);

  if (!current || typeof document === 'undefined') return null;
  const done = () => setQueue((q) => q.filter((b) => b.id !== current.id));
  return createPortal(current.epic ? <EpicMoment key={current.id} spec={current} onDone={done} /> : <CelebrationBanner key={current.id} spec={current} onDone={done} />, overlayRoot());
}
