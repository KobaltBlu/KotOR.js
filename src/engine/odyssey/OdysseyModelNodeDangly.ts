import { OdysseyModelNodeType } from "@core/enums/odyssey/OdysseyModelNodeType";
import { IOdysseyArrayDefinition } from "@core/interface/odyssey/IOdysseyArrayDefinition";
import type { OdysseyModel } from "@engine/odyssey/OdysseyModel";
import type { OdysseyModelNode } from "@engine/odyssey/OdysseyModelNode";
import { OdysseyModelNodeMesh } from "@engine/odyssey/OdysseyModelNodeMesh";
import { OdysseyModelUtility } from "@engine/odyssey/OdysseyModelUtility";

/**
 * OdysseyModelNodeDangly class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModelNodeDangly.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyModelNodeDangly extends OdysseyModelNodeMesh {
  danglyDisplacement: number;
  danglyTightness: number;
  danglyPeriod: number;
  danglyMDLOffset: number;
  constraints: Float32Array;
  danglyVec4: number[];
  contraintArrayDefinition: IOdysseyArrayDefinition;

  constructor(parent: OdysseyModelNode){
    super(parent);
    this.type |= OdysseyModelNodeType.Dangly;
  }

  readBinary(odysseyModel: OdysseyModel){
    super.readBinary(odysseyModel);

    this.contraintArrayDefinition = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader);

    this.danglyDisplacement = this.odysseyModel.mdlReader.readSingle();
    this.danglyTightness = this.odysseyModel.mdlReader.readSingle();
    this.danglyPeriod = this.odysseyModel.mdlReader.readSingle();

    this.danglyMDLOffset = this.odysseyModel.mdlReader.readUInt32();
    
    this.constraints = OdysseyModelUtility.ReadArrayFloats(this.odysseyModel.mdlReader, this.odysseyModel.fileHeader.modelDataOffset + this.contraintArrayDefinition.offset, this.contraintArrayDefinition.count);
    this.odysseyModel.mdlReader.seek(this.odysseyModel.fileHeader.modelDataOffset + this.danglyMDLOffset);
    this.danglyVec4 = [];
    for(let i = 0; i < this.contraintArrayDefinition.count; i++){
      this.danglyVec4.push(
        this.odysseyModel.mdlReader.readSingle(), 
        this.odysseyModel.mdlReader.readSingle(), 
        this.odysseyModel.mdlReader.readSingle(), 
        this.constraints[i]
      );
    }

  }

}
