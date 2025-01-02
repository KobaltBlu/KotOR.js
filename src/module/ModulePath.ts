import * as THREE from "three";
import { ResourceLoader } from "../loaders";
import { GFFObject } from "../resource/GFFObject";
import { ResourceTypes } from "../resource/ResourceTypes";
import { GameState } from "../GameState";
import { PathPoint } from "../engine/pathfinding/PathPoint";
import { IClosestPathPointData } from "../interface/engine/pathfinding/IClosestPathPointData";
import type { ModuleArea } from "./ModuleArea";

/**
* ModulePath class.
* 
* Class representing all of the points and connections fro pathfinding in a module area.
* 
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
* 
* @file ModulePath.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModulePath {
  area: ModuleArea;
  _tmpVector: THREE.Vector3;
  points: PathPoint[];
  template: GFFObject;
  name: string;
  line: THREE.LineSegments;
  initialized: boolean;

  constructor(area: ModuleArea){
    this._tmpVector = new THREE.Vector3(0, 0, 0);
    this.points = [];
    this.template = new GFFObject();
    this.area = area;
    this.name = area.name;
  }

  async load(){
    const buffer = ResourceLoader.loadCachedResource(ResourceTypes['pth'], this.name);
    if(buffer){
      this.template = new GFFObject(buffer);
    }else{
      console.error('Failed to load ModulePath template');
    }

    if(this.template instanceof GFFObject){
      this.initProperties();
    }
    return this;
  }

  initProperties(){
    this.initialized = true;
    if(!(this.template instanceof GFFObject)){
      return;
    }
    
    /**
     * Parse the Path Points
     */
    if(this.template.RootNode.hasField('Path_Points')){
      const pathPoints = this.template.getFieldByLabel('Path_Points').getChildStructs();
      for(let i = 0, len = pathPoints.length; i < len; i++){
        this.points[i] = PathPoint.FromGFFStruct(pathPoints[i]);
        this.points[i].id = i;
      }
    }

    /**
     * Parse the Path Connections
     */
    if(this.template.RootNode.hasField('Path_Conections')){
      const pathConnections = this.template.getFieldByLabel('Path_Conections').getChildStructs();
      for(let i = 0, len = this.points.length; i < len; i++){
        const point = this.points[i];
        if(!point.num_connections) continue;
        
        let connIdx = point.first_connection;
        for(let j = 0; j < point.num_connections; j++){
          const pointIdx = pathConnections[connIdx + j].getFieldByLabel('Destination').getValue();
          point.connections[j] = this.points[pointIdx];
        }
      }
    }

    /**
     * Build line segments for the visual helper geometry
     */
    const material = new THREE.LineBasicMaterial({
      color: 0x0000ff
    });

    const geometry = new THREE.BufferGeometry();
    const points: number[] = [];

    for(let i = 0; i < this.points.length; i++){
      let point = this.points[i];
      points.push(
        point.vector.x, point.vector.y, -100,
        point.vector.x, point.vector.y, 100
      )
    }

    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( points, 3 ) );
        
    this.line = new THREE.LineSegments( geometry, material );
    GameState.scene.add( this.line );
    this.setPathHelpersVisibility(false);
  }

  cleanupConnections(){
    for(let i = 0; i < this.points.length; i++){
      const point = this.points[i];
      const toPrune: PathPoint[] = [];
      for(let j = 0; j < point.connections.length; j++){
        const con = point.connections[j];
        if(!point.hasLOS(con)){
          toPrune.push(con);
        }
      }
      while(toPrune.length){
        const con = toPrune.pop();
        console.log('los', 'pruning connection', point, con);
        point.removeConnection(con);
        con.removeConnection(point);
      }
    }
  }

  setPathHelpersVisibility(state = false){
    this.line.visible = state;
  }

  getClosestPathPointData(target = new THREE.Vector3): IClosestPathPointData {
    const targetPoint = new THREE.Vector3().copy(target);
    targetPoint.z = 0;
    const line3 = new THREE.Line3();
    const closest_position_on_line = new THREE.Vector3(0, 0, 0);
    let point_a: PathPoint;
    let point_b: PathPoint;
    let distance = Infinity;
    let pDistance = 0;

    const _tempPoint = new THREE.Vector3(0, 0, 0);
    for(let i = 0; i < this.points.length; i++){
      const point = this.points[i];
      for(let j = 0; j < point.num_connections; j++){
        const connection = point.connections[j];
        line3.set(point.vector, connection.vector);
        line3.closestPointToPoint(targetPoint, true, _tempPoint);
        pDistance = targetPoint.distanceTo(_tempPoint);
        if(pDistance < distance){
          distance = pDistance;
          point_a = point;
          point_b = connection;
          closest_position_on_line.copy(_tempPoint);
        }
      }
    }
    
    return { 
      point_a: point_a, 
      point_b: point_b, 
      closest_position_on_line: closest_position_on_line 
    };
  }

  getClosestPathPoint(origin: THREE.Vector3): PathPoint{
    let point: PathPoint;
    let distance = Infinity;
    for(let i = 0; i < this.points.length; i++){
      const p = this.points[i];
      const d = origin.distanceTo(p.vector);
      if(d < distance){
        point = p;
        distance = d;
      }
    }
    return point;
  }

  traverseToPoint(origin: THREE.Vector3, dest: THREE.Vector3): ComputedPath {
    this.reset();

    const originPoint = PathPoint.FromVector3(origin);
    const destPoint = PathPoint.FromVector3(dest);
    const fallbackPath = ComputedPath.FromPointsList([destPoint]);
    if(!this.points.length) return fallbackPath;

    if(originPoint.hasLOS(destPoint)) return fallbackPath;

    const closest_origin_point = this.getClosestPathPoint(origin);
    const closest_destination_point = this.getClosestPathPoint(dest);

    //origin
    originPoint.addConnection(closest_origin_point);
    closest_origin_point.addConnection(originPoint);

    //dest
    closest_destination_point.addConnection(destPoint);
    destPoint.addConnection(closest_destination_point);

    originPoint.connections = this.points.slice(0).filter( (p) => {
      return p.hasLOS(originPoint);
    });

    const path = new ComputedPath(originPoint, destPoint);
    path.search();

    //clean up tmp point refs
    for(let i = 0; i < this.points.length; i++){
      const p = this.points[i];
      p.removeConnection(originPoint);
      p.removeConnection(destPoint);
    }

    if(path.points.length){
      return path;
    }
    return fallbackPath;

  }

  reset(){
    this.points.map( (p) => {
      p.reset();
    })
  }

}

