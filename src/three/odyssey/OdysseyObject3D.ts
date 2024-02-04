import * as THREE from "three";
import type { OdysseyModelNode } from "../../odyssey/OdysseyModelNode";
import type { OdysseyController } from "../../odyssey/controllers/OdysseyController";
import type { OdysseyEmitter3D } from "./OdysseyEmitter3D";
import type { OdysseyLight3D } from "./OdysseyLight3D";
import type { OdysseyModel3D } from "./OdysseyModel3D";

/**
 * OdysseyObject3D class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyObject3D.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyObject3D extends THREE.Object3D {
  odysseyModel: OdysseyModel3D;
  odysseyModelNode: OdysseyModelNode;
  NodeType: number;
  isWalkmesh: boolean;
  controllers: Map<number, OdysseyController>;
  controllerCache: any;
  controllerHelpers: any = {
    hasOrientation: false,
    hasPosition: false,
    hasScale: false,
  };
  matrixInverse: THREE.Matrix4;
  wasOffscreen: boolean = false;
  box: THREE.Box3;
  transitionState: {
    position: THREE.Vector3,
    quaternion: THREE.Quaternion,
  };
  
  head: any;
  lipping: boolean = false;
  
  emitter: OdysseyEmitter3D;
  light: THREE.Light | OdysseyLight3D;

  constructor( node: OdysseyModelNode = undefined ){
    super();
    this.odysseyModelNode = node;
    if(node){
      this.controllers = node?.controllers;
    }
    this.controllerCache = {};
    this.transitionState = {
      position: new THREE.Vector3,
      quaternion: new THREE.Quaternion,
    };
  }
  
  getControllerByType(type = -1){
    return this.controllers.get(type);
  }

  disableMatrixUpdate() {
    throw new Error("Method not implemented.");
  }

  dispose() {
    throw new Error("Method not implemented.");
  }

  update(delta: number) {
    throw new Error("Method not implemented.");
  }

  playAnimation(arg0: any, aLooping: boolean, arg2?: Function) {
    throw new Error("Method not implemented.");
  }

  static getUUIDs(object: THREE.Object3D): string[] {
    const uuids: string[] = [];

    if(!object){ return uuids; }

    uuids.push(object.uuid);

    for(let i = 0, len = object.children.length; i < len; i++){
      uuids.push(...OdysseyObject3D.getUUIDs(object.children[i]));
    }

    return uuids;
  }
  
}