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
 * Retail `Yaw(Vector*)` — degrees.
 */
export function auroraYawFromVector(x: number, y: number, _z: number): number {
  if(y === 0 && x === 0) return 0;
  return Math.atan2(-x, y) * RAD2DEG;
}

/**
 * Retail `Pitch(Vector*)` — degrees.
 */
export function auroraPitchFromVector(x: number, y: number, z: number): number {
  return Math.atan2(z, Math.sqrt(x * x + y * y)) * RAD2DEG;
}

/**
 * Direction derived from a quaternion for Yaw/Pitch extractors
 * (`Yaw` / `Pitch`).
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

/** Retail `Yaw(Quaternion*)` — degrees. */
export function auroraYawFromQuaternion(q: THREE.Quaternion): number {
  auroraFacingFromQuaternion(q, _fwd);
  return auroraYawFromVector(_fwd.x, _fwd.y, _fwd.z);
}

/** Retail `Pitch(Quaternion*)` — degrees. */
export function auroraPitchFromQuaternion(q: THREE.Quaternion): number {
  auroraFacingFromQuaternion(q, _fwd);
  return auroraPitchFromVector(_fwd.x, _fwd.y, _fwd.z);
}

/**
 * Retail `Roll(Quaternion)` — undo yaw then pitch, then extract
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
 * Retail `YawPitchRoll` — angles in degrees.
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
 * Matches `SetShotFromScript` then `Control`
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

/**
 * Orient a Z-up Three.js camera so local −Z equals `dir` (world look direction).
 *
 * Aurora facing pitch 0 is horizontal (+Y for identity), but THREE cameras look
 * along −Z. Placeable cameras bridge this with GIT Pitch ≈ 90°; dialog look-at
 * must apply the same +90° camera-space offset so shots aim at the speaker.
 *
 * Composition: YawPitchRoll(Yaw(dir), Pitch(dir)+90, 0) — matches
 * `placeableCameraOrientation(yawOnlyQuat, 90)` for horizontal dirs.
 */
export function auroraCameraLookOrientation(
  dir: THREE.Vector3,
  out: THREE.Quaternion = new THREE.Quaternion()
): THREE.Quaternion {
  let x = dir.x;
  let y = dir.y;
  let z = dir.z;
  const lenSq = x * x + y * y + z * z;
  if(lenSq < 1e-12){
    x = 0;
    y = 1;
    z = 0;
  }else if(Math.abs(lenSq - 1) > 1e-6){
    const inv = 1 / Math.sqrt(lenSq);
    x *= inv;
    y *= inv;
    z *= inv;
  }
  const yaw = auroraYawFromVector(x, y, z);
  const pitch = auroraPitchFromVector(x, y, z) + 90;
  return auroraYawPitchRoll(yaw, pitch, 0, out);
}
