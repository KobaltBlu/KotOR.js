import * as THREE from "three";
import type { ModuleObject } from "@/module/ModuleObject";
import { PathPoint } from "@/engine/pathfinding/PathPoint";
import { PathPointDfsTransTable } from "@/engine/pathfinding/path-point-dfs-trans-table";

/**
 * Approximate PathPointDFSearch + GenerateSuccessors.
 *
 * Goal-ordered DFS with iterative cost budget (PlotPathPointPath)
 * and TransTable pruning. Wall-clock time slice mirrors retail return-1;
 * continuation reuses TransTable + cost budget (state/state) — retail
 * does not save the mid-DFS call stack.
 *
 * @file path-point-dfs.ts
 */

export type PathPointDfsEdgeEval = {
  /** Edge cost; < 0 = blocked (skip). */
  cost: number;
  detour?: THREE.Vector3;
};

export type PathPointDfsResult = {
  ok: boolean;
  /** Goal node (or best near-goal) with parent chain set. */
  end?: PathPoint;
  detours: WeakMap<PathPoint, THREE.Vector3>;
  visits: number;
  /** True when wall-clock budget expired before a full solution (retail return 1). */
  timedOut?: boolean;
  /** TransTable to reuse on the next frame (Retail). */
  transTable?: PathPointDfsTransTable;
  /** Cost budget to continue deepening from (retail). */
  costBudget?: number;
};

type Successor = {
  node: PathPoint;
  cost: number;
  detour?: THREE.Vector3;
  h: number;
};

const MAX_VISITS = 0xfff;
const MAX_ROUNDS = 16;
const MAX_DEPTH = 256;
/** Default sync budget — enough for typical areas without hitching the frame. */
const DEFAULT_TIME_BUDGET_MS = 12;

/**
 * Run PathPoint DFS from origin toward destination.
 * `evaluateEdge` should mirror GenerateSuccessors LOS / creature detour / NoNonWalk.
 */
export function pathPointDfsSearch(options: {
  origin: PathPoint;
  destination: PathPoint;
  owner?: ModuleObject;
  evaluateEdge: (from: PathPoint, to: PathPoint) => PathPointDfsEdgeEval;
  /**
   * Wall-clock ms budget (PlotPathPointPath high-res timer).
   * 0 = unlimited; omit = DEFAULT_TIME_BUDGET_MS.
   */
  timeBudgetMs?: number;
  /** Reuse TransTable from a prior timed-out search (same endpoints). */
  transTable?: PathPointDfsTransTable;
  /** Resume cost-budget deepening from a prior timed-out search. */
  costBudget?: number;
}): PathPointDfsResult {
  const origin = options.origin;
  const destination = options.destination;
  const detours = new WeakMap<PathPoint, THREE.Vector3>();
  const table = options.transTable ?? new PathPointDfsTransTable();
  const resumeTable = !!options.transTable;

  if(!origin || !destination){
    return { ok: false, detours, visits: 0 };
  }
  if(origin === destination){
    return { ok: true, end: destination, detours, visits: 0 };
  }

  const timeBudgetMs = options.timeBudgetMs === undefined
    ? DEFAULT_TIME_BUDGET_MS
    : options.timeBudgetMs;
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const timedOut = (): boolean => {
    if(timeBudgetMs <= 0) return false;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return (now - t0) >= timeBudgetMs;
  };

  const goalDist0 = origin.vector.distanceTo(destination.vector);
  const closeEnough = Math.max(0.01, goalDist0);
  const budgetStep = Math.max(0.5, goalDist0 * 0.25);
  let budget = options.costBudget ?? (budgetStep + 10);

  let bestEnd: PathPoint | undefined;
  let bestDist = Infinity;
  let totalVisits = 0;
  let foundGoal = false;
  let hitTimeLimit = false;

  if(!resumeTable){
    table.reset();
  }

  for(let round = 0; round < MAX_ROUNDS; round++){
    if(timedOut()){
      hitTimeLimit = true;
      break;
    }

    let visits = 0;
    let abort = false;
    const onPath = new Set<PathPoint>();

    const dfs = (node: PathPoint, gCost: number, remaining: number, depth: number): boolean => {
      if(timedOut()){
        hitTimeLimit = true;
        abort = true;
        return false;
      }

      visits++;
      totalVisits++;
      if(visits > MAX_VISITS || depth > MAX_DEPTH){
        abort = true;
        return false;
      }

      const distGoal = node.vector.distanceTo(destination.vector);
      if(distGoal < bestDist){
        bestDist = distGoal;
        bestEnd = node;
      }

      if(node === destination || distGoal < 1e-4){
        foundGoal = true;
        return true;
      }

      if(remaining < distGoal){
        return false;
      }

      const px = node.vector.x;
      const py = node.vector.y;
      if(table.shouldPrune(px, py, gCost, remaining)){
        return false;
      }

      const successors = generateSuccessors(node, destination, options.evaluateEdge);
      table.put(px, py, gCost, remaining);

      onPath.add(node);
      for(let i = 0; i < successors.length; i++){
        if(abort) break;
        const s = successors[i];
        if(onPath.has(s.node)) continue;
        s.node.parent = node;
        if(s.detour){
          detours.set(s.node, s.detour);
        }else{
          detours.delete(s.node);
        }
        if(dfs(s.node, gCost + s.cost, remaining - s.cost, depth + 1)){
          onPath.delete(node);
          return true;
        }
      }
      onPath.delete(node);
      return false;
    };

    origin.parent = undefined;
    if(dfs(origin, 0, budget, 0)){
      const end = foundGoal && (destination.parent != null || destination === origin)
        ? destination
        : (bestEnd ?? destination);
      return {
        ok: true,
        end,
        detours,
        visits: totalVisits,
        timedOut: false,
      };
    }

    if(abort && !hitTimeLimit) break;
    if(hitTimeLimit) break;
    budget += budgetStep;
  }

  if(bestEnd && bestDist < closeEnough * 0.5){
    return {
      ok: true,
      end: bestEnd,
      detours,
      visits: totalVisits,
      timedOut: hitTimeLimit,
      transTable: hitTimeLimit ? table : undefined,
      costBudget: hitTimeLimit ? budget + budgetStep : undefined,
    };
  }

  return {
    ok: false,
    end: bestEnd,
    detours,
    visits: totalVisits,
    timedOut: hitTimeLimit,
    transTable: hitTimeLimit ? table : undefined,
    costBudget: hitTimeLimit ? budget + budgetStep : undefined,
  };
}

/**
 * GenerateSuccessors: connections with LOS/detour costs, sorted by goal heuristic.
 */
function generateSuccessors(
  node: PathPoint,
  destination: PathPoint,
  evaluateEdge: (from: PathPoint, to: PathPoint) => PathPointDfsEdgeEval
): Successor[] {
  const neighbors = node.connections;
  if(!neighbors?.length) return [];

  const out: Successor[] = [];
  for(let i = 0; i < neighbors.length; i++){
    const neighbor = neighbors[i];
    if(!neighbor || neighbor === node) continue;
    const evaled = evaluateEdge(node, neighbor);
    if(evaled.cost < 0) continue;
    out.push({
      node: neighbor,
      cost: evaled.cost,
      detour: evaled.detour,
      h: neighbor.vector.distanceTo(destination.vector),
    });
  }

  // Retail insertion-sort: lower goal heuristic first (DFS tries closest first)
  out.sort((a, b) => a.h - b.h);
  return out;
}
