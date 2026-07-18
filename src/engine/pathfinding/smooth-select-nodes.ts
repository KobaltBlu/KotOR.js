import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleObject } from "@/module/ModuleObject";
import { hasDirectLine } from "@/engine/pathfinding/test-direct-line";

/**
 * Approximate CSWSArea::SmoothSelectNodes @ 004c0180 /
 * SmoothSelectNodesRestartable @ 004c04e0 + SmoothSelectionRestartable @ 004c13e0.
 *
 * Retail SmoothSelectionRestartable (Ghidra-validated @ 004c13e0):
 *   field124 stage 2: densify only — param_5=1, param_6=0, param_7=**5.0**
 *   field124 stage 3: densify + look-ahead string-pull — (1, 1, **1.1**)
 *   field124 stage 4: string-pull only — (0, 1, 1.1)
 *
 * Time budget: retail compares Exo high-res delta to DAT_007a1b1c (=10000);
 * JS uses ~10ms wall clock and may return mid-pipeline with resume
 * (field124 / working polyline). Mid-pass densify stack (field131/field132)
 * is Approximate — stage boundaries are the resume points.
 *
 * @file smooth-select-nodes.ts
 */

const DENSIFY_STEP = 1.0;
/** Pass-1 threshold (SmoothSelectionRestartable first call). */
const DENSIFY_MIN_COARSE = 5.0;
/** Pass-2/3 threshold. */
const DENSIFY_MIN_FINE = 1.1;
/** Retail DAT_007a1b1c = 10000 timer ticks ≈ 10ms wall slice. */
export const SMOOTH_SELECTION_BUDGET_MS = 10;

/** field124_0x214 — SmoothSelectionRestartable stage. */
export type SmoothSelectionStage = 2 | 3 | 4;

/**
 * Resume across frames when SmoothSelectNodesRestartable returns 1.
 * Working polyline is the input for the next stage (or current if mid-stage).
 */
export type SmoothSelectionResume = {
  stage: SmoothSelectionStage;
  working: THREE.Vector3[];
};

export type SmoothSelectionResult = {
  points: THREE.Vector3[];
  timedOut: boolean;
  resume?: SmoothSelectionResume;
};

/**
 * Insert points along segments longer than `minLength` (retail densify).
 */
export function densifyPathPoints(
  points: THREE.Vector3[],
  step: number = DENSIFY_STEP,
  minLength: number = DENSIFY_MIN_FINE
): THREE.Vector3[] {
  if(points.length < 2) return points;
  const out: THREE.Vector3[] = [points[0]];
  for(let i = 1; i < points.length; i++){
    const a = out[out.length - 1];
    const b = points[i];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    if(dist >= minLength){
      // Retail: subtract 1.0 from remaining length each insert
      let remaining = dist;
      while(remaining > step){
        const t = 1 - (remaining - step) / dist;
        if(t >= 0.999) break;
        out.push(new THREE.Vector3(
          a.x + (b.x - a.x) * t,
          a.y + (b.y - a.y) * t,
          a.z + (b.z - a.z) * t
        ));
        remaining -= step;
      }
    }
    out.push(b);
  }
  return out;
}

/**
 * Reduce a polyline by LOS string-pull. Returns a new array (may share Vector3 refs).
 */
export function smoothSelectNodes(
  area: ModuleArea | undefined,
  points: THREE.Vector3[],
  owner?: ModuleObject,
  shouldAbort?: () => boolean
): THREE.Vector3[] {
  if(!area || points.length <= 2) return points;

  const out: THREE.Vector3[] = [points[0]];
  let i = 0;
  while(i < points.length - 1){
    if(shouldAbort?.()) break;
    let farthest = i + 1;

    for(let j = points.length - 1; j > i + 1; j--){
      if(hasDirectLine(area, points[i], points[j], owner)){
        farthest = j;
        break;
      }
    }

    // Retail: when look-ahead fails and span≥5, binary-halve span
    if(farthest === i + 1 && points.length - 1 - i >= 5){
      let span = points.length - 1 - i;
      while(span >= 5){
        const mid = i + (span >> 1);
        if(mid <= i + 1) break;
        if(hasDirectLine(area, points[i], points[mid], owner)){
          farthest = mid;
          break;
        }
        span >>= 1;
      }
    }

    out.push(points[farthest]);
    i = farthest;
  }

  // If aborted mid-pull, keep remaining tail so path stays connected
  if(i < points.length - 1 && out[out.length - 1] !== points[points.length - 1]){
    for(let k = i + 1; k < points.length; k++){
      out.push(points[k]);
    }
  }
  return out;
}

export type SmoothSelectionOptions = {
  timeBudgetMs?: number;
  resume?: SmoothSelectionResume;
};

/**
 * Retail SmoothSelectionRestartable three-pass pipeline (@ 004c13e0).
 * May return early with `timedOut` + `resume` when wall budget exhausted.
 */
export function smoothSelectionRestartable(
  area: ModuleArea | undefined,
  points: THREE.Vector3[],
  owner?: ModuleObject,
  options: SmoothSelectionOptions = {}
): SmoothSelectionResult {
  if(!area || points.length <= 2){
    return { points, timedOut: false };
  }

  const budget = options.timeBudgetMs;
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const timedOut = (): boolean =>
    budget != null && budget >= 0 && (performance.now() - t0) >= budget;
  const shouldAbort = budget != null ? timedOut : undefined;

  let stage: SmoothSelectionStage = options.resume?.stage ?? 2;
  let working = options.resume?.working ?? points;

  if(stage === 2){
    working = densifyPathPoints(working, DENSIFY_STEP, DENSIFY_MIN_COARSE);
    if(timedOut()){
      return { points: working, timedOut: true, resume: { stage: 3, working } };
    }
    stage = 3;
  }

  if(stage === 3){
    working = densifyPathPoints(working, DENSIFY_STEP, DENSIFY_MIN_FINE);
    working = smoothSelectNodes(area, working, owner, shouldAbort);
    if(timedOut()){
      return { points: working, timedOut: true, resume: { stage: 4, working } };
    }
    stage = 4;
  }

  if(stage === 4){
    working = smoothSelectNodes(area, working, owner, shouldAbort);
    if(timedOut()){
      return { points: working, timedOut: true, resume: { stage: 4, working } };
    }
  }

  return { points: working, timedOut: false };
}

/**
 * Sync convenience wrapper — completes all stages unless budget is set.
 */
export function smoothSelection(
  area: ModuleArea | undefined,
  points: THREE.Vector3[],
  owner?: ModuleObject,
  options?: SmoothSelectionOptions
): THREE.Vector3[] {
  return smoothSelectionRestartable(area, points, owner, options).points;
}
