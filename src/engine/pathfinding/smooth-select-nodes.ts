import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleObject } from "@/module/ModuleObject";
import { hasClearWalkLine } from "@/engine/pathfinding/walk-line-clear";

/**
 * Approximate SmoothSelectNodes
 * SmoothSelectNodesRestartable + SmoothSelectionRestartable.
 *
 * SmoothSelectionRestartable :
 * state stage 2: densify only — arg5=1, arg6=0, arg7=**5.0**
 * state stage 3: densify + look-ahead string-pull — (1, 1, **1.1**)
 * state stage 4: string-pull only — (0, 1, 1.1)
 *
 * Time budget: compares Exo high-res delta to constant (=10000);
 * JS uses ~10ms wall clock and may return mid-pipeline with resume
 * (state + mid-pass densify cursor state/state/state).
 *
 * @file smooth-select-nodes.ts
 */

const DENSIFY_STEP = 1.0;
/** Pass-1 threshold (SmoothSelectionRestartable first call). */
const DENSIFY_MIN_COARSE = 5.0;
/** Pass-2/3 threshold. */
const DENSIFY_MIN_FINE = 1.1;
/** constant = 10000 timer ticks ≈ 10ms wall slice. */
export const SMOOTH_SELECTION_BUDGET_MS = 10;

/** SmoothSelectionRestartable stage. */
export type SmoothSelectionStage = 2 | 3 | 4;

/**
 * Resume across frames when SmoothSelectNodesRestartable returns 1.
 * Working polyline is the input for the next stage (or current if mid-stage).
 * Densify cursor matches engine behavior/132/133 on CPathfindInformation.
 */
export type SmoothSelectionResume = {
  stage: SmoothSelectionStage;
  working: THREE.Vector3[];
  /** Input polyline for the current densify pass. */
  source?: THREE.Vector3[];
  /** state — next source index to consume (1..source.length). */
  srcIndex?: number;
  /** state — remaining inserts along the current edge. */
  densifyStack?: THREE.Vector3[];
  /** state — densify stack depth; -1 = idle. */
  densifyStackDepth?: number;
};

export type SmoothSelectionResult = {
  points: THREE.Vector3[];
  timedOut: boolean;
  resume?: SmoothSelectionResume;
};

export type DensifyRestartableResult = {
  points: THREE.Vector3[];
  timedOut: boolean;
  srcIndex: number;
  densifyStack: THREE.Vector3[];
  densifyStackDepth: number;
};

function cloneVecList(points: THREE.Vector3[]): THREE.Vector3[] {
  return points.map((p) => p.clone());
}

/**
 * Build insert points along segment a→b when length ≥ minLength (densify).
 */
function buildEdgeInserts(
  a: THREE.Vector3,
  b: THREE.Vector3,
  step: number,
  minLength: number
): THREE.Vector3[] {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  if(dist < minLength) return [];
  const inserts: THREE.Vector3[] = [];
  let remaining = dist;
  while(remaining > step){
    const t = 1 - (remaining - step) / dist;
    if(t >= 0.999) break;
    inserts.push(new THREE.Vector3(
      a.x + (b.x - a.x) * t,
      a.y + (b.y - a.y) * t,
      a.z + (b.z - a.z) * t
    ));
    remaining -= step;
  }
  return inserts;
}

/**
 * Insert points along segments longer than `minLength` (densify).
 * Sync convenience — no time slice.
 */
export function densifyPathPoints(
  points: THREE.Vector3[],
  step: number = DENSIFY_STEP,
  minLength: number = DENSIFY_MIN_FINE
): THREE.Vector3[] {
  return densifyPathPointsRestartable(points, step, minLength).points;
}

/**
 * Budgeted densify with mid-edge resume (SmoothSelectNodesRestartable densify).
 * On abort: densifyStackDepth ≥ 0 and srcIndex points at the unfinished source vertex.
 */
