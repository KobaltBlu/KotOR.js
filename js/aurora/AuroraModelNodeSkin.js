/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The AuroraModelNodeSkin
 */

 class AuroraModelNodeSkin extends AuroraModelNodeMesh {

  constructor(parent = undefined){
    super(parent);
    this.type |= AuroraModel.NODETYPE.Skin;
  }

  readBinary(auroraModel = undefined){
    super.readBinary(auroraModel);

    this.weights_def = AuroraModel.ReadArrayDefinition(this.auroraModel.mdlReader);

    this.MDXBoneWeightOffset = this.auroraModel.mdlReader.ReadUInt32();
    this.MDXBoneIndexOffset = this.auroraModel.mdlReader.ReadUInt32();
    this.BoneMapOffset = this.auroraModel.mdlReader.ReadUInt32();
    this.BoneMapCount = this.auroraModel.mdlReader.ReadUInt32();

    this.BoneQuaternionDef = AuroraModel.ReadArrayDefinition(this.auroraModel.mdlReader);
    this.BonePositionDef = AuroraModel.ReadArrayDefinition(this.auroraModel.mdlReader);
    this.BoneConstantsDef = AuroraModel.ReadArrayDefinition(this.auroraModel.mdlReader);

    this.bone_parts = [];

    //Models appear have up to 17 bones. Not sure if this is the limit or just the known max used.
    //Example: c_ithorian.mdl uses 17 bones, while most other models use 16
    for(let i = 0; i < 17; i++){
      this.bone_parts[i] = this.auroraModel.mdlReader.ReadUInt16();
    }

    this.weights = [];
    this.boneIdx = [];
    this.bone_mapping = [];
    this.bone_constants = [];
    this.bone_quaternions = [];
    this.bone_translations = [];
    this.bone_inverse_matrix = [];

    for (let i = 0; i < this.VerticiesCount; i++) {
      // Position
      this.auroraModel.mdxReader.position = (this._mdxNodeDataOffset + (i * this.MDXDataSize)) + this.MDXBoneWeightOffset;
      
      this.weights[i] = [0, 0, 0, 0];
      for(let i2 = 0; i2 < 4; i2++){
        this.weights[i][i2] = this.auroraModel.mdxReader.ReadSingle();
      }

      this.auroraModel.mdxReader.position = (this._mdxNodeDataOffset + (i * this.MDXDataSize)) + this.MDXBoneIndexOffset;

      this.boneIdx[i] = [0, 0, 0, 0];
      for(let i2 = 0; i2 < 4; i2++){
        this.boneIdx[i][i2] = this.auroraModel.mdxReader.ReadSingle();
      }
    }

    if (this.BoneMapCount > 0) {
      this.auroraModel.mdlReader.Seek(this.auroraModel.fileHeader.ModelDataOffset + this.BoneMapOffset);
      for(let i = 0; i < this.BoneMapCount; i++){
        this.bone_mapping[i] = this.auroraModel.mdlReader.ReadSingle();
      }
    

      //Inverse Bone Quaternions
      if (this.BoneQuaternionDef.count > 0) {
        this.auroraModel.mdlReader.Seek(this.auroraModel.fileHeader.ModelDataOffset + this.BoneQuaternionDef.offset);
        for(let i = 0; i < this.BoneQuaternionDef.count; i++){
          let w = this.auroraModel.mdlReader.ReadSingle();
          this.bone_quaternions[i] = new THREE.Quaternion(this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle(), w);
        }
      }

      //Inverse Bone Translations
      if (this.BonePositionDef.count > 0) {
        this.auroraModel.mdlReader.Seek(this.auroraModel.fileHeader.ModelDataOffset + this.BonePositionDef.offset);
        for(let i = 0; i < this.BonePositionDef.count; i++){
          this.bone_translations[i] = new THREE.Vector3(this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle());
        }
      }

      //Unused Array of Bytes
      if (this.BoneConstantsDef.count > 0) {
        this.auroraModel.mdlReader.Seek(this.auroraModel.fileHeader.ModelDataOffset + this.BoneConstantsDef.offset);
        for(let i = 0; i < this.BoneConstantsDef.count; i++){
          this.bone_constants[i] = this.auroraModel.mdlReader.ReadByte();
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

module.exports = AuroraModelNodeSkin;
