/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { BinaryReader } from "../BinaryReader";
import { OdysseyModelEngine } from "../interface/odyssey/OdysseyModelEngine";
import { OdysseyModelNodeType } from "../interface/odyssey/OdysseyModelNodeType";
import { 
  OdysseyModelAnimation, OdysseyModelAnimationNode, OdysseyModelNode, OdysseyModelNodeAABB, OdysseyModelNodeDangly,
  OdysseyModelNodeEmitter, OdysseyModelNodeLight, OdysseyModelNodeMesh, OdysseyModelNodeReference, OdysseyModelNodeSaber, OdysseyModelNodeSkin 
} from ".";
import * as THREE from 'three';

/* @file
 * The OdysseyModel class takes an MDL & MDX file and decode the values to later be passed to a 
 * OdysseyModel3D class to be converted into an object that can be added to the scene graph.
 */

export class OdysseyModel {
  mdlReader: BinaryReader;
  mdxReader: BinaryReader;
  fileHeader: any = {};
  geometryHeader: any = {};
  modelHeader: any = {};
  animations: any[];
  rootNode: any;
  engine: OdysseyModelEngine;
  names: string[];
  nodes: any = {};
  static ENGINE: any;
  
  constructor( mdlReader: BinaryReader, mdxReader: BinaryReader, onLoad?: Function, onError?: Function ){

    this.mdlReader = mdlReader;
    this.mdxReader = mdxReader;

    this.fileHeader = {};
    this.geometryHeader = {};
    this.modelHeader = {};
    this.animations = [];
    this.rootNode = null;

    this.fileHeader.FlagBinary = this.mdlReader.readUInt32();

    if (this.fileHeader.FlagBinary != 0){
      throw ("KotOR binary model not presented");
    }

    this.fileHeader.ModelDataSize = this.mdlReader.readUInt32();
    this.fileHeader.RawDataSize = this.mdlReader.readUInt32();

    this.fileHeader.ModelDataOffset = 12;
    this.fileHeader.RawDataOffset = this.fileHeader.ModelDataOffset + this.fileHeader.ModelDataSize;

    /*
     * Geometry Header
     */

    this.geometryHeader.FunctionPointer0 = this.mdlReader.readUInt32(); //4Byte Function pointer
    this.geometryHeader.FunctionPointer1 = this.mdlReader.readUInt32(); //4Byte Function pointer

    //Thanks bead-v :)
    //Use FunctionPointer0 in the geometry header to determine the engine version the model was prepared for.
    switch(this.geometryHeader.FunctionPointer0){
      case 4273776: //K1
        this.engine = OdysseyModelEngine.K1;
      break;
      case 4285200: //K2
        this.engine = OdysseyModelEngine.K2;
      break;
      case 4254992: //K1_XBOX
        this.engine = OdysseyModelEngine.K1_XBOX;
      break;
      case 4285872: //K2_XBOX
        this.engine = OdysseyModelEngine.K2_XBOX;
      break;
    }

    this.geometryHeader.ModelName = this.mdlReader.readChars(32).replace(/\0[\s\S]*$/g,'');
    this.geometryHeader.RootNodeOffset = this.mdlReader.readUInt32();
    this.geometryHeader.NodeCount = this.mdlReader.readUInt32();
    mdlReader.movePointerForward(24);

    this.geometryHeader.RefCount = this.mdlReader.readUInt32();
    this.geometryHeader.GeometryType = this.mdlReader.readByte(); //Model Type
    this.geometryHeader.Unknown4 = this.mdlReader.readBytes(3); //Padding

    /*
     * Model Header
     */
    
    this.modelHeader.Classification = this.mdlReader.readByte();
    this.modelHeader.SubClassification = this.mdlReader.readByte();
    this.modelHeader.Smoothing = this.mdlReader.readByte() == 1 ? true : false; //Unknown
    this.modelHeader.Fogged = this.mdlReader.readByte();
    this.modelHeader.ChildModelCount = this.mdlReader.readUInt32(); //Unkown

    let _animDataDef = OdysseyModel.ReadArrayDefinition(mdlReader);

    this.modelHeader.AnimationDataOffset = _animDataDef.offset;
    this.modelHeader.AnimationsCount = _animDataDef.count;

    this.modelHeader.AnimationsAllocated = this.modelHeader.AnimationsCount;

    this.modelHeader.ParentModelPointer = this.mdlReader.readUInt32(); // Parent model pointer

    this.modelHeader.BoundingMinX = this.mdlReader.readSingle();
    this.modelHeader.BoundingMinY = this.mdlReader.readSingle();
    this.modelHeader.BoundingMinZ = this.mdlReader.readSingle();
    this.modelHeader.BoundingMaxX = this.mdlReader.readSingle();
    this.modelHeader.BoundingMaxY = this.mdlReader.readSingle();
    this.modelHeader.BoundingMaxZ = this.mdlReader.readSingle();
    this.modelHeader.Radius = this.mdlReader.readSingle();
    this.modelHeader.Scale = this.mdlReader.readSingle();
    this.mdlReader.seek(148);
    this.modelHeader.SuperModelName = this.mdlReader.readChars(32).replace(/\0[\s\S]*$/g,'');
    
    /*
     * Names Array Header
     */

    this.mdlReader.position += 4; // Root node pointer again
    this.mdlReader.position += 12; // Unknown

    let _nameDef = OdysseyModel.ReadArrayDefinition(this.mdlReader);
    let nameOffset = _nameDef.offset;
    let nameCount = _nameDef.count;

    let nameOffsets = OdysseyModel.ReadArray(this.mdlReader, this.fileHeader.ModelDataOffset + nameOffset, nameCount);

    this.names = OdysseyModel.readStrings(this.mdlReader, nameOffsets, this.fileHeader.ModelDataOffset);
    for(let i = 0, namesLen = this.names.length; i < namesLen; i++){
      this.names[i] = this.names[i].replace(/\0[\s\S]*$/g,'').toLowerCase();
    }

    /*
     * Nodes Header
     */

    //START: TEST - Loading Root Node
    this.nodes = {};
    let tmpPos = this.mdlReader.position;
    let nodeOffset = this.geometryHeader.RootNodeOffset;
    this.rootNode = this.ReadNode(nodeOffset);
    this.mdlReader.seek(tmpPos);
    //END:   TEST - Loading Root Node

    let animOffsets = OdysseyModel.ReadArray(mdlReader, this.fileHeader.ModelDataOffset + this.modelHeader.AnimationDataOffset, this.modelHeader.AnimationsCount);

    for (let i = 0; i < this.modelHeader.AnimationsCount; i++){
      let tmpPos = this.mdlReader.position;
      let offset = animOffsets[i];
      this.ReadAnimation((this.fileHeader.ModelDataOffset as number) + offset);
      this.mdlReader.seek(tmpPos);
    }

    //console.log(this.modelHeader.SuperModelName.indexOf("NULL") == -1);

    this.mdlReader = undefined;
    this.mdxReader = undefined;

  }