export function densifyPathPointsRestartable(
  points: THREE.Vector3[],
  step: number = DENSIFY_STEP,
  minLength: number = DENSIFY_MIN_FINE,
  options: {
    shouldAbort?: () => boolean;
    working?: THREE.Vector3[];
    srcIndex?: number;
    densifyStack?: THREE.Vector3[];
    densifyStackDepth?: number;
  } = {}
): DensifyRestartableResult {
  if(points.length < 2){
    return {
      points,
      timedOut: false,
      srcIndex: points.length,
      densifyStack: [],
      densifyStackDepth: -1,
    };
  }

  const shouldAbort = options.shouldAbort;
  const out: THREE.Vector3[] = options.working?.length
    ? cloneVecList(options.working)
    : [points[0].clone()];

  let srcIndex = typeof options.srcIndex === 'number' ? options.srcIndex : 1;
  let stack = options.densifyStack?.length
    ? cloneVecList(options.densifyStack)
    : [];
  let stackDepth = typeof options.densifyStackDepth === 'number'
    ? options.densifyStackDepth
    : -1;

  // Flush remaining inserts from a prior mid-edge abort
  if(stackDepth > 0 && stack.length){
    while(stack.length){
      if(shouldAbort?.()){
        return {
          points: out,
          timedOut: true,
          srcIndex,
          densifyStack: stack,
          densifyStackDepth: stack.length,
        };
      }
      out.push(stack.shift()!);
    }
    if(shouldAbort?.()){
      return {
        points: out,
        timedOut: true,
        srcIndex,
        densifyStack: [],
        densifyStackDepth: 0,
      };
    }
    // Finish the edge by emitting the destination source vertex
    if(srcIndex < points.length){
      out.push(points[srcIndex].clone());
      srcIndex++;
    }
    stackDepth = -1;
  }

  for(; srcIndex < points.length; srcIndex++){
    if(shouldAbort?.()){
      return {
        points: out,
        timedOut: true,
        srcIndex,
        densifyStack: [],
        densifyStackDepth: -1,
      };
    }

    const a = out[out.length - 1];
    const b = points[srcIndex];
    const inserts = buildEdgeInserts(a, b, step, minLength);

    for(let k = 0; k < inserts.length; k++){
      if(shouldAbort?.()){
        const remaining = inserts.slice(k);
        return {
          points: out,
          timedOut: true,
          srcIndex,
          densifyStack: remaining,
          densifyStackDepth: remaining.length,
        };
      }
      out.push(inserts[k]);
    }

    out.push(b.clone());
  }

  return {
    points: out,
    timedOut: false,
    srcIndex: points.length,
    densifyStack: [],
    densifyStackDepth: -1,
  };
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
      if(hasClearWalkLine(area, points[i], points[j], owner)){
        farthest = j;
        break;
      }
    }

    // : when look-ahead fails and span≥5, binary-halve span
    if(farthest === i + 1 && points.length - 1 - i >= 5){
      let span = points.length - 1 - i;
      while(span >= 5){
        const mid = i + (span >> 1);
        if(mid <= i + 1) break;
        if(hasClearWalkLine(area, points[i], points[mid], owner)){
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

function makeDensifyResume(
  stage: SmoothSelectionStage,
  densify: DensifyRestartableResult,
  source: THREE.Vector3[]
): SmoothSelectionResume {
  return {
    stage,
    working: densify.points,
    source: cloneVecList(source),
    srcIndex: densify.srcIndex,
    densifyStack: densify.densifyStack,
    densifyStackDepth: densify.densifyStackDepth,
  };
}

/**
 * SmoothSelectionRestartable three-pass pipeline.
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
  let working = options.resume?.working
    ? cloneVecList(options.resume.working)
    : cloneVecList(points);

  if(stage === 2){
    const source = options.resume?.source?.length
      ? options.resume.source
      : points;
    const densify = densifyPathPointsRestartable(
      source,
      DENSIFY_STEP,
      DENSIFY_MIN_COARSE,
      {
        shouldAbort,
        working: options.resume?.source ? options.resume.working : undefined,
        srcIndex: options.resume?.srcIndex,
        densifyStack: options.resume?.densifyStack,
        densifyStackDepth: options.resume?.densifyStackDepth,
      }
    );
    working = densify.points;
    if(densify.timedOut){
      return {
        points: working,
        timedOut: true,
        resume: makeDensifyResume(2, densify, source),
      };
    }
    stage = 3;
  }

  if(stage === 3){
    const midDensify = !!(
      options.resume?.stage === 3 &&
      options.resume.source?.length &&
      (options.resume.densifyStackDepth ?? -1) >= 0
    );
    const densifyInput = midDensify ? options.resume!.source! : working;
    const densify = densifyPathPointsRestartable(
      densifyInput,
      DENSIFY_STEP,
      DENSIFY_MIN_FINE,
      midDensify
        ? {
            shouldAbort,
            working: options.resume?.working,
            srcIndex: options.resume?.srcIndex,
            densifyStack: options.resume?.densifyStack,
            densifyStackDepth: options.resume?.densifyStackDepth,
          }
        : { shouldAbort }
    );
    working = densify.points;
    if(densify.timedOut){
      return {
        points: working,
        timedOut: true,
        resume: makeDensifyResume(3, densify, densifyInput),
      };
    }

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
