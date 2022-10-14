/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as THREE from "three";
import { OdysseyModel, OdysseyModelNode, OdysseyModelNodeMesh } from ".";
import { OdysseyModelNodeType } from "../interface/odyssey/OdysseyModelNodeType";

/* @file
 * The OdysseyModelNodeDangly
 */

export class OdysseyModelNodeDangly extends OdysseyModelNodeMesh {
  danglyDisplacement: number;
  danglyTightness: number;
  danglyPeriod: number;
  danglyMDLOffset: number;
  constraints: number[];
  danglyVec4: number[];

  constructor(parent: OdysseyModelNode){
    super(parent);
    this.type |= OdysseyModelNodeType.Dangly;
  }

  readBinary(odysseyModel: OdysseyModel){
    super.readBinary(odysseyModel);

    let contraintArray = OdysseyModel.ReadArrayDefinition(this.odysseyModel.mdlReader);

    this.danglyDisplacement = this.odysseyModel.mdlReader.ReadSingle();
    this.danglyTightness = this.odysseyModel.mdlReader.ReadSingle();
    this.danglyPeriod = this.odysseyModel.mdlReader.ReadSingle();

    this.danglyMDLOffset = this.odysseyModel.mdlReader.ReadUInt32();
    
    this.constraints = OdysseyModel.ReadArrayFloats(this.odysseyModel.mdlReader, this.odysseyModel.fileHeader.ModelDataOffset + contraintArray.offset, contraintArray.count);
    this.odysseyModel.mdlReader.Seek(this.odysseyModel.fileHeader.ModelDataOffset + this.danglyMDLOffset);
    this.danglyVec4 = new Array(contraintArray.count);
    for(let i = 0; i < contraintArray.count; i++){
      this.danglyVec4.push(
        this.odysseyModel.mdlReader.ReadSingle(), 
        this.odysseyModel.mdlReader.ReadSingle(), 
        this.odysseyModel.mdlReader.ReadSingle(), 
        this.constraints[i]
      );
    }

  }

}
