import { BinaryReader } from "@core/binary/BinaryReader";
import { OdysseyModelEngine } from "@core/enums/odyssey/OdysseyModelEngine";
import type { OdysseyModel } from "@engine/odyssey/OdysseyModel";
import { OdysseyModelAnimation } from "@engine/odyssey/OdysseyModelAnimation";
import { OdysseyModelFactory } from "@engine/odyssey/OdysseyModelFactory";
import type { OdysseyModelNode } from "@engine/odyssey/OdysseyModelNode";
import { OdysseyModelUtility } from "@engine/odyssey/OdysseyModelUtility";
import {
  MDL_FN_PTR_K1_PC,
  MDL_FN_PTR_K1_XBOX,
  MDL_FN_PTR_K2_PC,
  MDL_FN_PTR_K2_XBOX,
} from "@engine/odyssey/binary/OdysseyModelBinaryLayout";

const mdlStringCleaner = (str: string = ''): string => {
  const cleaned = str.replace(/\0[\s\S]*$/g,'').toLowerCase().trim();
  return cleaned != 'null' ? cleaned : '';
};

export type OdysseyModelBinaryReadOptions = {
  preserveSourceBinary?: boolean;
};

/**
 * Populates an {@link OdysseyModel} from MDL/MDX binary readers.
 * Keeps header / name-table / node-tree / animation ingest out of the model class.
 */
export class OdysseyModelBinaryReader {

