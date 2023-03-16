/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { BinaryReader } from "../BinaryReader";
import { OdysseyModelEngine } from "../enums/odyssey/OdysseyModelEngine";
import { OdysseyModelNodeType } from "../enums/odyssey/OdysseyModelNodeType";
import { 
  OdysseyModelAnimation, OdysseyModelAnimationNode, OdysseyModelNode, OdysseyModelNodeAABB, OdysseyModelNodeDangly,
  OdysseyModelNodeEmitter, OdysseyModelNodeLight, OdysseyModelNodeMesh, OdysseyModelNodeReference, OdysseyModelNodeSaber, OdysseyModelNodeSkin 
} from ".";
import { OdysseyArrayDefinition } from "../interface/odyssey/OdysseyArrayDefinition";
import { OdysseyFileHeader } from "../interface/odyssey/OdysseyFileHeader";
import { OdysseyGeometryHeader } from "../interface/odyssey/OdysseyGeometryHeader";
import { OdysseyModelHeader } from "../interface/odyssey/OdysseyModelHeader";
import * as THREE from 'three';
import { BinaryWriter } from "../BinaryWriter";

/* @file
 * The OdysseyModel class takes an MDL & MDX file and decode the values to later be passed to a 
 * OdysseyModel3D class to be converted into an object that can be added to the scene graph.
 */

export class OdysseyModel {
  mdlReader: BinaryReader;
  mdxReader: BinaryReader;

  fileHeader: OdysseyFileHeader = {} as OdysseyFileHeader;
  geometryHeader: OdysseyGeometryHeader = {} as OdysseyGeometryHeader;
  modelHeader: OdysseyModelHeader = {} as OdysseyModelHeader;

  animations: OdysseyModelAnimation[] = [];
  rootNode: OdysseyModelNode;
  engine: OdysseyModelEngine;

  names: string[];
  nodes: Map<string, OdysseyModelNode> = new Map();

  namesArrayDefinition: OdysseyArrayDefinition;
  nameOffsetsArray: number[] = [];
  
