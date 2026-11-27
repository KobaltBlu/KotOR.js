import type * as THREE from "three";

/** Minimal face shape the grid needs (OdysseyFace3 satisfies it). */
export interface WalkGridFace {
  a: number;
  b: number;
  c: number;
  walkmesh?: { vertices?: ArrayLike<{ x: number; y: number }>; geometryVersion?: number } | null;
  pointInFace2d(point: THREE.Vector3): boolean;
}

/** Cell edge length in world units. Room walk faces are typically 0.5–4m across. */
export const WALK_GRID_CELL_SIZE = 2;
/** Upper bound on cells so a stray far-away vertex cannot blow up memory. */
const MAX_CELLS = 1 << 18;

/**
 * 2D uniform grid over a fixed walk-face list (XY only, like pointInFace2d).
 *
 * Queries return the same face a front-to-back linear scan would: each cell
 * lists face indices in ascending order, and every face whose 2D bounds touch
 * the cell is listed. Faces with non-finite vertices make pointInFace2d true
 * for any point, so they are kept in a separate list merged into every query.
 */
export class WalkFaceGrid {
  readonly source: readonly WalkGridFace[];
  readonly sourceLength: number;
  /** walkmeshGeometryEpoch this grid was last validated against. */
  epoch = -1;
  /** Distinct walkmeshes behind the faces, with the version indexed. */
  private readonly meshes: Array<{ mesh: { geometryVersion?: number }; version: number | undefined }> = [];
  private readonly minX: number;
  private readonly minY: number;
  private readonly cellSize: number;
  private readonly cols: number;
  private readonly rows: number;
  /** CSR layout: faces of cell i are cellFaces[cellStart[i] .. cellStart[i + 1]). */
  private readonly cellStart: Uint32Array;
  private readonly cellFaces: Uint32Array;
  /** Indices of faces with non-finite bounds, ascending. */
  private readonly anywhereFaces: number[];

  constructor(faces: readonly WalkGridFace[], cellSize = WALK_GRID_CELL_SIZE){
    this.source = faces;
    this.sourceLength = faces.length;
    const n = faces.length;
    const bounds = new Float64Array(n * 4);
    const anywhere: number[] = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const seenMeshes = new Set<object>();
    let lastMesh: object | null | undefined;
    for(let i = 0; i < n; i++){
      const f = faces[i];
      if(!f){
        bounds[i * 4] = NaN; // holes never match
        continue;
      }
      const wm = f.walkmesh;
      if(wm && wm !== lastMesh){
        lastMesh = wm;
        if(!seenMeshes.has(wm)){
          seenMeshes.add(wm);
          this.meshes.push({ mesh: wm, version: wm.geometryVersion });
        }
      }
      const verts = wm?.vertices;
      const v1 = verts?.[f.a], v2 = verts?.[f.b], v3 = verts?.[f.c];
      const o = i * 4;
      if(!v1 || !v2 || !v3){
        // Missing vertex data: pointInFace2d throws or misbehaves either way;
        // keep it reachable from every query so the scan order is unchanged.
        anywhere.push(i);
        bounds[o] = NaN;
        continue;
      }
      const x0 = Math.min(v1.x, v2.x, v3.x), x1 = Math.max(v1.x, v2.x, v3.x);
      const y0 = Math.min(v1.y, v2.y, v3.y), y1 = Math.max(v1.y, v2.y, v3.y);
      if(!Number.isFinite(x0) || !Number.isFinite(x1) || !Number.isFinite(y0) || !Number.isFinite(y1)){
        anywhere.push(i);
        bounds[o] = NaN;
        continue;
      }
      bounds[o] = x0; bounds[o + 1] = y0; bounds[o + 2] = x1; bounds[o + 3] = y1;
      if(x0 < minX) minX = x0;
      if(y0 < minY) minY = y0;
      if(x1 > maxX) maxX = x1;
      if(y1 > maxY) maxY = y1;
    }
    this.anywhereFaces = anywhere;

    if(!Number.isFinite(minX)){
      this.minX = 0; this.minY = 0; this.cellSize = cellSize;
      this.cols = 0; this.rows = 0;
      this.cellStart = new Uint32Array(1);
      this.cellFaces = new Uint32Array(0);
      return;
    }

    let size = cellSize;
    let cols = Math.floor((maxX - minX) / size) + 1;
    let rows = Math.floor((maxY - minY) / size) + 1;
    while(cols * rows > MAX_CELLS){
      size *= 2;
      cols = Math.floor((maxX - minX) / size) + 1;
      rows = Math.floor((maxY - minY) / size) + 1;
    }
    this.minX = minX; this.minY = minY; this.cellSize = size;
    this.cols = cols; this.rows = rows;

    const cellCount = cols * rows;
    const counts = new Uint32Array(cellCount + 1);
    const forEachCell = (i: number, fn: (cell: number) => void) => {
      const o = i * 4;
      const cx0 = Math.floor((bounds[o] - minX) / size);
      const cy0 = Math.floor((bounds[o + 1] - minY) / size);
      const cx1 = Math.min(cols - 1, Math.floor((bounds[o + 2] - minX) / size));
      const cy1 = Math.min(rows - 1, Math.floor((bounds[o + 3] - minY) / size));
      for(let cy = cy0; cy <= cy1; cy++){
        for(let cx = cx0; cx <= cx1; cx++){
          fn(cy * cols + cx);
        }
      }
    };
    for(let i = 0; i < n; i++){
      if(Number.isNaN(bounds[i * 4])) continue;
      forEachCell(i, (cell) => { counts[cell + 1]++; });
    }
    for(let c = 0; c < cellCount; c++) counts[c + 1] += counts[c];
    const cellFaces = new Uint32Array(counts[cellCount]);
    const fill = counts.slice(0, cellCount);
    // Ascending i keeps each cell's list in source order.
    for(let i = 0; i < n; i++){
      if(Number.isNaN(bounds[i * 4])) continue;
      forEachCell(i, (cell) => { cellFaces[fill[cell]++] = i; });
    }
    this.cellStart = counts;
    this.cellFaces = cellFaces;
  }

