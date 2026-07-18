/**
 * CClientOptions::camera_mode — retail K1 UpdateCameraFollow @ 006419a0,
 * SetCameraMode @ 0061b6f0, SetFreeLookCamera @ 006413c0, SetNavigateCamera @ 00641610,
 * SetCombatCamera @ 00641540 (mode 6).
 *
 * Default ctor value is ON_A_STICK (3), not CHASE.
 *
 * @file ClientCameraMode.ts
 */
export enum ClientCameraMode {
  /** UpdateCameraModeChaseCam — Aurora follow, soft yaw catch-up */
  CHASE = 0,
  /** UpdateCameraModeBG — top-down / BG params, no yaw follow */
  TOP_DOWN = 1,
  /** UpdateCameraModeEQ — stiff chase, fixed dist 6, aggressive yaw lock */
  STIFF_CHASE = 2,
  /** CSWCameraOnAStick — default gameplay chase (HitCheck / camerastyle) */
  ON_A_STICK = 3,
  /** Early-out in UpdateCameraFollow (no follow tick) */
  RESERVED_4 = 4,
  /**
   * FreeLook behavior + CamRelative drive yaw (SetFreeLookCamera / drive scripts).
   * Same numeric value as retail FreeLook and drive-control gate.
   */
  FREELOOK = 5,
  /** Alias — scripts / drive-input gate use mode 5 */
  DRIVE = 5,
  /**
   * CSWBehaviorCameraCombat — SetCombatCamera @ 00641540 / SetCombatMode.
   * CamRelative also uses mode 6 for target-facing turn.
   */
  COMBAT = 6,
  /** Alias — legacy name for mode 6 */
  TARGET_LOCK = 6,
  /** CSWCameraNavigate free-fly debug camera @ 006387e0 */
  NAVIGATE = 7,
}
