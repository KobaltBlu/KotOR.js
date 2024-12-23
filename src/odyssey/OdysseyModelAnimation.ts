import * as THREE from 'three';
import { TwoDAManager } from "../managers/TwoDAManager";
import { ITwoDAAnimation } from "../interface/twoDA/ITwoDAAnimation";
import { OdysseyModelAnimationNode } from './OdysseyModelAnimationNode';
import type { OdysseyModel } from './OdysseyModel';
import { OdysseyModelUtility } from './OdysseyModelUtility';

/**
 * OdysseyModelAnimation class.
 * 
 * The OdysseyModelAnimation class holds the values used in animations.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModelAnimation.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyModelAnimation {
  _position: THREE.Vector3 = new THREE.Vector3();
  _quaternion: THREE.Quaternion = new THREE.Quaternion();
  functionPointer0: number;
  functionPointer1: number;
  name: string;
  rootNodeOffset: number;
  nodeCount: number;
  refCount: number;
  geometryType: number;
  unknown4: Uint8Array;
  length: number;
  transition: number;
  modelName: string;
  events: {length: number; name: string; }[] = [];
  nodes: OdysseyModelAnimationNode[] = [];
  rootNode: OdysseyModelAnimationNode;
  currentFrame: number = 0;
  elapsed: number = 0;
  lastTime: number = 0;
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
  odysseyModel: OdysseyModel;

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

  readBinary(odysseyModel: OdysseyModel){
    this.odysseyModel = odysseyModel;

    //GeometryHeader
    this.functionPointer0 = this.odysseyModel.mdlReader.readUInt32(); //4Byte Function pointer
    this.functionPointer1 = this.odysseyModel.mdlReader.readUInt32(); //4Byte Function pointer

    this.name = this.odysseyModel.mdlReader.readChars(32).replace(/\0[\s\S]*$/g,'');
    this.rootNodeOffset = this.odysseyModel.mdlReader.readUInt32();
    this.nodeCount = this.odysseyModel.mdlReader.readUInt32();

    this.odysseyModel.mdlReader.skip(24); //Skip unknown array definitions

    this.refCount = this.odysseyModel.mdlReader.readUInt32();
    this.geometryType = this.odysseyModel.mdlReader.readByte(); //Model Type
    this.unknown4 = this.odysseyModel.mdlReader.readBytes(3); //Padding

    //Animation
    this.length = this.odysseyModel.mdlReader.readSingle();
    this.transition = this.odysseyModel.mdlReader.readSingle();
    this.modelName = this.odysseyModel.mdlReader.readChars(32).replace(/\0[\s\S]*$/g,'').toLowerCase();

    let _eventsDef = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader);
    //anim.events = OdysseyModelUtility.ReadArrayFloats(this.mdlReader, this.fileHeader.ModelDataOffset + _eventsDef.offset, _eventsDef.count);
    this.events = new Array(_eventsDef.count);
    this.odysseyModel.mdlReader.skip(4); //Unknown uint32

    if (_eventsDef.count > 0) {
      this.odysseyModel.mdlReader.seek(this.odysseyModel.fileHeader.modelDataOffset + _eventsDef.offset);
      for (let i = 0; i < _eventsDef.count; i++) {
        this.events[i] = { 
          length: this.odysseyModel.mdlReader.readSingle(), 
          name: this.odysseyModel.mdlReader.readChars(32).replace(/\0[\s\S]*$/g,'') 
        };
      }
    }

    //Animation Node
    this.nodes = [];
    this.rootNode = this.readAnimationNode(this.odysseyModel.fileHeader.modelDataOffset + this.rootNodeOffset);

  }

  readAnimationNode(offset: number){
    this.odysseyModel.mdlReader.seek(offset);

    const node = new OdysseyModelAnimationNode(this);
    node.readBinary(this.odysseyModel);
    this.nodes.push(node);

    //Child Animation Nodes
    let len = node.childOffsets.length;
    for (let i = 0; i < len; i++) {
      node.children.push(
        this.readAnimationNode( this.odysseyModel.fileHeader.modelDataOffset + node.childOffsets[i] )
      );
    }

    return node;
  }

  static From(original: any){
    let anim = new OdysseyModelAnimation();
    //anim = Object.assign(Object.create( Object.getPrototypeOf(original)), original);
    anim.rootNode = original.rootNode;
    anim.currentFrame = original.currentFrame;
    anim.nodes = original.nodes;
    anim.modelName = original.ModelName;
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

  static GetAnimation2DA(name = ''): ITwoDAAnimation {
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
