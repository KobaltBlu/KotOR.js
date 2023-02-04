/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { TemplateLoader } from "../loaders/TemplateLoader";
import { GFFObject } from "../resource/GFFObject";
import { ResourceTypes } from "../resource/ResourceTypes";
import * as THREE from "three";
import { GameState } from "../GameState";

/* @file
 * The ModulePath class.
 */

interface ClosestPathPointData {
  startingPoint: PathPoint, 
  endingPoint: PathPoint, 
  closestPoint: THREE.Vector3
}

interface PathPointOptions {
  id: number;
  connections: PathPoint[];
  first_connection: number;
  num_connections: number;
  vector: THREE.Vector3;
}

class PathPoint {
  id: number;
  connections: PathPoint[];
  first_connection: number;
  num_connections: number;
  vector: THREE.Vector3;

  //search state
  h: number = 0;
  g: number = 0;
  f: number = 0;
  cost: number = 1;
  visited: boolean = false;
  closed: boolean = false;
  parent?: PathPoint;

  constructor(options: PathPointOptions){
    options = Object.assign({
      id: 0,
      connections: [],
      first_connection: 0,
      num_connections: 0,
      vector: new THREE.Vector3
    }, options);

    this.id = options.id;
    this.connections = options.connections;
    this.first_connection = options.first_connection;
    this.num_connections = options.num_connections;
    this.vector = options.vector;

  }

  reset(){
    this.h = this.g = this.f = 0;
    this.cost = 1;
    this.visited = false;
    this.closed = false;
    this.parent = undefined;
  }

  isWall(): boolean {
    return false;
  }

  addConnection(node: PathPoint) {
    if(this.connections.indexOf(node) == -1){
      this.connections.push(node);
    }
  }

  removeConnection(node: PathPoint) {
    const index = this.connections.indexOf(node);
    if(index >= 0){
      this.connections.splice(index, 1);
    }
  }

  static FromVector3(vector: THREE.Vector3): PathPoint {
    const p = new PathPoint({
      id: -1,
      connections: [],
      first_connection: 0,
      num_connections: 0,
      vector: vector
    });
    return p;
  }

}

export class ModulePath {
  _tmpVector: THREE.Vector3;
  points: PathPoint[];
  template: GFFObject;
  name: string;
  line: THREE.LineSegments;
  initialized: boolean;

  constructor(pathName = ''){
    this._tmpVector = new THREE.Vector3(0, 0, 0);
    this.points = [];
    this.template = new GFFObject();
    this.name = pathName;
  }

  Load( onLoad?: Function ){
    TemplateLoader.Load({
      ResRef: this.name,
      ResType: ResourceTypes.pth,
      onLoad: (gff: GFFObject) => {

        this.template = gff;
        //console.log(this.template, gff, this)
        this.InitProperties();
        if(typeof onLoad === 'function')
          onLoad(this);

      },
      onFail: () => {
        console.error('Failed to load path template');
        if(typeof onLoad === 'function')
          onLoad(this);
      }
    });
  }

  InitProperties(){
    if(this.template instanceof GFFObject){
      let _points = this.template.json.fields.Path_Points.structs;
      for(let i = 0; i < _points.length; i++){

        let _pnt = _points[i];
        let point: PathPoint = new PathPoint({
          id: i,
          connections: [],
          first_connection: _pnt.fields.First_Conection.value,
          num_connections: _pnt.fields.Conections.value,
          vector: new THREE.Vector3(_pnt.fields.X.value, _pnt.fields.Y.value, 0)
        });
        this.points.push(point);
      }

      let material = new THREE.LineBasicMaterial({
        color: 0x0000ff
      });

      let geometry = new THREE.BufferGeometry();
      const points: number[] =[];

      for(let i = 0; i < this.points.length; i++){
        let point = this.points[i];
        if(point.num_connections){
          let connIdx = point.first_connection;
          for(let j = 0; j < point.num_connections; j++){
            point.connections.push(
              this.points[
                this.template.json.fields.Path_Conections.structs[connIdx + j].fields.Destination.value
              ]
            );
          }
        }

        for(let i = 0; i < this.points.length; i++){
          let point = this.points[i];
          points.push(
            point.vector.x, point.vector.y, -100,
            point.vector.x, point.vector.y, 100
          )
        }

      }

      geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( points, 3 ) );
          
      this.line = new THREE.LineSegments( geometry, material );
      GameState.scene.add( this.line );
      this.setPathHelpersVisibility(false);

    }
    