  /**
   * Source index of the first face after `afterIndex` that contains `point`
   * (pointInFace2d), or -1. Iterate all matches by feeding the result back in.
   */
  nextFaceIndexAt(point: THREE.Vector3, afterIndex = -1): number {
    const faces = this.source;
    const x = point.x, y = point.y;
    if(!Number.isFinite(x) || !Number.isFinite(y)){
      // pointInFace2d with a NaN point matches every face; keep linear semantics.
      for(let i = afterIndex + 1; i < faces.length; i++){
        if(faces[i]?.pointInFace2d(point)) return i;
      }
      return -1;
    }

    let start = 0, end = 0;
    const cx = Math.floor((x - this.minX) / this.cellSize);
    const cy = Math.floor((y - this.minY) / this.cellSize);
    if(cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows){
      const cell = cy * this.cols + cx;
      start = this.cellStart[cell];
      end = this.cellStart[cell + 1];
    }

    const cellFaces = this.cellFaces;
    const anywhere = this.anywhereFaces;
    let ai = 0;
    // Merge the cell list and the anywhere list by ascending source index.
    while(start < end || ai < anywhere.length){
      let i: number;
      if(ai >= anywhere.length || (start < end && cellFaces[start] < anywhere[ai])){
        i = cellFaces[start++];
      }else{
        i = anywhere[ai++];
      }
      if(i <= afterIndex) continue;
      if(faces[i].pointInFace2d(point)) return i;
    }
    return -1;
  }

  /** True when any indexed walkmesh has moved its vertices since the build. */
  walkmeshesChanged(): boolean {
    for(let i = 0; i < this.meshes.length; i++){
      const m = this.meshes[i];
      if(m.mesh.geometryVersion !== m.version) return true;
    }
    return false;
  }

  /** First face (source order) containing `point`, or undefined. */
  findFace(point: THREE.Vector3): WalkGridFace | undefined {
    const i = this.nextFaceIndexAt(point);
    return i < 0 ? undefined : this.source[i];
  }
}

const _grids = new WeakMap<object, WalkFaceGrid>();

/** Global counter bumped whenever any walkmesh moves its vertices. */
let walkmeshGeometryEpoch = 0;

export function noteWalkmeshGeometryChanged(): void {
  walkmeshGeometryEpoch++;
}

/**
 * Grid for an area's current walk-face array. Rebuilt when the array is
 * replaced or resized, or when one of its walkmeshes moved its vertices.
 */
export function getWalkFaceGrid(owner: object, faces: readonly WalkGridFace[]): WalkFaceGrid {
  let grid = _grids.get(owner);
  if(grid && grid.source === faces && grid.sourceLength === faces.length){
    if(grid.epoch === walkmeshGeometryEpoch) return grid;
    // Some walkmesh changed; only rebuild if it is one this grid indexes.
    if(!grid.walkmeshesChanged()){
      grid.epoch = walkmeshGeometryEpoch;
      return grid;
    }
  }
  grid = new WalkFaceGrid(faces);
  grid.epoch = walkmeshGeometryEpoch;
  _grids.set(owner, grid);
  return grid;
}
