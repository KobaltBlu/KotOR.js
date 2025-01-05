import * as THREE from "three";
import { PathPoint } from "./PathPoint";
import type { ModuleObject } from "../../module/ModuleObject";
import { GameState } from "../../GameState";
import { BinaryHeap } from "./BinaryHeap";

export class ComputedPath {
  owner: ModuleObject;
  points: PathPoint[] = [];
  origin: PathPoint = undefined;
  destination: PathPoint = undefined;
  realtime: boolean = false;
  timer: number = 0;

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
    return point.vector.manhattanDistanceTo( this.destination.vector );
  }

  clone(){
    const clone = new ComputedPath(this.owner);
    clone.points = this.points.slice(0);
    clone.origin = this.origin;
    clone.destination = this.destination;
    return clone;
  }

  //https://github.com/bgrins/javascript-astar
  search(): ComputedPath {
    const openHeap = new BinaryHeap<PathPoint>(
      //scorer
      function(node: PathPoint) { 
      return node.f; 
    });
    openHeap.push(this.origin);
    while(openHeap.size() > 0){
      const currentNode = openHeap.pop();

      if(currentNode == this.destination){
        let curr = currentNode;
        curr.end = true;
        this.points = [];
        while(curr.parent) {
          this.points.push(curr);
          curr = curr.parent;
        }
        
        this.points.reverse();
        this.prunePathPoints();
        return this;
      }

      currentNode.closed = true;

      const neighbors = currentNode.connections;
      for(let i = 0, il = neighbors.length; i < il; i++) {
        let neighbor = neighbors[i];
        if(neighbor.closed || !neighbor.hasLOS(currentNode, this.owner)) {
          continue;
        }
        let gScore = currentNode.g + neighbor.cost;
        let beenVisited = neighbor.visited;
        if(!beenVisited || gScore < neighbor.g) {
          neighbor.visited = true;
          neighbor.parent = currentNode;
          neighbor.h = neighbor.h || this.getCost(neighbor);
          neighbor.g = gScore;
          neighbor.f = neighbor.g + neighbor.h;
          if (!beenVisited) {
            openHeap.push(neighbor);
          }
          else {
            openHeap.rescoreElement(neighbor);
          }
        }
      }

    }
    return this;
  }

  /**
   * Prunes any unneeded points based of LOS checks between points
   * @returns void
   */
  prunePathPoints(){
    return;
    if(!this.points.length)
      return;

    const pruneList: number[] = [];
    let pruneRest = false;

    let lastLOSOrigin;
    for(let i = 0, len = this.points.length; i < len; i++){
      const cPoint = this.points[i];
      const nPoint = this.points[i+1];
      const lPoint = this.points[i-1];

      if(this.destination == cPoint || !nPoint) continue;

      /**
       * Prune until the end because we already found LOS to the destination
       */
      if(pruneRest && nPoint){
        pruneList.push(i);
        continue;
      }

      if(cPoint.hasLOS(this.destination, this.owner)){
        pruneRest = true;
        continue;
      }
      
      if(cPoint == this.origin)
        continue;

      if(!lPoint)
        continue;

      if(lastLOSOrigin && lastLOSOrigin.hasLOS(nPoint), this.owner){
        pruneList.push(i);
        continue;
      }

      lastLOSOrigin = undefined;

      if(!!nPoint && lPoint.hasLOS(nPoint, this.owner)){
        lastLOSOrigin = lPoint;
        pruneList.push(i);
        continue;
      }
    }

    if(pruneList.length){
      while(pruneList.length){
        this.points.splice(pruneList.pop(), 1);
      }
    }

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
    const connectionCount = pointCount - 1;
    const pointDataSize = 6;
    const connDataSize = 6;
    const bufferSize = (pointCount * pointDataSize) + (connectionCount * connDataSize);

    let connectionIndexStart = (pointCount * 2);

    if(!bufferSize){
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
    for(let i = 0; i < this.points.length; i++){
      this.points[i].vector.copy(
        this.owner.area.getNearestWalkablePoint(this.points[i].vector, safeDistance)
      );
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
