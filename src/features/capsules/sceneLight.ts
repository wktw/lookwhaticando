/**
 * The capsule art's light is the app's one light (DESIGN §10.4, `@/art/scene/moment`): the lamp
 * when the page is in Lamplight, otherwise the real window at this time of day.
 */
export { useArtLight as useSceneLight, artLightNow as sceneLight, readLamplight as isLamplight } from '@/art/scene/moment';
