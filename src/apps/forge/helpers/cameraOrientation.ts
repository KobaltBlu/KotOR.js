/**
 * Static area camera GIT Orientation is a yaw-only quaternion.
 * Odyssey: yaw = -atan2(Orientation.w, -Orientation.x) * 2
 * Pitch is a separate float and must not be baked into Orientation.
 *
 * @file cameraOrientation.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import * as THREE from "three";

export interface CameraOrientationXY {
  x: number;
  w: number;
}

/** Decode retail camera Orientation to editor yaw (rotation.z radians). */
export function yawFromCameraOrientation(
  orientation: Pick<THREE.Quaternion, "x" | "w"> | { x: number; w: number },
): number {
  return -Math.atan2(orientation.w, -orientation.x) * 2;
}

/**
 * Encode editor yaw (rotation.z radians) to a retail-style camera Orientation.
 * y/z are 0; pitch lives in the separate Pitch field.
 */
export function cameraOrientationFromYaw(yaw: number): THREE.Quaternion {
  const half = yaw / 2;
  // Inverse of yaw = -atan2(w, -x) * 2:
  // atan2(w, -x) = -yaw/2  =>  w = sin(-yaw/2), -x = cos(-yaw/2)
  return new THREE.Quaternion(-Math.cos(half), 0, 0, -Math.sin(half));
}

/** Write yaw into an existing quaternion (y/z cleared). */
export function setCameraOrientationFromYaw(
  target: THREE.Quaternion,
  yaw: number,
): THREE.Quaternion {
  const encoded = cameraOrientationFromYaw(yaw);
  return target.copy(encoded);
}
