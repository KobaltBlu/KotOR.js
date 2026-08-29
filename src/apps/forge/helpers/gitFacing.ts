/**
 * GIT XOrientation/YOrientation are a facing unit vector (not yaw written twice).
 * Odyssey: yaw = -atan2(XOrientation, YOrientation).
 * Inverse: XO = cos(yaw + π/2), YO = sin(yaw + π/2).
 *
 * Research-only against exports JSON; authoring stays binary GFF.
 *
 * @file gitFacing.ts
 */

export interface GitFacingXY {
  x: number;
  y: number;
}

/** Convert editor yaw (rotation.z radians) to retail GIT facing vector. */
export function facingFromYaw(yaw: number): GitFacingXY {
  return {
    x: Math.cos(yaw + Math.PI / 2),
    y: Math.sin(yaw + Math.PI / 2),
  };
}

/** Convert retail GIT facing vector to editor yaw (rotation.z radians). */
export function yawFromFacing(xOrientation: number, yOrientation: number): number {
  return -Math.atan2(xOrientation, yOrientation);
}
