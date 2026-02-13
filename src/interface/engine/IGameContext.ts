import type * as THREE from "three";

import type { LightManager } from "../../managers/LightManager";

import type { IGameStateGroups } from "./IGameStateGroups";

export interface IGameContext {
  camera: THREE.Camera;
  /** Used by emitters for MVP (e.g. depth); falls back to camera when absent. */
  currentCamera?: THREE.Camera;
  raycaster: THREE.Raycaster;
  lightManager: LightManager;
  deltaTime: number;
  group: IGameStateGroups;
}