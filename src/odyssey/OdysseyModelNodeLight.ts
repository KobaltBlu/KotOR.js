/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as THREE from "three";
import { OdysseyModel, OdysseyModelNode } from ".";
import { OdysseyModelFlare } from "../interface/odyssey/OdysseyModelFlare";
import { OdysseyModelNodeType } from "../interface/odyssey/OdysseyModelNodeType";

/* @file
 * The OdysseyModelNodeLight
 */

export class OdysseyModelNodeLight extends OdysseyModelNode {
  LightPriority: number;
  AmbientFlag: number;
  DynamicFlag: number;
  AffectDynamicFlag: number;
  ShadowFlag: number;
  GenerateFlareFlag: number;
  FadingLightFlag: number;
  flare: OdysseyModelFlare;

  constructor(parent: OdysseyModelNode){
    super(parent);
    this.type |= OdysseyModelNodeType.Light;
  }

  readBinary(odysseyModel: OdysseyModel){
    super.readBinary(odysseyModel);

    let flareRadius = this.odysseyModel.mdlReader.ReadSingle();

    this.odysseyModel.mdlReader.Skip(0x0C); //Unknown UInt32 array

    let FlareSizes = OdysseyModel.ReadArrayDefinition(this.odysseyModel.mdlReader);
    let FlarePositions = OdysseyModel.ReadArrayDefinition(this.odysseyModel.mdlReader);
    let FlareColorShifts = OdysseyModel.ReadArrayDefinition(this.odysseyModel.mdlReader);
    let FlareTextures = OdysseyModel.ReadArrayDefinition(this.odysseyModel.mdlReader);

    this.LightPriority = this.odysseyModel.mdlReader.ReadUInt32();
    this.AmbientFlag = this.odysseyModel.mdlReader.ReadUInt32(); //Flag
    this.DynamicFlag = this.odysseyModel.mdlReader.ReadUInt32();
    this.AffectDynamicFlag = this.odysseyModel.mdlReader.ReadUInt32();
    this.ShadowFlag = this.odysseyModel.mdlReader.ReadUInt32();
    this.GenerateFlareFlag = this.odysseyModel.mdlReader.ReadUInt32();
    this.FadingLightFlag = this.odysseyModel.mdlReader.ReadUInt32();

    this.flare = {
      radius: flareRadius,
      sizes: [],
      positions: [],
      colorShifts: [],
      textures: []
    } as OdysseyModelFlare;

    if(FlareTextures.count){
      //FlareTextures are stored as follows offset1,offset2,string1,string2
      for(let i = 0; i < FlareTextures.count; i++){
        //Seek to the location of the textures offset value
        this.odysseyModel.mdlReader.Seek(this.odysseyModel.fileHeader.ModelDataOffset + FlareTextures.offset + (4*i));
        //Read out the offset value
        let stringOffset = this.odysseyModel.mdlReader.ReadUInt32();
        //Seek the reader to where the beginning of the flare texture name should be located
        this.odysseyModel.mdlReader.Seek(this.odysseyModel.fileHeader.ModelDataOffset + stringOffset);
        //Read the string and push it to the textures array
        this.flare.textures.push(this.odysseyModel.mdlReader.ReadString().replace(/\0[\s\S]*$/g,'').trim().toLowerCase());
      }
    }

    if(FlareSizes.count){
      this.odysseyModel.mdlReader.Seek(this.odysseyModel.fileHeader.ModelDataOffset + FlareSizes.offset);
      for(let i = 0; i < FlareSizes.count; i++){
        this.flare.sizes.push(this.odysseyModel.mdlReader.ReadSingle())
      }
    }

    if(FlarePositions.count){
      this.odysseyModel.mdlReader.Seek(this.odysseyModel.fileHeader.ModelDataOffset + FlarePositions.offset);
      for(let i = 0; i < FlarePositions.count; i++){
        this.flare.positions.push(this.odysseyModel.mdlReader.ReadSingle())
      }
    }

    if(FlareColorShifts.count){
      this.odysseyModel.mdlReader.Seek(this.odysseyModel.fileHeader.ModelDataOffset + FlareColorShifts.offset);
      for(let i = 0; i < FlareColorShifts.count; i++){
        this.flare.colorShifts.push(
          new THREE.Color(
            this.odysseyModel.mdlReader.ReadSingle(), 
            this.odysseyModel.mdlReader.ReadSingle(), 
            this.odysseyModel.mdlReader.ReadSingle()
          )
        );
      }
    }

  }

}