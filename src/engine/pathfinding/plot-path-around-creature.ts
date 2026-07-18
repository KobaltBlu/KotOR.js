import * as THREE from "three";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { PathPoint } from "@/engine/pathfinding/PathPoint";
import { testDirectLine } from "@/engine/pathfinding/test-direct-line";
import { computeHeightAtPoint } from "@/engine/pathfinding/compute-safe-location";
import { getCreaturePersonalSpace } from "@/combat/attack-range";

/**
 * Approximate CAvoidCreature::PlotPathAroundCreature @ 005d0840.
 *
 * Retail: ComputeHexPoints around blocker (cre_personal_space sum), FindEntryAndExit
 * on current path, dual FindPath (CW/CCW), IsPathClear scoring, InsertPathSegmentBetween.
 * Reputation < 11 triggers k_def_pathfail01 (handled by caller / onBlocked).
 *
 * JS: 6-point hex ring; score CW/CCW arcs like IsPathClear (0/1/2); splice best.
 *
 * @file plot-path-around-creature.ts
 */

const HEX_COUNT = 6;
const _tmp = new THREE.Vector3();
const _hit = new THREE.Vector3();

/** Extra radius padding — retail `plotPathAroundCreatureAdditionalSpace`. */
const HEX_EXTRA_SPACE = 0.35;

export type PlotAroundResult = {
  /** True when a hex segment was spliced into the path. */
  spliced: boolean;
  /**
   * Creature that blocked the chosen arc (IsPathClear hit), if any.
   * Caller may run pathfail with foundEnemy set when hostile.
   */
  foundEnemyOnPath?: ModuleCreature;
};

type EntryExit = {
  entryPathIdx: number;
  exitPathIdx: number;
  entryHexEdge: number;
  exitHexEdge: number;
  entryPoint: THREE.Vector3;
  exitPoint: THREE.Vector3;
};

/**
 * Build hex vertices around center (retail ComputeHexPoints @ 005cf1f0).
 * First vertex = center + normalize(-facing) * (radius / 0.866025);
 * then rotate −60° about Z five times. Z via ComputeHeight approx.
 */
export function computeHexPoints(
  center: THREE.Vector3,
  radius: number,
  facingRad: number = 0,
  area?: Parameters<typeof computeHeightAtPoint>[0]
): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  // Retail: opposite of orientation, scaled by r / cos(30°)
  const scale = radius / 0.86602540378;
  let vx = -Math.cos(facingRad) * scale;
  let vy = -Math.sin(facingRad) * scale;
  const cos60 = Math.cos(-Math.PI / 3);
  const sin60 = Math.sin(-Math.PI / 3);

  for(let i = 0; i < HEX_COUNT; i++){
    const p = new THREE.Vector3(center.x + vx, center.y + vy, center.z);
    if(area){
      p.z = computeHeightAtPoint(area, p);
    }
    pts.push(p);
    const nx = vx * cos60 - vy * sin60;
    const ny = vx * sin60 + vy * cos60;
    vx = nx;
    vy = ny;
  }
  return pts;
}

/**
 * Retail IsPointInHex @ 005cfc70 — point inside all six inward half-planes.
 */
export function isPointInHex(hex: THREE.Vector3[], p: THREE.Vector3): boolean {
  if(hex.length < 3) return false;
  for(let i = 0; i < HEX_COUNT; i++){
    const a = hex[i];
    const b = hex[(i + 1) % HEX_COUNT];
    // Edge a→b; inward normal is rotate edge 90° toward center (cross with +Z, then negate like retail)
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    // cross(Z, edge) = (-ey, ex) — outward for CCW hex; retail uses -cross so inward
    const nx = ey;
    const ny = -ex;
    const len = Math.hypot(nx, ny) || 1;
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    if((dx * nx + dy * ny) / len < 0){
      return false;
    }
  }
  return true;
}

/**
 * 2D segment intersection (retail IntersectLineSegments2d). Returns true + writes hit.
 */
