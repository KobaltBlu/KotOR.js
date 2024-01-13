import * as THREE from "three";

/**
 * IGameStateGroups interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IGameStateGroups.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IGameStateGroups {
  creatures: THREE.Group;
  doors: THREE.Group;
  placeables: THREE.Group;
  rooms: THREE.Group;
  grass: THREE.Group;
  sounds: THREE.Group;
  triggers: THREE.Group;
  waypoints: THREE.Group;
  party: THREE.Group;
  lights: THREE.Group;
  light_helpers: THREE.Group;
  shadow_lights: THREE.Group;
  path_helpers: THREE.Group;
  emitters: THREE.Group;
  effects: THREE.Group;
  stunt: THREE.Group;
  weather_effects: THREE.Group;
  room_walkmeshes: THREE.Group;
  spell_instances: THREE.Group;
};