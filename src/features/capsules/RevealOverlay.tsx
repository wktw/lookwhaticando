import { createPortal } from 'preact/compat';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { getCollectible } from '@/catalog/collectibles';
import { MACHINE_BY_ID, seriesLabel } from '@/catalog/machines';
import { DAY_LIGHT, type Light } from '@/art/light';
import { CollectibleArt } from '@/art/CollectibleArt';
import { CapsuleArt } from '@/art/machines/CapsuleArt';
import { CapsuleFigure } from './CapsuleFigure';
import { sfx } from '@/fx/sound';
import { haptic } from '@/fx/haptics';
import { cx } from './ui/CandyButton';
import { useFocusTrap } from './ui/useFocusTrap';
import { lockScroll } from './ui/scrollLock';
import { prefersReducedMotion } from './motion';
import { angleDelta } from './ratchet';
import { TwistTracker } from './twist';
import { tierLabel } from './copy';
import { RevealCard, type PullAgainOffer } from './RevealCard';
import { finishFor, type RevealData } from './reveal';
import s from './RevealOverlay.module.css';

export type RevealStage = 'anticipate' | 'open' | 'card';

/** Where a revealed pet or decor goes next (DESIGN §7.2 step 7; the placement UI comes later). */
export interface PlaceHandlers {
  /** "Find them a place": pick a spot for it. */
  onPlace?: (itemId: string) => void;
  /** "Let them choose": species preferences decide. */
  onLetThemChoose?: (itemId: string) => void;
}

export interface RevealOverlayProps extends PlaceHandlers {
  data: RevealData;
  /** Screen rect the capsule comes from (the cabinet's chute). */
  origin?: DOMRect | null;
  /** Skip the anticipation and go straight to the card (Preferences › Quick open). */
  quickOpen?: boolean;
  /** The scene's light, so the capsule matches the cabinet it came out of. */
  light?: Light;
  onClose: () => void;
  /** Offered when another pull can be paid for (the card shows how). */
  pullAgain?: PullAgainOffer;
  /** Where focus goes on close if the element that opened the reveal is gone. */
  returnFocus?: () => HTMLElement | null | undefined;
  /** Start at a given stage (gallery). */
  initialStage?: RevealStage;
  /** A Secret already this many taps in (gallery). */
  initialCracks?: number;
}

/** A Secret takes three twists or taps, each one opening the seam a little further. */
const STEPS = (secret: boolean) => (secret ? 3 : 1);
/** One arrow key press twists this far. */
const KEY_TWIST = 30;

/**
 * The reveal (DESIGN §7.2 steps 4–6): the capsule, close up, in a pool of window light (or lamp
 * light). Twist it open, or tap. The halves part, and the figure steps out onto its folded
 * paper insert, which opens out into the reveal card.
 */
