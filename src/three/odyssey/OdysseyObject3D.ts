import * as THREE from "three";
import { OdysseyModelNode } from "../../odyssey/OdysseyModelNode";
import { OdysseyController } from "../../odyssey/controllers/OdysseyController";
import { GUIControl } from "../../gui/GUIControl";
import { OdysseyEmitter3D, OdysseyLight3D, OdysseyModel3D } from ".";
import { ModuleObject } from "../../module";
import { OdysseyControllerGeneric } from "../../interface/odyssey/controller/OdysseyControllerGeneric";
export class OdysseyObject3D extends THREE.Object3D {
  odysseyModel: OdysseyModel3D;
  odysseyModelNode: OdysseyModelNode;
  moduleObject: ModuleObject;
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
  isClickable: (e: any) => any;
  onClick: (e: any) => void;
  onMouseMove: (e: any) => void;
  onMouseDown: (e: any) => void;
  onMouseUp: (e: any) => void;
  onHover: (e: any) => void;
  getControl: () => GUIControl;
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
  
}