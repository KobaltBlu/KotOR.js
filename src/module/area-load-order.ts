/**
 * Canonical module-area object load order matching retail LoadGIT.
 *
 * K1: LoadGIT, LoadArea
 * TSL: LoadGIT (identical object sequence)
 *
 * LoadArea wraps: LoadAreaHeader → LoadRoomInfo → LoadGIT → LoadPathPoints.
 * KotOR.js maps rooms before GIT objects and path after them in loadScene.
 */

/** GIT / AddToArea object types in retail LoadGIT call order. */
export const RETAIL_LOAD_GIT_OBJECT_ORDER = [
  'creatures',
  'items',
  'doors',
  'triggers',
  'encounters',
  'waypoints',
  'sounds',
  'placeables',
  'stores',
  'areaEffects',
  'properties',
  'maps',
  'cameras',
] as const;

export type RetailLoadGitObjectStep = (typeof RETAIL_LOAD_GIT_OBJECT_ORDER)[number];

/**
 * Scene asset load steps after rooms (and before path / minigame / music).
 * Player + party are KotOR.js companions to creatures (not in GIT).
 */
export const RETAIL_LOAD_SCENE_OBJECT_ORDER = [
  'creatures',
  'player',
  'party',
  'items',
  'doors',
  'triggers',
  'encounters',
  'waypoints',
  'sounds',
  'placeables',
  'stores',
  'areaEffects',
  'cameras',
] as const;

export type RetailLoadSceneObjectStep = (typeof RETAIL_LOAD_SCENE_OBJECT_ORDER)[number];

/**
 * initAreaObjects iteration order — GIT types then party.
 * Scripted OnSpawn only for types that retail scripts; others still iterate here.
 */
export const RETAIL_INIT_AREA_OBJECT_ORDER = [
  'creatures',
  'items',
  'doors',
  'triggers',
  'encounters',
  'waypoints',
  'sounds',
  'placeables',
  'stores',
  'areaEffects',
  'party',
] as const;

export type RetailInitAreaObjectStep = (typeof RETAIL_INIT_AREA_OBJECT_ORDER)[number];
