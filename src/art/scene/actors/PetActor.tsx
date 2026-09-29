/**
 * A pet on the Shelf: PetArt in the scene's light, at a spot, with a long shadow when it stands in
 * the sunbeam. Moves are CSS transitions on transform (compositor only); walking adds a gait on an
 * inner wrapper (a cow's four-beat bob, a duck's waddle, small hops), all paused off screen.
 */
import type { Outfit } from '@/state/types';
import type { Expression } from '@/art/pets/types';
import type { Light } from '@/art/light';
import type { Species } from '@/catalog/types';
import type { PetSpot } from '../model';
import { depthScale, PET_BASELINE } from '../room';
import { Pet, type PetPose } from './adapters';
import { moveTo, u } from './stand';
import s from '../shelf.module.css';

export interface ActorView extends PetSpot {
  /** Milliseconds for the move to this spot (0 = jump there). */
  move?: number;
  /** A two-stage hop up or down (a cat onto a pot rim). */
  hop?: boolean;
  /** A passing expression (a reaction); otherwise asleep or at rest. */
  expression?: Expression;
  /** Standing in the sun: throw a long shadow across the sill. */
  sunny?: boolean;
}

export interface PetActorProps {
  id: string;
  petId: string;
  species: Species;
  view: ActorView;
  /** Canvas edge in units. */
  size: number;
  light: Light;
  outfit?: Outfit;
  /** The surface colour the long shadow shows (the bare sill through the beam). */
  castColor?: string;
  /** Per unit of height: [across, toward the front] (see castVector). */
  cast?: readonly [number, number];
  animated?: boolean;
  label?: string;
}

const GAIT: Partial<Record<Species, string>> = {
  cow: s.gaitCow,
  duck: s.gaitDuck,
  frog: s.gaitHop,
  bunny: s.gaitHop,
  hamster: s.gaitScurry,
};

/** A rough silhouette per pose, for the long shadow: [half width, height] on the pet canvas. */
const SILHOUETTE: Record<PetPose, readonly [number, number]> = {
  sit: [15, 44],
  loaf: [22, 30],
  stand: [24, 38],
  walk: [24, 38],
  sleep: [21, 20],
};

/** Pets in the sun throw a longer shadow than the pots do (DESIGN §10.4). */
const LONGER = 1.35;

export function PetActor({ id, petId, species, view, size, light, outfit, castColor, cast, animated = true, label }: PetActorProps) {
  const scale = depthScale(view.depth);
  const walking = view.pose === 'walk';
  const gait = walking ? (GAIT[species] ?? s.gaitPad) : '';
  const expression: Expression = view.expression ?? (view.asleep ? 'sleep' : 'idle');
  const [hw, h] = SILHOUETTE[view.pose];
  const showCast = !!(view.sunny && castColor && cast && !view.perch);
  return (
    <div
      class={s.actor}
      data-pet={id}
      data-species={species}
      style={{
        width: u(size),
        height: u(size),
        zIndex: view.z,
        transform: moveTo(view.x, view.y, size, PET_BASELINE, scale),
        transformOrigin: `50% ${PET_BASELINE}%`,
        transitionDuration: view.move ? `${Math.round(view.move)}ms` : undefined,
      }}
    >
      {showCast && (
        <svg class={s.cast} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <ellipse
            cx={0}
            cy={-h / 2}
            rx={hw}
            ry={h / 2}
            fill={castColor}
            transform={`translate(50 ${PET_BASELINE}) matrix(1 0 ${+(-cast![0] * LONGER).toFixed(3)} ${+(-cast![1] * LONGER).toFixed(3)} 0 0)`}
          />
        </svg>
      )}
      <div class={[s.body, gait, view.hop ? s.hop : ''].filter(Boolean).join(' ')}>
        <Pet
          petId={petId}
          pose={view.pose}
          light={light}
          facing={view.facing}
          expression={expression}
          outfit={outfit}
          animated={animated}
          size="100%"
          title={label}
        />
      </div>
    </div>
  );
}
