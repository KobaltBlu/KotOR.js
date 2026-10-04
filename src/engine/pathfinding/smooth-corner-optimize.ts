import * as THREE from "three";
import type { ModuleArea } from "@engine/module/ModuleArea";
import type { ModuleObject } from "@engine/module/ModuleObject";
import { PathPoint } from "@engine/pathfinding/PathPoint";
import { hasClearWalkLine } from "@engine/pathfinding/walk-line-clear";
import { SMOOTH_SELECTION_BUDGET_MS } from "@engine/pathfinding/smooth-select-nodes";

/**
 * SmoothCornerOptimize + find best corner chord.
 *
 * For sharp corners (BA·BC normalized < 0.9), binary-search a chord that cuts
 * the corner, then nested CBC passes refine near/far sides of the chord
 * (SmoothCornerOptimize control flow).
 *
 * Restartable variant is KotOR.js hitch hardening (runs corners sync after
 * SmoothSelectionRestartable returns 0). Budget matches engine behavior constant ≈ 10ms.
 *
 * @file smooth-corner-optimize.ts
 */

const DOT_SHARP = 0.9;
const MIN_LEN = 0.0001;

/** Mid-pass resume for SmoothCornerOptimize under a wall-clock budget. */
export type SmoothCornerResume = {
  /** Next interior vertex index in the source polyline (1..n-2). */
  cornerIndex: number;
  /** Partial output built so far (cloned PathPoint vectors). */
  working: THREE.Vector3[];
};

export type SmoothCornerResult = {
  points: PathPoint[];
  timedOut: boolean;
  resume?: SmoothCornerResume;
};

export type SmoothCornerOptions = {
  timeBudgetMs?: number;
  resume?: SmoothCornerResume;
};

/**
 * Corner-cut a path point list (2D xy). Sync convenience wrapper.
 */
export function smoothCornerOptimize(
  area: ModuleArea | undefined,
  points: PathPoint[],
  owner?: ModuleObject
): PathPoint[] {
  return smoothCornerOptimizeRestartable(area, points, owner).points;
}

/**
 * Budgeted SmoothCornerOptimize — may return mid-loop with resume.
 */
export function smoothCornerOptimizeRestartable(
  area: ModuleArea | undefined,
  points: PathPoint[],
  owner?: ModuleObject,
  options: SmoothCornerOptions = {}
): SmoothCornerResult {
  if(!area || points.length < 3){
    return { points, timedOut: false };
  }

  const budget = options.timeBudgetMs;
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const timedOut = (): boolean =>
    budget != null && budget >= 0 && (performance.now() - t0) >= budget;

  const source = points;
  let cornerIndex = options.resume?.cornerIndex ?? 1;
  const workingVecs: THREE.Vector3[] = options.resume?.working?.length
    ? options.resume.working.map((v) => v.clone())
    : [source[0].vector.clone()];

  for(; cornerIndex < source.length - 1; cornerIndex++){
    if(timedOut()){
      return {
        points: vectorsToPathPoints(workingVecs, false),
        timedOut: true,
        resume: {
          cornerIndex,
          working: workingVecs.map((v) => v.clone()),
        },
      };
    }

    const a = workingVecs[workingVecs.length - 1];
    const b = source[cornerIndex].vector;
    const c = source[cornerIndex + 1].vector;

    // SmoothCornerOptimize — nested find best corner chord passes
    const chord = findBestCornerChord(area, a, b, c, owner);
    if(!chord){
      workingVecs.push(b.clone());
      continue;
    }
    const near = findBestCornerChord(area, a, chord.p0, chord.p1, owner);
    if(near){
      const far = findBestCornerChord(area, near.p1, chord.p1, c, owner);
      if(far){
        workingVecs.push(near.p0.clone(), near.p1.clone(), far.p0.clone(), far.p1.clone());
      }else{
        workingVecs.push(near.p0.clone(), near.p1.clone(), chord.p1.clone());
      }
    }else{
      const far = findBestCornerChord(area, chord.p0, chord.p1, c, owner);
      if(far){
        workingVecs.push(chord.p0.clone(), far.p0.clone(), far.p1.clone());
      }else{
        workingVecs.push(chord.p0.clone(), chord.p1.clone());
      }
    }
  }

  workingVecs.push(source[source.length - 1].vector.clone());

  const pruned = dedupeVectors(workingVecs);
  return { points: vectorsToPathPoints(pruned, true), timedOut: false };
}

function dedupeVectors(vecs: THREE.Vector3[]): THREE.Vector3[] {
  const pruned: THREE.Vector3[] = [vecs[0]];
  for(let i = 1; i < vecs.length; i++){
    if(pruned[pruned.length - 1].distanceToSquared(vecs[i]) > 0.0001){
      pruned.push(vecs[i]);
    }
  }
  return pruned;
}

function vectorsToPathPoints(vecs: THREE.Vector3[], markEnd: boolean): PathPoint[] {
  const out = vecs.map((v) => PathPoint.FromVector3(v));
  if(markEnd && out.length >= 1){
    out[out.length - 1].end = true;
  }
  return out;
}

type CornerChord = { p0: THREE.Vector3; p1: THREE.Vector3 };

/**
 * find best corner chord: chord across corner B of polyline A-B-C.
 */
export function findBestCornerChord(
  area: ModuleArea,
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  owner?: ModuleObject
): CornerChord | undefined {
  const lenAB = Math.hypot(b.x - a.x, b.y - a.y);
  const lenBC = Math.hypot(c.x - b.x, c.y - b.y);
  if(lenAB < MIN_LEN || lenBC < MIN_LEN) return undefined;

  // : (BA · BC) / (|BA| |BC|) < 0.9 → sharp enough to cut
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

    if(hasClearWalkLine(area, p0, p1, owner)){
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

export { SMOOTH_SELECTION_BUDGET_MS as SMOOTH_CORNER_BUDGET_MS };