export class ComputedPath {
  points: PathPoint[] = [];
  origin: PathPoint = undefined;
  destination: PathPoint = undefined;
  realtime: boolean = false;
  timer: number = 0;
  line: THREE.LineSegments;

  constructor(origin: PathPoint = undefined, destination: PathPoint = undefined){
    this.origin = origin;
    this.destination = destination;
    this.points = [];
  }

  getCost( point: PathPoint ){
    return point.vector.manhattanDistanceTo( this.destination.vector );
  }

  clone(){
    const clone = new ComputedPath();
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
        if(neighbor.closed || !neighbor.hasLOS(currentNode)) {
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

  prunePathPoints(){
    if(this.points.length){
      const pruneList: number[] = [];
      let pruneRest = false;
      for(let i = 0; i < this.points.length; i++){
        const cPoint = this.points[i];
        const nPoint = this.points[i+1];

        if(this.destination == cPoint) continue;

        if(!pruneRest){
          if(cPoint.hasLOS(this.destination)){
            pruneRest = true;
          }else if(nPoint && (cPoint != this.origin)){
            //Check to see if we have LOS to the next point, which would make the current point useless
            if(this.origin.hasLOS(nPoint)){
              //Contine: prune and continue
              pruneList.push(i);
            }else{
              //Exit: prune mode
              // break;
            }
          }
        }else{
          pruneList.push(i);
        }
      }

      if(pruneList.length){
        // console.log('ComputedPath:pruneList', pruneList.length, this);
        while(pruneList.length){
          const index = pruneList.pop();
          this.points.splice(index, 1);
        }
      }

      this.reIndex();
    }
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
    const material = new THREE.LineBasicMaterial({
      color: 0x0000ff
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( 
      this.points.map( (p) => {
        return [
          p.vector.x, p.vector.y, -100, 
          p.vector.x, p.vector.y, 100
        ]
      }).flat(), 3 ) 
    );
          
    this.line = new THREE.LineSegments( geometry, material );
    GameState.scene.add( this.line );
  }

  dispose(){
    if(this.line){
      this.line.removeFromParent();
      const material = this.line.material as THREE.Material;
      if(material) material.dispose()
      this.line.geometry.dispose();
    }
  }

  static FromPointsList(points: PathPoint[] = []): ComputedPath {
    const path = new ComputedPath();
    path.points = points;
    return path;
  }

}

type ScoreFunctionType<T> = (node: T) => void;

//https://github.com/bgrins/javascript-astar
class BinaryHeap<T> {
  content: T[];
  scoreFunction?: ScoreFunctionType<T>;

  constructor(scoreFunction?: ScoreFunctionType<T>){
    this.content = [];
    this.scoreFunction = scoreFunction;
  }

  push(element: T) {
    // Add the new element to the end of the array.
    this.content.push(element);

    // Allow it to sink down.
    this.sinkDown(this.content.length - 1);
  }

  pop() {
    // Store the first element so we can return it later.
    let result = this.content[0];
    // Get the element at the end of the array.
    let end = this.content.pop();
    // If there are any elements left, put the end element at the
    // start, and let it bubble up.
    if (this.content.length > 0) {
      this.content[0] = end;
      this.bubbleUp(0);
    }
    return result;
  }

  remove(node: T) {
    let i = this.content.indexOf(node);

    // When it is found, the process seen in 'pop' is repeated
    // to fill up the hole.
    let end = this.content.pop();

    if (i !== this.content.length - 1) {
      this.content[i] = end;

      if (this.scoreFunction(end) < this.scoreFunction(node)) {
        this.sinkDown(i);
      } else {
        this.bubbleUp(i);
      }
    }
  }

  size() {
    return this.content.length;
  }

  rescoreElement(node: T) {
    this.sinkDown(this.content.indexOf(node));
  }

  sinkDown(n: number) {
    // Fetch the element that has to be sunk.
    let element = this.content[n];

    // When at 0, an element can not sink any further.
    while (n > 0) {

      // Compute the parent element's index, and fetch it.
      let parentN = ((n + 1) >> 1) - 1;
      let parent = this.content[parentN];
      // Swap the elements if the parent is greater.
      if (this.scoreFunction(element) < this.scoreFunction(parent)) {
        this.content[parentN] = element;
        this.content[n] = parent;
        // Update 'n' to continue at the new position.
        n = parentN;
      }
      // Found a parent that is less, no need to sink any further.
      else {
        break;
      }
    }
  }

  bubbleUp(n: number) {
    // Look up the target element and its score.
    let length = this.content.length;
    let element = this.content[n];
    let elemScore = this.scoreFunction(element);

    while (true) {
      // Compute the indices of the child elements.
      let child2N = (n + 1) << 1;
      let child1N = child2N - 1;
      // This is used to store the new position of the element, if any.
      let swap = null;
      let child1Score;
      // If the first child exists (is inside the array)...
      if (child1N < length) {
        // Look it up and compute its score.
        let child1 = this.content[child1N];
        child1Score = this.scoreFunction(child1);

        // If the score is less than our element's, we need to swap.
        if (child1Score < elemScore) {
          swap = child1N;
        }
      }

      // Do the same checks for the other child.
      if (child2N < length) {
        let child2 = this.content[child2N];
        let child2Score = this.scoreFunction(child2);
        if (child2Score < (swap === null ? elemScore : child1Score)) {
          swap = child2N;
        }
      }

      // If the element needs to be moved, swap it, and continue.
      if (swap !== null) {
        this.content[n] = this.content[swap];
        this.content[swap] = element;
        n = swap;
      }
      // Otherwise, we are done.
      else {
        break;
      }
    }
  }

}
