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
    this.BoneVertexDef = AuroraModel.ReadArrayDefinition(this.auroraModel.mdlReader);
    this.BoneConstantsDef = AuroraModel.ReadArrayDefinition(this.auroraModel.mdlReader);

    this.bone_parts = [];//new Array(17);

    for(let i = 0; i <= 17; i++){
      this.bone_parts[i] = this.auroraModel.mdlReader.ReadUInt16();
    }

    //this.spare = this.auroraModel.mdlReader.ReadInt16();

    this.weights = [];//new Array(this.VerticiesCount*4);
    this.boneIdx = [];//new Array(this.VerticiesCount*4);

    for (let i = 0; i < this.VerticiesCount; i++) {
      // Position
      this.auroraModel.mdxReader.position = (this._mdxNodeDataOffset + (i * this.MDXDataSize)) + this.MDXBoneWeightOffset;
      
      this.weights[i] = [0, 0, 0, 0];
      for(let i2 = 0; i2 < 4; i2++){
        let float = this.auroraModel.mdxReader.ReadSingle();
        this.weights[i][i2] = (float);//(float == -1 ? 0 : float);//[i][i2] = float == -1 ? 0 : float;
      }

      this.auroraModel.mdxReader.position = (this._mdxNodeDataOffset + (i * this.MDXDataSize)) + this.MDXBoneIndexOffset;

      this.boneIdx[i] = [0, 0, 0, 0];
      for(let i2 = 0; i2 < 4; i2++){
        let float = this.auroraModel.mdxReader.ReadSingle();
        this.boneIdx[i][i2] = (float);//(float == -1 ? 0 : float);//[i][i2] = float == -1 ? 0 : float;
      }
    }

    if (this.BoneMapCount > 0) {
      this.auroraModel.mdlReader.Seek(this.auroraModel.fileHeader.ModelDataOffset + this.BoneMapOffset);
      this.bone_mapping = [];
      for(let i = 0; i < this.BoneMapCount; i++){
        this.bone_mapping[i] = this.auroraModel.mdlReader.ReadSingle();
      }
    }

    if (this.BoneQuaternionDef.count > 0) {
      this.auroraModel.mdlReader.Seek(this.auroraModel.fileHeader.ModelDataOffset + this.BoneQuaternionDef.offset);
      this.bone_quats = [];
      for(let i = 0; i < this.BoneQuaternionDef.count; i++){
        let w = this.auroraModel.mdlReader.ReadSingle();
        this.bone_quats[i] = new THREE.Quaternion(this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle(), w);
        //this.bone_quats[i].normalize();
      }
    }

    if (this.BoneVertexDef.count > 0) {
      this.auroraModel.mdlReader.Seek(this.auroraModel.fileHeader.ModelDataOffset + this.BoneVertexDef.offset);
      this.bone_vertex = [];
      for(let i = 0; i < this.BoneVertexDef.count; i++){
        this.bone_vertex[i] = new THREE.Vector3(this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle());
        //this.bone_vertex[i].normalize();
      }
    }

    if (this.BoneConstantsDef.count > 0) {
      this.auroraModel.mdlReader.Seek(this.auroraModel.fileHeader.ModelDataOffset + this.BoneConstantsDef.offset);
      this.bone_constants = [];
      for(let i = 0; i < this.BoneConstantsDef.count; i++){
        this.bone_constants[i] = this.auroraModel.mdlReader.ReadByte();
      }
    }

  }

}

module.exports = AuroraModelNodeSkin;
