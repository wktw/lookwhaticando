/**
 * <CelebrationHost/>: listens to game events and gives each the right-sized moment.
 * Events from one action arrive synchronously and are batched, planned by the pure
 * planCelebration(), then shown: paper notes for small things, a note tucked over the band for
 * big ones, the calm epic moment for exclusives.
 *
 * Two things happen right away, inside the user's gesture, before planning: the batch's coins
 * and stars are reserved (so wallet counters wait for the flying coins, see walletLedger), and
 * the haptic fires (iOS only plays it from inside the gesture).
 */
import { createPortal } from 'preact/compat';
import { useEffect, useRef, useState } from 'preact/hooks';
import { featuredPetId } from '@/domain/friendship';
import { onGameEvent } from '@/state/events';
import { state } from '@/state/store';
import type { GameEvent } from '@/state/api';
import { getCollectible } from '@/catalog/collectibles';
import { BADGE_BY_ID } from '@/catalog/badges';
import { CoinIcon } from '@/art/icons';
import { overlayRoot } from '@/ui/overlay';
import { findToast, toast } from '@/ui/toast';
import { announce } from '@/ui/announce';
import {
  addTally,
  EMPTY_TALLY,
  enqueueBanner,
  eventWeight,
  formatTally,
  isEmptyTally,
  planCelebration,
  walletDelta,
  type BannerSpec,
  type CelebrationContext,
  type CelebrationPlan,
  type Tally,
  type ToastSpec,
} from './celebrationPlan';
import { CelebrationArt } from './CelebrationArt';
import { CelebrationBanner, RewardInline } from './CelebrationBanner';
import { EpicMoment } from './EpicMoment';
import { sfx } from './sound';
import { haptic } from './haptics';
import { flyPayout } from './coinFly';
import { holdPayout, releasePayout, reserveInto, type Payout } from './walletLedger';

/** How long after an action its events are gathered into one batch. */
export const BATCH_MS = 40;
/** A local check-in flourish claims that habit's coin event for this long. */
const CLAIM_MS = 1500;
/** The coin leaves a note once it has settled. */
const TOAST_HOP_MS = 280;

interface Batch {
  events: GameEvent[];
  payout: Payout;
  /** Check-in coins per habit, so a screen's own flourish can take them over. */
  checkins: Map<string, number>;
  felt: 'big' | 'small' | null;
}

let batch: Batch | null = null;
const newBatch = (): Batch => ({ events: [], payout: {}, checkins: new Map(), felt: null });
const claims = new Map<string, number>();

/**
 * Screens that play their own check-in flourish (see celebrateCheckIn) call this right after
 * checkIn(), so the host neither celebrates nor flies those coins a second time.
 */
export function markCelebratedLocally(habitId: string): void {
  claims.set(habitId, performance.now());
  const amount = batch?.checkins.get(habitId);
  if (!batch || !amount) return;
  batch.checkins.delete(habitId);
  batch.payout.coins?.release(amount);
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
      return s.pets[id]?.name ?? (def?.category === 'pet' ? def.defaultName : 'Your pet');
    },
    itemName: (id) => getCollectible(id)?.name ?? 'Something new',
    itemFlavor: (id) => getCollectible(id)?.flavor ?? '',
    badge: (id) => BADGE_BY_ID.get(id),
    buddy: featuredPetId(s) ?? '',
    locallyCelebrated: new Set(claims.keys()),
    sill: () => s.habits.filter((h) => !h.archivedOn).map((h) => h.plant),
  };
}

const hasRewards = (p: Payout) => !!(p.coins?.left || p.stars?.left);

/** Where a toast's art sits on screen (coins hop out of it). */
function toastOrigin(id: string): DOMRect | { x: number; y: number } {
  const el = document.querySelector(`[data-toast-id="${id}"]`);
  return (el?.querySelector('[data-toast-art]') ?? el)?.getBoundingClientRect() ?? { x: innerWidth / 2, y: 44 };
}

function flyFromToast(id: string, payout: Payout) {
  holdPayout(payout, TOAST_HOP_MS + 1500);
  setTimeout(() => flyPayout(payout, toastOrigin(id)), TOAST_HOP_MS);
}

