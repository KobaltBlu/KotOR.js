/**
 * 
 */
export enum EngineDebugType {
  CONTROLS = 'CONTROLS',
  SELECTED_OBJECT = 'SELECTED_OBJECT',
  OBJECT_LABELS = 'OBJECT_LABELS',
  PATH_FINDING = 'PATH_FINDING',

  /**
   * Walkmesh
   */
  ROOM_WALKMESH = 'ROOM_WALKMESH',
  DOOR_WALKMESH = 'DOOR_WALKMESH',
  PLACEABLE_WALKMESH = 'PLACEABLE_WALKMESH',
  COLLISION_HELPERS = 'COLLISION_HELPERS',
  LIGHT_HELPERS = 'LIGHT_HELPERS',
  /** When on with LIGHT_HELPERS, hide gizmos for lights not in the bound/fade set. */
  LIGHT_HELPERS_BOUND_ONLY = 'LIGHT_HELPERS_BOUND_ONLY',
  SHADOW_LIGHTS = 'SHADOW_LIGHTS',
  /**
   * Log / assert dual movement commits and unauthorized position writes.
   * Part of the Retail Movement Harmony ownership pipeline.
   */
  MOVEMENT_OWNERSHIP = 'MOVEMENT_OWNERSHIP',
}