/**
 * Idle life for the machine on screen (DESIGN §10.4): every few seconds one small "beat"
 * plays once and stops: a blink, a tail flick, an ear twitch, a twinkle, a falling raindrop.
 * Nothing loops. Animating inside a large SVG repaints the whole drawing on every frame, so
 * a machine at rest must cost nothing between beats.
 *
 * Beats find their elements by the class names the motifs use. Each element's transform-box
 * and transform-origin live in machine.css.
 */

interface Beat {
  selector: string;
  weight: number;
  play: (els: Element[]) => Animation[];
}

const ease = 'cubic-bezier(.45,0,.55,1)';

function pickSome(els: Element[], n: number): Element[] {
  return [...els].sort(() => Math.random() - 0.5).slice(0, n);
}

const BEATS: Beat[] = [
  {
    selector: '.machine-eye',
    weight: 3,
    play: (els) => {
      // Now and then a double blink.
      const frames = Math.random() < 0.3 ? [1, 0.1, 1, 0.1, 1] : [1, 0.1, 1];
      return els.map((el) =>
        el.animate(
          frames.map((k) => ({ transform: `scaleY(${k})` })),
          { duration: frames.length * 90, easing: 'ease-in-out' },
        ),
      );
    },
  },
  {
    selector: '.machine-tail',
    weight: 2,
    play: (els) =>
      els.map((el) =>
        el.animate(
          [
            { transform: 'rotate(0deg)' },
            { transform: 'rotate(-7deg)' },
            { transform: 'rotate(9deg)' },
            { transform: 'rotate(-3deg)' },
            { transform: 'rotate(0deg)' },
          ],
          { duration: 1400, easing: ease },
        ),
      ),
  },
  {
    selector: '.machine-ear',
    weight: 1.5,
    play: (els) =>
      els.map((el) =>
        el.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-11deg)' }, { transform: 'rotate(4deg)' }, { transform: 'rotate(0deg)' }], {
          duration: 420,
          easing: 'ease-out',
        }),
      ),
  },
  {
    selector: '.machine-twinkle',
    weight: 2.5,
    play: (els) =>
      pickSome(els, 2).map((el, i) =>
        el.animate(
          [
            { transform: 'scale(1) rotate(0deg)', opacity: 1 },
            { transform: 'scale(1.4) rotate(20deg)', opacity: 1, offset: 0.35 },
            { transform: 'scale(0.7) rotate(0deg)', opacity: 0.55, offset: 0.7 },
            { transform: 'scale(1) rotate(0deg)', opacity: 1 },
          ],
          { duration: 900, delay: i * 280, easing: ease },
        ),
      ),
  },
  {
    selector: '.machine-float',
    weight: 2,
    play: (els) =>
      els.map((el, i) =>
        el.animate(
          [
            { transform: 'translateY(0) rotate(0deg)' },
            { transform: 'translateY(-6px) rotate(-8deg)', offset: 0.4 },
            { transform: 'translateY(-2px) rotate(6deg)', offset: 0.75 },
            { transform: 'translateY(0) rotate(0deg)' },
          ],
          { duration: 1800, delay: i * 220, easing: ease },
        ),
      ),
  },
  {
    selector: '.machine-drop',
    weight: 2,
    // Each drop falls from the cloud, fades, then beads up again where it was.
    play: (els) =>
      els.map((el, i) =>
        el.animate(
          [
            { transform: 'translateY(0)', opacity: 1 },
            { transform: 'translateY(15px)', opacity: 0, offset: 0.62, easing: 'step-end' },
            { transform: 'translateY(-2px) scale(0.3)', opacity: 0, offset: 0.64 },
            { transform: 'translateY(0) scale(1)', opacity: 1 },
          ],
          { duration: 1300, delay: i * 190, easing: 'cubic-bezier(.5,0,.9,.6)' },
        ),
      ),
  },
  {
    selector: '.machine-petal',
    weight: 1.5,
    play: (els) =>
      els.map((el, i) =>
        el.animate(
          [
            { transform: 'translate(0, 0) rotate(0deg)' },
            { transform: 'translate(4px, 6px) rotate(26deg)', offset: 0.5 },
            { transform: 'translate(0, 0) rotate(0deg)' },
          ],
          { duration: 2600, delay: i * 400, easing: ease },
        ),
      ),
  },
  {
    selector: '.machine-sway',
    weight: 2,
    play: (els) =>
      els.map((el) =>
        el.animate(
          [
            { transform: 'rotate(0deg)' },
            { transform: 'rotate(-6deg)' },
            { transform: 'rotate(5deg)' },
            { transform: 'rotate(-2deg)' },
            { transform: 'rotate(0deg)' },
          ],
          { duration: 1700, easing: ease },
        ),
      ),
  },
];

export interface IdleLifeOptions {
  /** Checked before every beat (e.g. reduced motion). */
  enabled?: () => boolean;
}

/** Start the beats on a rendered machine. Returns a stop function that also cancels a running beat. */
export function startIdleLife(svg: SVGSVGElement, { enabled = () => true }: IdleLifeOptions = {}): () => void {
  const available = BEATS.map((b) => ({ beat: b, els: Array.from(svg.querySelectorAll(b.selector)) })).filter((b) => b.els.length > 0);
  if (available.length === 0 || typeof svg.animate !== 'function') return () => {};

  let timer = 0;
  let running: Animation[] = [];
  let last: Beat | null = null;
  let stopped = false;

  const schedule = (ms: number) => {
    timer = window.setTimeout(play, ms);
  };

  function play() {
    if (stopped) return;
    if (document.hidden || !enabled()) {
      schedule(4000);
      return;
    }
    // Weighted pick, never the same beat twice in a row (unless it's the only one).
    const pool = available.length > 1 ? available.filter((b) => b.beat !== last) : available;
    let roll = Math.random() * pool.reduce((sum, b) => sum + b.beat.weight, 0);
    const pick = pool.find((b) => (roll -= b.beat.weight) <= 0) ?? pool[0]!;
    last = pick.beat;
    running = pick.beat.play(pick.els);
    Promise.all(running.map((a) => a.finished.catch(() => undefined))).then(() => {
      running = [];
      if (!stopped) schedule(2600 + Math.random() * 4200);
    });
  }

  schedule(1200 + Math.random() * 1400);
  return () => {
    stopped = true;
    clearTimeout(timer);
    for (const a of running) a.cancel();
    running = [];
  };
}
