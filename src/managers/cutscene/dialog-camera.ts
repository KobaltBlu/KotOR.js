import * as THREE from "three";
import { DLGCameraAngle } from "@/enums/dialog/DLGCameraAngle";
import {
  auroraPitchFromQuaternion,
  auroraRollFromQuaternion,
  auroraYawFromQuaternion,
  auroraYawPitchRoll,
} from "@/utility/aurora-camera-orientation";

/**
 * Dialog camera shot framing and TSL appearance / placeable overrides.
 * Shot types match DLG CameraAngle 1–3 (speaker / OTS / two-shot).
 * Pseudo-random angles advance per entry/reply; CUT names come from
 * dialog animation id bands.
 */

const DEG2RAD = Math.PI / 180;

/** Dialog constructor angle table (19 entries). */
export const DIALOG_PSEUDO_RANDOM_ANGLES: readonly number[] = [
  1, 3, 1, 3, 2, 2, 1, 3, 1, 2, 1, 2, 1, 3, 2, 3, 1, 1, 1,
];

export interface DialogCameraShotResult {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
}

export interface DialogCameraShotOptions {
  /** Extra camera height bias */
  heightBias?: number;
  /** Extra look-at height bias */
  focusHeightBias?: number;
  /** Used by type-1 close-up pull */
  closeUpExtra?: number;
  /** Collision fallback forces type-1 framing */
  collided?: boolean;
  /** Side flip (2 mirrors yaw) */
  side?: number;
  /**
   * TSL dialog camera appearance overrides (distance / height / yaw).
   * Only applied when the conversation is not treated as modded.
   */
  aspyrDistanceOverride?: number;
  aspyrHeightOverride?: number;
  aspyrAngleOverrideDeg?: number;
}

export interface DialogPseudoRandomState {
  /** Index into DIALOG_PSEUDO_RANDOM_ANGLES */
  mod19: number;
  /** Step size (u%5+1) */
  angleCycle: number;
  /** Direction (u&1); 0 = subtract, else add */
  parity: number;
  /** First ANGLE_RANDOM entry forces shot 2 */
  firstEntryRandom: boolean;
  /** First ANGLE_RANDOM reply forces shot 2 */
  firstReplyRandom: boolean;
}

/**
 * Map DLG angle to shot type (1/2/3).
 * ANGLE_FOCUS_PLAYER (5) does not build a speaker/listener shot.
 */
export function dlgAngleToShotType(angle: DLGCameraAngle): number {
  switch(angle){
    case DLGCameraAngle.ANGLE_SPEAKER:
      return 1;
    case DLGCameraAngle.ANGLE_SPEAKER_BEHIND_PLAYER:
      return 2;
    case DLGCameraAngle.ANGLE_SPEAKER_AND_PLAYER_SIDE:
      return 3;
    default:
      return 1;
  }
}

/**
 * Hash dialog resref → (parity, %19, %5+1) for the pseudo-random angle table.
 * Hash: u += ((int)pow(10, i) + 1) * char
 */
export function hashDialogResref(resref: string): {
  parity: number;
  mod19: number;
  angleCycle: number;
} {
  const s = (resref || '').toLowerCase();
  let u = 0;
  for(let i = 0; i < s.length; i++){
    // trunc(pow(10,i)) + 1, then * signed char
    const place = (Math.pow(10, i) | 0) + 1;
    u = (u + place * (s.charCodeAt(i) << 24 >> 24)) | 0;
  }
  // Unsigned remainder stores
  const uu = u >>> 0;
  return {
    parity: uu & 1,
    mod19: uu % 0x13,
    angleCycle: (uu % 5) + 1,
  };
}

/** Create PRNG state after loading a dialog (first-entry / first-reply flags start true). */
export function createDialogPseudoRandomState(resref: string): DialogPseudoRandomState {
  const h = hashDialogResref(resref);
  return {
    mod19: h.mod19,
    angleCycle: h.angleCycle,
    parity: h.parity,
    firstEntryRandom: true,
    firstReplyRandom: true,
  };
}

/**
 * Advance the 19-slot angle table index (done on every entry/reply send).
 * Returns the table value at the previous index.
 */
