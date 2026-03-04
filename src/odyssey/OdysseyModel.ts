import { OdysseyModelEngine } from "@/enums/odyssey/OdysseyModelEngine";
import { OdysseyModelNodeType } from "@/enums/odyssey/OdysseyModelNodeType";
import { IOdysseyArrayDefinition } from "@/interface/odyssey/IOdysseyArrayDefinition";
import { IOdysseyFileHeader } from "@/interface/odyssey/IOdysseyFileHeader";
import { IOdysseyGeometryHeader } from "@/interface/odyssey/IOdysseyGeometryHeader";
import { IOdysseyModelHeader } from "@/interface/odyssey/IOdysseyModelHeader";
import { OdysseyModelAnimation } from "@/odyssey/OdysseyModelAnimation";
import { OdysseyModelFactory } from "@/odyssey/OdysseyModelFactory";
import { OdysseyModelNode } from "@/odyssey/OdysseyModelNode";


const log = createScopedLogger(LogScope.Loader);
import { OdysseyModelUtility } from "@/odyssey/OdysseyModelUtility";
import { BinaryReader } from "@/utility/binary/BinaryReader";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const mdlStringCleaner = (str: string = ''): string => {
  const cleaned = str.replace(/\0[\s\S]*$/g,'').toLowerCase().trim();
  return cleaned != 'null' ? cleaned : '';
};

/**
 * OdysseyModel class.
 * 
 * The OdysseyModel class takes an MDL & MDX file and decode the values to later be passed to a 
 * OdysseyModel3D class to be converted into an object that can be added to the scene graph.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModel.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyModel {

  mdlReader: BinaryReader;
  mdxReader: BinaryReader;

  fileHeader: IOdysseyFileHeader = {} as IOdysseyFileHeader;
  geometryHeader: IOdysseyGeometryHeader = {} as IOdysseyGeometryHeader;
  modelHeader: IOdysseyModelHeader = {} as IOdysseyModelHeader;

  animations: OdysseyModelAnimation[] = [];
  rootNode: OdysseyModelNode;
  engine: OdysseyModelEngine;

  names: string[];
  nodes: Map<string, OdysseyModelNode> = new Map();

  namesArrayDefinition: IOdysseyArrayDefinition;
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

    this.geometryHeader.modelName = mdlStringCleaner(this.mdlReader.readChars(32));
    this.geometryHeader.rootNodeOffset = this.mdlReader.readUInt32();
    this.geometryHeader.nodeCount = this.mdlReader.readUInt32();

    this.geometryHeader.unknown1ArrayDefinition = OdysseyModelUtility.ReadArrayDefinition(mdlReader);
    this.geometryHeader.unknown2ArrayDefinition = OdysseyModelUtility.ReadArrayDefinition(mdlReader);

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

    this.modelHeader.animationArrayDefinition = OdysseyModelUtility.ReadArrayDefinition(mdlReader);

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
    this.modelHeader.superModelName = mdlStringCleaner(this.mdlReader.readChars(32));
    
    /*
     * Names Array Header
     */

    this.geometryHeader.rootNodeOffset2 = this.mdlReader.readUInt32();
    this.geometryHeader.padding = this.mdlReader.readUInt32();
    this.geometryHeader.mdxLength = this.mdlReader.readUInt32();
    this.geometryHeader.mdxOffset = this.mdlReader.readUInt32();

    this.namesArrayDefinition = OdysseyModelUtility.ReadArrayDefinition(this.mdlReader);
    this.nameOffsetsArray = OdysseyModelUtility.ReadArray(this.mdlReader, this.fileHeader.modelDataOffset + this.namesArrayDefinition.offset, this.namesArrayDefinition.count);

    this.names = OdysseyModelUtility.ReadStrings(this.mdlReader, this.nameOffsetsArray, this.fileHeader.modelDataOffset);
    for(let i = 0, namesLen = this.names.length; i < namesLen; i++){
      this.names[i] = mdlStringCleaner(this.names[i]);
    }

    /*
     * Nodes
     */

    this.rootNode = this.readNode( this.geometryHeader.rootNodeOffset );

    /*
     * Animations
     */

    const animOffsets = OdysseyModelUtility.ReadArray(mdlReader, this.fileHeader.modelDataOffset + this.modelHeader.animationArrayDefinition.offset, this.modelHeader.animationArrayDefinition.count);
    for (let i = 0; i < this.modelHeader.animationArrayDefinition.count; i++){
      this.readAnimation( this.fileHeader.modelDataOffset + animOffsets[i] );
    }

    this.mdlReader.dispose();
    this.mdxReader.dispose();

  }

  readNode(offset: number, parent = this.rootNode){

    this.mdlReader.position = this.fileHeader.modelDataOffset + offset;  
    // let node: OdysseyModelNode;

    const node = OdysseyModelFactory.ReadNode(parent, this.mdlReader);
    node.isRootNode = !parent;

    if(node){
      node.readBinary(this);
      node.odysseyModel = undefined;

      for(let i = 0, len = node.childOffsets.length; i < len; i++){
        node.add( this.readNode(node.childOffsets[i], node ) );
      }
  
      return node;
    }else{
      log.error('OdysseyModel.ReadNode', 'Unhandled Node', node.nodeType);
    }

    return node;
  }

  readAnimation(offset: number){
    const pos = this.mdlReader.position;
    this.mdlReader.seek(offset);

    const anim = new OdysseyModelAnimation();
    anim.readBinary(this);

    this.animations.push(anim);
    this.mdlReader.seek(pos);

    return anim;
  }

  getAnimationDummyNodeName(){
    return this.geometryHeader.modelName.trim().toLowerCase() + 'a';
  }

  static FromBuffers(mdl_buffer: Uint8Array, mdx_buffer: Uint8Array): OdysseyModel {
    const mdlReader = new BinaryReader(mdl_buffer);
    const mdxReader = new BinaryReader(mdx_buffer);
    return new OdysseyModel(mdlReader, mdxReader);
  }
}
