import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleObject } from "@/module/ModuleObject";
import { PathPoint } from "@/engine/pathfinding/PathPoint";
import { hasDirectLine } from "@/engine/pathfinding/test-direct-line";

/**
 * Approximate CSWSArea::SmoothCornerOptimize @ 004bfe20 + ComputeBestCorner @ 004be3a0.
 *
 * For sharp corners (BA·BC normalized < 0.9), binary-search a chord that cuts
 * the corner with TestDirectLine clearance.
 *
 * @file smooth-corner-optimize.ts
 */

const DOT_SHARP = 0.9;
const MIN_LEN = 0.0001;

/**
 * Corner-cut a path point list (2D xy). Returns a new PathPoint array.
 */
export function smoothCornerOptimize(
  area: ModuleArea | undefined,
  points: PathPoint[],
  owner?: ModuleObject
): PathPoint[] {
  if(!area || points.length < 3) return points;

  const out: PathPoint[] = [points[0]];
  for(let i = 1; i < points.length - 1; i++){
    const a = out[out.length - 1].vector;
    const b = points[i].vector;
    const c = points[i + 1].vector;

    const corner = computeBestCorner(area, a, b, c, owner);
    if(corner){
      out.push(PathPoint.FromVector3(corner.p0));
      out.push(PathPoint.FromVector3(corner.p1));
    }else{
      out.push(points[i]);
    }
  }
  out.push(points[points.length - 1]);

  const pruned: PathPoint[] = [out[0]];
  for(let i = 1; i < out.length; i++){
    if(pruned[pruned.length - 1].vector.distanceToSquared(out[i].vector) > 0.0001){
      pruned.push(out[i]);
    }
  }
  if(pruned.length >= 1){
    pruned[pruned.length - 1].end = true;
  }
  return pruned;
}

type CornerChord = { p0: THREE.Vector3; p1: THREE.Vector3 };

/**
 * Retail ComputeBestCorner: chord across corner B of polyline A-B-C.
 */
export function computeBestCorner(
  area: ModuleArea,
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  owner?: ModuleObject
): CornerChord | undefined {
  const lenAB = Math.hypot(b.x - a.x, b.y - a.y);
  const lenBC = Math.hypot(c.x - b.x, c.y - b.y);
  if(lenAB < MIN_LEN || lenBC < MIN_LEN) return undefined;

  // Retail: (BA · BC) / (|BA| |BC|) < 0.9 → sharp enough to cut
  const bax = a.x - b.x;
  const bay = a.y - b.y;
  const bcx = c.x - b.x;
  const bcy = c.y - b.y;
  const cornerDot = (bax * bcx + bay * bcy) / (lenAB * lenBC);
  if(cornerDot >= DOT_SHARP) return undefined;

  const minLen = Math.min(lenAB, lenBC);
  let t = 0.5;
  let step = 0.25;
  let found = false;
  const best0 = new THREE.Vector3();
  const best1 = new THREE.Vector3();
  let first = true;

  while(first || step * minLen > 0.1){
    const dist = t * minLen;
    const p0 = new THREE.Vector3(
      b.x + (a.x - b.x) * (dist / lenAB),
      b.y + (a.y - b.y) * (dist / lenAB),
      b.z
    );
    const p1 = new THREE.Vector3(
      b.x + (c.x - b.x) * (dist / lenBC),
      b.y + (c.y - b.y) * (dist / lenBC),
      b.z
    );

    if(hasDirectLine(area, p0, p1, owner)){
      t = t + step;
      best0.copy(p0);
      best1.copy(p1);
      found = true;
    }else{
      t = t - step;
    }
    step *= 0.5;
    first = false;
  }

  return found ? { p0: best0, p1: best1 } : undefined;
}