export function advancePseudoRandomIndex(state: DialogPseudoRandomState): number {
  const idx = ((state.mod19 % 0x13) + 0x13) % 0x13;
  const value = DIALOG_PSEUDO_RANDOM_ANGLES[idx];
  let next = state.parity === 0
    ? idx - state.angleCycle
    : idx + state.angleCycle;
  if(next > 0x12) next = 0;
  if(next < 0) next = 0x12;
  state.mod19 = next;
  return value;
}

/**
 * Resolve ANGLE_RANDOM for an entry.
 * First random entry in a dialog is always shot 2; later use the table.
 * The first-entry flag clears on every entry send.
 */
export function resolveEntryCameraAngle(
  angle: number,
  state: DialogPseudoRandomState
): DLGCameraAngle {
  const tableValue = advancePseudoRandomIndex(state);
  let resolved = angle as DLGCameraAngle;
  if(angle === DLGCameraAngle.ANGLE_RANDOM){
    resolved = state.firstEntryRandom
      ? DLGCameraAngle.ANGLE_SPEAKER_BEHIND_PLAYER
      : tableValue as DLGCameraAngle;
  }
  state.firstEntryRandom = false;
  return resolved;
}

/**
 * Resolve ANGLE_RANDOM for a reply.
 * The first-reply flag clears after the reply batch.
 */
export function resolveReplyCameraAngle(
  angle: number,
  state: DialogPseudoRandomState
): DLGCameraAngle {
  const tableValue = advancePseudoRandomIndex(state);
  let resolved = angle as DLGCameraAngle;
  if(angle === DLGCameraAngle.ANGLE_RANDOM){
    resolved = state.firstReplyRandom
      ? DLGCameraAngle.ANGLE_SPEAKER_BEHIND_PLAYER
      : tableValue as DLGCameraAngle;
  }
  state.firstReplyRandom = false;
  return resolved;
}

/**
 * Whether a dialog stunt animation id is looping.
 * CUT ids in the `l` / `wl` bands (1401..1727) loop; base / `w` cuts are one-shot.
 */
export function isLoopingDialogStuntAnimation(animationId: number): boolean {
  const id = animationId | 0;
  return id > 0x577 && id < 0x6c0;
}

/**
 * Build a CUT camera animation name from a dialog animation id.
 * Ranges: 1000+ base, 1200+ w, 1400+ l, 1600+ wl; 10100 → none.
 * Note: cut029 is missing — offs 28 and 38 map to cut039.
 */
export function getCameraAnimationName(animationId: number): string {
  const id = animationId | 0;
  if(id === 0x2772) return 'none';

  let base = 0;
  let suffix = '';
  if(id >= 1000 && id <= 0x467){
    base = 1000;
    suffix = '';
  }else if(id >= 0x4b0 && id <= 0x52f){
    base = 0x4b0;
    suffix = 'w';
  }else if(id >= 0x578 && id <= 0x5f7){
    base = 0x578;
    suffix = 'l';
  }else if(id >= 0x640 && id <= 0x6bf){
    base = 0x640;
    suffix = 'wl';
  }else{
    return 'none';
  }

  const off = id - base;
  // 0..27 → cut001..028; 28 → cut039; 29..37 → cut030..038; 38 → cut039; 39..127 → cut040..128
  let num: number;
  if(off <= 27){
    num = off + 1;
  }else if(off === 28 || off === 38){
    num = 39;
  }else{
    num = off + 1;
  }

  return 'cut' + ('000' + num).slice(-3) + suffix;
}

/**
 * Compute dialog camera position + look-at from speaker/listener hooks.
 * `speaker` / `listener` should already be CAMERAHOOK (or height-adjusted) points.
 */
