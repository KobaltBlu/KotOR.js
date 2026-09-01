import * as THREE from "three";

/**
 * Retail-aligned CWalkHitInfo helpers (NoCreaturesOnLine / NoNonWalkPolys).
 *
 * @file walk-hit-info.ts
 */

export enum WalkHitKind {
  None = 0,
  /** Edge / circle hit (Initialize type 1). */
  Edge = 1,
  /** Interior face containment (Initialize type 2). */
  Interior = 2,
}

export type WalkHitInfo = {
  kind: WalkHitKind;
  /** Closest hit along the query. */
  hitPoint: THREE.Vector3;
  /** Outward / contact normal. */
  normal: THREE.Vector3;
  /** Optional edge endpoints when kind=Edge. */
  edgeA?: THREE.Vector3;
  edgeB?: THREE.Vector3;
  /** Blocking object id (creature / door / placeable). */
  objectId?: number;
};

export function createWalkHitInfo(): WalkHitInfo {
  return {
    kind: WalkHitKind.None,
    hitPoint: new THREE.Vector3(),
    normal: new THREE.Vector3(0, 0, 1),
  };
}

/**
 * Approximate SetHitInfoForCreature.
 * Fills hit from circle(creature) ∩ segment intersection (nearest to line start).
 */
export function setHitInfoForCreature(
  creaturePos: THREE.Vector3,
  radius: number,
  lineStart: THREE.Vector3,
  lineEnd: THREE.Vector3,
  hit: WalkHitInfo
): boolean {
  const ax = lineStart.x;
  const ay = lineStart.y;
  const bx = lineEnd.x;
  const by = lineEnd.y;
  const cx = creaturePos.x;
  const cy = creaturePos.y;
  const abx = bx - ax;
  const aby = by - ay;
  const abLenSq = abx * abx + aby * aby;
  if(abLenSq < 1e-12){
    const dx = cx - ax;
    const dy = cy - ay;
    const d = Math.hypot(dx, dy);
    if(d > radius || d < 1e-8) return false;
    hit.kind = WalkHitKind.Edge;
    hit.hitPoint.set(ax, ay, lineStart.z);
    hit.normal.set(dx / d, dy / d, 0);
    hit.objectId = undefined;
    return true;
  }

  // Project center onto segment
  let t = ((cx - ax) * abx + (cy - ay) * aby) / abLenSq;
  t = Math.max(0, Math.min(1, t));
  const px = ax + abx * t;
  const py = ay + aby * t;
  const dx = px - cx;
  const dy = py - cy;
  const dist = Math.hypot(dx, dy);
  if(dist > radius + 1e-4) return false;

  // Hit on circle toward line start direction along segment
  const inv = dist > 1e-8 ? 1 / dist : 0;
  const nx = dist > 1e-8 ? dx * inv : -aby / Math.sqrt(abLenSq);
  const ny = dist > 1e-8 ? dy * inv : abx / Math.sqrt(abLenSq);

  hit.kind = WalkHitKind.Edge;
  hit.hitPoint.set(
    cx + nx * radius,
    cy + ny * radius,
    creaturePos.z
  );
  hit.normal.set(nx, ny, 0);
  // Tangent edge for Initialize-style payload
  hit.edgeA = new THREE.Vector3(hit.hitPoint.x - ny, hit.hitPoint.y + nx, hit.hitPoint.z);
  hit.edgeB = new THREE.Vector3(hit.hitPoint.x + ny, hit.hitPoint.y - nx, hit.hitPoint.z);
  return true;
}

/**
 * Fill WalkHitInfo from AABB ∩ segment (placeable / door box fallbacks).
 * Approximate CWalkHitInfo Initialize type 1 (edge) with box-face contact.
 */
export function setHitInfoForAabb(
  box: { min: THREE.Vector3; max: THREE.Vector3 },
  lineStart: THREE.Vector3,
  lineEnd: THREE.Vector3,
  hit: WalkHitInfo,
  objectId?: number
): boolean {
  const ax = lineStart.x;
  const ay = lineStart.y;
  const bx = lineEnd.x;
  const by = lineEnd.y;
  const abx = bx - ax;
  const aby = by - ay;
  const abLenSq = abx * abx + aby * aby;
  if(abLenSq < 1e-12) return false;

  // Sample along segment for first point inside expanded box
  let hitT = -1;
  for(let i = 0; i <= 16; i++){
    const t = i / 16;
    const px = ax + abx * t;
    const py = ay + aby * t;
    if(
      px >= box.min.x && px <= box.max.x &&
      py >= box.min.y && py <= box.max.y
    ){
      hitT = t;
      break;
    }
  }
  if(hitT < 0){
    // Closest point on segment to box center
    const cx = (box.min.x + box.max.x) * 0.5;
    const cy = (box.min.y + box.max.y) * 0.5;
    let t = ((cx - ax) * abx + (cy - ay) * aby) / abLenSq;
    t = Math.max(0, Math.min(1, t));
    hitT = t;
  }

  const hx = ax + abx * hitT;
  const hy = ay + aby * hitT;
  const cx = (box.min.x + box.max.x) * 0.5;
  const cy = (box.min.y + box.max.y) * 0.5;
  let nx = hx - cx;
  let ny = hy - cy;
  const nlen = Math.hypot(nx, ny);
  if(nlen > 1e-8){
    nx /= nlen;
    ny /= nlen;
  }else{
    nx = 1;
    ny = 0;
  }

  hit.kind = WalkHitKind.Edge;
  hit.hitPoint.set(hx, hy, lineStart.z);
  hit.normal.set(nx, ny, 0);
  hit.objectId = objectId;
  hit.edgeA = new THREE.Vector3(hx - ny, hy + nx, lineStart.z);
  hit.edgeB = new THREE.Vector3(hx + ny, hy - nx, lineStart.z);
  return true;
}
