import * as THREE from "three";
import { PathPoint } from "@/engine/pathfinding/PathPoint";
import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { GameState } from "@/GameState";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import { smoothCornerOptimizeRestartable, type SmoothCornerResume } from "@/engine/pathfinding/smooth-corner-optimize";
import {
  smoothSelectionRestartable,
  SMOOTH_SELECTION_BUDGET_MS,
  type SmoothSelectionResume,
} from "@/engine/pathfinding/smooth-select-nodes";
import { computeCreatureEdgeDetour } from "@/engine/pathfinding/path-point-creature-detour";
import { pathPointDfsSearch } from "@/engine/pathfinding/path-point-dfs";
import type { PathPointDfsTransTable } from "@/engine/pathfinding/path-point-dfs-trans-table";
import { noNonWalkPolysDetailed } from "@/engine/pathfinding/no-non-walk-polys";
import { noCreaturesOnLine } from "@/engine/pathfinding/no-creatures-on-line";
import { isPthEdgeBlockedByObject } from "@/engine/pathfinding/pth-edge-block";

/** Resume state for PlotPathPointPath state / state across timed-out searches. */
export type PathPointDfsResume = {
  transTable: PathPointDfsTransTable;
  costBudget: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

export type { SmoothSelectionResume };

export class ComputedPath {
  owner: ModuleObject;
  points: PathPoint[] = [];
  origin: PathPoint = undefined;
  destination: PathPoint = undefined;
  realtime: boolean = false;
  timer: number = 0;
  /** SmoothSelectionRestartable mid-pipeline resume (state + working). */
  smoothResume: SmoothSelectionResume | undefined;
  /** SmoothCornerOptimize mid-pass resume (JS hitch hardening after selection). */
  smoothCornerResume: SmoothCornerResume | undefined;
  /** True when DFS hit wall-clock budget without a full path (return 1). */
  incomplete: boolean = false;
  /** Populated on timeout for cross-frame TransTable reuse. */
  dfsResume: PathPointDfsResume | undefined;

  color = new THREE.Color().setRGB(1, 0.6470588235294118, 0);
  helperColors: THREE.Float32BufferAttribute;
  helperPositions: THREE.Float32BufferAttribute;
  helperGeometry = new THREE.BufferGeometry();
  helperMaterial = new THREE.LineBasicMaterial({
    color: 0xFFFFFF,
    vertexColors: true
  });
  helperMesh: THREE.LineSegments = new THREE.LineSegments();
  enableHelper: boolean = false;

  /** Detour waypoint when parent→child went around a creature (cost geometry). */
  private edgeDetours = new WeakMap<PathPoint, THREE.Vector3>();

  constructor(owner: ModuleObject, origin: PathPoint = undefined, destination: PathPoint = undefined){
    this.owner = owner;
    this.origin = origin;
    this.destination = destination;
    this.points = [];
  }

  setOwner(owner: ModuleObject){
    this.owner = owner;
  }

  getCost( point: PathPoint ){
    // PathPointDFS heuristic: distance to goal
    return point.vector.distanceTo( this.destination.vector );
  }

  clone(){
    const clone = new ComputedPath(this.owner);
    clone.points = this.points.slice(0);
    clone.origin = this.origin;
    clone.destination = this.destination;
    return clone;
  }

  /**
   * PTH graph search — PathPointDFS  with TransTable + iterative
   * cost budget (PlotPathPointPath). Creature detours from GenerateSuccessors.
   * Optional wall-clock slice (~ high-res timer continuation).
   * Pass `resume` to reuse TransTable when start/end unchanged (state).
   */
  search(options: {
    timeBudgetMs?: number;
    resume?: PathPointDfsResume;
  } = {}): ComputedPath {
    this.edgeDetours = new WeakMap();
    this.incomplete = false;
    this.dfsResume = undefined;
    this.smoothResume = undefined;
    this.smoothCornerResume = undefined;
    if(!this.origin || !this.destination){
      return this;
    }

    // Realtime / chase repaths get a tighter slice; normal plots get default DFS budget
    const timeBudgetMs = options.timeBudgetMs ?? (this.realtime ? 6 : undefined);

    const ox = this.origin.vector.x;
    const oy = this.origin.vector.y;
    const dx = this.destination.vector.x;
    const dy = this.destination.vector.y;
    const resume = options.resume;
    const sameEndpoints = !!(
      resume &&
      Math.hypot(ox - resume.startX, oy - resume.startY) < 0.01 &&
      Math.hypot(dx - resume.endX, dy - resume.endY) < 0.01
    );

    const result = pathPointDfsSearch({
      origin: this.origin,
      destination: this.destination,
      owner: this.owner,
      evaluateEdge: (from, to) => this.evaluateEdge(from, to),
      timeBudgetMs,
      transTable: sameEndpoints ? resume.transTable : undefined,
      costBudget: sameEndpoints ? resume.costBudget : undefined,
    });

    this.edgeDetours = result.detours;
    this.incomplete = !!result.timedOut;
    if(result.end && (result.ok || result.timedOut)){
      this.reconstructPath(result.end);
      // SmoothSelection runs in ModulePath.traverseToPoint / callers via prunePathPoints
      // (avoids double-prune and allows SmoothSelectionRestartable resume).
    }
    if(result.timedOut && result.transTable && result.costBudget != null){
      this.dfsResume = {
        transTable: result.transTable,
        costBudget: result.costBudget,
        startX: ox,
        startY: oy,
        endX: dx,
        endY: dy,
      };
    }
    return this;
  }

  private reconstructPath(end: PathPoint){
    let curr: PathPoint | undefined = end;
    if(curr) curr.end = true;
    this.points = [];
    while(curr){
      this.points.push(curr);
      const parent = curr.parent;
      const detour = this.edgeDetours.get(curr);
      if(detour && parent){
        const mid = PathPoint.FromVector3(detour);
        mid.setArea(curr.area ?? parent.area);
        this.points.push(mid);
      }
      curr = parent;
    }
    this.points.reverse();
  }

  /**
   * Edge cost for PTH expansion (GenerateSuccessors).
   * cost < 0 = blocked (static door / placeable).
   * Non-static doors do not prune edges — plot through while scripted open finishes.
   * Creature on line → detour length + splice waypoint.
   */
  private evaluateEdge(from: PathPoint, to: PathPoint): { cost: number; detour?: THREE.Vector3 } {
    const dist = from.vector.distanceTo(to.vector);
    const area = from.area ?? this.owner?.area;
    if(!area) return { cost: dist };

    // order: NoCreaturesOnLine, then NoNonWalkPolysDetailed
    const creatures = noCreaturesOnLine(area, from.vector, to.vector, {
      owner: this.owner,
      allowPartyCreatures: true,
    });
    if(!creatures.clear && creatures.blockingCreatureId != null){
      const blocker =
        area.creatures?.find((c) => c.id === creatures.blockingCreatureId) ??
        GameState.PartyManager?.party?.find((c) => c.id === creatures.blockingCreatureId);
      if(blocker){
        const d = computeCreatureEdgeDetour(area, from.vector, to.vector, blocker, this.owner);
        if(d) return { cost: d.cost, detour: d.detour };
      }
      return { cost: dist + Math.max(1.0, dist * 0.5) };
    }

    const polys = noNonWalkPolysDetailed(area, from.vector, to.vector, {
      ignoreObjectIds: BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)
        ? (() => {
            const id = (this.owner as ModuleCreature).pathFindIgnoreObjectId | 0;
            return id ? [id] : undefined;
          })()
        : undefined,
    });
    if(!polys.clear){
      const obj = GameState.ModuleObjectManager?.GetObjectById?.(polys.blockingObjectId);
      // Placeable or static door → drop edge; non-static door → keep successor
      if(isPthEdgeBlockedByObject(obj)){
        return { cost: -1 };
      }
    }

    return { cost: dist };
  }

  /**
   * Prune — SmoothSelection three-pass (densify + string-pull).
   * Optional time budget + resume (~SmoothSelectionRestartable).
   * On timeout sets `smoothResume` for ModulePath cross-frame session.
   */
  prunePathPoints(options: {
    timeBudgetMs?: number;
    resume?: SmoothSelectionResume;
  } = {}){
    if(this.points.length <= 2){
      this.smoothResume = undefined;
      return;
    }

    const area = this.owner?.area ?? this.points[0]?.area;
    const vectors = this.points.map((p) => p.vector);
    const timeBudgetMs = options.timeBudgetMs ?? (
      this.realtime ? SMOOTH_SELECTION_BUDGET_MS : undefined
    );
    const result = smoothSelectionRestartable(area, vectors, this.owner, {
      timeBudgetMs,
      resume: options.resume,
    });
    const selected = result.points;
    this.smoothResume = result.timedOut ? result.resume : undefined;
    if(selected.length === this.points.length){
      let same = true;
      for(let i = 0; i < selected.length; i++){
        if(selected[i] !== this.points[i].vector && selected[i].distanceToSquared(this.points[i].vector) > 1e-8){
          same = false;
          break;
        }
      }
      if(same) return;
    }

    const next: PathPoint[] = [];
    for(let i = 0; i < selected.length; i++){
      const v = selected[i];
      const existing = this.points.find((p) => p.vector === v || p.vector.distanceToSquared(v) < 1e-8);
      next.push(existing ?? PathPoint.FromVector3(v));
    }
    if(next.length){
      next[next.length - 1].end = true;
    }
    this.points = next;
    this.origin = this.points[0];
    this.destination = this.points[this.points.length - 1];
    this.reIndex();
  }

  reIndex(): void {
    let parent: PathPoint;
    for(let i = 0; i < this.points.length; i++){
      const p = this.points[i];
      p.parent = p;
      parent = p;
    }
  }

  buildHelperLine(){
    const pointCount = this.points.length;
    if(pointCount < 1){
      if(this.helperMesh){
        this.helperMesh.visible = false;
        this.helperMesh.removeFromParent();
      }
      return;
    }

    const connectionCount = Math.max(0, pointCount - 1);
    const pointDataSize = 6;
    const connDataSize = 6;
    const bufferSize = (pointCount * pointDataSize) + (connectionCount * connDataSize);

    let connectionIndexStart = (pointCount * 2);

    if(bufferSize <= 0){
      this.helperMesh.visible = false;
      this.helperMesh.removeFromParent();
      return;
    }

    if(!this.helperColors || bufferSize != this.helperColors.array.length){
      this.helperColors = new THREE.Float32BufferAttribute( (new Array(bufferSize)).fill(0), 3 );
    }

    if(!this.helperPositions || bufferSize != this.helperPositions.array.length){
      this.helperPositions = new THREE.Float32BufferAttribute( (new Array(bufferSize)).fill(0), 3 );
    }

    for(let i = 0; i < pointCount; i++){
      const point = this.points[i];

      const idx = i * 2;
      const idx2 = idx + 1;

      this.helperPositions.setX(idx, point.vector.x);
      this.helperPositions.setY(idx, point.vector.y);
      this.helperPositions.setZ(idx, point.vector.z);
      
      this.helperPositions.setX(idx2, point.vector.x);
      this.helperPositions.setY(idx2, point.vector.y);
      this.helperPositions.setZ(idx2, point.vector.z + 0.75);

      this.helperColors.setX(idx, 1);
      this.helperColors.setY(idx, 0);
      this.helperColors.setZ(idx, 1);

      //this.helperColor

      this.helperColors.setX(idx2, this.color.r);
      this.helperColors.setY(idx2, this.color.g);
      this.helperColors.setZ(idx2, this.color.b);

      if(i >= (pointCount - 1)){
        continue;
      }

      const cPoint = this.points[i + 1];
      const idx3 = connectionIndexStart;
      const idx4 = idx3 + 1;

      this.helperPositions.setX(idx3, point.vector.x);
      this.helperPositions.setY(idx3, point.vector.y);
      this.helperPositions.setZ(idx3, point.vector.z + 0.75);
      
      this.helperPositions.setX(idx4, cPoint.vector.x);
      this.helperPositions.setY(idx4, cPoint.vector.y);
      this.helperPositions.setZ(idx4, cPoint.vector.z + 0.75);

      this.helperColors.setX(idx3, 1);
      this.helperColors.setY(idx3, 0.6470588235294118);
      this.helperColors.setZ(idx3, 0);

      this.helperColors.setX(idx4, 1);
      this.helperColors.setY(idx4, 0.6470588235294118);
      this.helperColors.setZ(idx4, 0);
      connectionIndexStart += 2;
    }
    this.helperPositions.needsUpdate = true;
    this.helperColors.needsUpdate = true;

    this.helperGeometry.setAttribute('position', this.helperPositions);
    this.helperGeometry.setAttribute('color', this.helperColors);

    this.helperMesh.geometry = this.helperGeometry;
    this.helperMesh.material = this.helperMaterial;
    
    if(!this.helperMesh.parent){
      GameState.scene.add( this.helperMesh );
    }
    this.helperMesh.visible = this.enableHelper;
  }

  setColor(color: THREE.Color){
    this.color = color;
    if(!this.helperColors)
      return;

    const pointCount = this.points.length;
    let connectionIndexStart = (pointCount * 2);
    for(let i = 0; i < pointCount; i++){
      const point = this.points[i];

      const idx = i * 2;
      const idx2 = idx + 1;

      this.helperColors.setX(idx, 1);
      this.helperColors.setY(idx, 0);
      this.helperColors.setZ(idx, 1);

      //this.helperColor

      this.helperColors.setX(idx2, this.color.r);
      this.helperColors.setY(idx2, this.color.g);
      this.helperColors.setZ(idx2, this.color.b);

      if(i >= (pointCount - 1)){
        continue;
      }

      const cPoint = this.points[i + 1];
      const idx3 = connectionIndexStart;
      const idx4 = idx3 + 1;

      this.helperColors.setX(idx3, this.color.r);
      this.helperColors.setY(idx3, this.color.g);
      this.helperColors.setZ(idx3, this.color.b);

      this.helperColors.setX(idx4, this.color.r);
      this.helperColors.setY(idx4, this.color.g);
      this.helperColors.setZ(idx4, this.color.b);
      connectionIndexStart += 2;
    }
    this.helperColors.needsUpdate = true;
  }

  pop(){
    const p = this.points.shift();
    this.buildHelperLine();
    return p;
  }

  dispose(){
    if(!this.helperMesh)
      return;

    this.helperMesh.removeFromParent();

    if(this.helperMaterial)
      this.helperMaterial.dispose();

    if(this.helperGeometry)
      this.helperGeometry.dispose();

    this.helperMesh = undefined;
    this.helperGeometry = undefined;
    this.helperMaterial = undefined;
    this.helperColors = undefined;
    this.helperPositions = undefined;
  }

  merge(path2: ComputedPath){
    const endP1 = this.points[this.points.length - 1];
    const startP2 = path2.points[0];
    if(endP1.vector.equals(startP2.vector)){
      path2.points.shift();
    }
    this.points = [...this.points, ...path2.points];
    this.destination = this.points[this.points.length-1];
  }

  fixWalkEdges(safeDistance = 1.5){
    if(!this.owner) return;
    const area = this.owner.area;
    if(!area) return;
    for(let i = 0; i < this.points.length; i++){
      const v = this.points[i].vector;
      // PreferWalkable: keep points already on a walk face. Re-snapping with
      // owner perspace shoved doorway / dialog approach points across the room.
      if(typeof area.isPointWalkable === 'function' && area.isPointWalkable(v)){
        continue;
      }
      v.copy(area.getNearestWalkablePoint(v, safeDistance));
    }
  }

  smooth(divisions: number = -1){
    if(this.points.length < 2)
      return;

    if(divisions == -1)
      divisions = this.points.length * 5;

    const preSmooth = this.points.map( (p) => p.vector );
    const curve = new THREE.CatmullRomCurve3(preSmooth);

    const safeDistance = this.owner?.getHitDistance();

    this.points = curve.getPoints( divisions ).map( (v) => {
      return PathPoint.FromVector3(this.owner ? this.owner.area.getNearestWalkablePoint(v, safeDistance) : v);
    });
  }

  /**
   * SmoothPointsOnPath second stage — corner chords via TestDirectLine.
   * Optional budget/resume for JS hitch hardening after SmoothSelection.
   */
  smoothCorners(options: {
    timeBudgetMs?: number;
    resume?: SmoothCornerResume;
  } = {}){
    if(this.points.length < 3){
      this.smoothCornerResume = undefined;
      return;
    }
    const area = this.owner?.area ?? this.points[0]?.area;
    const result = smoothCornerOptimizeRestartable(area, this.points, this.owner, {
      timeBudgetMs: options.timeBudgetMs,
      resume: options.resume,
    });
    this.points = result.points;
    this.smoothCornerResume = result.timedOut ? result.resume : undefined;
    this.origin = this.points[0];
    this.destination = this.points[this.points.length - 1];
    this.reIndex();
  }

  static FromPointsList(points: PathPoint[] = []): ComputedPath {
    const path = new ComputedPath(undefined, points[0], points[points.length-1]);
    path.points = points;
    return path;
  }

  static FromVector3List(points: THREE.Vector3[] = []): ComputedPath {
    return this.FromPointsList(
      points.map((p) => PathPoint.FromVector3(p))
    );
  }

}