export function computeDialogCameraShot(
  shotType: number,
  speaker: THREE.Vector3,
  listener: THREE.Vector3,
  outPos: THREE.Vector3,
  outLook: THREE.Vector3,
  opts: DialogCameraShotOptions = {}
): DialogCameraShotResult {
  const heightBias = opts.heightBias ?? 0;
  const focusHeightBias = opts.focusHeightBias ?? 0;
  const closeUpExtra = opts.closeUpExtra ?? 0;
  const side = opts.side ?? 1;
  let type = shotType | 0;
  if(opts.collided) type = 1;

  let sp = speaker.clone();
  let lp = listener.clone();

  // Coincident participants — nudges listener
  if(sp.distanceToSquared(lp) < 1e-8){
    lp.x += 1.5;
    lp.y += 1.5;
    lp.z += 0.1;
  }

  // Per-shot framing constants
  let lookFrac = 1.0;
  let pullDist = 0.5;
  let yawDeg = 30.0;
  let heightAlongScale = 0.0;
  let heightAddScale = 0.0;
  let zBiasSp = 0.0;
  let zBiasLp = 0.0;

  if(type === 2){
    lookFrac = 0.3;
    pullDist = 0.8;
    zBiasSp = -0.1;
    zBiasLp = -0.05;
  }else if(type === 3){
    lookFrac = 0.5;
    pullDist = 1.5;
    yawDeg = 90.0;
    heightAlongScale = -0.2;
    heightAddScale = 0.3;
  }

  if(side === 2) yawDeg = -yawDeg;

  const dist = lp.distanceTo(sp);

  if(type === 1 || opts.collided){
    // Close-up: face speaker, slight pull toward listener, ±30° yaw
    yawDeg = side === 2 ? -30 : 30;
    const along = new THREE.Vector3(sp.x - lp.x, sp.y - lp.y, 0);
    if(along.lengthSq() < 1e-8) along.set(1, 0, 0);
    along.normalize();

    outLook.set(
      sp.x - along.x * 0.2,
      sp.y - along.y * 0.2,
      sp.z - along.z * 0.2 - 0.04 + focusHeightBias
    );

    const toListener = new THREE.Vector3().subVectors(sp, lp);
    const rotated = rotateYaw(toListener, yawDeg);
    rotated.normalize();

    let pull = 0.5;
    if(!opts.collided){
      pull = closeUpExtra * 0.2 + 0.5;
      outLook.z -= closeUpExtra * 0.2;
    }

    outPos.set(
      outLook.x - rotated.x * pull,
      outLook.y - rotated.y * pull,
      outLook.z - rotated.z * pull
    );
    outPos.z += heightBias;
    return { position: outPos, lookAt: outLook };
  }

  // Types 2 / 3 — interpolate focus along speaker↔listener, yaw offset, pull back
  sp.z += zBiasSp * dist;
  lp.z += zBiasLp * dist;

  outLook.set(
    lp.x + (sp.x - lp.x) * lookFrac,
    lp.y + (sp.y - lp.y) * lookFrac,
    lp.z + (sp.z - lp.z) * lookFrac
  );
  outLook.z += dist * heightAlongScale + focusHeightBias;

  const toSpeaker = new THREE.Vector3().subVectors(sp, lp);
  const rotated = rotateYaw(toSpeaker, yawDeg);

  if(type === 2){
    const n = rotated.clone().normalize();
    outPos.set(
      outLook.x - (rotated.x * pullDist + n.x * 0.15),
      outLook.y - (rotated.y * pullDist + n.y * 0.15),
      outLook.z - (rotated.z * pullDist + n.z * 0.15)
    );
  }else{
    outPos.set(
      outLook.x - rotated.x * pullDist,
      outLook.y - rotated.y * pullDist,
      outLook.z - rotated.z * pullDist
    );
  }

  outPos.z += dist * heightAddScale + heightBias;

  // TSL dialog camera appearance overrides (gated when not modded)
  const distOvr = opts.aspyrDistanceOverride ?? 0;
  const heightOvr = opts.aspyrHeightOverride ?? 0;
  const angleOvr = opts.aspyrAngleOverrideDeg ?? 0;
  if(distOvr || heightOvr || angleOvr){
    if(angleOvr){
      const fromLook = new THREE.Vector3().subVectors(outPos, outLook);
      const rotatedOvr = rotateYaw(fromLook, angleOvr);
      outPos.copy(outLook).add(rotatedOvr);
    }
    if(distOvr){
      const dir = new THREE.Vector3().subVectors(outPos, outLook);
      const len = dir.length();
      if(len > 1e-6){
        dir.multiplyScalar((len + distOvr) / len);
        outPos.copy(outLook).add(dir);
      }
    }
    outPos.z += heightOvr;
  }

  return { position: outPos, lookAt: outLook };
}

function rotateYaw(v: THREE.Vector3, yawDeg: number): THREE.Vector3 {
  const a = yawDeg * DEG2RAD;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return new THREE.Vector3(
    v.x * c - v.y * s,
    v.x * s + v.y * c,
    v.z
  );
}

/** Default dialog FOV (55°). */
export const DIALOG_CAMERA_FOV = 55;

