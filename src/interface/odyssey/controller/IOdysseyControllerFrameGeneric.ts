import type * as THREE from 'three';

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
/** Controller keyframe; only the fields relevant to the controller type are set. */
export interface IOdysseyControllerFrameGeneric {
  time: number;
  a?: THREE.Vector3;
  b?: THREE.Vector3;
  c?: THREE.Vector3;
  isBezier?: boolean;
  isLinearBezier?: boolean;
  bezier?: THREE.QuadraticBezierCurve3;
  x?: number;
  y?: number;
  z?: number;
  w?: number;
  lastFrame?: boolean;
  /** Scalar or other controller-specific value (e.g. scale, opacity). */
  value?: number;
}
