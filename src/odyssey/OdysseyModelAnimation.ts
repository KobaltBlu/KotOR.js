/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { OdysseyModelAnimationNode } from "./";
import * as THREE from 'three';
import { TwoDAManager } from "../managers/TwoDAManager";

/* @file
 * The OdysseyModelAnimation class holds the values used in animations.
 */

export class OdysseyModelAnimation {
  _position: any;
  _quaternion: any;
  p_func1: any;
  p_func12: any;
  name: any;
  RootNodeOffset: any;
  NodeCount: any;
  RefCount: any;
  GeometryType: any;
  Unknown4: any;
  length: any;
  transition: any;
  ModelName: any;
  events: any[];
  nodes: OdysseyModelAnimationNode[];
  rootNode: OdysseyModelAnimationNode;
  currentFrame: number;
  elapsed: number;
  lastTime: number;
  type: string;

  data: { 
    loop: boolean; 
    cFrame: number; 
    elapsed: number; 
    lastTime: number; 
    delta: number; 
    lastEvent: number; 
    events: any[]; 
    callback?: Function; 
  };
  anim: { loop: false; cFrame: number; elapsed: number; lastTime: number; delta: number; lastEvent: number; callback: any; };
  callback: any;
  lastEvent: number;
  bezierA: THREE.Vector3;
  bezierB: THREE.Vector3;
  bezierC: THREE.Vector3;
  static _position: THREE.Vector3;
  static _quaternion: THREE.Quaternion;

  constructor(){
    this.type = 'OdysseyModelAnimation';
    this.rootNode = new OdysseyModelAnimationNode();
    //this.currentFrame = 0;
    //this.elapsed = 0;
    //this.lastTime = 0;
    //this.delta = 0;
    this.data = {
      loop: false,
      cFrame: 0,
      elapsed: 0,
      lastTime: 0,
      delta: 0,
      lastEvent: 0,
      events: [],
      callback: undefined
    };
    this.callback = null;

    this.lastEvent = 0;

    this._position = new THREE.Vector3();
    this._quaternion = new THREE.Quaternion();

    this.bezierA = new THREE.Vector3();
    this.bezierB = new THREE.Vector3();
    this.bezierC = new THREE.Vector3();

  }

  static From(original: any){
    let anim = new OdysseyModelAnimation();
    //anim = Object.assign(Object.create( Object.getPrototypeOf(original)), original);
    anim.rootNode = original.rootNode;
    anim.currentFrame = original.currentFrame;
    anim.nodes = original.nodes;
    anim.ModelName = original.ModelName;
    anim.events = original.events;
    anim.name = original.name;
    anim.length = original.length;
    anim.transition = original.transition;

    anim._position = new THREE.Vector3();
    anim._quaternion = new THREE.Quaternion();

    anim.bezierA = new THREE.Vector3();
    anim.bezierB = new THREE.Vector3();
    anim.bezierC = new THREE.Vector3();

    anim.data = {
      loop: false,
      cFrame: 0,
      elapsed: 0,
      lastTime: 0,
      delta: 0,
      lastEvent: 0,
      events: [],
      callback: undefined
    };

    return anim;
  }

  getDamageDelay(){
    for(let i = 0, len = this.events.length; i < len; i++){
      if(this.events[i].name == 'Hit'){
        return this.events[i].length;
      }
    }
    return 0.5;
  }

  static GetAnimation2DA(name = ''){
    const animations2DA = TwoDAManager.datatables.get('animations');
    if(animations2DA){
      for(let i = 0, len = animations2DA.RowCount; i < len; i++){
        if(animations2DA.rows[i].name.toLowerCase() == name.toLowerCase()){
          return animations2DA.rows[i];
        }
      }
    }
    return undefined;
  }

}
