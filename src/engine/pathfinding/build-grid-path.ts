import * as THREE from "three";
import type { Area } from "@engine/module/Area";
import type { Creature } from "@engine/module/Creature";
import type { GameObject } from "@engine/module/GameObject";
import { getPathPersonalSpace } from "@engine/combat/attack-range";
import { hasClearWalkLine, hasWalkLineClear } from "@engine/pathfinding/walk-line-clear";
import { smoothSelection } from "@engine/pathfinding/smooth-select-nodes";
import { getPathStepTolerance } from "@engine/pathfinding/path-point-creature-detour";

/**
 * buildGridPath + grid DFS search.
 *
 * Corridor grid along start→end (cell ≈ personal_space), then DFS with
 * Moore successors + TransTable prune + expanding lateral budget.
 *
 * @file build-grid-path.ts
 */

const MAX_ALONG = 96;
/** buildGridPath expands DFS budget up to along + 0x24 (36). */
const MAX_LATERAL = 36;
/** abort after 0x3f recursive frames. */
const MAX_DFS_DEPTH = 64;
const MAX_NODES = 12000;

type GridKey = string;

type GridCell = {
  along: number;
  lateral: number;
  parent?: GridCell;
};

/** Integer-key TransTable for grid DFS (along, lateral). */
class GridDfsTransTable {
  private readonly g = new Map<GridKey, number>();
  private readonly rem = new Map<GridKey, number>();

  reset(){
    this.g.clear();
    this.rem.clear();
  }

  shouldPrune(along: number, lateral: number, gCost: number, remaining: number): boolean {
    const k = `${along},${lateral}`;
    const prevG = this.g.get(k);
    if(prevG === undefined) return false;
    const prevRem = this.rem.get(k) ?? 0;
    return prevG < gCost || remaining <= prevRem;
  }

  put(along: number, lateral: number, gCost: number, remaining: number){
    const k = `${along},${lateral}`;
    this.g.set(k, gCost);
    this.rem.set(k, remaining);
  }
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
 */
export function buildGridPath(
  area: Area | undefined,
  origin: THREE.Vector3,
  dest: THREE.Vector3,
  options: {
    owner?: GameObject;
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

  if(hasClearWalkLine(area, origin, dest, options.owner)){
    return [origin.clone(), dest.clone()];
  }

  const perspace = Math.max(
    0.1,
    options.personalSpace
      ?? (options.owner ? getPathPersonalSpace(options.owner as Creature) : 0.5)
  );
  const cell = perspace;
  const alongCount = Math.min(MAX_ALONG, Math.max(1, Math.round(dist / cell)));
  const maxLateralCap = Math.min(
    MAX_LATERAL,
    options.maxLateral ?? Math.min(MAX_LATERAL, alongCount + 36)
  );

  const forward = new THREE.Vector3(dx / dist, dy / dist, 0);
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
    const hit = hasWalkLineClear(area, tmpA, tmpB, {
      owner: options.owner,
      personalSpace: perspace,
      checkCreatures: false,
      skipRoomCheck: true,
      steps: 6,
    });
    // Require a fully clear micro-step — partial clearT must not chord NonWalk voids.
    return hit.ok;
  };

  // widens: along+2 … along+36
  const lateralPasses = [8, 16, maxLateralCap].filter(
    (v, i, arr) => v > 0 && v <= maxLateralCap && arr.indexOf(v) === i
  );
  if(lateralPasses[lateralPasses.length - 1] !== maxLateralCap){
    lateralPasses.push(maxLateralCap);
  }

  for(let pass = 0; pass < lateralPasses.length; pass++){
    const maxLateral = lateralPasses[pass];
    const result = searchGridDfs(
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

function searchGridDfs(
  origin: THREE.Vector3,
  dest: THREE.Vector3,
  forward: THREE.Vector3,
  right: THREE.Vector3,
  cell: number,
  alongCount: number,
  maxLateral: number,
  isWalkableCell: (along: number, lateral: number) => boolean,
  canStep: (a0: number, l0: number, a1: number, l1: number) => boolean,
  area: Area,
  owner: GameObject | undefined,
  perspace: number,
  tmpA: THREE.Vector3
): THREE.Vector3[] | undefined {
  const table = new GridDfsTransTable();
  table.reset();

  // Moore 3×3 + forward leaps (GridDFSGenerateSuccessors)
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
  neighbors.sort((a, b) => (Math.abs(a[0]) + Math.abs(a[1])) - (Math.abs(b[0]) + Math.abs(b[1])));

  let visited = 0;
  let aborted = false;
  let bestGoal: GridCell | undefined;
  let bestManhattan = Infinity;

  const remainingBudget = (along: number, lateral: number) =>
    (alongCount - along) + Math.abs(lateral);

  const dfs = (
    along: number,
    lateral: number,
    gCost: number,
    depth: number,
    parent: GridCell | undefined
  ): boolean => {
    if(aborted || visited >= MAX_NODES) return false;
    visited++;

    if(depth > MAX_DFS_DEPTH){
      aborted = true;
      return false;
    }

    const rem = remainingBudget(along, lateral);
    if(table.shouldPrune(along, lateral, gCost, rem)){
      return false;
    }
    table.put(along, lateral, gCost, rem);

    const cellNode: GridCell = { along, lateral, parent };
    const manh = Math.abs(alongCount - along) + Math.abs(lateral);
    if(manh < bestManhattan){
      bestManhattan = manh;
      bestGoal = cellNode;
    }

    // Goal / step_tolerance early-out
    if(along >= alongCount && Math.abs(lateral) === 0){
      bestGoal = cellNode;
      return true;
    }
    if(along >= alongCount && Math.abs(lateral) <= stepTol){
      bestGoal = cellNode;
      return true;
    }

    cellPosition(origin, forward, right, cell, along, lateral, tmpA);
    if(along === 0 && lateral === 0) tmpA.copy(origin);

    // Periodic / near-goal snap to dest
    const trySnap =
      along >= alongCount - 1 ||
      depth % 6 === 4 ||
      along >= Math.floor(alongCount * 0.75);
    if(trySnap && hasClearWalkLine(area, tmpA, dest, owner)){
      bestGoal = { along: alongCount, lateral: 0, parent: cellNode };
      return true;
    }

    for(let i = 0; i < neighbors.length; i++){
      if(aborted) break;
      const da = neighbors[i][0];
      const dl = neighbors[i][1];
      const na = along + da;
      const nl = lateral + dl;
      if(na < 0 || na > alongCount) continue;
      if(Math.abs(nl) > maxLateral) continue;
      if(na < alongCount && !isWalkableCell(na, nl)) continue;
      if(!canStep(along, lateral, na, nl)) continue;

      const stepCost = Math.abs(da) + Math.abs(dl);
      if(dfs(na, nl, gCost + stepCost, depth + 1, cellNode)){
        return true;
      }
    }
    return false;
  };

  dfs(0, 0, 0, 0, undefined);

  // Reject if we never progressed ~halfway along the corridor
  if(!bestGoal || bestGoal.along < Math.max(1, Math.floor(alongCount * 0.5))){
    return undefined;
  }

  const cells: GridCell[] = [];
  let curr: GridCell | undefined = bestGoal;
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
