import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleDoor } from "@/module/ModuleDoor";
import type { ModulePlaceable } from "@/module/ModulePlaceable";
import type { ModuleObject } from "@/module/ModuleObject";

/**
 * Uniform XY hash for door / placeable static-blocker pruning.
 * Rebuild when area door/placeable membership changes.
 *
 * @file static-blocker-grid.ts
 */

const CELL_SIZE = 5;
const CELL_INV = 1 / CELL_SIZE;

type StaticBlockerCell = {
  doors: ModuleDoor[];
  placeables: ModulePlaceable[];
};

export type StaticBlockerGrid = {
  cells: Map<number, StaticBlockerCell>;
  /** Objects with no usable AABB — always considered for detailed tests. */
  alwaysDoors: ModuleDoor[];
  alwaysPlaceables: ModulePlaceable[];
};

function cellKey(cx: number, cy: number): number {
  // Pack signed 16-bit cell coords into one number.
  return ((cx & 0xffff) << 16) | (cy & 0xffff);
}

function cellCoord(v: number): number {
  return Math.floor(v * CELL_INV);
}

function ensureCell(grid: StaticBlockerGrid, key: number): StaticBlockerCell {
  let cell = grid.cells.get(key);
  if(!cell){
    cell = { doors: [], placeables: [] };
    grid.cells.set(key, cell);
  }
  return cell;
}

function insertBox(
  grid: StaticBlockerGrid,
  box: { min: { x: number; y: number }; max: { x: number; y: number } } | undefined,
  position: { x: number; y: number } | undefined,
  door?: ModuleDoor,
  placeable?: ModulePlaceable
): boolean {
  let minX: number;
  let maxX: number;
  let minY: number;
  let maxY: number;
  if(box && Number.isFinite(box.min.x) && Number.isFinite(box.max.x)){
    minX = box.min.x;
    maxX = box.max.x;
    minY = box.min.y;
    maxY = box.max.y;
  }else if(position && Number.isFinite(position.x) && Number.isFinite(position.y)){
    minX = position.x - CELL_SIZE;
    maxX = position.x + CELL_SIZE;
    minY = position.y - CELL_SIZE;
    maxY = position.y + CELL_SIZE;
  }else{
    return false;
  }

  const cx0 = cellCoord(minX);
  const cx1 = cellCoord(maxX);
  const cy0 = cellCoord(minY);
  const cy1 = cellCoord(maxY);
  for(let cx = cx0; cx <= cx1; cx++){
    for(let cy = cy0; cy <= cy1; cy++){
      const cell = ensureCell(grid, cellKey(cx, cy));
      if(door) cell.doors.push(door);
      if(placeable) cell.placeables.push(placeable);
    }
  }
  return true;
}

/** Build a fresh XY cell map from area doors / placeables. */
export function buildStaticBlockerGrid(area: ModuleArea): StaticBlockerGrid {
  const grid: StaticBlockerGrid = {
    cells: new Map(),
    alwaysDoors: [],
    alwaysPlaceables: [],
  };
  const doors = area.doors;
  if(doors?.length){
    for(let i = 0; i < doors.length; i++){
      const door = doors[i];
      if(!door) continue;
      if(!insertBox(grid, door.box, door.position, door, undefined)){
        grid.alwaysDoors.push(door);
      }
    }
  }
  const placeables = area.placeables;
  if(placeables?.length){
    for(let i = 0; i < placeables.length; i++){
      const plc = placeables[i];
      if(!plc) continue;
      if(!insertBox(grid, plc.box, plc.position, undefined, plc)){
        grid.alwaysPlaceables.push(plc);
      }
    }
  }
  return grid;
}

/**
 * Ensure area.staticBlockerGrid is current (rebuild when dirty / missing).
 */
export function ensureStaticBlockerGrid(area: ModuleArea): StaticBlockerGrid {
  const areaAny = area as ModuleArea & {
    staticBlockerGrid?: StaticBlockerGrid;
    staticBlockerGridDirty?: boolean;
  };
  if(!areaAny.staticBlockerGrid || areaAny.staticBlockerGridDirty !== false){
    areaAny.staticBlockerGrid = buildStaticBlockerGrid(area);
    areaAny.staticBlockerGridDirty = false;
  }
  return areaAny.staticBlockerGrid;
}

export function invalidateStaticBlockerGrid(area: ModuleArea | undefined): void {
  if(!area) return;
  (area as ModuleArea & { staticBlockerGridDirty?: boolean }).staticBlockerGridDirty = true;
}

/**
 * Collect unique doors / placeables whose cells overlap the segment AABB.
 */
export function queryStaticBlockersInAabb(
  area: ModuleArea,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): { doors: ModuleDoor[]; placeables: ModulePlaceable[] } {
  const grid = ensureStaticBlockerGrid(area);
  if(!grid.cells.size && !grid.alwaysDoors.length && !grid.alwaysPlaceables.length){
    return {
      doors: area.doors ?? [],
      placeables: area.placeables ?? [],
    };
  }

  const doorSet = new Set<ModuleDoor>();
  const placeableSet = new Set<ModulePlaceable>();
  for(let i = 0; i < grid.alwaysDoors.length; i++){
    doorSet.add(grid.alwaysDoors[i]);
  }
  for(let i = 0; i < grid.alwaysPlaceables.length; i++){
    placeableSet.add(grid.alwaysPlaceables[i]);
  }

  const cx0 = cellCoord(minX);
  const cx1 = cellCoord(maxX);
  const cy0 = cellCoord(minY);
  const cy1 = cellCoord(maxY);
  for(let cx = cx0; cx <= cx1; cx++){
    for(let cy = cy0; cy <= cy1; cy++){
      const cell = grid.cells.get(cellKey(cx, cy));
      if(!cell) continue;
      for(let i = 0; i < cell.doors.length; i++){
        doorSet.add(cell.doors[i]);
      }
      for(let i = 0; i < cell.placeables.length; i++){
        placeableSet.add(cell.placeables[i]);
      }
    }
  }

  return {
    doors: doorSet.size ? Array.from(doorSet) : [],
    placeables: placeableSet.size ? Array.from(placeableSet) : [],
  };
}

/** Sync walkmesh LocalToWorld only when pose/collision matrix is dirty. */
export function ensureWalkmeshMatrixSynced(
  obj: ModuleObject | undefined
): void {
  if(!obj) return;
  const anyObj = obj as ModuleObject & {
    collisionMatrixDirty?: boolean;
    syncWalkmeshMatrix?: () => void;
  };
  if(typeof anyObj.syncWalkmeshMatrix !== "function") return;
  // Static / already-synced pose: matrix is current until markCollisionBoundsDirty.
  if(anyObj.collisionMatrixDirty === false) return;
  anyObj.syncWalkmeshMatrix();
  anyObj.collisionMatrixDirty = false;
}
