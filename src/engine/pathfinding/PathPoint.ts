import * as THREE from 'three';
import { IPathPointOptions } from "../../interface/engine/pathfinding/IPathPointOptions";
import { GameState } from '../../GameState';
import { Utility } from '../../utility/Utility';

export class PathPoint {
  id: number;
  connections: PathPoint[];
  first_connection: number;
  num_connections: number;
  vector: THREE.Vector3;
  isTemp: boolean = false;

  //search state
  h: number = 0;
  g: number = 0;
  f: number = 0;
  cost: number = 1;
  visited: boolean = false;
  closed: boolean = false;
  parent?: PathPoint;
  end: boolean = false;

  constructor(options: IPathPointOptions){
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
    this.isTemp = false;
  }

  reset(){
    this.h = this.g = this.f = 0;
    this.cost = 1;
    this.visited = false;
    this.closed = false;
    this.parent = undefined;
    this.end = false;
  }

  isWall(): boolean {
    return false;
  }

  hasLOS(point_b: PathPoint): boolean {
    let has_los = true;
    const path_line = new THREE.Line3(this.vector, point_b.vector)
    for(let i = 0; i < GameState.module.area.rooms.length; i++){
      const room = GameState.module.area.rooms[i];
      if(room.model.wok){
        const walkmesh = room.model.wok;
        const edges: any[] = Object.values(walkmesh.edges);
        for(let j = 0; j < edges.length; j++){
          const edge = edges[j];
          if(edge.transition == -1){
            if(Utility.THREELineLineIntersection(path_line, edge.line)){
              has_los = false;
              break;
            }
          }
        }
      }
    }
    return has_los;
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

  closestPointFromLine(point_b: PathPoint, target: THREE.Vector3): PathPoint {
    const _tempPoint= new THREE.Vector3();
    const line3 = new THREE.Line3(this.vector, point_b.vector)
    line3.closestPointToPoint(target, true, _tempPoint);
    return PathPoint.FromVector3(target);
  }

  static FromVector3(vector: THREE.Vector3): PathPoint {
    const p = new PathPoint({
      id: -1,
      connections: [],
      first_connection: 0,
      num_connections: 0,
      vector: vector
    });
    p.isTemp = true;
    return p;
  }

}