/**
 * Scene art: the Meadow (where pets live) and the Today windowsill header.
 *
 * <MeadowScene> fills its container and renders sky (by time of day), hills, the big tree,
 * fence and gate, wildflowers, placed decor and a planter box. Pets and other live actors are
 * rendered by the Meadow screen as `children` in the ground layer, positioned with GROUND
 * coordinates via `groundToStyle(x, y)` (x 0..1 across, y 0..1 from the horizon to the front
 * edge; see ./ground.ts for the full contract). Decor goes where `placeDecor` / `decorDefaultPos`
 * say for the scene's aspect, and `decorGroundRect` / `planterGroundRect` map what pets should
 * walk around (see ./placement.ts).
 */
export { timeOfDayAt, TIMES_OF_DAY, type TimeOfDay } from './time';
export { MeadowScene, type MeadowSceneProps, type PlacedDecor } from './MeadowScene';
export {
  WindowsillScene,
  sillLayout,
  sillRow,
  sillSlotStyle,
  SILL_SURFACE,
  SILL_MAX_ITEMS,
  type SillRow,
  type WindowsillSceneProps,
} from './WindowsillScene';
export {
  groundToStyle,
  groundPoint,
  pointToGround,
  depthAt,
  HORIZON,
  PET_UNITS,
  type GroundPoint,
  type GroundStyleOptions,
} from './ground';
export {
  decorDefaultPos,
  placeDecor,
  decorGroundRect,
  planterGroundRect,
  pathAt,
  DECOR_DEFAULT_POS,
  type GroundPos,
  type GroundRect,
} from './placement';
export { unitScale, decorUnitScale } from './layout';
export { MAX_PLANTERS, type PlanterPlant } from './meadow/Planter';
export { decorFootprint } from './decor';
