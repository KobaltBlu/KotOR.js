import type * as THREE from "three";
import type { LightManager } from "@engine/managers/LightManager";
import type { IGameStateGroups } from "@engine/interface/engine/IGameStateGroups";

export interface IGameContext {
  camera: THREE.Camera;
  raycaster: THREE.Raycaster;
  lightManager: LightManager;
  deltaTime: number;
  group: IGameStateGroups;
}