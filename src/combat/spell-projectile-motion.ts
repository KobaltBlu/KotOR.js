import * as THREE from "three";
import { ProjectilePath } from "@/enums/combat/ProjectilePath";
import { SPELL_PROJECTILE_PATH6_EXTRA_MS } from "@/combat/spell-projectile-time";

/**
 * Client spell-projectile motion samples for the paths SpellCastInstance uses.
 *
 * Path 6 (spiral): approach then 2500ms collapsing orbit near dest.
 * Path 11 (grenade): multi-segment ground ballistic along the throw chord.
 * Path 2 / 8: ballistic with gravity-style arc.
 * Path 3: high ballistic (+30 mid peak).
 * Path 1 / default: linear lerp (homing / bolt).
 *
 * @file spell-projectile-motion.ts
 */

const _tmp = new THREE.Vector3();

/**
 * Sample world position along a spell projectile path.
 * @param t - 0 at launch, 1 at impact
 * @param spiralSign - ±1 lateral spiral handedness (rand bit); path 6 only
 */
export function sampleSpellProjectilePosition(
  pathType: number,
  origin: THREE.Vector3,
  dest: THREE.Vector3,
  t: number,
  out: THREE.Vector3 = new THREE.Vector3(),
  opts: { totalMs?: number; spiralSign?: number } = {}
): THREE.Vector3 {
  const u = Math.min(1, Math.max(0, t));
  const path = pathType | 0;
  const totalMs = Math.max(1, opts.totalMs | 0);
  const sign = (opts.spiralSign | 0) === 0 ? 1 : Math.sign(opts.spiralSign);

  switch(path){
    case ProjectilePath.SPIRAL:
    case 6:
      return sampleSpiral(origin, dest, u, totalMs, sign, out);
    case ProjectilePath.GRENADE:
    case 11:
      return sampleGrenadeGroundBallistic(origin, dest, u, out);
    case ProjectilePath.BOUNCE:
    case 8:
    case ProjectilePath.BALLISTIC:
    case 2:
      return sampleBallistic(origin, dest, u, out, 2.5);
    case ProjectilePath.HIGH_BALLISTIC:
    case 3:
      return sampleHighBallistic(origin, dest, u, out);
    case ProjectilePath.HOMING:
    case 1:
    default:
      return out.lerpVectors(origin, dest, u);
  }
}

/**
 * Path 6: travel for (totalMs - 2500), then spiral hang of 2500ms near dest.
 * Lateral offset magnitude ~2 matches observed spiral behavior.
 */
function sampleSpiral(
  origin: THREE.Vector3,
  dest: THREE.Vector3,
  t: number,
  totalMs: number,
  sign: number,
  out: THREE.Vector3
): THREE.Vector3 {
  const hangMs = Math.min(SPELL_PROJECTILE_PATH6_EXTRA_MS, totalMs);
  const hangT = hangMs / totalMs;
  const travelT = Math.max(0.05, 1 - hangT);

  // Horizontal perpendicular (spiral lateral axis)
  const dx = dest.x - origin.x;
  const dy = dest.y - origin.y;
  let px = -dy;
  let py = dx;
  const plen = Math.hypot(px, py);
  if(plen > 1e-5){
    px = (px / plen) * sign;
    py = (py / plen) * sign;
  }else{
    px = 0;
    py = sign;
  }

  if(t < travelT){
    const u = t / travelT;
    out.lerpVectors(origin, dest, u);
    // Modest lob during the approach leg (visual throw, not spiral)
    const dist = origin.distanceTo(dest);
    out.z += Math.sin(u * Math.PI) * Math.min(2.5, dist * 0.12);
    return out;
  }

  // Spiral hang: orbit while collapsing onto dest
  const s = (t - travelT) / Math.max(1e-6, hangT);
  const radius = 2 * (1 - s);
  const angle = s * Math.PI * 2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  out.copy(dest);
  out.x += (px * cos - py * sin) * radius;
  out.y += (px * sin + py * cos) * radius;
  // Settle from approach peak toward dest.z
  const approachPeak = Math.min(2.5, origin.distanceTo(dest) * 0.12);
  out.z += approachPeak * (1 - s) * 0.25;
  return out;
}

