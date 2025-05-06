import * as THREE from "three";
import { OdysseyFace3 } from "../three/odyssey";
import { OdysseyWalkMesh } from "./OdysseyWalkMesh";
import { OdysseyWalkMeshType } from "../enums/odyssey/OdysseyWalkMeshType";

/**
 * WalkmeshEdge class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file WalkmeshEdge.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class WalkmeshEdge {
  transition: number;
  line: THREE.Line3;
  normal: THREE.Vector3;
  _normal_a: THREE.Vector3;
  _normal_b: THREE.Vector3;
  center_point: THREE.Vector3;
  face: OdysseyFace3;
  walkmesh: OdysseyWalkMesh;
  side: number;
  vertex_1: number = -1;
  vertex_2: number = -1;
  index: number = -1;
  exportable: boolean = true;

  constructor(transition = -1){
    this.transition = transition;
    this.line = undefined;
    this.normal = new THREE.Vector3(0, 0, 0);
    this._normal_a = new THREE.Vector3(0, 0, 0);
    this._normal_b = new THREE.Vector3(0, 0, 0);
    this.center_point = new THREE.Vector3(0, 0, 0);
    this.face = undefined;
    this.walkmesh = undefined;
    this.side = -1;
  }

  //index into the walkable face adjacency array
  setIndex(index: number){
    this.index = index;
  }

  setFace(face: OdysseyFace3){
    this.face = face;
    if(!face) return;
    face.perimeter[this.index == 0 ? 'a' : this.index == 1 ? 'b' : 'c'] = true;
  }

  setSide(side: number){
    this.side = side;
  }

  setWalkmesh(walkmesh: OdysseyWalkMesh){
    this.walkmesh = walkmesh;
  }

  update(){
    if(!this.walkmesh){
      return;
    }

    this.line = undefined;
    if(this.side == 0){
      this.vertex_1 = this.face.a;
      this.vertex_2 = this.face.b;
      this.line = new THREE.Line3( this.walkmesh.vertices[this.vertex_1], this.walkmesh.vertices[this.vertex_2] );
    }else if(this.side == 1){
      this.vertex_1 = this.face.b;
      this.vertex_2 = this.face.c;
      this.line = new THREE.Line3( this.walkmesh.vertices[this.vertex_1], this.walkmesh.vertices[this.vertex_2] );
    }else if(this.side == 2){
      this.vertex_1 = this.face.c;
      this.vertex_2 = this.face.a;
      this.line = new THREE.Line3( this.walkmesh.vertices[this.vertex_1], this.walkmesh.vertices[this.vertex_2] );
    }

    const isAABB = this.walkmesh.header.walkMeshType == OdysseyWalkMeshType.AABB;

    if(this.line instanceof THREE.Line3){
      // Calculate edge midpoint
      this.line.at(0.5, this.center_point);

      if(this.face && this.face.centroid){
        // Calculate edge direction vector
        const edgeDirection = this.line.end.clone().sub(this.line.start);
        
        // Calculate perpendicular vector (rotate 90 degrees in XY plane)
        this.normal.set(-edgeDirection.y, edgeDirection.x, 0).normalize();
        
        // Get vector from centroid to edge midpoint
        const centroidToEdge = this.center_point.clone().sub(this.face.centroid);
        
        // If normal points towards centroid, flip it
        if (this.normal.dot(centroidToEdge) < 0) {
          this.normal.multiplyScalar(isAABB ? 1 : -1);
        }
      }else{
        // Fallback to simple perpendicular if no centroid
        const dx = this.line.end.x - this.line.start.x;
        const dy = this.line.end.y - this.line.start.y;
        this.normal.set(-dy, dx, 0).normalize();
      }
    }
  }

}