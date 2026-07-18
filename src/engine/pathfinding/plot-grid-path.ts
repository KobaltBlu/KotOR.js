import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { getPathPersonalSpace } from "@/combat/attack-range";
import { hasDirectLine, testDirectLine } from "@/engine/pathfinding/test-direct-line";
import { BinaryHeap } from "@/engine/pathfinding/BinaryHeap";
import { smoothSelection } from "@/engine/pathfinding/smooth-select-nodes";
import { getPathStepTolerance } from "@/engine/pathfinding/path-point-creature-detour";

/**
 * Approximate CSWSArea::PlotGridPath @ 004c1a00 + GridDFSearch @ 004c0930.
 *
 * Retail builds a corridor grid along start→end with cell size ≈ personal_space,
 * then DFS with lateral successors validated by TestDirectLine.
 *
 * JS: corridor frame + A* with retail-ish Moore successors + step leaps;
 * walkable + direct-line neighbor checks. Used when an area has no PTH path points.
 *
 * @file plot-grid-path.ts
 */

const MAX_ALONG = 96;
/** Retail PlotGridPath expands DFS budget up to along + 0x24 (36). */
const MAX_LATERAL = 36;
const MAX_NODES = 12000;

type GridKey = string;

type GridNode = {
  along: number;
  lateral: number;
  g: number;
  h: number;
  f: number;
  parent?: GridNode;
  closed: boolean;
  key: GridKey;
};

function keyOf(along: number, lateral: number): GridKey {
  return `${along},${lateral}`;
}

function cellPosition(
  origin: THREE.Vector3,
  forward: THREE.Vector3,
  right: THREE.Vector3,
  cell: number,
  along: number,
  lateral: number,
  out: THREE.Vector3
): THREE.Vector3 {
  return out.set(
    origin.x + forward.x * cell * along + right.x * cell * lateral,
    origin.y + forward.y * cell * along + right.y * cell * lateral,
    origin.z
  );
}

/**
 * Plot a path on a personal-space corridor grid (no PTH required).
 * Returns world waypoints including origin and dest, or undefined if unreachable.
 *
 * Retail PlotGridPath @ 004c1a00: alongCount = round(dist / personal_space),
 * then GridDFSearch with expanding lateral budget (along+2 … along+36).
 */
export function plotGridPath(
  area: ModuleArea | undefined,
  origin: THREE.Vector3,
  dest: THREE.Vector3,
  options: {
    owner?: ModuleObject;
    personalSpace?: number;
    checkCreatures?: boolean;
    maxLateral?: number;
  } = {}
): THREE.Vector3[] | undefined {
  if(!area) return undefined;

  const dx = dest.x - origin.x;
  const dy = dest.y - origin.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if(dist < 0.05){
    return [origin.clone(), dest.clone()];
  }

  if(hasDirectLine(area, origin, dest, options.owner)){
    return [origin.clone(), dest.clone()];
  }

  const perspace = Math.max(
    0.1,
    options.personalSpace
      ?? (options.owner ? getPathPersonalSpace(options.owner as ModuleCreature) : 0.5)
  );
  const cell = perspace;
  // Retail: __ftol2(dist / personal_space + 0.5) → round
  const alongCount = Math.min(MAX_ALONG, Math.max(1, Math.round(dist / cell)));
  const maxLateralCap = Math.min(
    MAX_LATERAL,
    options.maxLateral ?? Math.min(MAX_LATERAL, alongCount + 36)
  );

  const forward = new THREE.Vector3(dx / dist, dy / dist, 0);
  // Retail lateral = (fy, -fx) * cell; CCW (-fy, fx) is equivalent chirality
  const right = new THREE.Vector3(-forward.y, forward.x, 0);
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();

  const isWalkableCell = (along: number, lateral: number): boolean => {
    cellPosition(origin, forward, right, cell, along, lateral, tmpA);
    if(along >= alongCount){
      tmpA.copy(dest);
    }
    if(typeof area.isPointWalkable === 'function' && !area.isPointWalkable(tmpA)){
      return false;
    }
    return true;
  };

  const canStep = (a0: number, l0: number, a1: number, l1: number): boolean => {
    cellPosition(origin, forward, right, cell, a0, l0, tmpA);
    if(a0 === 0 && l0 === 0) tmpA.copy(origin);
    cellPosition(origin, forward, right, cell, a1, l1, tmpB);
    if(a1 >= alongCount) tmpB.copy(dest);

    if(typeof area.isPointWalkable === 'function' && !area.isPointWalkable(tmpB)){
      return false;
    }
    // Neighbor micro-steps: skip room-graph (cells are within corridor)
    const hit = testDirectLine(area, tmpA, tmpB, {
      owner: options.owner,
      personalSpace: perspace,
      checkCreatures: false,
      skipRoomCheck: true,
      skipClippedLine: true,
      steps: 6,
    });
    return hit.ok || hit.clearT >= 0.85;
  };

  // Retail widens search: along+2, +2 … along+36. Try increasing lateral caps.
  const lateralPasses = [8, 16, maxLateralCap].filter(
    (v, i, arr) => v > 0 && v <= maxLateralCap && arr.indexOf(v) === i
  );
  if(lateralPasses[lateralPasses.length - 1] !== maxLateralCap){
    lateralPasses.push(maxLateralCap);
  }

  for(let pass = 0; pass < lateralPasses.length; pass++){
    const maxLateral = lateralPasses[pass];
    const result = searchGrid(
      origin,
      dest,
      forward,
      right,
      cell,
      alongCount,
      maxLateral,
      isWalkableCell,
      canStep,
      area,
      options.owner,
      perspace,
      tmpA
    );
    if(result) return result;
  }

  return undefined;
}

