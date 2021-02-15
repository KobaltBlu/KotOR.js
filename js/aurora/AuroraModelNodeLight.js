/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The AuroraModelNodeLight
 */

class AuroraModelNodeLight extends AuroraModelNode {

  constructor(parent = undefined){
    super(parent);
    this.type |= AuroraModel.NODETYPE.Light;
  }

  readBinary(auroraModel = undefined){
    super.readBinary(auroraModel);

    let flareRadius = this.auroraModel.mdlReader.ReadSingle();

    this.auroraModel.mdlReader.Skip(0x0C); //Unknown UInt32 array

    let FlareSizes = AuroraModel.ReadArrayDefinition(this.auroraModel.mdlReader);
    let FlarePositions = AuroraModel.ReadArrayDefinition(this.auroraModel.mdlReader);
    let FlareColorShifts = AuroraModel.ReadArrayDefinition(this.auroraModel.mdlReader);
    let FlareTextures = AuroraModel.ReadArrayDefinition(this.auroraModel.mdlReader);

    this.LightPriority = this.auroraModel.mdlReader.ReadUInt32();
    this.AmbientFlag = this.auroraModel.mdlReader.ReadUInt32(); //Flag
    this.DynamicFlag = this.auroraModel.mdlReader.ReadUInt32();
    this.AffectDynamicFlag = this.auroraModel.mdlReader.ReadUInt32();
    this.ShadowFlag = this.auroraModel.mdlReader.ReadUInt32();
    this.GenerateFlareFlag = this.auroraModel.mdlReader.ReadUInt32();
    this.FadingLightFlag = this.auroraModel.mdlReader.ReadUInt32();

    this.flare = {
      radius: flareRadius,
      sizes: [],
      positions: [],
      colorShifts: [],
      textures: []
    };

    if(FlareTextures.count){
      //FlareTextures are stored as follows offset1,offset2,string1,string2
      for(let i = 0; i < FlareTextures.count; i++){
        //Seek to the location of the textures offset value
        this.auroraModel.mdlReader.Seek(this.auroraModel.fileHeader.ModelDataOffset + FlareTextures.offset + (4*i));
        //Read out the offset value
        let stringOffset = this.auroraModel.mdlReader.ReadUInt32();
        //Seek the reader to where the beginning of the flare texture name should be located
        this.auroraModel.mdlReader.Seek(this.auroraModel.fileHeader.ModelDataOffset + stringOffset);
        //Read the string and push it to the textures array
        this.flare.textures.push(this.auroraModel.mdlReader.ReadString().replace(/\0[\s\S]*$/g,'').trim().toLowerCase());
      }
    }

    if(FlareSizes.count){
      this.auroraModel.mdlReader.Seek(this.auroraModel.fileHeader.ModelDataOffset + FlareSizes.offset);
      for(let i = 0; i < FlareSizes.count; i++){
        this.flare.sizes.push(this.auroraModel.mdlReader.ReadSingle())
      }
    }

    if(FlarePositions.count){
      this.auroraModel.mdlReader.Seek(this.auroraModel.fileHeader.ModelDataOffset + FlarePositions.offset);
      for(let i = 0; i < FlarePositions.count; i++){
        this.flare.positions.push(this.auroraModel.mdlReader.ReadSingle())
      }
    }

    if(FlareColorShifts.count){
      this.auroraModel.mdlReader.Seek(this.auroraModel.fileHeader.ModelDataOffset + FlareColorShifts.offset);
      for(let i = 0; i < FlareColorShifts.count; i++){
        this.flare.colorShifts.push(
          new THREE.Color(this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle())
          );
      }
    }

  }

}
module.exports = AuroraModelNodeLight;
