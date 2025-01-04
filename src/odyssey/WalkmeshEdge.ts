import * as THREE from "three";
import { OdysseyFace3 } from "../three/odyssey";
import { OdysseyWalkMesh } from "./OdysseyWalkMesh";

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
    if(this.walkmesh){
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

      if(this.line instanceof THREE.Line3){
        // this.line.start = this.line.start.applyMatrix4(this.walkmesh.mat4);
        // this.line.end = this.line.end.applyMatrix4(this.walkmesh.mat4);
        let dx = this.line.end.x - this.line.start.x;
        let dy = this.line.end.y - this.line.start.y;
        this._normal_a.set(-dy, dx, 0).normalize();
        this._normal_b.set(dy, -dx, 0).normalize();

        this.line.at(0.5, this.center_point);
        if(this.face && this.face.centroid){
          let normal_a_dist = 0;
          let normal_b_dist = 0;
          let centroid = this.face.centroid.clone();
          // let direction = this.center_point.clone().sub(centroid).normalize();

          normal_a_dist = this.center_point.clone().add(this._normal_a).distanceTo(centroid);
          normal_b_dist = this.center_point.clone().add(this._normal_b).distanceTo(centroid);

          if(normal_a_dist < normal_b_dist){
            this.normal = this._normal_a;
          }else{
            this.normal = this._normal_b;
          }
        }else{
          this.normal = this._normal_a.clone();
        }
      }
    }
  }

}