import { createPortal } from 'preact/compat';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { Rarity } from '@/catalog/types';
import { CollectibleArt } from '@/art/CollectibleArt';
import { CapsuleArt, SPARKLE_PATH } from '@/art/machines/CapsuleArt';
import { burst, type BurstOptions } from '@/fx/confetti';
import { sfx } from '@/fx/sound';
import { haptic } from '@/fx/haptics';
import { cx } from './ui/CandyButton';
import { useFocusTrap } from './ui/useFocusTrap';
import { prefersReducedMotion } from './motion';
import { RevealCard } from './RevealCard';
import { Rays } from './Rays';
import type { RevealData } from './reveal';
import s from './RevealOverlay.module.css';

export type RevealStage = 'anticipate' | 'open' | 'card';

export interface RevealOverlayProps {
  data: RevealData;
  /** Screen rect the capsule flies in from (the machine's tray). */
  origin?: DOMRect | null;
  /** Skip the anticipation and go straight to the card (Settings › Quick capsule open). */
  quickOpen?: boolean;
  onClose: () => void;
  /** Offered when another pull is affordable. */
  onPullAgain?: () => void;
  /** Start at a given stage (gallery demos). */
  initialStage?: RevealStage;
  /** Pre-cracked shell (gallery demos). */
  initialCracks?: number;
}

/** Taps needed to open: the Secret takes three, each one cracking the shell further. */
const TAPS: Record<Rarity, number> = { common: 1, uncommon: 1, rare: 1, ultra: 3 };

const CONFETTI: Record<Rarity, BurstOptions> = {
  common: { intensity: 'small', shapes: ['circle', 'petal'], colors: ['#C3DFB4', '#FFE593', '#FFC4D3', '#FFFFFF'] },
  uncommon: { intensity: 'medium', shapes: ['circle', 'star', 'petal'], colors: ['#BBDCF6', '#7DB7E8', '#FFE593', '#FFFFFF'] },
  rare: { intensity: 'big', shapes: ['star', 'sparkle', 'circle'], colors: ['#D6C8F8', '#A993EA', '#FFE593', '#FFFFFF'] },
  ultra: { intensity: 'epic', shapes: ['star', 'heart', 'sparkle', 'petal'], colors: ['#FFB3C7', '#FFE593', '#B3E6D6', '#BBDCF6', '#D6C8F8'] },
};

/** Scattered background sparkles: [left %, top %, delay s, scale]. */
const TWINKLES = [
  [8, 12, 0, 1],
  [86, 8, 0.7, 0.8],
  [18, 38, 1.4, 0.6],
  [92, 34, 0.3, 1.1],
  [6, 66, 1.9, 0.9],
  [80, 58, 1.1, 0.7],
  [30, 88, 0.5, 0.8],
  [70, 92, 1.6, 1],
  [52, 5, 2.2, 0.6],
] as const;