/**
 * Path 11 grenade throw: multi-segment skim along the chord toward dest.
 * Waypoints at ~80/90/95/100% of travel; time ~60% / 12% / 10% / remainder.
 * Z lerps toward dest.z (flat-ground stand-in for ground probes).
 */
function sampleGrenadeGroundBallistic(
  origin: THREE.Vector3,
  dest: THREE.Vector3,
  t: number,
  out: THREE.Vector3
): THREE.Vector3 {
  // Cumulative time keys and chord fractions
  const timeKeys = [0, 0.6, 0.72, 0.82, 1.0];
  const chordKeys = [0, 0.8, 0.9, 0.95, 1.0];

  let seg = 0;
  while(seg < timeKeys.length - 2 && t > timeKeys[seg + 1]){
    seg++;
  }
  const t0 = timeKeys[seg];
  const t1 = timeKeys[seg + 1];
  const local = (t - t0) / Math.max(1e-6, t1 - t0);
  const c0 = chordKeys[seg];
  const c1 = chordKeys[seg + 1];
  const chord = c0 + (c1 - c0) * local;

  out.lerpVectors(origin, dest, chord);
  // Modest lob on the first leg only — later legs skim toward dest.z
  if(seg === 0){
    const dist = origin.distanceTo(dest);
    out.z += Math.sin(local * Math.PI) * Math.min(2.0, dist * 0.1);
  }
  return out;
}

/** Path 2 ballistic — gravity-style arc (accel −9.81 in VelAndAccel). */
function sampleBallistic(
  origin: THREE.Vector3,
  dest: THREE.Vector3,
  t: number,
  out: THREE.Vector3,
  peakScale: number
): THREE.Vector3 {
  out.lerpVectors(origin, dest, t);
  const dist = origin.distanceTo(dest);
  out.z += Math.sin(t * Math.PI) * Math.min(peakScale, dist * 0.2);
  return out;
}

/**
 * Path 3 high ballistic — raises mid waypoint +30 on first half.
 */
function sampleHighBallistic(
  origin: THREE.Vector3,
  dest: THREE.Vector3,
  t: number,
  out: THREE.Vector3
): THREE.Vector3 {
  if(t <= 0.5){
    const u = t * 2;
    _tmp.set(dest.x, dest.y, dest.z + 30);
    out.lerpVectors(origin, _tmp, u);
  }else{
    const u = (t - 0.5) * 2;
    _tmp.set(dest.x, dest.y, dest.z + 30);
    out.lerpVectors(_tmp, dest, u);
  }
  return out;
}

/** Build mid control point for legacy QuadraticBezier callers (broadcast helper). */
export function spellProjectileBezierMid(
  pathType: number,
  origin: THREE.Vector3,
  dest: THREE.Vector3,
  out: THREE.Vector3 = new THREE.Vector3()
): THREE.Vector3 {
  out.lerpVectors(origin, dest, 0.5);
  const path = pathType | 0;
  if(path === ProjectilePath.HIGH_BALLISTIC || path === 3){
    out.z += 30;
  }else if(
    path === ProjectilePath.GRENADE || path === 11 ||
    path === ProjectilePath.BOUNCE || path === 8 ||
    path === ProjectilePath.BALLISTIC || path === 2
  ){
    out.z += Math.min(2.5, origin.distanceTo(dest) * 0.15);
  }else if(path === ProjectilePath.SPIRAL || path === 6){
    out.z += Math.min(2.5, origin.distanceTo(dest) * 0.15);
  }else{
    out.z += 2;
  }
  return out;
}
