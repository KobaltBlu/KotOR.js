import * as THREE from "three";
import { OdysseyModelNode } from "../../odyssey/OdysseyModelNode";
import { OdysseyController } from "../../odyssey/controllers/OdysseyController";
import { GUIControl } from "../../gui/GUIControl";
import { OdysseyEmitter3D } from "./";
export class OdysseyObject3D extends THREE.Object3D {
  odysseyModel: OdysseyModelNode;
  NodeType: number;
  isWalkmesh: boolean;
  controllers: Map<number, OdysseyController>;
  controllerCache: any;
  emitter: OdysseyEmitter3D;
  matrixInverse: THREE.Matrix4;
  // trans: {
  //   position: THREE.Vector3,
  //   quaternion: THREE.Quaternion,
  // };
  isClickable: (e: any) => any;
  onClick: (e: any) => void;
  onMouseMove: (e: any) => void;
  onMouseDown: (e: any) => void;
  onMouseUp: (e: any) => void;
  onHover: (e: any) => void;
  getControl: () => GUIControl;
  constructor( node: OdysseyModelNode = undefined ){
    super();
    this.odysseyModel = node;
    this.controllers = node.controllers;
    this.controllerCache = {};
    // this.trans = {
    //   position: new THREE.Vector3,
    //   quaternion: new THREE.Quaternion,
    // };
  }
  
  getControllerByType(type = -1){
    return this.auroraNode.controllers.get(type);
  }
}