function intersectSegments2d(
  a0: THREE.Vector3,
  a1: THREE.Vector3,
  b0: THREE.Vector3,
  b1: THREE.Vector3,
  out: THREE.Vector3
): boolean {
  const ax = a1.x - a0.x;
  const ay = a1.y - a0.y;
  const bx = b1.x - b0.x;
  const by = b1.y - b0.y;
  const den = ax * by - ay * bx;
  if(Math.abs(den) < 1e-8) return false;
  const cx = b0.x - a0.x;
  const cy = b0.y - a0.y;
  const t = (cx * by - cy * bx) / den;
  const u = (cx * ay - cy * ax) / den;
  if(t < 0 || t > 1 || u < 0 || u > 1) return false;
  out.set(a0.x + t * ax, a0.y + t * ay, a0.z + t * (a1.z - a0.z));
  return true;
}

/**
 * Retail FindEntryAndExit @ 005d0160 — walk path segments vs hex edges.
 */
export function findEntryAndExit(
  pathPoints: { vector: THREE.Vector3 }[],
  hex: THREE.Vector3[]
): EntryExit | undefined {
  if(pathPoints.length < 2 || hex.length < HEX_COUNT) return undefined;

  let entryPathIdx = -1;
  let exitPathIdx = -1;
  let entryHexEdge = -1;
  let exitHexEdge = -1;
  const entryPoint = new THREE.Vector3();
  const exitPoint = new THREE.Vector3();
  let hits = 0;

  for(let i = 0; i < pathPoints.length - 1; i++){
    const p0 = pathPoints[i].vector;
    const p1 = pathPoints[i + 1].vector;
    for(let e = 0; e < HEX_COUNT; e++){
      const h0 = hex[e];
      const h1 = hex[(e + 1) % HEX_COUNT];
      if(!intersectSegments2d(p0, p1, h0, h1, _hit)) continue;
      if(hits === 0){
        entryPathIdx = i;
        entryHexEdge = e;
        entryPoint.copy(_hit);
        hits = 1;
      }else{
        // Shift previous entry → "first hit" storage like retail field2..field6
        exitPathIdx = entryPathIdx;
        exitHexEdge = entryHexEdge;
        exitPoint.copy(entryPoint);
        // Current becomes latest (exit)
        entryPathIdx = i;
        entryHexEdge = e;
        entryPoint.copy(_hit);
        hits++;
        break; // next path segment (retail breaks inner after intersect)
      }
    }
  }

  // After loop retail stores: field2=entry path idx, field7=exit path idx (swapped naming).
  // We want chronological entry then exit along the path.
  if(hits >= 2){
    // Last two hits: exitPoint was previous, entryPoint is latest — swap to chronological
    const chronEntryIdx = exitPathIdx;
    const chronExitIdx = entryPathIdx;
    const chronEntryEdge = exitHexEdge;
    const chronExitEdge = entryHexEdge;
    const chronEntry = exitPoint.clone();
    const chronExit = entryPoint.clone();
    return {
      entryPathIdx: chronEntryIdx,
      exitPathIdx: Math.min(pathPoints.length - 1, chronExitIdx + 1),
      entryHexEdge: chronEntryEdge,
      exitHexEdge: chronExitEdge,
      entryPoint: chronEntry,
      exitPoint: chronExit,
    };
  }

  // Fallback: closest hex verts to start/end (retail GetClosestPointTo)
  if(hits === 1){
    let closest = 0;
    let bestD = Infinity;
    const end = pathPoints[pathPoints.length - 1].vector;
    for(let i = 0; i < HEX_COUNT; i++){
      const d = hex[i].distanceToSquared(end);
      if(d < bestD){ bestD = d; closest = i; }
    }
    return {
      entryPathIdx,
      exitPathIdx: pathPoints.length - 1,
      entryHexEdge,
      exitHexEdge: closest,
      entryPoint: entryPoint.clone(),
      exitPoint: hex[closest].clone(),
    };
  }

  return undefined;
}