/** A small moment's note; when it carries the batch's rewards, its coin arcs out of it. */
function showToast(t: ToastSpec, payout: Payout) {
  const message = t.rewards ? (
    <>
      {t.message} <RewardInline rewards={t.rewards} />
    </>
  ) : (
    t.message
  );
  const label = t.rewards ? `${t.message} ${formatTally(t.rewards)}` : t.message;
  const id = toast({ key: t.key, message, label, tone: t.tone, art: <CelebrationArt art={t.art} size={30} animated={false} /> });
  if (t.rewards && hasRewards(payout)) flyFromToast(id, payout);
}

let walletTally: Tally = { ...EMPTY_TALLY };

/** The one calm, coalescing "+N coins" note; each batch's coin arcs out of it. */
function showWallet(add: Tally, payout: Payout) {
  walletTally = findToast('wallet') ? addTally(walletTally, add) : add;
  const id = toast({ key: 'wallet', message: formatTally(walletTally), art: <CoinIcon size={22} />, tone: 'butter' });
  if (hasRewards(payout)) flyFromToast(id, payout);
  else sfx.play('sparkle', { volume: 0.7 });
}

type Queued = BannerSpec & { id: number; payouts: Payout[] };
let bannerSeq = 0;

export function CelebrationHost() {
  const [queue, setQueue] = useState<Queued[]>([]);
  const queueRef = useRef(queue);
  queueRef.current = queue;

  useEffect(() => {
    let timer = 0;
    const apply = (plan: CelebrationPlan, payout: Payout) => {
      plan.toasts.forEach((t, i) => {
        showToast(t, payout);
        if (i === 0 && !plan.banner && t.sound) sfx.play(t.sound);
      });
      if (plan.banner) {
        // The banner carries the batch's rewards and flies them once it's ready.
        holdPayout(payout, Infinity);
        const next: Queued = { ...plan.banner, id: ++bannerSeq, payouts: [payout] };
        setQueue((q) => {
          const merged = enqueueBanner(q, next);
          if (merged.length > q.length) return merged;
          // Folded into the last waiting banner, which now carries these rewards too.
          const last = merged[merged.length - 1]!;
          return [...merged.slice(0, -1), { ...last, payouts: [...last.payouts, payout] }];
        });
      } else if (!isEmptyTally(plan.wallet)) {
        showWallet(plan.wallet, payout);
      } else if (!plan.toasts.some((t) => t.rewards)) {
        releasePayout(payout);
      }
    };
    const flush = () => {
      timer = 0;
      const b = batch;
      batch = null;
      if (b) apply(planCelebration(b.events, context()), b.payout);
    };
    const off = onGameEvent((e) => {
      const b = (batch ??= newBatch());
      b.events.push(e);
      const delta = walletDelta(e);
      if (delta) {
        reserveInto(b.payout, delta.kind, delta.amount);
        if (e.type === 'coins' && e.reason === 'checkin' && e.habitId) b.checkins.set(e.habitId, (b.checkins.get(e.habitId) ?? 0) + e.amount);
      }
      const weight = eventWeight(e);
      if (weight === 'big' && b.felt !== 'big') {
        haptic('success');
        b.felt = 'big';
      } else if (weight === 'small' && !b.felt) {
        haptic('light');
        b.felt = 'small';
      }
      if (!timer) timer = window.setTimeout(flush, BATCH_MS);
    });
    return () => {
      off();
      clearTimeout(timer);
      // Nothing may stay reserved once the host is gone.
      releasePayout(batch?.payout);
      batch = null;
      for (const b of queueRef.current) b.payouts.forEach(releasePayout);
    };
  }, []);

  const current = queue[0];

  // The moment a banner appears: its sound and a screen-reader announcement.
  useEffect(() => {
    if (!current) return;
    sfx.play(current.sound);
    announce(`${current.eyebrow}. ${current.title}. ${current.text} ${formatTally(current.rewards)}`);
  }, [current?.id]);

  if (!current || typeof document === 'undefined') return null;
  const done = () => {
    current.payouts.forEach(releasePayout);
    setQueue((q) => q.filter((b) => b.id !== current.id));
  };
  return createPortal(
    current.epic ? (
      <EpicMoment key={current.id} spec={current} payouts={current.payouts} onDone={done} />
    ) : (
      <CelebrationBanner key={current.id} spec={current} payouts={current.payouts} onDone={done} />
    ),
    overlayRoot(),
  );
}