  ParseModel(){

  }

  ReadHeader(){

  }

  ReadNode(offset: number, parent = this.rootNode){

    this.mdlReader.position = this.fileHeader.ModelDataOffset + offset;  
    let node = undefined;

    //Read the node type so we can know what type of node we are dealing with
    let NodeType = this.mdlReader.readUInt16();
    this.mdlReader.position -= 2;

    if ((NodeType & OdysseyModelNodeType.Emitter) == OdysseyModelNodeType.Emitter) {
      node = new OdysseyModelNodeEmitter(parent);
    }else if ((NodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
      node = new OdysseyModelNodeLight(parent);
    }else if ((NodeType & OdysseyModelNodeType.Skin) == OdysseyModelNodeType.Skin) {
      node = new OdysseyModelNodeSkin(parent);
    }else if ((NodeType & OdysseyModelNodeType.Dangly) == OdysseyModelNodeType.Dangly) {
      node = new OdysseyModelNodeDangly(parent);
    }else if ((NodeType & OdysseyModelNodeType.Saber) == OdysseyModelNodeType.Saber) {
      node = new OdysseyModelNodeSaber(parent);
    }else if ((NodeType & OdysseyModelNodeType.AABB) == OdysseyModelNodeType.AABB) {
      node = new OdysseyModelNodeAABB(parent);
    }else if ((NodeType & OdysseyModelNodeType.Anim) == OdysseyModelNodeType.Anim) {
      this.mdlReader.position += 0x38;
    }else if ((NodeType & OdysseyModelNodeType.Mesh) == OdysseyModelNodeType.Mesh) {
      node = new OdysseyModelNodeMesh(parent);
    }else if ((NodeType & OdysseyModelNodeType.Reference) == OdysseyModelNodeType.Reference) {
      node = new OdysseyModelNodeReference(parent);
    }else{
      node = new OdysseyModelNode(parent);
    }

    if(node instanceof OdysseyModelNode){
      node.readBinary(this);
      node.odysseyModel = undefined;

      for(let i = 0, len = node.childOffsets.length; i < len; i++){
        node.add( this.ReadNode(node.childOffsets[i], node ) );
      }
  
      return node;
    }else{
      console.error('OdysseyModel.ReadNode', 'Unhandled Node', NodeType);
    }

    return node;
  }

  ReadAnimation(offset: number){
    let pos = this.mdlReader.position;
    this.mdlReader.seek(offset);

    let anim = new OdysseyModelAnimation();

    anim._position = new THREE.Vector3();
    anim._quaternion = new THREE.Quaternion();

    //GeometryHeader
    anim.p_func1 = this.mdlReader.readUInt32(); //4Byte Function pointer
    anim.p_func12 = this.mdlReader.readUInt32(); //4Byte Function pointer

    anim.name = this.mdlReader.readChars(32).replace(/\0[\s\S]*$/g,'');
    anim.RootNodeOffset = this.mdlReader.readUInt32();
    anim.NodeCount = this.mdlReader.readUInt32();

    this.mdlReader.movePointerForward(24); //Skip unknown array definitions

    anim.RefCount = this.mdlReader.readUInt32();
    anim.GeometryType = this.mdlReader.readByte(); //Model Type
    anim.Unknown4 = this.mdlReader.readBytes(3); //Padding

    //Animation
    anim.length = this.mdlReader.readSingle();
    anim.transition = this.mdlReader.readSingle();
    anim.ModelName = this.mdlReader.readChars(32).replace(/\0[\s\S]*$/g,'').toLowerCase();

    let _eventsDef = OdysseyModel.ReadArrayDefinition(this.mdlReader);
    //anim.events = OdysseyModel.ReadArrayFloats(this.mdlReader, this.fileHeader.ModelDataOffset + _eventsDef.offset, _eventsDef.count);
    anim.events = new Array(_eventsDef.count);
    this.mdlReader.movePointerForward(4); //Unknown uint32

    let events_pos = this.mdlReader.position;

    if (_eventsDef.count > 0) {
      this.mdlReader.seek(this.fileHeader.ModelDataOffset + _eventsDef.offset);
      for (let i = 0; i < _eventsDef.count; i++) {
        anim.events[i] = { 
          length: this.mdlReader.readSingle(), 
          name: this.mdlReader.readChars(32).replace(/\0[\s\S]*$/g,'') 
        };
      }
    }

    //this.mdlReader.seek(events_pos);

    //Animation Node
    anim.nodes = [];
    anim.rootNode = this.ReadAnimationNode(anim, this.fileHeader.ModelDataOffset + anim.RootNodeOffset);
    

    anim.currentFrame = 0;
    anim.elapsed = 0;
    anim.lastTime = 0;

    this.animations.push(anim);
    this.mdlReader.seek(pos);

    return anim;
  }

  ReadAnimationNode(anim: OdysseyModelAnimation, offset: number){
    let pos = this.mdlReader.position;
    this.mdlReader.seek(offset);

    let node = new OdysseyModelAnimationNode(anim);
    node.readBinary(this);
    anim.nodes.push(node);

    //Child Animation Nodes
    let len = node.childOffsets.length;
    for (let i = 0; i < len; i++) {
      this.ReadAnimationNode(anim, this.fileHeader.ModelDataOffset + node.childOffsets[i] )
    }

    this.mdlReader.seek(pos);
    return node;
  }

  static ReadArray(stream: BinaryReader, offset: number, count: number){
    let posCache = stream.position;
    stream.position = offset;

    let values = [];
    for (let i = 0; i < count; i++) {
      values[i] = stream.readUInt32();
    }

    stream.position = posCache;
    return values;
  }

  static ReadArrayFloats(stream: BinaryReader, offset: number, count: number){
    let posCache = stream.position;
    stream.position = offset;

    let values = [];
    for (let i = 0; i < count; i++) {
      values[i] = stream.readSingle();
    }

    stream.position = posCache;
    return values;
  }

  //Gets the Array Offset & Length
  static ReadArrayDefinition(stream: BinaryReader){
    return {
      offset: stream.readUInt32(), 
      count: stream.readUInt32(), 
      count2: stream.readUInt32()
    };
  }

  static readStrings(stream: BinaryReader, offsets: number[], offset: number) {
    let posCache = stream.position;
    let strings = [];

    for (let i = 0; i < offsets.length; i++){
      stream.position = offset + offsets[i];

      let str = "";
      let char;

      while ((char = stream.readChar()).charCodeAt(0) != 0)
        str = str + char;

      strings[i] = str;
    }

    stream.position = posCache;
    return strings;
  }

}
