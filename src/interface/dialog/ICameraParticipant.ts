import type { ModuleObject } from "../../module/ModuleObject";
import type * as THREE from "three";

/**
 * ICameraParticipant interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ICameraParticipant.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface ICameraParticipant {
  participant: ModuleObject;
  position: THREE.Vector3;
  rotation: THREE.Vector3;
}