export function RevealOverlay({
  data,
  origin,
  quickOpen,
  light = DAY_LIGHT,
  onClose,
  pullAgain,
  returnFocus,
  initialStage,
  initialCracks = 0,
  onPlace,
  onLetThemChoose,
}: RevealOverlayProps) {
  const reduced = prefersReducedMotion();
  // Pulls arrive in a capsule, and so does an ordered Secret (it stays a surprise). Other orders arrive unboxed.
  const inCapsule = data.via === 'pull' || data.secret;
  const [stage, setStage] = useState<RevealStage>(initialStage ?? (!inCapsule || quickOpen ? 'card' : 'anticipate'));
  const [cracks, setCracks] = useState(initialCracks);
  const root = useRef<HTMLDivElement>(null);
  const flyer = useRef<HTMLDivElement>(null);
  const capsuleButton = useRef<HTMLButtonElement>(null);
  const capsuleSvg = useRef<HTMLDivElement>(null);
  const celebrated = useRef(false);
  const tracker = useRef<TwistTracker | null>(null);
  if (!tracker.current) {
    tracker.current = new TwistTracker(STEPS(data.secret));
    for (let i = 0; i < initialCracks; i++) tracker.current.tap();
  }
  const drag = useRef<{ id: number; cx: number; cy: number; last: number; moved: number } | null>(null);
  const suppressClick = useRef(false);

  const def = getCollectible(data.itemId);
  const machine = data.machineId ? MACHINE_BY_ID.get(data.machineId) : undefined;
  const finish = finishFor(data);
  const stepsLeft = STEPS(data.secret) - cracks;
  // What's inside shows through the clear half as a silhouette; a Secret keeps its secret.
  const figure = data.secret ? undefined : <CapsuleFigure id={data.itemId} />;
  const figureInk = machine?.theme.ink;

  // Esc during the anticipation opens it straight away (the item is already yours, so closing
  // unseen would throw the moment away); once it's open, Esc closes.
  useFocusTrap(root, true, { onEscape: () => (stage === 'anticipate' ? open() : onClose()), returnFocus });

  useEffect(() => lockScroll(), []);

  // The capsule comes up out of the chute to the middle of the room.
  useLayoutEffect(() => {
    const el = flyer.current;
    if (!el || !origin || reduced || stage !== 'anticipate') return;
    const end = el.getBoundingClientRect();
    if (!end.width) return;
    const dx = origin.left + origin.width / 2 - (end.left + end.width / 2);
    const dy = origin.top + origin.height / 2 - (end.top + end.height / 2);
    const k = Math.max(0.1, origin.width / end.width);
    el.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${k})` }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }, []);

  useEffect(() => {
    if (stage === 'anticipate') capsuleButton.current?.focus({ preventScroll: true });
    // The capsule button is gone while the halves part: keep focus (and Esc) inside the dialog.
    if (stage === 'open') root.current?.focus({ preventScroll: true });
    if (stage !== 'anticipate') celebrate();
    if (stage === 'open') {
      const t = setTimeout(() => setStage('card'), reduced ? 200 : 900);
      return () => clearTimeout(t);
    }
  }, [stage]);

  function celebrate() {
    if (celebrated.current) return;
    celebrated.current = true;
    sfx.play(`reveal-${data.rarity}`);
    if (data.secret) sfx.play('sparkle');
    haptic(data.rarity === 'rare' || data.rarity === 'ultra' ? 'success' : 'medium');
  }

  function open() {
    if (stage !== 'anticipate') return;
    sfx.play('pop');
    setStage('open');
  }

  const setTwist = (deg: number) => capsuleSvg.current?.style.setProperty('--twist', `${deg.toFixed(1)}deg`);

  /** After a twist or a tap: crack the Secret's seam a step further, or open. */
  function afterStep() {
    const t = tracker.current!;
    if (t.done) {
      setTwist(0);
      open();
      return;
    }
    if (t.stepsDone > cracks) {
      setCracks(t.stepsDone);
      setTwist(0);
      sfx.play('crack', { pitch: 1 + t.stepsDone * 0.18 });
      haptic('medium');
    }
  }

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || stage !== 'anticipate') return;
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    const cx0 = r.left + r.width / 2;
    const cy0 = r.top + r.height / 2;
    drag.current = { id: e.pointerId, cx: cx0, cy: cy0, last: (Math.atan2(e.clientY - cy0, e.clientX - cx0) * 180) / Math.PI, moved: 0 };
    el.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const a = (Math.atan2(e.clientY - d.cy, e.clientX - d.cx) * 180) / Math.PI;
    const delta = angleDelta(d.last, a);
    d.last = a;
    d.moved += Math.abs(delta);
    tracker.current!.turn(delta);
    setTwist(tracker.current!.angle);
    afterStep();
  };
  const onPointerUp = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    suppressClick.current = d.moved >= 10;
    tracker.current!.release();
    setTwist(0);
  };
  const onClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    tracker.current!.tap();
    afterStep();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const t = tracker.current!;
    const dir = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 1;
    const before = t.stepsDone;
    for (let i = 0; i < KEY_TWIST / 10; i++) t.turn(dir * 10);
    setTwist(t.angle);
    afterStep();
    if (t.stepsDone > before || t.done) t.release();
  };

  const label =
    stepsLeft > 1
      ? `Open the capsule, ${tierLabel(data.rarity, data.secret)} finish: twist it or tap it, ${stepsLeft} more times`
      : `Open the capsule, ${tierLabel(data.rarity, data.secret)} finish: twist it or tap it`;
  const hint = data.secret
    ? stepsLeft === 3
      ? 'This one holds on tight. Twist, or tap'
      : stepsLeft === 2
        ? 'The seam gives a little'
        : 'Once more'
    : 'Twist to open, or tap';

  return createPortal(
    <div
      ref={root}
      class={cx(s.overlay, light.night && s.night, reduced && s.reduced, s[`finish-${finish}`])}
      role="dialog"
      aria-modal="true"
      aria-label="Capsule reveal"
      tabIndex={-1}
    >
      <div class={s.pool} aria-hidden="true" />
      <div class={s.content}>
        {machine && stage !== 'card' && <p class={s.kicker}>{seriesLabel(machine)}</p>}

        {stage === 'anticipate' && (
          <div ref={flyer} class={s.flyer}>
            <button
              ref={capsuleButton}
              type="button"
              class={s.capsule}
              aria-label={label}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onClick={onClick}
              onKeyDown={onKeyDown}
            >
              <div ref={capsuleSvg} class={s.capsuleArt}>
                <CapsuleArt
                  finish={finish}
                  color={data.shell.color}
                  color2={data.shell.color2}
                  machineId={data.machineId}
                  cracks={cracks}
                  light={light}
                  figure={figure}
                  figureInk={figureInk}
                  size="100%"
                />
              </div>
            </button>
            <p class={s.hint} aria-hidden="true">
              {hint}
            </p>
          </div>
        )}

        {stage === 'open' && (
          <div class={s.opening} aria-hidden="true">
            {inCapsule && (
              <div class={s.capsuleArt}>
                <CapsuleArt
                  finish={finish}
                  color={data.shell.color}
                  color2={data.shell.color2}
                  machineId={data.machineId}
                  state={reduced ? 'parting' : 'open'}
                  light={light}
                  size="100%"
                />
              </div>
            )}
            <div class={s.rising}>
              <CollectibleArt id={data.itemId} size="100%" />
            </div>
          </div>
        )}

        {stage === 'card' && def && (
          <RevealCard
            data={data}
            light={light}
            onClose={onClose}
            pullAgain={pullAgain}
            onPlace={onPlace}
            onLetThemChoose={onLetThemChoose}
            quick={!!quickOpen}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