function searchGrid(
  origin: THREE.Vector3,
  dest: THREE.Vector3,
  forward: THREE.Vector3,
  right: THREE.Vector3,
  cell: number,
  alongCount: number,
  maxLateral: number,
  isWalkableCell: (along: number, lateral: number) => boolean,
  canStep: (a0: number, l0: number, a1: number, l1: number) => boolean,
  area: ModuleArea,
  owner: ModuleObject | undefined,
  perspace: number,
  tmpA: THREE.Vector3
): THREE.Vector3[] | undefined {
  const startKey = keyOf(0, 0);
  const start: GridNode = {
    along: 0,
    lateral: 0,
    g: 0,
    h: alongCount,
    f: alongCount,
    closed: false,
    key: startKey,
  };

  const open = new BinaryHeap<GridNode>((n) => n.f);
  const nodes = new Map<GridKey, GridNode>();
  nodes.set(startKey, start);
  open.push(start);

  let visited = 0;
  let bestGoal: GridNode | undefined;

  // Retail GridDFSGenerateSuccessors @ 004bcee0: 3×3 Moore (Δalong,Δlateral ∈ [-1,1])
  // plus occasional longer forward leaps (step_tolerance / depth%6==4).
  const neighbors: number[][] = [];
  for(let da = -1; da <= 1; da++){
    for(let dl = -1; dl <= 1; dl++){
      if(da === 0 && dl === 0) continue;
      neighbors.push([da, dl]);
    }
  }
  const stepTol = getPathStepTolerance(owner);
  for(let leap = 2; leap <= stepTol; leap++){
    neighbors.push([leap, 0], [leap, 1], [leap, -1]);
  }
  // Prefer lower |Δ| first (retail sorts successors by manhattan)
  neighbors.sort((a, b) => (Math.abs(a[0]) + Math.abs(a[1])) - (Math.abs(b[0]) + Math.abs(b[1])));

  while(open.size() > 0 && visited < MAX_NODES){
    const current = open.pop();
    if(!current || current.closed) continue;
    current.closed = true;
    visited++;

    if(current.along >= alongCount){
      bestGoal = current;
      break;
    }

    cellPosition(origin, forward, right, cell, current.along, current.lateral, tmpA);
    if(current.along === 0 && current.lateral === 0) tmpA.copy(origin);

    // Retail: periodic / near-goal TestDirectLine snap to end_point
    const trySnap =
      current.along >= alongCount - 1 ||
      visited % 6 === 4 ||
      current.along >= Math.floor(alongCount * 0.75);
    if(trySnap && hasDirectLine(area, tmpA, dest, owner)){
      const goalKey = keyOf(alongCount, 0);
      let goal = nodes.get(goalKey);
      const gCost = current.g + 1;
      if(!goal){
        goal = {
          along: alongCount,
          lateral: 0,
          g: gCost,
          h: 0,
          f: gCost,
          parent: current,
          closed: false,
          key: goalKey,
        };
        nodes.set(goalKey, goal);
      }else if(gCost < goal.g){
        goal.g = gCost;
        goal.f = gCost;
        goal.parent = current;
      }
      bestGoal = goal;
      break;
    }

    for(let i = 0; i < neighbors.length; i++){
      const da = neighbors[i][0];
      const dl = neighbors[i][1];
      const na = current.along + da;
      const nl = current.lateral + dl;
      if(na < 0 || na > alongCount) continue;
      if(Math.abs(nl) > maxLateral) continue;
      if(na < alongCount && !isWalkableCell(na, nl)) continue;
      if(!canStep(current.along, current.lateral, na, nl)) continue;

      const nk = keyOf(na, nl);
      const stepCost = Math.abs(da) + Math.abs(dl) * 1.15;
      const tentativeG = current.g + stepCost;
      let node = nodes.get(nk);
      if(node?.closed) continue;

      const h = (alongCount - na) + Math.abs(nl) * 0.5;
      if(!node){
        node = {
          along: na,
          lateral: nl,
          g: tentativeG,
          h,
          f: tentativeG + h,
          parent: current,
          closed: false,
          key: nk,
        };
        nodes.set(nk, node);
        open.push(node);
      }else if(tentativeG < node.g){
        node.g = tentativeG;
        node.h = h;
        node.f = tentativeG + h;
        node.parent = current;
        const idx = open.content.indexOf(node);
        if(idx >= 0){
          open.rescoreElement(node);
        }else{
          open.push(node);
        }
      }
    }
  }

  if(!bestGoal){
    return undefined;
  }

  const cells: GridNode[] = [];
  let curr: GridNode | undefined = bestGoal;
  while(curr){
    cells.push(curr);
    curr = curr.parent;
  }
  cells.reverse();

  const world: THREE.Vector3[] = [origin.clone()];
  for(let i = 1; i < cells.length; i++){
    const c = cells[i];
    if(c.along >= alongCount){
      world.push(dest.clone());
      break;
    }
    cellPosition(origin, forward, right, cell, c.along, c.lateral, tmpA);
    if(typeof area.getNearestWalkablePoint === 'function'){
      world.push(area.getNearestWalkablePoint(tmpA, perspace * 0.5));
    }else{
      world.push(tmpA.clone());
    }
  }
  const last = world[world.length - 1];
  if(!last || last.distanceToSquared(dest) > 0.01){
    world.push(dest.clone());
  }

  return smoothSelection(area, world, owner);
}
