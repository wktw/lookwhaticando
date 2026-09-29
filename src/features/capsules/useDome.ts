import { useEffect, useRef, useState } from 'preact/hooks';
import type { MachineDef, MachineId } from '@/catalog/types';
import type { CapsuleSim, DomeBody } from '@/fx/physics';
import { createMachineSim } from '@/art/machines/pile';
import { capsuleTransforms, type CapsuleNodes } from '@/art/machines/WindowCapsules';
import { prefersReducedMotion } from './motion';

/** One sim per cabinet for the whole session, so a cabinet keeps its pile across swipes and tabs. */
const sims = new Map<MachineId, CapsuleSim>();

function machineSim(machine: MachineDef): CapsuleSim {
  let sim = sims.get(machine.id);
  if (!sim) {
    sim = createMachineSim(machine);
    sims.set(machine.id, sim);
  }
  return sim;
}

export interface DomeController {
  /** Capsules to render (changes only when one leaves or arrives). */
  bodies: readonly DomeBody[];
  register: (id: number, nodes: CapsuleNodes | null) => void;
  stir: (strength: number, swirl?: number) => void;
  /** Take the capsule over the exit (a `prefer`red one if it's close); returns it for the drop animation. */
  release: (prefer?: (b: DomeBody) => boolean) => DomeBody | null;
  refill: () => void;
}

/**
 * Runs the window's physics while it is awake and the page is visible, writing each capsule's
 * transform straight to its SVG nodes (never through Preact state), then goes idle.
 */
export function useDome(machine: MachineDef, active: boolean): DomeController {
  const sim = machineSim(machine);
  const [bodies, setBodies] = useState<readonly DomeBody[]>(() => [...sim.bodies]);
  const nodes = useRef(new Map<number, CapsuleNodes>()).current;
  const loop = useRef({ raf: 0, last: 0 }).current;

  const write = () => {
    for (const b of sim.bodies) {
      const n = nodes.get(b.id);
      if (!n) continue;
      const t = capsuleTransforms(b);
      n.root.setAttribute('transform', t.root);
      n.shell.setAttribute('transform', t.shell);
    }
  };

  const frame = (now: number) => {
    const dt = (now - loop.last) / 1000;
    loop.last = now;
    const awake = sim.step(dt);
    write();
    loop.raf = awake ? requestAnimationFrame(frame) : 0;
  };

  const kick = () => {
    if (loop.raf || !active || document.hidden || !sim.awake) return;
    // Reduced motion: jump straight to the resting pile instead of animating there.
    if (prefersReducedMotion()) {
      sim.settle();
      write();
      return;
    }
    loop.last = performance.now();
    loop.raf = requestAnimationFrame(frame);
  };

  const stop = () => {
    if (loop.raf) cancelAnimationFrame(loop.raf);
    loop.raf = 0;
  };

  useEffect(() => {
    if (!active) return;
    const onVisibility = () => (document.hidden ? stop() : kick());
    document.addEventListener('visibilitychange', onVisibility);
    kick();
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, [active]);

  return {
    bodies,
    register: (id, n) => (n ? nodes.set(id, n) : nodes.delete(id)),
    stir: (strength, swirl = 0) => {
      if (prefersReducedMotion()) return;
      sim.agitate(strength, swirl);
      kick();
    },
    release: (prefer) => {
      const b = sim.removeOne(prefer);
      setBodies([...sim.bodies]);
      kick();
      return b;
    },
    refill: () => {
      sim.addOne();
      setBodies([...sim.bodies]);
      kick();
    },
  };
}
