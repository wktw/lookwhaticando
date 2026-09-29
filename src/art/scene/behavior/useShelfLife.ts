/**
 * Runs the pets' director for a scene: live while the scene is on screen and its tab visible, still
 * under reduced motion (DESIGN §10.5), and not at all when `live` is off (the gallery, photo mode).
 */
import type { RefObject } from 'preact';
import { useCallback, useEffect, useMemo } from 'preact/hooks';
import type { Signal } from '@preact/signals';
import { prefersReducedMotion } from '@/fx/motion';
import type { PetSpot } from '../model';
import type { ActorView } from '../actors/PetActor';
import type { Moment } from '../time';
import { useVisible } from '../hooks';
import { Director, type DirectorPet } from './director';
import { petNode } from '../query';

export function useShelfLife(
  pets: readonly DirectorPet[],
  start: ReadonlyMap<string, PetSpot>,
  { moment, live, sceneRef, vignettes = true, opening }: { moment: Moment; live: boolean; sceneRef: RefObject<HTMLElement>; vignettes?: boolean; opening?: string },
): { views: ReadonlyMap<string, Signal<ActorView>>; director: Director } {
  const director = useMemo(
    () =>
      new Director(pets, start, {
        moment,
        vignettes,
        reduced: prefersReducedMotion,
        element: (key) => petNode(sceneRef.current, key),
      }),
    // A new cast or a new stage makes a new director; the moment is passed on below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pets, start],
  );

  useEffect(() => director.setMoment(moment), [director, moment]);

  const onVisible = useCallback(
    (visible: boolean) => {
      if (!live) return;
      if (visible) director.start();
      else director.stop();
    },
    [director, live],
  );
  useVisible(sceneRef, onVisible);

  useEffect(() => {
    if (!live) return;
    director.start();
    // A staged vignette plays out (a line of ducks walks on) once the scene is live.
    const t = opening ? setTimeout(() => director.playVignette(opening), 400) : undefined;
    return () => {
      clearTimeout(t);
      director.stop();
    };
  }, [director, live, opening]);

  return { views: director.views, director };
}
