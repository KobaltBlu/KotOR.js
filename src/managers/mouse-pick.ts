import type { Vector3 } from "three";

/**
 * Retail mouse object picking helpers.
 *
 * CClientExoAppInternal::ProcessInput @ 006227e0 (Win) / 00305304 (Android):
 *   1) Camera::HitCheck → Scene geometry
 *   2) Sticky fallback via GetReticlePoint + GetStickyMouseThreshhold
 *
 * @file mouse-pick.ts
 */

/** Retail ProcessInput pick range (√900) — XY distance player↔object. */
export const MOUSE_PICK_RANGE = 30;
export const MOUSE_PICK_RANGE_SQ = MOUSE_PICK_RANGE * MOUSE_PICK_RANGE;

/**
 * Retail CSWCObject::GetStickyMouseThreshhold @ 0063d780 / Android 0039b28c —
 * `(screenW/10)² + (screenH/10)²` in viewport pixels².
 */
export function getStickyMouseThresholdSq(screenWidth: number, screenHeight: number): number {
  const w = screenWidth / 10;
  const h = screenHeight / 10;
  return w * w + h * h;
}

/** Squared screen-space distance between mouse and projected reticle. */
export function screenDistanceSq(
  mouseX: number,
  mouseY: number,
  screenX: number,
  screenY: number,
): number {
  const dx = screenX - mouseX;
  const dy = screenY - mouseY;
  return dx * dx + dy * dy;
}

/**
 * Retail ProcessInput gates after a candidate is resolved:
 * - XY distance to player < 30
 * - (player - cam) · (obj - cam) >= 0 in XY (same half-space as the player)
 */
export function passesMousePickGates(
  player: Vector3,
  camera: Vector3,
  object: Vector3,
  maxDistSq: number = MOUSE_PICK_RANGE_SQ,
): boolean {
  const dx = object.x - player.x;
  const dy = object.y - player.y;
  if(dx * dx + dy * dy > maxDistSq){
    return false;
  }
  const px = player.x - camera.x;
  const py = player.y - camera.y;
  const ox = object.x - camera.x;
  const oy = object.y - camera.y;
  return px * ox + py * oy >= 0;
}
