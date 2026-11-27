import type * as THREE from "three";
import { AudioEngine } from "@engine/audio";
import { FollowerCamera } from "@engine/render/FollowerCamera";
import { GameState } from "@engine/runtime/GameState";
import { OdysseyMaterialBuilder } from "@engine/render/three/odyssey/OdysseyMaterialBuilder";

/**
 * Scene graph groups used while realizing area room/object models.
 */
export interface AreaSceneGroups {
  rooms: THREE.Group;
  room_walkmeshes: THREE.Group;
  creatures: THREE.Group;
  party: THREE.Group;
  doors: THREE.Group;
  placeables: THREE.Group;
  waypoints: THREE.Group;
  effects: THREE.Group;
  grass?: THREE.Object3D;
}

/**
 * Narrow services used while area ARE/GIT/resource data is attached
 * and while scene assets are realized.
 */
export interface AreaLoadContext {
  setAlphaTest(value: number): void;
  setSceneFog(fog: THREE.Fog | undefined): void;
  setDesiredEnvironment(environmentAudio: number): void;
  applyDesiredEnvironment(): void;
  setAreaAudioProperties(audio: any): void;
  setCameraStyle(style: any): void;
  setCameraFOV(fov: number): void;
  getDefaultCameraFOV(): number;
  setDefaultEnvMap(resRef: string): void;
  getAudioEngine(): AudioEngine;
  loadNWScript(resRef: string): any | undefined;

  /** Load-screen progress while scene assets realize. */
  setLoadProgress(progress: number): void;
  getSceneGroups(): AreaSceneGroups;
  getWalkmeshList(): THREE.Object3D[];
  getCollisionList(): any[];
  getStaticCameras(): THREE.Camera[];

  getPartyManager(): typeof GameState.PartyManager;
  isLoadingSave(): boolean;
  getPendingJumpSpawn(): {
    x: number;
    y: number;
    z: number;
    ox: number;
    oy: number;
  } | undefined;
  clearPendingJumpSpawn(): void;

  /** Bind in-game overlay / pause-map minimap textures for the loaded area. */
  bindAreaMapUI(areaMap: any, areaName: string): void;
  getAIScheduler(): {
    increaseAILevelPriority(objects: any[]): void;
    setAILevel(object: any, level: any): void;
  };
  isGrassEnabled(): boolean;
  getLightManager(): typeof GameState.lightManager;
  getObjectById(id: number): any;
}

/**
 * Adapts the shared runtime services used while area data is attached
 * and scene assets are realized.
 */
export function getDefaultAreaLoadContext(): AreaLoadContext {
  return {
    setAlphaTest(value: number): void {
      GameState.AlphaTest = value;
    },
    setSceneFog(fog: THREE.Fog | undefined): void {
      GameState.scene.fog = fog;
    },
    setDesiredEnvironment(environmentAudio: number): void {
      AudioEngine.GetAudioEngine().setDesiredEnvironment(environmentAudio);
    },
    applyDesiredEnvironment(): void {
      AudioEngine.GetAudioEngine().applyDesiredEnvironment();
    },
    setAreaAudioProperties(audio: any): void {
      AudioEngine.GetAudioEngine().setAreaAudioProperties(audio);
    },
    setCameraStyle(style: any): void {
      FollowerCamera.setCameraStyle(style);
    },
    setCameraFOV(fov: number): void {
      FollowerCamera.setCameraFOV(fov);
    },
    getDefaultCameraFOV(): number {
      return FollowerCamera.DEFAULT_FOV;
    },
    setDefaultEnvMap(resRef: string): void {
      OdysseyMaterialBuilder.defaultEnvMap = resRef;
    },
    getAudioEngine(): AudioEngine {
      return AudioEngine.GetAudioEngine();
    },
    loadNWScript(resRef: string): any | undefined {
      return GameState.NWScript?.Load?.(resRef);
    },

    setLoadProgress(progress: number): void {
      GameState.MenuManager.LoadScreen.setProgress(progress);
    },
    getSceneGroups(): AreaSceneGroups {
      return GameState.group as AreaSceneGroups;
    },
    getWalkmeshList(): THREE.Object3D[] {
      return GameState.walkmeshList;
    },
    getCollisionList(): any[] {
      return GameState.collisionList;
    },
    getStaticCameras(): THREE.Camera[] {
      return GameState.staticCameras;
    },

    getPartyManager(): typeof GameState.PartyManager {
      return GameState.PartyManager;
    },
    isLoadingSave(): boolean {
      return !!GameState.isLoadingSave;
    },
    getPendingJumpSpawn() {
      return GameState.pendingJumpSpawn;
    },
    clearPendingJumpSpawn(): void {
      GameState.pendingJumpSpawn = undefined;
    },

    bindAreaMapUI(areaMap: any, areaName: string): void {
      GameState.MenuManager.InGameOverlay.miniMap.setAreaMap(areaMap);
      GameState.MenuManager.InGameOverlay.SetMapTexture('lbl_map'+areaName);
      GameState.MenuManager.MenuMap.miniMap.setAreaMap(areaMap);
      GameState.MenuManager.MenuMap.SetMapTexture('lbl_map'+areaName);
    },
    getAIScheduler() {
      return GameState.module.aiScheduler;
    },
    isGrassEnabled(): boolean {
      return !!GameState.iniConfig.getProperty('Graphics Options.Grass');
    },
    getLightManager(): typeof GameState.lightManager {
      return GameState.lightManager;
    },
    getObjectById(id: number): any {
      return GameState.GameObjectManager.GetObjectById(id);
    },
  };
}
