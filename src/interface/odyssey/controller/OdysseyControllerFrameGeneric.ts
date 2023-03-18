
export interface OdysseyControllerFrameGeneric {
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
