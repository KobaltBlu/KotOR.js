/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The AuroraModelNodeDangly
 */

 class AuroraModelNodeDangly extends AuroraModelNodeMesh {

  constructor(parent = undefined){
    super(parent);
    this.type |= AuroraModel.NODETYPE.Dangly;
  }

  readBinary(auroraModel = undefined){
    super.readBinary(auroraModel);

    let contraintArray = AuroraModel.ReadArrayDefinition(this.auroraModel.mdlReader);

    this.danglyDisplacement = this.auroraModel.mdlReader.ReadSingle();
    this.danglyTightness = this.auroraModel.mdlReader.ReadSingle();
    this.danglyPeriod = this.auroraModel.mdlReader.ReadSingle();

    this.danglyMDLOffset = this.auroraModel.mdlReader.ReadUInt32();
    
    this.constraints = AuroraModel.ReadArrayFloats(this.auroraModel.mdlReader, this.auroraModel.fileHeader.ModelDataOffset + contraintArray.offset, contraintArray.count);
    this.auroraModel.mdlReader.Seek(this.auroraModel.fileHeader.ModelDataOffset + this.danglyMDLOffset);
    this.danglyVec4 = new Array(contraintArray.count);
    for(let i = 0; i < contraintArray.count; i++){
      this.danglyVec4[i] = new THREE.Vector4(this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle(), this.constraints[i]);
    }

  }

}

module.exports = AuroraModelNodeDangly;
