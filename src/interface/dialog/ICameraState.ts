import type { CameraMode } from "@/enums/dialog/CameraMode";
import type { DLGCameraAngle } from "@/enums/dialog/DLGCameraAngle";
import type { OdysseyModelAnimation } from "@/odyssey/OdysseyModelAnimation";
import type { ICameraParticipant } from "@/interface/dialog/ICameraParticipant";

/**
 * ICameraState interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ICameraState.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface ICameraState {
  mode: CameraMode;
  cameraAngle: DLGCameraAngle;
  cameraID: number;
  cameraAnimation: number;
  currentCameraAnimation: OdysseyModelAnimation;
  currentCameraAnimationElapsed: number;
  /** Cached GetSideUnobstructed result (1 or 2); cleared on each entry shot. */
  dialogCamSide?: number;
  /** CamHeightOffset from active entry/reply (SetShot field3). */
  camHeightOffset?: number;
  /** TarHeightOffset from active entry/reply (SetShot field4). */
  tarHeightOffset?: number;
  /**
   * Close-up pull from dialoganimations CU_PB_Range (UpdateShotCamera /
   * SetShot field5). Cleared when shot type ≠ 1.
   */
  closeUpExtra?: number;
  /** CamFieldOfView from active entry/reply; ≤0 means use default 55. */
  camFieldOfView?: number;
  listener: ICameraParticipant;
  speaker: ICameraParticipant;
}