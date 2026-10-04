/**
 * IOdysseyControllerFrameGeneric interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IOdysseyControllerFrameGeneric.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IOdysseyControllerFrameGeneric {
  a: THREE.Vector3;
  b: THREE.Vector3;
  c: THREE.Vector3;
  isBezier: boolean;
  isLinearBezier: boolean;
  bezier: THREE.QuadraticBezierCurve3;
  time: number;
  x: number;
  y: number;
  z: number;
  w: number;
  lastFrame: boolean;
  value: any;
}
