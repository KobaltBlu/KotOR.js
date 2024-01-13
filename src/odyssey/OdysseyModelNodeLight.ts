import * as THREE from "three";
import { IOdysseyModelFlare } from "../interface/odyssey/IOdysseyModelFlare";
import { OdysseyModelNodeType } from "../enums/odyssey/OdysseyModelNodeType";
import { IOdysseyArrayDefinition } from "../interface/odyssey/IOdysseyArrayDefinition";
import { OdysseyModelNode } from "./OdysseyModelNode";
import type { OdysseyModel } from "./OdysseyModel";
import { OdysseyModelUtility } from "./OdysseyModelUtility";

/**
 * OdysseyModelNodeLight class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModelNodeLight.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyModelNodeLight extends OdysseyModelNode {
  lightPriority: number;
  ambientFlag: number;
  dynamicFlag: number;
  affectDynamicFlag: number;
  shadowFlag: number;
  generateFlareFlag: number;
  fadingLightFlag: number;
  flare: IOdysseyModelFlare = {
    radius: 0,
    sizes: [],
    positions: [],
    colorShifts: [],
    textures: []
  };
  color: THREE.Color;
  radius: number = 1;
  intensity: number = 1;
  multiplier: number = 1;
  // light: THREE.Light;

  flareSizesArrayDefinition: IOdysseyArrayDefinition;
  flarePositionsArrayDefinition: IOdysseyArrayDefinition;
  flareColorShiftsArrayDefinition: IOdysseyArrayDefinition;
  flareTexturesArrayDefinition: IOdysseyArrayDefinition;

  constructor(parent: OdysseyModelNode){
    super(parent);
    this.type |= OdysseyModelNodeType.Light;
  }

  readBinary(odysseyModel: OdysseyModel){
    super.readBinary(odysseyModel);

    this.flare.radius = this.odysseyModel.mdlReader.readSingle();

    this.odysseyModel.mdlReader.skip(0x0C); //Unknown UInt32 array

    this.flareSizesArrayDefinition = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader);
    this.flarePositionsArrayDefinition = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader);
    this.flareColorShiftsArrayDefinition = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader);
    this.flareTexturesArrayDefinition = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader);

    this.lightPriority = this.odysseyModel.mdlReader.readUInt32();
    this.ambientFlag = this.odysseyModel.mdlReader.readUInt32(); //Flag
    this.dynamicFlag = this.odysseyModel.mdlReader.readUInt32();
    this.affectDynamicFlag = this.odysseyModel.mdlReader.readUInt32();
    this.shadowFlag = this.odysseyModel.mdlReader.readUInt32();
    this.generateFlareFlag = this.odysseyModel.mdlReader.readUInt32();
    this.fadingLightFlag = this.odysseyModel.mdlReader.readUInt32();

    if(this.flareTexturesArrayDefinition.count){
      //FlareTextures are stored as follows offset1,offset2,string1,string2
      for(let i = 0; i < this.flareTexturesArrayDefinition.count; i++){
        //Seek to the location of the textures offset value
        this.odysseyModel.mdlReader.seek(this.odysseyModel.fileHeader.modelDataOffset + this.flareTexturesArrayDefinition.offset + (4*i));
        //Read out the offset value
        let stringOffset = this.odysseyModel.mdlReader.readUInt32();
        //Seek the reader to where the beginning of the flare texture name should be located
        this.odysseyModel.mdlReader.seek(this.odysseyModel.fileHeader.modelDataOffset + stringOffset);
        //Read the string and push it to the textures array
        this.flare.textures.push(this.odysseyModel.mdlReader.readString().replace(/\0[\s\S]*$/g,'').trim().toLowerCase());
      }
    }

    if(this.flareSizesArrayDefinition.count){
      this.odysseyModel.mdlReader.seek(this.odysseyModel.fileHeader.modelDataOffset + this.flareSizesArrayDefinition.offset);
      for(let i = 0; i < this.flareSizesArrayDefinition.count; i++){
        this.flare.sizes.push(this.odysseyModel.mdlReader.readSingle())
      }
    }

    if(this.flarePositionsArrayDefinition.count){
      this.odysseyModel.mdlReader.seek(this.odysseyModel.fileHeader.modelDataOffset + this.flarePositionsArrayDefinition.offset);
      for(let i = 0; i < this.flarePositionsArrayDefinition.count; i++){
        this.flare.positions.push(this.odysseyModel.mdlReader.readSingle())
      }
    }

    if(this.flareColorShiftsArrayDefinition.count){
      this.odysseyModel.mdlReader.seek(this.odysseyModel.fileHeader.modelDataOffset + this.flareColorShiftsArrayDefinition.offset);
      for(let i = 0; i < this.flareColorShiftsArrayDefinition.count; i++){
        this.flare.colorShifts.push(
          new THREE.Color(
            this.odysseyModel.mdlReader.readSingle(), 
            this.odysseyModel.mdlReader.readSingle(), 
            this.odysseyModel.mdlReader.readSingle()
          )
        );
      }
    }

  }

}
