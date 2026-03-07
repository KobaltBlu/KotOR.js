import type * as THREE from "three";

import type { IGameStateGroups } from "@/interface/engine/IGameStateGroups";
import type { LightManager } from "@/managers/LightManager";

export interface IGameContext {
  camera: THREE.Camera;
  raycaster: THREE.Raycaster;
  lightManager: LightManager;
  deltaTime: number;
  group: IGameStateGroups;
}