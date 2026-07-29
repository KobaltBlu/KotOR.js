/**
 * Three.js camera/object layer indices used by the game render pipeline.
 * Avoid ShadowBlobManager.STENCIL_LAYER (7).
 */
export enum RenderLayer {
  /** Default world geometry (Three.js default). */
  DEFAULT = 0,
  /**
   * Minigame camera HUD (e.g. m17mg_camera) — drawn after AccumulationBlurPass
   * so speed blur does not smear screen-locked gauges.
   */
  MG_CAMERA_HUD = 3,
}
