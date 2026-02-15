import * as THREE from "three";

import { OdysseyWalkMeshType } from "@/enums/odyssey/OdysseyWalkMeshType";
import { OdysseyWalkMesh } from "@/odyssey/OdysseyWalkMesh";
import { OdysseyFace3 } from "@/three/odyssey";


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
  line: THREE.Line3 = new THREE.Line3(new THREE.Vector3(), new THREE.Vector3());
  normal: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  center_point: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  face: OdysseyFace3 = undefined;
  walkmesh: OdysseyWalkMesh = undefined;
  side: number = -1;
  vertIdx1: number = -1;
  vertIdx2: number = -1;
  index: number = -1;
  exportable: boolean = true;

  constructor(transition = -1){
    this.transition = transition;
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

    this.vertIdx1 = this.side == 0 ? this.face.a : this.side == 1 ? this.face.b : this.face.c;
    this.vertIdx2 = this.side == 0 ? this.face.b : this.side == 1 ? this.face.c : this.face.a;
    const verts = Array.isArray(this.walkmesh.vertices) ? this.walkmesh.vertices : [];
    const vert1 = verts[this.vertIdx1];
    const vert2 = verts[this.vertIdx2];
    this.line.start.set( vert1.x, vert1.y, vert1.z );
    this.line.end.set( vert2.x, vert2.y, vert2.z );

    this.updateNormal();
  }

  isAABB(): boolean {
    if(!this.walkmesh){
      return false;
    }
    return this.walkmesh.header.walkMeshType == OdysseyWalkMeshType.AABB;
  }

  #tmpVector1: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  /**
   * Update the normal of the edge.
   * The normal is calculated by taking the cross product of the edge direction vector and the face normal.
   * If the face is not an AABB, the normal is flipped.
   * @returns void
   */
  updateNormal(): void {
    if(!(this.line instanceof THREE.Line3)){
      return;
    }
    // Calculate edge midpoint
    this.line.at(0.5, this.center_point);

    // Calculate edge direction vector
    const dx = this.line.end.x - this.line.start.x;
    const dy = this.line.end.y - this.line.start.y;
    
    // Calculate perpendicular vector (rotate 90 degrees in XY plane)
    this.normal.set(-dy, dx, 0).normalize();

    if(!this.face || !this.face.centroid){
      return;
    }

    // Get vector from centroid to edge midpoint
    this.#tmpVector1.copy(this.center_point).sub(this.face.centroid);
    
    // If normal points towards centroid, flip it
    if (this.normal.dot(this.#tmpVector1) < 0) {
      this.normal.multiplyScalar(this.isAABB() ? 1 : -1);
    }
  }
}