function snapWalkable(
  creature: ModuleCreature,
  p: THREE.Vector3
): THREE.Vector3 {
  const area = creature.area;
  if(area?.getNearestWalkablePoint){
    return area.getNearestWalkablePoint(p, getCreaturePersonalSpace(creature) * 0.5);
  }
  return p.clone();
}

/**
 * Score an arc like retail IsPathClear: 2 = fully clear, 1 = blocked by creature, 0 = fail.
 */
function scoreArc(
  creature: ModuleCreature,
  from: THREE.Vector3,
  arc: THREE.Vector3[],
  to: THREE.Vector3,
  ignoreIds: number[]
): { score: number; blockingCreatureId?: number } {
  if(!arc.length) return { score: 0 };
  let blockingCreatureId: number | undefined;
  const segs: [THREE.Vector3, THREE.Vector3][] = [];
  segs.push([from, arc[0]]);
  for(let i = 0; i < arc.length - 1; i++){
    segs.push([arc[i], arc[i + 1]]);
  }
  segs.push([arc[arc.length - 1], to]);

  for(let i = 0; i < segs.length; i++){
    const [a, b] = segs[i];
    const hit = testDirectLine(creature.area, a, b, {
      owner: creature,
      ignoreCreatureIds: ignoreIds,
    });
    if(hit.ok) continue;
    if(hit.blockingCreatureId != null){
      blockingCreatureId = hit.blockingCreatureId;
      // Partial: walkable but creature on line → score 1 if rest walkable-ish
      const walkOnly = testDirectLine(creature.area, a, b, {
        owner: creature,
        checkCreatures: false,
      });
      if(!walkOnly.ok) return { score: 0, blockingCreatureId };
      // keep scanning for harder fails
      continue;
    }
    // Soft: allow if midpoint walkable
    _tmp.lerpVectors(a, b, 0.5);
    if(typeof creature.area.isPointWalkable === 'function' && !creature.area.isPointWalkable(_tmp)){
      return { score: 0, blockingCreatureId };
    }
  }
  if(blockingCreatureId != null){
    return { score: 1, blockingCreatureId };
  }
  return { score: 2 };
}

/**
 * Try to detour around blocker. Returns splice result + optional enemy on arc.
 */