    this.initialized = true;
    
  }

  setPathHelpersVisibility(state = false){
    this.line.visible = state;
  }

  getClosestPathPointData(target = new THREE.Vector3): ClosestPathPointData{
    const targetPoint = new THREE.Vector3().copy(target);
    targetPoint.z = 0;
    const line3 = new THREE.Line3();
    const closestPoint = new THREE.Vector3(0, 0, 0);
    let startingPoint: PathPoint;
    let endingPoint: PathPoint;
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
          startingPoint = point;
          endingPoint = connection;
          closestPoint.copy(_tempPoint);
        }
      }
    }
    
    return { 
      startingPoint: startingPoint, 
      endingPoint: endingPoint, 
      closestPoint: closestPoint 
    };
  }

  traverseToPoint(origin: any, dest: any){
    this.reset();
    if(!this.points.length) return [dest];

    const startingPoint = this.getClosestPathPointData(origin);
    const endingPoint = this.getClosestPathPointData(dest);

    if(startingPoint.startingPoint == endingPoint.endingPoint) return [dest];
    if(!startingPoint.startingPoint || !endingPoint.endingPoint) return [dest];

    const tmpStart = PathPoint.FromVector3(startingPoint.closestPoint);
    const tmpEnd = PathPoint.FromVector3(endingPoint.closestPoint);

    tmpStart.addConnection(startingPoint.startingPoint);
    endingPoint.endingPoint.addConnection(tmpEnd);

    const path = new ComputedPath(tmpStart, tmpEnd);
    path.search();

    endingPoint.endingPoint.removeConnection(tmpEnd);
    if(!path.points.length){
      return path.points;
    }
    return [dest];

  }

  reset(){
    this.points.map( (p) => {
      p.reset();
    })
  }

}

class ComputedPath {
  cost = 0;
  points: PathPoint[] = [];
  closed_list: any[] = [];
  starting_point: PathPoint = undefined;
  ending_point: PathPoint = undefined;
  complete = false;

  constructor(starting_point: PathPoint = undefined, ending_point: PathPoint = undefined){
    this.starting_point = starting_point;
    this.ending_point = ending_point;
    this.points = [];
  }

  getCost( point: PathPoint ){
    return point.vector.manhattanDistanceTo( this.ending_point.vector );
  }

  clone(){
    const clone = new ComputedPath();
    clone.cost = this.cost;
    clone.points = this.points.slice(0);
    clone.closed_list = this.closed_list.slice(0);
    clone.starting_point = this.starting_point;
    clone.ending_point = this.ending_point;
    return clone;
  }

  //https://github.com/bgrins/javascript-astar
  search(): ComputedPath {
    const openHeap = new BinaryHeap<PathPoint>(
      //scorer
      function(node: PathPoint) { 
      return node.f; 
    });
    openHeap.push(this.starting_point);
    while(openHeap.size() > 0){
      const currentNode = openHeap.pop();

      if(currentNode == this.ending_point){
        var curr = currentNode;
        this.points = [];
        while(curr.parent) {
          this.points.push(curr);
          curr = curr.parent;
        }
        
        this.points.reverse();
        return this;
      }

      currentNode.closed = true;

      const neighbors = currentNode.connections;
      for(let i = 0, il = neighbors.length; i < il; i++) {
        let neighbor = neighbors[i];
        if(neighbor.closed || neighbor.isWall()) {
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

}

//https://github.com/bgrins/javascript-astar
class BinaryHeap<T> {
  content: T[];
  scoreFunction?: Function;

  constructor(scoreFunction?: Function){
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
    var result = this.content[0];
    // Get the element at the end of the array.
    var end = this.content.pop();
    // If there are any elements left, put the end element at the
    // start, and let it bubble up.
    if (this.content.length > 0) {
      this.content[0] = end;
      this.bubbleUp(0);
    }
    return result;
  }

  remove(node: T) {
    var i = this.content.indexOf(node);

    // When it is found, the process seen in 'pop' is repeated
    // to fill up the hole.
    var end = this.content.pop();

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
    var element = this.content[n];

    // When at 0, an element can not sink any further.
    while (n > 0) {

      // Compute the parent element's index, and fetch it.
      var parentN = ((n + 1) >> 1) - 1;
      var parent = this.content[parentN];
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
    var length = this.content.length;
    var element = this.content[n];
    var elemScore = this.scoreFunction(element);

    while (true) {
      // Compute the indices of the child elements.
      var child2N = (n + 1) << 1;
      var child1N = child2N - 1;
      // This is used to store the new position of the element, if any.
      var swap = null;
      var child1Score;
      // If the first child exists (is inside the array)...
      if (child1N < length) {
        // Look it up and compute its score.
        var child1 = this.content[child1N];
        child1Score = this.scoreFunction(child1);

        // If the score is less than our element's, we need to swap.
        if (child1Score < elemScore) {
          swap = child1N;
        }
      }

      // Do the same checks for the other child.
      if (child2N < length) {
        var child2 = this.content[child2N];
        var child2Score = this.scoreFunction(child2);
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
