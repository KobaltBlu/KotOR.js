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
  /** Bezier control A (plain xyz at parse; may become THREE.Vector3 lazily). */
  a?: { x: number; y: number; z: number };
  b?: { x: number; y: number; z: number };
  c?: { x: number; y: number; z: number };
  isBezier?: boolean;
  isLinearBezier?: boolean;
  /** When true, bezier mid control equals start (first keyframe). */
  bezierMidEqualsStart?: boolean;
  /** Lazy THREE curve; created on first animation sample. */
  bezier?: THREE.QuadraticBezierCurve3;
  time: number;
  x: number;
  y: number;
  z: number;
  w: number;
  lastFrame: boolean;
  value: any;
}
