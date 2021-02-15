/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The AuroraModelNodeReference
 */

 class AuroraModelNodeReference extends AuroraModelNode {

  constructor(parent = undefined){
    super(parent);
    this.type |= AuroraModel.NODETYPE.Reference;
  }

  readBinary(auroraModel = undefined){
    super.readBinary(auroraModel);

    this.modelName = this.auroraModel.mdlReader.ReadChars(32);
    this.reattachable = this.auroraModel.mdlReader.ReadInt32();

  }

}

module.exports = AuroraModelNodeReference;
