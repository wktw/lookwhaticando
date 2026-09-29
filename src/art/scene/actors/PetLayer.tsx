/** The pets out in one segment of the Shelf, each re-rendering only when its own spot changes. */
import type { Signal } from '@preact/signals';
import type { Light } from '@/art/light';
import type { ShelfPet } from '../model';
import { petKey, speciesOf } from '../model';
import { PetActor, type ActorView, type PetActorProps } from './PetActor';
import type { PetTouchLayer } from './usePetTouch';

export interface PetLayerProps {
  pets: readonly ShelfPet[];
  views: ReadonlyMap<string, Signal<ActorView>>;
  size: number;
  light: Light;
  castColor?: string;
  cast?: readonly [number, number];
  animated?: boolean;
  /** Passing reactions (the Today band's look-up), by pet key. */
  expressions?: Readonly<Record<string, ActorView['expression']>>;
  /** Touch: buttons, answers and name tags (usePetTouch). */
  touch?: PetTouchLayer;
}

export function PetLayer({ pets, views, size, light, castColor, cast, animated, expressions, touch }: PetLayerProps) {
  return (
    <>
      {pets.map((p) => {
        const key = petKey(p);
        const view = views.get(key);
        if (!view) return null;
        return (
          <LiveActor
            key={key}
            view={view}
            id={key}
            petId={p.petId}
            species={speciesOf(p.petId)}
            size={size}
            light={light}
            outfit={p.outfit}
            castColor={castColor}
            cast={cast}
            animated={animated}
            label={p.name}
            expression={expressions?.[key]}
            touch={touch?.touchFor(p)}
            reaction={touch?.reactions[key]}
          />
        );
      })}
    </>
  );
}

function LiveActor({ view, expression, ...rest }: Omit<PetActorProps, 'view'> & { view: Signal<ActorView>; expression?: ActorView['expression'] }) {
  const v = view.value;
  return <PetActor {...rest} view={expression ? { ...v, expression } : v} />;
}