  static readInto(
    model: OdysseyModel,
    mdlReader: BinaryReader,
    mdxReader: BinaryReader,
    options?: OdysseyModelBinaryReadOptions,
  ): OdysseyModel {
    if (options?.preserveSourceBinary) {
      model.sourceMdl = mdlReader.buffer.slice(
        mdlReader.buffer.byteOffset,
        mdlReader.buffer.byteOffset + mdlReader.buffer.byteLength,
      );
      if (mdxReader?.buffer?.byteLength) {
        model.sourceMdx = mdxReader.buffer.slice(
          mdxReader.buffer.byteOffset,
          mdxReader.buffer.byteOffset + mdxReader.buffer.byteLength,
        );
      }
    }

    model.mdlReader = mdlReader;
    model.mdxReader = mdxReader;

    model.fileHeader.flagBinary = model.mdlReader.readUInt32();

    if (model.fileHeader.flagBinary != 0){
      throw ("KotOR binary model not presented");
    }

    model.fileHeader.mdlDataSize = model.mdlReader.readUInt32();
    model.fileHeader.mdxDataSize = model.mdlReader.readUInt32();

    model.fileHeader.modelDataOffset = 12;
    model.fileHeader.rawDataOffset = model.fileHeader.modelDataOffset + model.fileHeader.mdlDataSize;

    /*
     * Geometry Header
     */

    model.geometryHeader.functionPointer0 = model.mdlReader.readUInt32();
    model.geometryHeader.functionPointer1 = model.mdlReader.readUInt32();

    // Engine version from geometry function pointer 0 (observable across retail builds).
    switch(model.geometryHeader.functionPointer0){
      case MDL_FN_PTR_K1_PC:
        model.engine = OdysseyModelEngine.K1;
      break;
      case MDL_FN_PTR_K2_PC:
        model.engine = OdysseyModelEngine.K2;
      break;
      case MDL_FN_PTR_K1_XBOX:
        model.engine = OdysseyModelEngine.K1_XBOX;
      break;
      case MDL_FN_PTR_K2_XBOX:
        model.engine = OdysseyModelEngine.K2_XBOX;
      break;
    }

    model.geometryHeader.modelName = mdlStringCleaner(model.mdlReader.readChars(32));
    model.geometryHeader.rootNodeOffset = model.mdlReader.readUInt32();
    model.geometryHeader.nodeCount = model.mdlReader.readUInt32();

    model.geometryHeader.unknown1ArrayDefinition = OdysseyModelUtility.ReadArrayDefinition(mdlReader);
    model.geometryHeader.unknown2ArrayDefinition = OdysseyModelUtility.ReadArrayDefinition(mdlReader);

    model.geometryHeader.refCount = model.mdlReader.readUInt32();
    model.geometryHeader.geometryType = model.mdlReader.readByte();
    model.geometryHeader.unknown4 = model.mdlReader.readBytes(3);

    /*
     * Model Header
     */

    model.modelHeader.classification = model.mdlReader.readByte();
    model.modelHeader.subClassification = model.mdlReader.readByte();
    const smoothingByte = model.mdlReader.readByte();
    model.modelHeader.smoothing = !!smoothingByte;
    model.modelHeader.smoothingGroupsInFile = smoothingByte === 1;
    model.modelHeader.fogged = !!model.mdlReader.readByte();
    model.modelHeader.childModelCount = model.mdlReader.readUInt32();

    model.modelHeader.animationArrayDefinition = OdysseyModelUtility.ReadArrayDefinition(mdlReader);

    model.modelHeader.parentModelPointer = model.mdlReader.readUInt32();

    model.modelHeader.boundingMinX = model.mdlReader.readSingle();
    model.modelHeader.boundingMinY = model.mdlReader.readSingle();
    model.modelHeader.boundingMinZ = model.mdlReader.readSingle();
    model.modelHeader.boundingMaxX = model.mdlReader.readSingle();
    model.modelHeader.boundingMaxY = model.mdlReader.readSingle();
    model.modelHeader.boundingMaxZ = model.mdlReader.readSingle();
    model.modelHeader.radius = model.mdlReader.readSingle();
    model.modelHeader.scale = model.mdlReader.readSingle();
    model.modelHeader.superModelName = mdlStringCleaner(model.mdlReader.readChars(32));

    model.modelHeader.animRootOffset = model.mdlReader.readUInt32();
    model.modelHeader.headerPaddingAC = model.mdlReader.readUInt32();
    model.modelHeader.mdxSize = model.mdlReader.readUInt32();
    model.modelHeader.mdxOffset = model.mdlReader.readUInt32();

    /*
     * Names Array Header
     */

    model.namesArrayDefinition = OdysseyModelUtility.ReadArrayDefinition(model.mdlReader);
    model.nameOffsetsArray = OdysseyModelUtility.ReadArrayUInt32s(
      model.mdlReader,
      model.fileHeader.modelDataOffset + model.namesArrayDefinition.offset,
      model.namesArrayDefinition.count,
    );

    model.names = OdysseyModelUtility.ReadStrings(model.mdlReader, model.nameOffsetsArray, model.fileHeader.modelDataOffset);
    for(let i = 0, namesLen = model.names.length; i < namesLen; i++){
      model.names[i] = mdlStringCleaner(model.names[i]);
    }

    /*
     * Nodes
     */

    model.rootNode = OdysseyModelBinaryReader.readNode(model, model.geometryHeader.rootNodeOffset);

    /*
     * Animations
     */

    const animOffsets = OdysseyModelUtility.ReadArrayUInt32s(
      mdlReader,
      model.fileHeader.modelDataOffset + model.modelHeader.animationArrayDefinition.offset,
      model.modelHeader.animationArrayDefinition.count,
    );
    for (let i = 0; i < model.modelHeader.animationArrayDefinition.count; i++){
      OdysseyModelBinaryReader.readAnimation(model, model.fileHeader.modelDataOffset + animOffsets[i]);
    }

    model.mdlReader.dispose();
    model.mdxReader.dispose();

    return model;
  }

  static readNode(model: OdysseyModel, offset: number, parent: OdysseyModelNode = model.rootNode): OdysseyModelNode {
    model.mdlReader.position = model.fileHeader.modelDataOffset + offset;

    const node = OdysseyModelFactory.ReadNode(parent, model.mdlReader);
    node.isRootNode = !parent;

    if(node){
      node.readBinary(model);
      node.odysseyModel = undefined;

      for(let i = 0, len = node.childOffsets.length; i < len; i++){
        node.add( OdysseyModelBinaryReader.readNode(model, node.childOffsets[i], node ) );
      }

      return node;
    }else{
      console.error('OdysseyModelBinaryReader.readNode', 'Unhandled Node', (node as OdysseyModelNode)?.nodeType);
    }

    return node;
  }

  static readAnimation(model: OdysseyModel, offset: number): OdysseyModelAnimation {
    const pos = model.mdlReader.position;
    model.mdlReader.seek(offset);

    const anim = new OdysseyModelAnimation();
    anim.readBinary(model);

    model.animations.push(anim);
    model.mdlReader.seek(pos);

    return anim;
  }

}
