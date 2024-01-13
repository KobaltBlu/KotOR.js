import * as THREE from "three";
import { OdysseyModelNodeType } from "../enums/odyssey/OdysseyModelNodeType";
import { IOdysseyArrayDefinition } from "../interface/odyssey/IOdysseyArrayDefinition";
import { OdysseyModelNodeMesh } from "./OdysseyModelNodeMesh";
import type { OdysseyModelNode } from "./OdysseyModelNode";
import type { OdysseyModel } from "./OdysseyModel";
import { OdysseyModelUtility } from "./OdysseyModelUtility";

/**
 * OdysseyModelNodeSkin class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModelNodeSkin.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
 export class OdysseyModelNodeSkin extends OdysseyModelNodeMesh {
  weights_def: IOdysseyArrayDefinition;
  MDXBoneWeightOffset: number;
  MDXBoneIndexOffset: number;
  boneMapOffset: number;
  boneMapCount: number;
  boneQuaternionDefinition: IOdysseyArrayDefinition;
  bonePositionDefinition: IOdysseyArrayDefinition;
  boneConstantsDefinition: IOdysseyArrayDefinition;
  bone_parts: number[];
  weights: number[];
  boneIdx: number[];
  bone_mapping: number[];
  bone_constants: number[];
  bone_quaternions: THREE.Quaternion[];
  bone_translations: THREE.Vector3[];
  bone_inverse_matrix: THREE.Matrix4[];

  constructor(parent: OdysseyModelNode){
    super(parent);
    this.type |= OdysseyModelNodeType.Skin;
  }

  readBinary(odysseyModel: OdysseyModel){
    super.readBinary(odysseyModel);

    this.weights_def = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader);

    this.MDXBoneWeightOffset = this.odysseyModel.mdlReader.readUInt32();
    this.MDXBoneIndexOffset = this.odysseyModel.mdlReader.readUInt32();
    this.boneMapOffset = this.odysseyModel.mdlReader.readUInt32();
    this.boneMapCount = this.odysseyModel.mdlReader.readUInt32();

    this.boneQuaternionDefinition = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader);
    this.bonePositionDefinition = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader);
    this.boneConstantsDefinition = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader);

    this.bone_parts = [];

    //Models appear have up to 17 bones. Not sure if this is the limit or just the known max used.
    //Example: c_ithorian.mdl uses 17 bones, while most other models use 16
    for(let i = 0; i < 17; i++){
      this.bone_parts[i] = this.odysseyModel.mdlReader.readUInt16();
    }

    this.weights = [];
    this.boneIdx = [];
    this.bone_mapping = [];
    this.bone_constants = [];
    this.bone_quaternions = [];
    this.bone_translations = [];
    this.bone_inverse_matrix = [];

    for (let i = 0; i < this.verticesCount; i++) {
      // Seek To Weights
      this.odysseyModel.mdxReader.position = (this.MDXNodeDataOffset + (i * this.MDXDataSize)) + this.MDXBoneWeightOffset;
      this.weights.push(
        this.odysseyModel.mdxReader.readSingle(),
        this.odysseyModel.mdxReader.readSingle(),
        this.odysseyModel.mdxReader.readSingle(),
        this.odysseyModel.mdxReader.readSingle()
      );

      // Seek To Bone Indexes
      this.odysseyModel.mdxReader.position = (this.MDXNodeDataOffset + (i * this.MDXDataSize)) + this.MDXBoneIndexOffset;
      this.boneIdx.push(
        this.odysseyModel.mdxReader.readSingle(),
        this.odysseyModel.mdxReader.readSingle(),
        this.odysseyModel.mdxReader.readSingle(),
        this.odysseyModel.mdxReader.readSingle()
      );
    }

    if (this.boneMapCount > 0) {
      this.odysseyModel.mdlReader.seek(this.odysseyModel.fileHeader.modelDataOffset + this.boneMapOffset);
      for(let i = 0; i < this.boneMapCount; i++){
        this.bone_mapping[i] = this.odysseyModel.mdlReader.readSingle();
      }
    

      //Inverse Bone Quaternions
      if (this.boneQuaternionDefinition.count > 0) {
        this.odysseyModel.mdlReader.seek(this.odysseyModel.fileHeader.modelDataOffset + this.boneQuaternionDefinition.offset);
        for(let i = 0; i < this.boneQuaternionDefinition.count; i++){
          let w = this.odysseyModel.mdlReader.readSingle();
          this.bone_quaternions[i] = new THREE.Quaternion(this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle(), w);
        }
      }

      //Inverse Bone Translations
      if (this.bonePositionDefinition.count > 0) {
        this.odysseyModel.mdlReader.seek(this.odysseyModel.fileHeader.modelDataOffset + this.bonePositionDefinition.offset);
        for(let i = 0; i < this.bonePositionDefinition.count; i++){
          this.bone_translations[i] = new THREE.Vector3(this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle());
        }
      }

      //Unused Array of Bytes
      if (this.boneConstantsDefinition.count > 0) {
        this.odysseyModel.mdlReader.seek(this.odysseyModel.fileHeader.modelDataOffset + this.boneConstantsDefinition.offset);
        for(let i = 0; i < this.boneConstantsDefinition.count; i++){
          this.bone_constants[i] = this.odysseyModel.mdlReader.readByte();
        }
      }

      //Rebuild the inverse bone matrix from the QBone and TBone values
      if (this.bonePositionDefinition.count > 0) {
        for(let i = 0; i < this.bonePositionDefinition.count; i++){
          this.bone_inverse_matrix[i] = new THREE.Matrix4();
          this.bone_inverse_matrix[i].compose( this.bone_translations[i], this.bone_quaternions[i], new THREE.Vector3(1, 1, 1) );
        }
      }
    }

  }

}
