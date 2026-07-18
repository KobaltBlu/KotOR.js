import * as THREE from "three";

const DEG2RAD = 0.017453292;
const RAD2DEG = 57.29578;

const _axis = new THREE.Vector3();
const _qYaw = new THREE.Quaternion();
const _qPitch = new THREE.Quaternion();
const _qRoll = new THREE.Quaternion();
const _qTmp = new THREE.Quaternion();
const _fwd = new THREE.Vector3();

/**
 * Retail `Yaw(Vector*)` @ `004aa0f0` — degrees.
 */
export function auroraYawFromVector(x: number, y: number, _z: number): number {
  if(y === 0 && x === 0) return 0;
  return Math.atan2(-x, y) * RAD2DEG;
}

/**
 * Retail `Pitch(Vector*)` @ `004aa130` — degrees.
 */
export function auroraPitchFromVector(x: number, y: number, z: number): number {
  return Math.atan2(z, Math.sqrt(x * x + y * y)) * RAD2DEG;
}

/**
 * Direction derived from a quaternion for Yaw/Pitch extractors
 * (`Yaw` @ `004a9f40` / `Pitch` @ `004aa020`).
 * Identity → (0,1,0); with pitch 90 look quat, camera local −Z maps to this facing.
 */
function auroraFacingFromQuaternion(q: THREE.Quaternion, out: THREE.Vector3): THREE.Vector3 {
  const { x, y, z, w } = q;
  out.set(
    2 * (y * x - z * w),
    1 - 2 * (x * x + z * z),
    2 * (w * x + y * z)
  );
  return out;
}

/** Retail `Yaw(Quaternion*)` @ `004a9f40` — degrees. */
export function auroraYawFromQuaternion(q: THREE.Quaternion): number {
  auroraFacingFromQuaternion(q, _fwd);
  return auroraYawFromVector(_fwd.x, _fwd.y, _fwd.z);
}

/** Retail `Pitch(Quaternion*)` @ `004aa020` — degrees. */
export function auroraPitchFromQuaternion(q: THREE.Quaternion): number {
  auroraFacingFromQuaternion(q, _fwd);
  return auroraPitchFromVector(_fwd.x, _fwd.y, _fwd.z);
}

/**
 * Retail `Roll(Quaternion)` @ `004acb90` — undo yaw then pitch, then extract
 * remaining rotation about Y (degrees).
 */
export function auroraRollFromQuaternion(q: THREE.Quaternion): number {
  _qTmp.copy(q);
  const yaw = auroraYawFromQuaternion(_qTmp);
  _qYaw.setFromAxisAngle(_axis.set(0, 0, 1), -yaw * DEG2RAD);
  _qTmp.premultiply(_qYaw);

  const pitch = auroraPitchFromQuaternion(_qTmp);
  _qPitch.setFromAxisAngle(_axis.set(1, 0, 0), -pitch * DEG2RAD);
  _qTmp.premultiply(_qPitch);

  const { x, y, z, w } = _qTmp;
  return Math.atan2(-(2 * (z * x - y * w)), 1 - 2 * (z * z + y * y)) * RAD2DEG;
}

/**
 * Retail `YawPitchRoll` @ `004acac0` — angles in degrees.
 * Composition: (yaw_Z * pitch_X) * roll_Y.
 */
export function auroraYawPitchRoll(
  yawDeg: number,
  pitchDeg: number,
  rollDeg: number,
  out: THREE.Quaternion = new THREE.Quaternion()
): THREE.Quaternion {
  _qYaw.setFromAxisAngle(_axis.set(0, 0, 1), yawDeg * DEG2RAD);
  _qPitch.setFromAxisAngle(_axis.set(1, 0, 0), pitchDeg * DEG2RAD);
  _qRoll.setFromAxisAngle(_axis.set(0, 1, 0), rollDeg * DEG2RAD);
  return out.copy(_qYaw).multiply(_qPitch).multiply(_qRoll);
}

/**
 * Placeable / dialog camera orientation from GIT Orientation + Pitch.
 * Matches `SetShotFromScript` @ `0062e900` then `Control` @ `006bcf50`
 * (`YawPitchRoll(Yaw(q), Pitch(q)+Pitch, Roll(q))` with zero Control offsets).
 *
 * Aurora Camera and Three.js both look along local −Z, so the result can be
 * assigned directly to a PerspectiveCamera quaternion (world Z-up).
 */
export function placeableCameraOrientation(
  orientation: THREE.Quaternion,
  pitchFieldDeg: number,
  out: THREE.Quaternion = new THREE.Quaternion()
): THREE.Quaternion {
  const yaw = auroraYawFromQuaternion(orientation);
  const pitch = auroraPitchFromQuaternion(orientation) + pitchFieldDeg;
  const roll = auroraRollFromQuaternion(orientation);
  return auroraYawPitchRoll(yaw, pitch, roll, out);
}
