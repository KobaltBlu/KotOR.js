import type { CameraMode } from "../../enums/dialog/CameraMode";
import type { DLGCameraAngle } from "../../enums/dialog/DLGCameraAngle";
import type { OdysseyModelAnimation } from "../../odyssey/OdysseyModelAnimation";
import type { ICameraParticipant } from "./ICameraParticipant";

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
  listener: ICameraParticipant;
  speaker: ICameraParticipant;
}