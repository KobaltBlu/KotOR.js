import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleObject } from "@/module/ModuleObject";
import type { GFFStruct } from "@/resource/GFFStruct";
import type { WalkmeshEdge } from "@/odyssey/WalkmeshEdge";
import { isCreatureCapsuleClear } from "@/engine/pathfinding/creature-capsule-clear";
import { segmentCrossesBlockingWalkEdge } from "@/engine/pathfinding/walk-line-clear";
import * as THREE from 'three';
import { IPathPointOptions } from "@/interface/engine/pathfinding/IPathPointOptions";

/**
 * PathPoint class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file PathPoint.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class PathPoint {
  id: number;
  connections: PathPoint[];
  first_connection: number;
  num_connections: number;
  vector: THREE.Vector3;
  nearestWalkableVector: THREE.Vector3;
  isTemp: boolean = false;
  area: ModuleArea

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
      vector: new THREE.Vector3,
      area: undefined
    }, options);

    this.id = options.id;
    this.connections = options.connections;
    this.first_connection = options.first_connection;
    this.num_connections = options.num_connections;
    this.vector = options.vector;
    this.isTemp = false;
    this.setArea(options.area);
  }

  setArea(area: ModuleArea){
    this.area = area;
    if(this.area){
      this.nearestWalkableVector = this.area.getNearestWalkablePoint(this.vector);
      this.vector.z = this.nearestWalkableVector.z;
    }
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

  hasLOS(point_b: PathPoint, owner?: ModuleObject): boolean {
    if(!this.area)
      return true;

    if(segmentCrossesBlockingWalkEdge(this.area, this.vector, point_b.vector)){
      return false;
    }

    const creatures = isCreatureCapsuleClear(this.area, this.vector, point_b.vector, {
      owner,
      allowPartyCreatures: true,
    });
    return creatures.clear;
  }

  addConnection(node: PathPoint) {
    if(this.connections.indexOf(node) == -1){
      this.connections.push(node);
    }
    if(node.connections.indexOf(this) == -1){
      node.addConnection(this);
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

  static FromGFFStruct(struct: GFFStruct){
    return new PathPoint({
      id: -1,
      connections: [],
      first_connection: struct.getFieldByLabel('First_Conection').getValue(),
      num_connections: struct.getFieldByLabel('Conections').getValue(),
      vector: new THREE.Vector3(
        struct.getFieldByLabel('X').getValue(), 
        struct.getFieldByLabel('Y').getValue(), 
        0
      )
    });
  }

}