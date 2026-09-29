/**
 * Scene art: the Shelf (DESIGN §8.4, §9.4) and the Today windowsill band (§9.1).
 *
 * Everything is laid out in room units (1 unit = 1% of the scene's height) and lit by one window:
 * `sceneLight`/`windowLight` by day, the lamp from the right at night.
 */
export { timeOfDayAt, skyTime, seasonAt, momentAt, TIMES_OF_DAY, SEASONS, type TimeOfDay, type Season, type Moment } from './time';
export { SillScene, type SillSceneProps } from './SillScene';
export type { SillPot, ShelfPet, ShelfDecor, PetSpot } from './model';
export { lightAtSun, childLight, towardLight, LIGHT_FROMS } from './lighting';
export { CoinJar, jarLevel, JAR_FULL } from './props/CoinJar';
export { TableLamp } from './props/TableLamp';
export { PET_UNITS } from './room';
export { decorFootprint } from './decor';
export { WindowsillBand, bandResidents, type WindowsillBandHandle, type WindowsillBandProps } from './WindowsillBand';
export { bandCollapse, BAND_OPEN_PX, BAND_CLOSED_PX, type BandCollapse } from './band';
export { ShelfScene, type ShelfSceneProps } from './ShelfScene';
export { PlaceArt, type PlaceArtProps } from './PlaceArt';
export { PLACE_SCENES, type RoomPlaceId } from './places';
export { VIGNETTES, registerVignette, findVignette, vignetteById, type Vignette, type VignetteContext } from './behavior/vignettes';
export type { SceneTouchProps, ShelfSceneHandle } from './SillScene';
export type { EditDecor, PetGesture, SillExtras } from './model';
export { decorToScene, sceneToDecor, fracToScene, sceneToFrac, decorEntry, type DecorFloor } from './decorPlace';
export {
  windowMoment,
  windowClock,
  windowHemisphere,
  setWindowHemisphere,
  artLight,
  artLightFor,
  artLightNow,
  useArtLight,
  pageLamplight,
  retainWindowClock,
} from './moment';
export { useWindowMoment } from './hooks';
export { KEEPSAKE_ART, KEEPSAKE_KINDS, keepsakeItemId } from './objects/keepsakes';
export { ROUTINE_ART } from './objects/routines';
export { FOUND_ART, foundFor } from './objects/found';
export { ObjectArt, type ObjectArtProps } from './objects/ObjectArt';
export { WORLD_SCALE, COW_BACK } from '@/art/pets/world';
