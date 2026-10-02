/**
 * The Shelf's touch layer for its pets (DESIGN §8.2): which pet was touched how, the pet's own answer (unlimited:
 * only the XP is capped, and that is the store's business), its name tag after a tap, and a carried pet's landing.
 * Scenes share it; the screen hears about each touch through `onPet` and opens the Pet Card through `onOpenPet`.
 */
import type { RefObject } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Signal } from '@preact/signals';
import { getCollectible } from '@/catalog/collectibles';
import type { Expression } from '@/art/pets/types';
import type { PetGesture, PetSpot, ShelfPet } from '../model';
import { petKey, speciesOf } from '../model';
import { groundSpot, nearestFree, occupiesFloor, REST_POSE, type Ground } from '../arrange';
import type { ActorView, PetTouch } from './PetActor';
import { reactionFor, type Reaction } from './touch';
import { petNode } from '../query';

/** How long the name tag stays up after a tap (ms). */
export const NAME_TAG_MS = 4500;

export interface PetTouchOptions {
  pets: readonly ShelfPet[];
  views: ReadonlyMap<string, Signal<ActorView>>;
  sceneRef: RefObject<HTMLElement>;
  /** The ground each pet stands on (for a carried pet's landing). */
  groundOf: (key: string) => Ground | undefined;
  onPet?: (key: string, rect: DOMRect, gesture: PetGesture) => void;
  onOpenPet?: (key: string) => void;
  /** Pets are buttons (default: when the scene has a handler). */
  interactive?: boolean;
  /** A hand has the pet / lets it go (the director waits meanwhile). */
  hold?: (key: string) => void;
  release?: (key: string, at?: PetSpot) => void;
}

export interface PetTouchLayer {
  touchFor(p: ShelfPet): PetTouch | undefined;
  reactions: Readonly<Record<string, Reaction & { nonce: number }>>;
  /** A passing expression, for the scene's handle (`react(key, expression)`). */
  react(key: string, expression: Expression, ms?: number): void;
}

let nonces = 0;

export function petLabel(p: ShelfPet): string {
  const base = p.petId.startsWith('moonlit:') ? p.petId.slice('moonlit:'.length) : p.petId;
  return p.name ?? getCollectible(base)?.name ?? 'A pet';
}

export function usePetTouch(o: PetTouchOptions): PetTouchLayer {
  const [reactions, setReactions] = useState<Record<string, Reaction & { nonce: number }>>({});
  const [tag, setTag] = useState<string | null>(null);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = useCallback((id: string, fn: () => void, ms: number) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.set(id, setTimeout(fn, ms));
  }, []);
  const opts = useRef(o);
  opts.current = o;

  const answer = useCallback(
    (key: string, r: Reaction) => {
      if (!r.ms) return;
      setReactions((all) => ({ ...all, [key]: { ...r, nonce: ++nonces } }));
      later(`r:${key}`, () => setReactions(({ [key]: _gone, ...rest }) => rest), r.ms);
    },
    [later],
  );

  const react = useCallback((key: string, expression: Expression, ms = 900) => answer(key, { expression, ms }), [answer]);

  const interactive = o.interactive ?? !!(o.onPet || o.onOpenPet);
  const touchFor = useMemo(() => {
    if (!interactive) return () => undefined;
    const cache = new Map<string, PetTouch>();
    return (p: ShelfPet): PetTouch | undefined => {
      const key = petKey(p);
      const species = speciesOf(p.petId);
      const asleep = () => !!opts.current.views.get(key)?.peek().asleep;
      const t: PetTouch = cache.get(key) ?? {
        label: petLabel(p),
        onGesture(gesture, rect) {
          answer(key, reactionFor(gesture, species, asleep()));
          if (gesture === 'tap') {
            setTag(key);
            later('tag', () => setTag((k) => (k === key ? null : k)), NAME_TAG_MS);
          }
          opts.current.onPet?.(key, rect, gesture);
        },
        onCarry(phase, dx) {
          const { views, sceneRef, groundOf } = opts.current;
          const view = views.get(key);
          if (phase === 'lift') {
            opts.current.hold?.(key);
            const el = petNode(sceneRef.current, key);
            opts.current.onPet?.(key, el?.getBoundingClientRect() ?? new DOMRect(), 'carry');
            return;
          }
          const g = groundOf(key);
          const at = view?.peek();
          const unit = (sceneRef.current?.clientHeight ?? 100) / 100;
          if (!g || !at) return opts.current.release?.(key);
          const taken: number[] = [];
          for (const [k, v] of views) if (k !== key && groundOf(k) === g && occupiesFloor(g, v.peek())) taken.push(v.peek().x);
          const x = nearestFree(g, at.x + dx / unit, taken);
          const spot = groundSpot(g, x, at.perch ? (g.d0 + g.d1) / 2 : at.depth, REST_POSE[species], false, at.facing);
          if (opts.current.release) opts.current.release(key, spot);
          else if (view) view.value = { ...spot, move: 0 };
          answer(key, reactionFor('drop', species, false));
        },
      };
      cache.set(key, t);
      return { ...t, tagOpen: tag === key, onOpen: o.onOpenPet ? () => opts.current.onOpenPet?.(key) : undefined };
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, tag, answer, later, !!o.onOpenPet]);

  return { touchFor, reactions, react };
}
