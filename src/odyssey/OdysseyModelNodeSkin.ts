/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as THREE from "three";
import { OdysseyModel, OdysseyModelNode, OdysseyModelNodeMesh } from ".";
import { OdysseyModelNodeType } from "../interface/odyssey/OdysseyModelNodeType";

/* @file
 * The OdysseyModelNodeSkin
 */

 export class OdysseyModelNodeSkin extends OdysseyModelNodeMesh {
  weights_def: { offset: number; count: number; count2: number; };
  MDXBoneWeightOffset: number;
  MDXBoneIndexOffset: number;
  BoneMapOffset: number;
  BoneMapCount: number;
  BoneQuaternionDef: { offset: number; count: number; count2: number; };
  BonePositionDef: { offset: number; count: number; count2: number; };
  BoneConstantsDef: { offset: number; count: number; count2: number; };
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

    this.weights_def = OdysseyModel.ReadArrayDefinition(this.odysseyModel.mdlReader);

    this.MDXBoneWeightOffset = this.odysseyModel.mdlReader.readUInt32();
    this.MDXBoneIndexOffset = this.odysseyModel.mdlReader.readUInt32();
    this.BoneMapOffset = this.odysseyModel.mdlReader.readUInt32();
    this.BoneMapCount = this.odysseyModel.mdlReader.readUInt32();

    this.BoneQuaternionDef = OdysseyModel.ReadArrayDefinition(this.odysseyModel.mdlReader);
    this.BonePositionDef = OdysseyModel.ReadArrayDefinition(this.odysseyModel.mdlReader);
    this.BoneConstantsDef = OdysseyModel.ReadArrayDefinition(this.odysseyModel.mdlReader);

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

    for (let i = 0; i < this.VerticiesCount; i++) {
      // Seek To Weights
      this.odysseyModel.mdxReader.position = (this._mdxNodeDataOffset + (i * this.MDXDataSize)) + this.MDXBoneWeightOffset;
      this.weights.push(
        this.odysseyModel.mdxReader.readSingle(),
        this.odysseyModel.mdxReader.readSingle(),
        this.odysseyModel.mdxReader.readSingle(),
        this.odysseyModel.mdxReader.readSingle()
      );

      // Seek To Bone Indexes
      this.odysseyModel.mdxReader.position = (this._mdxNodeDataOffset + (i * this.MDXDataSize)) + this.MDXBoneIndexOffset;
      this.boneIdx.push(
        this.odysseyModel.mdxReader.readSingle(),
        this.odysseyModel.mdxReader.readSingle(),
        this.odysseyModel.mdxReader.readSingle(),
        this.odysseyModel.mdxReader.readSingle()
      );
    }

    if (this.BoneMapCount > 0) {
      this.odysseyModel.mdlReader.seek(this.odysseyModel.fileHeader.ModelDataOffset + this.BoneMapOffset);
      for(let i = 0; i < this.BoneMapCount; i++){
        this.bone_mapping[i] = this.odysseyModel.mdlReader.readSingle();
      }
    

      //Inverse Bone Quaternions
      if (this.BoneQuaternionDef.count > 0) {
        this.odysseyModel.mdlReader.seek(this.odysseyModel.fileHeader.ModelDataOffset + this.BoneQuaternionDef.offset);
        for(let i = 0; i < this.BoneQuaternionDef.count; i++){
          let w = this.odysseyModel.mdlReader.readSingle();
          this.bone_quaternions[i] = new THREE.Quaternion(this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle(), w);
        }
      }

      //Inverse Bone Translations
      if (this.BonePositionDef.count > 0) {
        this.odysseyModel.mdlReader.seek(this.odysseyModel.fileHeader.ModelDataOffset + this.BonePositionDef.offset);
        for(let i = 0; i < this.BonePositionDef.count; i++){
          this.bone_translations[i] = new THREE.Vector3(this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle());
        }
      }

      //Unused Array of Bytes
      if (this.BoneConstantsDef.count > 0) {
        this.odysseyModel.mdlReader.seek(this.odysseyModel.fileHeader.ModelDataOffset + this.BoneConstantsDef.offset);
        for(let i = 0; i < this.BoneConstantsDef.count; i++){
          this.bone_constants[i] = this.odysseyModel.mdlReader.readByte();
        }
      }

      //Rebuild the inverse bone matrix from the QBone and TBone values
      if (this.BonePositionDef.count > 0) {
        for(let i = 0; i < this.BonePositionDef.count; i++){
          this.bone_inverse_matrix[i] = new THREE.Matrix4();
          this.bone_inverse_matrix[i].compose( this.bone_translations[i], this.bone_quaternions[i], new THREE.Vector3(1, 1, 1) );
        }
      }
    }

  }

}
