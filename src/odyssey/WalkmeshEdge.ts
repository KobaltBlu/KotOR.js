import * as THREE from "three";
import { OdysseyFace3 } from "../three/odyssey";
import { OdysseyWalkMesh } from "./OdysseyWalkMesh";

export class WalkmeshEdge {
  transition: number;
  line: any;
  normal: THREE.Vector3;
  _normal_a: THREE.Vector3;
  _normal_b: THREE.Vector3;
  center_point: THREE.Vector3;
  face: OdysseyFace3;
  walkmesh: OdysseyWalkMesh;
  index: number;
  constructor(transition = -1){
    this.transition = transition;
    this.line = undefined;
    this.normal = new THREE.Vector3(0, 0, 0);
    this._normal_a = new THREE.Vector3(0, 0, 0);
    this._normal_b = new THREE.Vector3(0, 0, 0);
    this.center_point = new THREE.Vector3(0, 0, 0);
    this.face = undefined;
    this.walkmesh = undefined;
    this.index = -1;
  }

  setFace(face: OdysseyFace3){
    this.face = face;
  }

  setSideIndex(index: number){
    this.index = index;
  }

  setWalkmesh(walkmesh: OdysseyWalkMesh){
    this.walkmesh = walkmesh;
  }

  update(){
    if(this.walkmesh){
      this.line = undefined;
      if(this.index == 0){
        this.line = new THREE.Line3( this.walkmesh.vertices[this.face.a], this.walkmesh.vertices[this.face.b] );
      }else if(this.index == 1){
        this.line = new THREE.Line3( this.walkmesh.vertices[this.face.b], this.walkmesh.vertices[this.face.c] );
      }else if(this.index == 2){
        this.line = new THREE.Line3( this.walkmesh.vertices[this.face.c], this.walkmesh.vertices[this.face.a] );
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