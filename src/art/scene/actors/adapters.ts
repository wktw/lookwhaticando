/**
 * The art modules' components as the scene uses them: PetArt (with `pose` and `light`) and PlantArt (with `light`,
 * `damp`, `layer`, `look`). Plain re-exports; the scene's pose vocabulary is PetArt's.
 */
export { PetArt as Pet, type ArtPose as PetPose } from '@/art/pets/PetArt';
export { PlantArt as Plant } from '@/art/plants';