function Twinkles() {
  return (
    <div class={s.twinkles} aria-hidden="true">
      {TWINKLES.map(([x, y, delay, k]) => (
        <svg key={`${x}-${y}`} viewBox="-6 -6 12 12" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${-delay}s`, scale: String(k) }}>
          <path d={SPARKLE_PATH} fill="#FFF3C4" />
        </svg>
      ))}
    </div>
  );
}

const HINT: Record<number, string> = { 3: 'Something special… tap to crack it!', 2: 'Keep going!', 1: 'One more tap!' };

/**
 * Full-screen reveal (DESIGN §9.3 steps 4–5): the capsule floats in with rarity anticipation,
 * pops open with rays and confetti, and the item springs up above its card.
 */
export function RevealOverlay({ data, origin, quickOpen, onClose, onPullAgain, initialStage, initialCracks = 0 }: RevealOverlayProps) {
  const reduced = prefersReducedMotion();
  const [stage, setStage] = useState<RevealStage>(initialStage ?? (data.via === 'wish' ? 'open' : quickOpen ? 'card' : 'anticipate'));
  const [cracks, setCracks] = useState(initialCracks);
  const [shake, setShake] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const flyer = useRef<HTMLDivElement>(null);
  const capsuleButton = useRef<HTMLButtonElement>(null);
  const itemEl = useRef<HTMLDivElement>(null);
  const stageEl = useRef<HTMLDivElement>(null);
  const stageCenter = useRef<number | null>(null);
  const celebrated = useRef(false);
  const left = TAPS[data.rarity] - cracks;

  useFocusTrap(root, true, () => (stage === 'anticipate' ? pop() : onClose()));

  // Lock page scroll underneath.
  useEffect(() => {
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = 'hidden';
    return () => {
      el.style.overflow = prev;
    };
  }, []);

  // The capsule flies up from the machine's tray to center stage.
  useLayoutEffect(() => {
    const el = flyer.current;
    if (!el || !origin || reduced || stage !== 'anticipate') return;
    const end = el.getBoundingClientRect();
    const dx = origin.left + origin.width / 2 - (end.left + end.width / 2);
    const dy = origin.top + origin.height / 2 - (end.top + end.height / 2);
    const k = Math.max(0.1, origin.width / end.width);
    el.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${k})` }, { transform: 'none' }], { duration: 560, easing: 'cubic-bezier(.34,1.36,.64,1)' });
  }, []);

  // When the card slides in, the stage glides up to make room instead of jumping (FLIP).
  useLayoutEffect(() => {
    const el = stageEl.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const center = r.top + r.height / 2;
    const before = stageCenter.current;
    stageCenter.current = center;
    if (before === null || reduced || Math.abs(before - center) < 1) return;
    el.animate([{ transform: `translateY(${before - center}px)` }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' });
  }, [stage]);

  useEffect(() => {
    if (stage === 'anticipate') capsuleButton.current?.focus({ preventScroll: true });
    if (stage === 'open' || (stage === 'card' && !celebrated.current)) celebrate();
    if (stage === 'open') {
      const t = setTimeout(() => setStage('card'), reduced ? 250 : 720);
      return () => clearTimeout(t);
    }
  }, [stage]);

  function celebrate() {
    if (celebrated.current) return;
    celebrated.current = true;
    sfx.play(`reveal-${data.rarity}`);
    haptic(data.rarity === 'rare' || data.rarity === 'ultra' ? 'success' : 'medium');
    if (reduced) return;
    requestAnimationFrame(() => {
      const r = itemEl.current?.getBoundingClientRect();
      burst({ ...CONFETTI[data.rarity], ...(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null) });
    });
  }

  function pop() {
    if (stage !== 'anticipate') return;
    setStage('open');
  }

  function tap() {
    if (stage !== 'anticipate') return;
    if (left > 1) {
      const next = cracks + 1;
      setCracks(next);
      setShake((n) => n + 1);
      sfx.play('crack', { pitch: 1 + next * 0.18 });
      haptic('medium');
      return;
    }
    if (data.rarity === 'ultra') {
      // Last tap: the light breaks through for a beat before it bursts.
      setCracks(TAPS.ultra);
      sfx.play('crack', { pitch: 1.6 });
      haptic('medium');
      setTimeout(() => setStage('open'), reduced ? 0 : 260);
      return;
    }
    sfx.play('pop');
    pop();
  }

  const opened = stage !== 'anticipate';
  return createPortal(
    <div ref={root} class={cx(s.overlay, s[data.rarity], reduced && s.reduced)} role="dialog" aria-modal="true" aria-label="Capsule reveal" tabIndex={-1}>
      <Twinkles />
      <div ref={stageEl} class={cx(s.stage, stage === 'card' && s.withCard)}>
        {opened && !reduced && <Rays rarity={data.rarity} class={s.rays} />}
        <div class={cx(s.glow, !opened && s.dim)} aria-hidden="true" />

        {!opened ? (
          <div ref={flyer} class={s.flyer}>
            <button
              ref={capsuleButton}
              type="button"
              class={cx(s.capsule, shake > 0 && (shake % 2 ? s.shakeA : s.shakeB))}
              onClick={tap}
              aria-label={left > 1 ? `Crack the capsule open, ${left} taps to go` : 'Open the capsule'}
            >
              <CapsuleArt rarity={data.rarity} color={data.shell.color} color2={data.shell.color2} cracks={cracks} size="100%" animated />
            </button>
            <p class={s.hint} aria-hidden="true">
              {data.rarity === 'ultra' ? HINT[left] : 'Tap to open!'}
            </p>
          </div>
        ) : (
          <>
            {data.via === 'pull' && !reduced && stage === 'open' && (
              <div class={s.halves} aria-hidden="true">
                <CapsuleArt rarity={data.rarity} color={data.shell.color} color2={data.shell.color2} cracks={cracks} size="100%" svgClass={s.popping} />
              </div>
            )}
            {!reduced && stage === 'open' && <div class={s.flash} aria-hidden="true" />}
            <div ref={itemEl} class={cx(s.item, quickOpen && stage === 'card' && s.itemQuick)}>
              <CollectibleArt id={data.itemId} size="100%" animated />
            </div>
          </>
        )}
      </div>

      {stage === 'card' && <RevealCard data={data} onClose={onClose} onPullAgain={onPullAgain} />}
    </div>,
    document.body,
  );
}