export function plotPathAroundCreature(
  creature: ModuleCreature,
  blocker: ModuleCreature
): PlotAroundResult {
  if(!creature?.area || !blocker || creature === blocker){
    return { spliced: false };
  }

  const path = creature.getComputedPath?.();
  if(!path?.points?.length){
    return { spliced: false };
  }

  const r =
    getCreaturePersonalSpace(creature) +
    getCreaturePersonalSpace(blocker) +
    HEX_EXTRA_SPACE;
  const facing = creature.getFacing?.() ?? creature.rotation?.z ?? 0;
  const hex = computeHexPoints(blocker.position, r, facing, creature.area).map((p) =>
    snapWalkable(creature, p)
  );

  // Retail: if path *end* is inside the hex, abort (return -2)
  const endPt = path.points[path.points.length - 1].vector;
  if(isPointInHex(hex, endPt)){
    return { spliced: false };
  }

  const ee = findEntryAndExit(path.points, hex);
  let entryIdx: number;
  let exitIdx: number;
  let from: THREE.Vector3;
  let to: THREE.Vector3;
  let startHex = 0;

  if(ee){
    entryIdx = ee.entryPathIdx;
    exitIdx = ee.exitPathIdx;
    from = ee.entryPoint;
    to = ee.exitPoint;
    startHex = ee.entryHexEdge;
  }else{
    // Distance fallback when no segment×edge hit
    entryIdx = 0;
    exitIdx = path.points.length - 1;
    const blockerDist = (v: THREE.Vector3) =>
      (v.x - blocker.position.x) ** 2 + (v.y - blocker.position.y) ** 2;
    for(let i = 0; i < path.points.length; i++){
      if(blockerDist(path.points[i].vector) < r * r){
        entryIdx = Math.max(0, i - 1);
        break;
      }
    }
    for(let i = path.points.length - 1; i >= 0; i--){
      if(blockerDist(path.points[i].vector) < r * r){
        exitIdx = Math.min(path.points.length - 1, i + 1);
        break;
      }
    }
    if(exitIdx <= entryIdx){
      exitIdx = Math.min(path.points.length - 1, entryIdx + 1);
    }
    from = path.points[entryIdx].vector;
    to = path.points[exitIdx].vector;
  }

  const ignoreIds = [blocker.id];

  // Prefer arcs starting at entry hex edge; also score cands for fallback
  type Cand = { idx: number; score: number };
  const cands: Cand[] = [{ idx: startHex, score: 3 }];
  for(let i = 0; i < hex.length; i++){
    if(i === startHex) continue;
    const h = hex[i];
    if(typeof creature.area.isPointWalkable === 'function' && !creature.area.isPointWalkable(h)){
      continue;
    }
    const a = testDirectLine(creature.area, from, h, {
      owner: creature,
      ignoreCreatureIds: ignoreIds,
    }).ok;
    const b = testDirectLine(creature.area, h, to, {
      owner: creature,
      ignoreCreatureIds: ignoreIds,
    }).ok;
    if(!a && !b) continue;
    const score = (a ? 2 : 0) + (b ? 2 : 0) + h.distanceTo(blocker.position) * 0.1;
    cands.push({ idx: i, score });
  }
  if(!cands.length){
    return { spliced: false };
  }
  cands.sort((x, y) => y.score - x.score);
  const best = cands[0].idx;

  // Dual FindPath: CW and CCW — pick higher IsPathClear score (retail uVar10 vs uVar9)
  const endEdge = ee?.exitHexEdge ?? best;
  const arcs = [
    buildArcBetween(hex, best, endEdge, 1),
    buildArcBetween(hex, best, endEdge, -1),
  ];
  let bestArc: THREE.Vector3[] | undefined;
  let bestScore = 0;
  let foundEnemyId: number | undefined;

  for(let a = 0; a < arcs.length; a++){
    const scored = scoreArc(creature, from, arcs[a], to, ignoreIds);
    if(scored.score > bestScore){
      bestScore = scored.score;
      bestArc = arcs[a];
      foundEnemyId = scored.blockingCreatureId;
    }
  }

  if(bestScore === 0 || !bestArc?.length){
    const h = hex[best];
    const single = scoreArc(creature, from, [h], to, ignoreIds);
    if(single.score === 0){
      return { spliced: false };
    }
    bestArc = [h];
    bestScore = single.score;
    foundEnemyId = single.blockingCreatureId;
  }

  const before = path.points.slice(0, entryIdx + 1);
  const after = path.points.slice(exitIdx);
  const mid = bestArc.map((v) => {
    const p = PathPoint.FromVector3(v);
    p.setArea(creature.area);
    return p;
  });
  path.points = before.concat(mid, after);
  if(path.points.length){
    path.points[path.points.length - 1].end = true;
  }

  let foundEnemyOnPath: ModuleCreature | undefined;
  if(foundEnemyId != null && creature.area?.creatures){
    foundEnemyOnPath = creature.area.creatures.find((c) => c?.id === foundEnemyId);
  }

  return { spliced: true, foundEnemyOnPath };
}

function buildArcBetween(
  hex: THREE.Vector3[],
  startIdx: number,
  endIdx: number,
  dir: number
): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  let idx = ((startIdx % HEX_COUNT) + HEX_COUNT) % HEX_COUNT;
  const end = ((endIdx % HEX_COUNT) + HEX_COUNT) % HEX_COUNT;
  for(let i = 0; i < HEX_COUNT; i++){
    out.push(hex[idx]);
    if(idx === end) break;
    idx = ((idx + dir) % HEX_COUNT + HEX_COUNT) % HEX_COUNT;
  }
  return out;
}
