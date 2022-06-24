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

    for(let i = 0; i < 16; i++){
      this.bone_parts[i] = this.auroraModel.mdlReader.ReadUInt16();
    }

    //this.spare = this.auroraModel.mdlReader.ReadInt16();

    this.weights = [];
    this.boneIdx = [];

    for (let i = 0; i < this.VerticiesCount; i++) {
      // Position
      this.auroraModel.mdxReader.position = (this._mdxNodeDataOffset + (i * this.MDXDataSize)) + this.MDXBoneWeightOffset;
      
      this.weights[i] = [0, 0, 0, 0];
      for(let i2 = 0; i2 < 4; i2++){
        let float = this.auroraModel.mdxReader.ReadSingle();
        this.weights[i][i2] = (float);
      }

      this.auroraModel.mdxReader.position = (this._mdxNodeDataOffset + (i * this.MDXDataSize)) + this.MDXBoneIndexOffset;

      this.boneIdx[i] = [0, 0, 0, 0];
      for(let i2 = 0; i2 < 4; i2++){
        let float = this.auroraModel.mdxReader.ReadSingle();
        this.boneIdx[i][i2] = (float);
      }
    }

    if (this.BoneMapCount > 0) {
      this.auroraModel.mdlReader.Seek(this.auroraModel.fileHeader.ModelDataOffset + this.BoneMapOffset);
      this.bone_mapping = [];
      for(let i = 0; i < this.BoneMapCount; i++){
        this.bone_mapping[i] = this.auroraModel.mdlReader.ReadSingle();
      }
    }

    //Inverse Bone Quaternions
    if (this.BoneQuaternionDef.count > 0) {
      this.auroraModel.mdlReader.Seek(this.auroraModel.fileHeader.ModelDataOffset + this.BoneQuaternionDef.offset);
      this.bone_quats = [];
      for(let i = 0; i < this.BoneQuaternionDef.count; i++){
        let w = this.auroraModel.mdlReader.ReadSingle();
        this.bone_quats[i] = new THREE.Quaternion(this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle(), w);
      }
    }

    //Inverse Bone Translations
    if (this.BonePositionDef.count > 0) {
      this.auroraModel.mdlReader.Seek(this.auroraModel.fileHeader.ModelDataOffset + this.BonePositionDef.offset);
      this.bone_position = [];
      for(let i = 0; i < this.BonePositionDef.count; i++){
        this.bone_position[i] = new THREE.Vector3(this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle());
      }
    }

    //Unused Array of Bytes
    if (this.BoneConstantsDef.count > 0) {
      this.auroraModel.mdlReader.Seek(this.auroraModel.fileHeader.ModelDataOffset + this.BoneConstantsDef.offset);
      this.bone_constants = [];
      for(let i = 0; i < this.BoneConstantsDef.count; i++){
        this.bone_constants[i] = this.auroraModel.mdlReader.ReadByte();
      }
    }

    //Rebuild the inverse bone matrix from the QBone and TBone values
    if (this.BonePositionDef.count > 0) {
      this.bone_matrix = [];
      for(let i = 0; i < this.BonePositionDef.count; i++){
        this.bone_matrix[i] = new THREE.Matrix4();
        this.bone_matrix[i].compose( this.bone_position[i], this.bone_quats[i], new THREE.Vector3(1, 1, 1) );
      }
    }

  }

}

module.exports = AuroraModelNodeSkin;