/** Animated camera clip near/far. */
export const ANIMATED_CAMERA_NEAR = 0.1;
export const ANIMATED_CAMERA_FAR = 10000;

/**
 * Close-up pull distance for shot type 1: if the speaker's animation id is a
 * fire-forget or looping dialog animation, read dialoganimations.2da
 * `CU_PB_Range` at row (animId - 10000).
 */
export function lookupDialogCloseUpExtra(
  animId: number,
  getRow: (rowIndex: number) => { fireforget?: string|number; looping?: string|number; cu_pb_range?: string|number } | undefined
): number {
  const id = (animId | 0) & 0xffff;
  if(id < 10000) return 0;
  const row = getRow(id - 10000);
  if(!row) return 0;
  const fireForget = Number(row.fireforget) || 0;
  const looping = Number(row.looping) || 0;
  if(!fireForget && !looping) return 0;
  const range = Number(row.cu_pb_range);
  if(!Number.isFinite(range)) return 0;
  // Treat |x| < 0.001 as zero
  if(range > -0.001 && range < 0.001) return 0;
  return range;
}

/**
 * Whether override / mod folders are active for dialog camera gating.
 * KotOR.js maps this to ini EnableOverride / look_in_override.
 */
export function isDialogGameModded(enableOverride?: boolean, lookInOverride?: boolean): boolean {
  return !!enableOverride || !!lookInOverride;
}

/**
 * True when the conversation resref is `"carth"` (case-insensitive).
 * TSL applies placeable + appearance dialog camera overrides only for that
 * conversation; every other dialog leaves the vanilla-hack flag clear.
 */
export function isAspyrCarthDialogCameraHack(resref?: string): boolean {
  return (resref || '').toLowerCase() === 'carth';
}

export interface AspyrDialogCameraOverrides {
  distance: number;
  height: number;
  angleDeg: number;
}

/**
 * Dialog camera appearance-pair overrides — only when not modded and the
 * vanilla-hack flag is set. Appearance ids: 289, 290, 363.
 */
export function resolveAspyrAppearanceCameraOverrides(
  speakerAppearanceId: number,
  listenerAppearanceId: number,
  shotType: number,
  gameModded: boolean,
  applyVanillaAspyrHacks: boolean
): AspyrDialogCameraOverrides {
  const empty = { distance: 0, height: 0, angleDeg: 0 };
  if(gameModded || !applyVanillaAspyrHacks) return empty;
  const sp = speakerAppearanceId | 0;
  const lp = listenerAppearanceId | 0;
  const type = shotType | 0;
  // 289, 290, 363
  if(sp === 0x121 && lp === 0x122 && type === 3){
    return { distance: 0, height: 1, angleDeg: 70 };
  }
  if(sp === 0x16b && lp === 0x122 && type === 3){
    return { distance: 0.2, height: 1, angleDeg: 70 };
  }
  if(sp === 0x122 && lp === 0x16b && type === 2){
    return { distance: 0.2, height: 1, angleDeg: 70 };
  }
  if(sp === 0x122 && lp === 0x121 && type === 2){
    return { distance: 0.8, height: 0.6, angleDeg: 120 };
  }
  return empty;
}

/**
 * Placeable (angle 6) dialog camera offset when not modded and the
 * vanilla-hack flag is set: +2 X, −6 Y, +0.5 Z, +110° pitch.
 */
export function applyAspyrPlaceableCameraHack(
  position: THREE.Vector3,
  orientation: THREE.Quaternion,
  gameModded: boolean,
  applyVanillaAspyrHacks: boolean,
  outPos: THREE.Vector3 = position,
  outQuat: THREE.Quaternion = orientation
): { position: THREE.Vector3; quaternion: THREE.Quaternion } {
  outPos.copy(position);
  outQuat.copy(orientation);
  if(gameModded || !applyVanillaAspyrHacks){
    return { position: outPos, quaternion: outQuat };
  }
  outPos.x += 2;
  outPos.y -= 6;
  outPos.z += 0.5;
  const yaw = auroraYawFromQuaternion(outQuat);
  const pitch = auroraPitchFromQuaternion(outQuat) + 110;
  const roll = auroraRollFromQuaternion(outQuat);
  auroraYawPitchRoll(yaw, pitch, roll, outQuat);
  return { position: outPos, quaternion: outQuat };
}

