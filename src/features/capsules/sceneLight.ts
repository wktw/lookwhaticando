/**
 * The capsule art's light is the app's one light (DESIGN §10.4, `@/art/scene/moment`): the real
 * window at this time of day, the lamp after dark, whatever the page theme.
 */
export { useArtLight as useSceneLight, artLightNow as sceneLight } from '@/art/scene/moment';
