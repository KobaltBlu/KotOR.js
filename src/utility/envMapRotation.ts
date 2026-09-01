import * as THREE from "three";

/**
 * Retail DoEnvMapTransform — texture-matrix multiply by camera
 * orientation (translation zero). Eye-space reflection × this matrix → world
 * cubemap direction (same as FFP GL_REFLECTION_MAP + camera quaternion matrix).
 */
export function envMapRotationFromCamera(
  camera: THREE.Camera | undefined,
  target: THREE.Matrix3
): THREE.Matrix3 {
  if(!camera){
    return target.identity();
  }
  camera.updateMatrixWorld();
  // Upper 3×3 of matrixWorld: camera local → world (rotation + scale; cameras are unscaled).
  return target.setFromMatrix4(camera.matrixWorld);
}
