import * as THREE from "three";

export interface GameStateGroups {
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
};