  constructor( mdlReader: BinaryReader, mdxReader: BinaryReader ){

    this.mdlReader = mdlReader;
    this.mdxReader = mdxReader;

    this.fileHeader.flagBinary = this.mdlReader.readUInt32();

    if (this.fileHeader.flagBinary != 0){
      throw ("KotOR binary model not presented");
    }

    this.fileHeader.mdlDataSize = this.mdlReader.readUInt32();
    this.fileHeader.mdxDataSize = this.mdlReader.readUInt32();

    this.fileHeader.modelDataOffset = 12;
    this.fileHeader.rawDataOffset = this.fileHeader.modelDataOffset + this.fileHeader.mdlDataSize;

    /*
     * Geometry Header
     */

    this.geometryHeader.functionPointer0 = this.mdlReader.readUInt32(); //4Byte Function pointer
    this.geometryHeader.functionPointer1 = this.mdlReader.readUInt32(); //4Byte Function pointer

    //Thanks bead-v :)
    //Use FunctionPointer0 in the geometry header to determine the engine version the model was prepared for.
    switch(this.geometryHeader.functionPointer0){
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

    this.geometryHeader.modelName = this.mdlReader.readChars(32).replace(/\0[\s\S]*$/g,'');
    this.geometryHeader.rootNodeOffset = this.mdlReader.readUInt32();
    this.geometryHeader.nodeCount = this.mdlReader.readUInt32();

    this.geometryHeader.unknown1ArrayDefinition = OdysseyModel.ReadArrayDefinition(mdlReader);
    this.geometryHeader.unknown2ArrayDefinition = OdysseyModel.ReadArrayDefinition(mdlReader);

    this.geometryHeader.refCount = this.mdlReader.readUInt32();
    this.geometryHeader.geometryType = this.mdlReader.readByte(); //Model Type
    this.geometryHeader.unknown4 = this.mdlReader.readBytes(3); //Padding

    /*
     * Model Header
     */
    
    this.modelHeader.classification = this.mdlReader.readByte();
    this.modelHeader.subClassification = this.mdlReader.readByte();
    this.modelHeader.smoothing = !!this.mdlReader.readByte(); //Unknown
    this.modelHeader.fogged = !!this.mdlReader.readByte();
    this.modelHeader.childModelCount = this.mdlReader.readUInt32(); //Unkown

    this.modelHeader.animationArrayDefinition = OdysseyModel.ReadArrayDefinition(mdlReader);

    this.modelHeader.parentModelPointer = this.mdlReader.readUInt32(); // Parent model pointer

    this.modelHeader.boundingMinX = this.mdlReader.readSingle();
    this.modelHeader.boundingMinY = this.mdlReader.readSingle();
    this.modelHeader.boundingMinZ = this.mdlReader.readSingle();
    this.modelHeader.boundingMaxX = this.mdlReader.readSingle();
    this.modelHeader.boundingMaxY = this.mdlReader.readSingle();
    this.modelHeader.boundingMaxZ = this.mdlReader.readSingle();
    this.modelHeader.radius = this.mdlReader.readSingle();
    this.modelHeader.scale = this.mdlReader.readSingle();
    this.mdlReader.seek(148);
    this.modelHeader.superModelName = this.mdlReader.readChars(32).replace(/\0[\s\S]*$/g,'');
    
    /*
     * Names Array Header
     */

    this.geometryHeader.rootNodeOffset2 = this.mdlReader.readUInt32();
    this.geometryHeader.padding = this.mdlReader.readUInt32();
    this.geometryHeader.mdxLength = this.mdlReader.readUInt32();
    this.geometryHeader.mdxOffset = this.mdlReader.readUInt32();

    this.namesArrayDefinition = OdysseyModel.ReadArrayDefinition(this.mdlReader);
    this.nameOffsetsArray = OdysseyModel.ReadArray(this.mdlReader, this.fileHeader.modelDataOffset + this.namesArrayDefinition.offset, this.namesArrayDefinition.count);

    this.names = OdysseyModel.ReadStrings(this.mdlReader, this.nameOffsetsArray, this.fileHeader.modelDataOffset);
    for(let i = 0, namesLen = this.names.length; i < namesLen; i++){
      this.names[i] = this.names[i].replace(/\0[\s\S]*$/g,'').toLowerCase();
    }

    /*
     * Nodes
     */

    this.rootNode = this.readNode( this.geometryHeader.rootNodeOffset );

    /*
     * Animations
     */

    let animOffsets = OdysseyModel.ReadArray(mdlReader, this.fileHeader.modelDataOffset + this.modelHeader.animationArrayDefinition.offset, this.modelHeader.animationArrayDefinition.count);
    for (let i = 0; i < this.modelHeader.animationArrayDefinition.count; i++){
      this.readAnimation( this.fileHeader.modelDataOffset + animOffsets[i] );
    }

    this.mdlReader.dispose();
    this.mdxReader.dispose();

  }

  readNode(offset: number, parent = this.rootNode){

    this.mdlReader.position = this.fileHeader.modelDataOffset + offset;  
    let node: OdysseyModelNode;

    //Read the node type so we can know what type of node we are dealing with
    const NodeType = this.mdlReader.readUInt16();
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
        node.add( this.readNode(node.childOffsets[i], node ) );
      }
  
      return node;
    }else{
      console.error('OdysseyModel.ReadNode', 'Unhandled Node', NodeType);
    }

    return node;
  }

  readAnimation(offset: number){
    let pos = this.mdlReader.position;
    this.mdlReader.seek(offset);

    let anim = new OdysseyModelAnimation();
    anim.readBinary(this);

    this.animations.push(anim);
    this.mdlReader.seek(pos);

    return anim;
  }

  static ReadArray(stream: BinaryReader, offset: number, count: number){
    let posCache = stream.position;
    stream.position = offset;

    let values: number[] = new Array(count);
    for (let i = 0; i < count; i++) {
      values[i] = stream.readUInt32();
    }

    stream.position = posCache;
    return values;
  }

  static ReadArrayFloats(stream: BinaryReader, offset: number, count: number){
    let posCache = stream.position;
    stream.position = offset;

    let values: number[] = new Array(count);
    for (let i = 0; i < count; i++) {
      values[i] = stream.readSingle();
    }

    stream.position = posCache;
    return values;
  }

  //Gets the Array Offset & Length
  static ReadArrayDefinition(stream: BinaryReader): OdysseyArrayDefinition {
    return {
      offset: stream.readUInt32() & 0xFFFFFFFF, 
      count: stream.readUInt32() & 0xFFFFFFFF, 
      count2: stream.readUInt32() & 0xFFFFFFFF
    };
  }

  static ReadStrings(stream: BinaryReader, offsets: number[], offset: number) {
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
